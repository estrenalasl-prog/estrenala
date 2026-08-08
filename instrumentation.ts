// Tick del servidor (4e + 4g): al arrancar (dev o next start), cada 60 s corre
// el piloto automático (proyectos que publican solos) y después la publicación
// de programaciones vencidas. El primer tick espera 15 s para no competir con
// el arranque. Cada mitad tiene su try/catch: una rota no frena a la otra.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // El hot reload de dev puede volver a llamar a register(): el flag global
  // evita acumular intervalos duplicados en el mismo proceso.
  const g = globalThis as typeof globalThis & { __tickProgramados?: boolean };
  if (g.__tickProgramados) return;
  g.__tickProgramados = true;

  const tick = async () => {
    try {
      const [{ pilotoTick }, { publicarVencidos }, { projectStore }, { blogStore }, { getStorage }, { getDeploy }] =
        await Promise.all([
          import("@/src/blog/piloto"),
          import("@/src/blog/programados"),
          import("@/src/repositories/projects"),
          import("@/src/repositories/blog"),
          import("@/src/storage/factory"),
          import("@/src/publish/deploy-factory"),
        ]);
      try {
        const p = await pilotoTick({ store: projectStore, blog: blogStore, storage: getStorage() });
        if (p.ejecutados) console.log(`[piloto] ejecutados: ${p.ejecutados} · publicados: ${p.publicados}`);
      } catch (e) {
        console.error("[piloto] tick fallido:", e instanceof Error ? e.message : e);
      }
      const r = await publicarVencidos({
        store: projectStore, blog: blogStore, storage: getStorage(), deploy: getDeploy(),
      });
      if (r.publicados || r.errores) {
        console.log(`[programados] publicados: ${r.publicados} · errores: ${r.errores}`);
      }
      // Los certificados van UNA vez al día, no en cada tick: son 90 días de
      // vida y mirarlos cada minuto sería abrir 1.440 conexiones TLS diarias
      // contra las webs de los clientes para nada.
      try {
        await revisarCertificadosUnaVezAlDia();
      } catch (e) {
        console.error("[certificados] revisión fallida:", e instanceof Error ? e.message : e);
      }
    } catch (e) {
      // Un tick roto (BD caída, storage inaccesible) no tumba el servidor.
      console.error("[programados] tick fallido:", e instanceof Error ? e.message : e);
    }
  };
  setTimeout(() => void tick(), 15_000);
  setInterval(() => void tick(), 60_000);
}

/**
 * La puerta diaria de la revisión de certificados.
 *
 * El día se guarda EN MEMORIA, no en la base. Un despliegue reinicia el proceso
 * y vuelve a revisar ese día: como mucho, un aviso repetido en la jornada en que
 * un certificado cruza su umbral. Se prefirió eso a añadir una columna y una
 * migración para no repetir un correo que, si llega dos veces, tampoco molesta.
 */
let ultimoDiaRevisado = "";

async function revisarCertificadosUnaVezAlDia() {
  const hoy = new Date().toISOString().slice(0, 10);
  if (ultimoDiaRevisado === hoy) return;
  ultimoDiaRevisado = hoy;

  const [{ revisarCertificados }, { caducidadDelCertificado }, { dominiosPublicados }, { enviarCorreo }] =
    await Promise.all([
      import("@/src/certificados/revisar"),
      import("@/src/certificados/tls"),
      import("@/src/repositories/dominios"),
      import("@/src/email/enviar"),
    ]);

  const r = await revisarCertificados({
    listar: dominiosPublicados,
    caducidad: caducidadDelCertificado,
    enviar: enviarCorreo,
    copiaA: (process.env.ALERTAS_EMAIL ?? "").trim() || undefined,
  });

  if (r.revisados === 0) return;
  // Se escriben SIEMPRE los días que le quedan a cada uno, aunque no haya nada
  // que avisar: es la única forma de mirar el registro y ver que la vigilancia
  // está viva. Sin esta línea, «no hay avisos» y «no se está revisando» se ven
  // exactamente igual.
  console.log(`[certificados] ${r.revisados} revisado(s) · ${r.avisados} aviso(s) · ${JSON.stringify(r.dias)}`);
  if (r.ilegibles.length > 0) console.warn(`[certificados] no se pudo leer: ${r.ilegibles.join(", ")}`);
}
