// Cookie de sesión del panel: "v2.<userId>.<expiraEpochMs>.<hmacHex>",
// HMAC-SHA256 con SESSION_SECRET sobre "v2.<userId>.<expira>". Solo Web
// Crypto: se verifica en el middleware (runtime Edge). Las v1 (sin identidad,
// del panel monousuario) dejaron de valer en el incremento 6a.
// La cookie se emite SIN atributo Domain (host-only): no puede filtrarse a los
// subdominios de sitios ni a dominios de clientes.
//
// El prefijo `__Host-` no es decorativo (19): las webs publicadas viven en
// *.estrenala.com y ejecutan el JavaScript que su dueño haya subido. Leer esta
// cookie no podían (es host-only), pero sí ESCRIBIR una `wc_session` con
// `Domain=.estrenala.com`, que el navegador mandaría también a la plataforma.
// No sirve para suplantar a nadie —va firmada—, pero sí para meterte en la
// sesión del atacante sin que lo notes y que subas tu web a su cuenta.
// Con `__Host-`, el navegador RECHAZA cualquier cookie de ese nombre que traiga
// `Domain`. A cambio exige `Secure` y `Path=/` siempre (ver cookie-http.ts).
export const SESSION_COOKIE = "__Host-wc_session";
export const SESSION_DURACION_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function hmacHex(secret: string, mensaje: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(mensaje));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function firmarSesion(secret: string, userId: string, expiraEpochMs: number): Promise<string> {
  const cuerpo = `v2.${userId}.${expiraEpochMs}`;
  return `${cuerpo}.${await hmacHex(secret, cuerpo)}`;
}

export async function verificarSesion(
  secret: string, valor: string, ahoraMs: number
): Promise<{ userId: string } | null> {
  const partes = valor.split(".");
  if (partes.length !== 4 || partes[0] !== "v2") return null;
  const [, userId, expiraStr, firma] = partes;
  if (!UUID_RE.test(userId)) return null;
  const expira = Number(expiraStr);
  if (!Number.isFinite(expira) || expira <= ahoraMs) return null;
  const esperado = await hmacHex(secret, `v2.${userId}.${expiraStr}`);
  if (esperado.length !== firma.length) return null;
  let dif = 0; // comparación en tiempo constante
  for (let i = 0; i < esperado.length; i++) dif |= esperado.charCodeAt(i) ^ firma.charCodeAt(i);
  return dif === 0 ? { userId } : null;
}
