// Identificador de Google Ads (o GA4) de LA PLATAFORMA. Nada que ver con las webs
// de los clientes: esas no pasan por `app/layout.tsx`.
//
// A diferencia de Umami (ver analitica.ts), esto SÍ pone cookies de terceros y SÍ
// exige consentimiento previo. Por eso toda la lógica del banner cuelga de que este
// valor exista: sin identificador no hay scripts, no hay cookies publicitarias y no
// hay banner. Ver src/legal/consentimiento.ts.
//
// No es un secreto: el navegador lo ve en el HTML.

import type { Entorno } from "./analitica";

/**
 * `null` = no hay nada configurado. Es lo que hay hasta el día que Sebas empiece a
 * pagar anuncios, y hasta ese día la plataforma no pone una sola cookie que no sea
 * técnica.
 *
 * Se valida el formato porque este valor acaba dentro de una URL de script y de una
 * llamada a `gtag`: no vale cualquier cosa que venga del entorno.
 */
export function idAds(env: Entorno = process.env): string | null {
  const id = (env.GOOGLE_ADS_ID ?? "").trim().toUpperCase();
  if (!id) return null;
  // AW-123456789 (Ads), G-XXXXXXXXXX (GA4), GT-XXXXXXX (contenedor).
  if (!/^(AW-\d{6,12}|G-[A-Z0-9]{6,14}|GT-[A-Z0-9]{6,14})$/.test(id)) return null;
  return id;
}
