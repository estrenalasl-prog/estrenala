import { correoAviso, diasHasta, tocaAvisar, type Vigilado } from "./aviso";
import type { Correo } from "@/src/email/enviar";

/**
 * La revisión diaria de los certificados de los dominios propios.
 *
 * Por qué existe: los subdominios de la plataforma van bajo un certificado
 * comodín que se renueva de una vez, pero **cada dominio propio de cliente tiene
 * el suyo**, pedido a Let's Encrypt uno a uno. Si la renovación de UNO falla, su
 * web se rompe y todo lo demás sigue perfecto — no hay ninguna pantalla ni
 * ningún vigilante que lo note.
 *
 * Y falla de verdad: si un cliente quita el registro `www` de su DNS, Traefik se
 * queda pidiendo un certificado imposible para siempre mientras el del dominio
 * pelado se renueva bien. Fallo parcial, silencioso, y con fecha de caducidad.
 *
 * Todo entra por parámetros para poder probarlo sin red ni base ni correo.
 */
export type Deps = {
  /** Dominios propios publicados, con el correo de su dueño. */
  listar: () => Promise<Omit<Vigilado, "caduca">[]>;
  /** Cuándo caduca el certificado de ese host. `null` si no se pudo leer. */
  caducidad: (host: string) => Promise<Date | null>;
  enviar: (correo: Correo) => Promise<void>;
  /** Copia para el operador: es quien puede arreglarlo. Vacío = no se manda. */
  copiaA?: string;
};

export type Resultado = {
  revisados: number;
  avisados: number;
  ilegibles: string[];
  /** Días que le quedan a cada uno, para poder verlo en el registro. */
  dias: Record<string, number>;
};

export async function revisarCertificados(deps: Deps, ahora: Date = new Date()): Promise<Resultado> {
  const r: Resultado = { revisados: 0, avisados: 0, ilegibles: [], dias: {} };

  for (const v of await deps.listar()) {
    r.revisados++;
    let caduca: Date | null = null;
    try {
      caduca = await deps.caducidad(v.dominio);
    } catch {
      caduca = null;
    }

    // No poder leerlo NO es lo mismo que estar a punto de caducar, y por eso no
    // dispara ningún correo: un corte de red de diez segundos avisaría a todos
    // los clientes de que su web se rompe. Se anota y se mira el registro.
    if (!caduca) { r.ilegibles.push(v.dominio); continue; }

    const dias = diasHasta(caduca, ahora);
    r.dias[v.dominio] = dias;
    if (!tocaAvisar(dias)) continue;

    const { asunto, html, texto } = correoAviso({ ...v, caduca }, dias);
    await deps.enviar({ para: v.email, asunto, html, texto });
    r.avisados++;

    // Al operador se le manda aparte y no en copia oculta: si mañana el dueño es
    // un cliente de verdad, en su correo no tiene por qué aparecer nadie más.
    if (deps.copiaA && deps.copiaA !== v.email) {
      await deps.enviar({
        para: deps.copiaA,
        asunto: `[Estrénala] ${asunto}`,
        html: `<p>Aviso enviado a <strong>${v.email}</strong> (proyecto «${v.proyecto}»).</p>${html}`,
        texto: `Aviso enviado a ${v.email} (proyecto «${v.proyecto}»).\n\n${texto}`,
      });
    }
  }

  return r;
}
