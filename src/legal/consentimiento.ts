// Consentimiento de cookies. Solo aplica a la PLATAFORMA (panel y landing): las
// webs de los clientes se sirven desde app/sites/[host]/route.ts, un manejador de
// ruta que devuelve HTML en crudo y NO pasa por app/layout.tsx. Un banner nuestro
// no puede colarse ahí ni por error, y eso es estructural, no cuestión de cuidado.
//
// Regla de fondo: el banner aparece SOLO si hay algo que consentir de verdad, o
// sea si hay identificador de Google Ads configurado. Sin él no se carga ningún
// script, no hay cookies publicitarias y no sale banner. Enseñar un banner cuando
// solo usas cookies técnicas molesta, tira la conversión de la landing y acostumbra
// a la gente a aceptar sin leer; además la ley no lo exige para las estrictamente
// necesarias.

/**
 * Las cuatro categorías del Consent Mode v2 de Google, obligatorio desde marzo de
 * 2024 para anunciarse en el EEE. Sin enviarlas, Google degrada audiencias y
 * remarketing aunque el píxel esté puesto.
 */
export const CATEGORIAS = [
  "ad_storage",
  "ad_user_data",
  "ad_personalization",
  "analytics_storage",
] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export type Decision = "aceptado" | "rechazado";

export const COOKIE_CONSENTIMIENTO = "estrenala_cookies";

/**
 * Seis meses. La AEPD permite hasta 24, pero la recomendación europea es 6: pasado
 * ese tiempo se vuelve a preguntar en vez de dar por buena una decisión vieja.
 */
export const DIAS_CONSENTIMIENTO = 180;

/** Lo que vale la cookie. Cualquier otra cosa se trata como «no ha decidido». */
export function leerDecision(valor: string | null | undefined): Decision | null {
  const v = (valor ?? "").trim().toLowerCase();
  return v === "aceptado" || v === "rechazado" ? v : null;
}

/**
 * ¿Hay que enseñar el banner?
 *
 * Sin identificador de Ads no, aunque el usuario no haya decidido nada: no hay
 * ninguna cookie que consentir. Y con identificador, solo mientras no haya decidido.
 */
export function haceFaltaBanner(idAds: string | undefined, decision: Decision | null): boolean {
  return Boolean((idAds ?? "").trim()) && decision === null;
}

/** ¿Se pueden cargar los scripts de Google? Solo con identificador Y aceptación. */
export function seCarganScripts(idAds: string | undefined, decision: Decision | null): boolean {
  return Boolean((idAds ?? "").trim()) && decision === "aceptado";
}

/**
 * El estado que se le manda a Google. Sin decisión → todo denegado, que es lo que
 * exige el Consent Mode: se arranca en denegado y se actualiza si aceptan. Nunca al
 * revés — cargar concedido «hasta que rechacen» es exactamente lo que la norma
 * prohíbe.
 */
export function estadoConsentMode(decision: Decision | null): Record<Categoria, "granted" | "denied"> {
  const v = decision === "aceptado" ? "granted" : "denied";
  return {
    ad_storage: v,
    ad_user_data: v,
    ad_personalization: v,
    analytics_storage: v,
  };
}

/**
 * La cookie de la decisión es TÉCNICA: guarda una preferencia del usuario y no
 * identifica a nadie. Por eso se puede escribir sin consentimiento previo —si
 * hiciera falta consentir para recordar que no consientes, no habría salida—.
 *
 * `SameSite=Lax` y sin `Secure` en desarrollo (localhost no es https).
 */
export function cookieDecision(decision: Decision, seguro: boolean): string {
  const partes = [
    `${COOKIE_CONSENTIMIENTO}=${decision}`,
    "Path=/",
    `Max-Age=${DIAS_CONSENTIMIENTO * 24 * 60 * 60}`,
    "SameSite=Lax",
  ];
  if (seguro) partes.push("Secure");
  return partes.join("; ");
}

/** Para el botón «cambiar mi decisión» de la política de cookies. */
export function cookieOlvidar(seguro: boolean): string {
  const partes = [`${COOKIE_CONSENTIMIENTO}=`, "Path=/", "Max-Age=0", "SameSite=Lax"];
  if (seguro) partes.push("Secure");
  return partes.join("; ");
}
