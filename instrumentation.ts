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
    } catch (e) {
      // Un tick roto (BD caída, storage inaccesible) no tumba el servidor.
      console.error("[programados] tick fallido:", e instanceof Error ? e.message : e);
    }
  };
  setTimeout(() => void tick(), 15_000);
  setInterval(() => void tick(), 60_000);
}
