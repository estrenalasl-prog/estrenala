// Analítica de visitas de LA PLATAFORMA (no de las webs de los clientes: cada
// una pone la suya desde «Herramientas del sitio»).
//
// Se usa Umami autoalojado, y la razón no es el precio: **no pone ni una
// cookie**. El art. 22.2 de la LSSI habla de almacenar o acceder a información
// en el equipo del visitante, y Umami no guarda nada ahí. Por eso no hace falta
// banner de consentimiento y la página `/legal/cookies` —que dice que aquí solo
// hay cookies técnicas— sigue siendo verdad.
//
// Con Google Analytics no valdría: es analítica de terceros, no está entre las
// exentas, y habría que pedir consentimiento ANTES de cargarla.
//
// Ninguno de los dos valores es secreto: el navegador los ve en el HTML.

export type Entorno = Record<string, string | undefined>;

export type Analitica = { src: string; websiteId: string };

/**
 * `null` = no hay analítica configurada y no se pinta nada. Es lo que pasa en
 * desarrollo, para no ensuciar las estadísticas con nuestras propias pruebas.
 */
export function analitica(env: Entorno = process.env): Analitica | null {
  const src = (env.UMAMI_SRC ?? "").trim();
  const websiteId = (env.UMAMI_WEBSITE_ID ?? "").trim();
  if (!src || !websiteId) return null;
  // Solo https y una URL entera: esto acaba en un <script src>, así que no se
  // acepta cualquier cosa que venga del entorno.
  if (!/^https:\/\/[^\s"'<>]+$/.test(src)) return null;
  if (!/^[0-9a-f-]{36}$/i.test(websiteId)) return null; // Umami usa UUID
  return { src, websiteId };
}
