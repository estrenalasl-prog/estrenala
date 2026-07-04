// Cookie de sesión del panel: "v1.<expiraEpochMs>.<hmacHex>", HMAC-SHA256 con
// SESSION_SECRET. Solo Web Crypto: se verifica en el middleware (runtime Edge).
// La cookie se emite SIN atributo Domain (host-only): no puede filtrarse a los
// subdominios de sitios ni a dominios de clientes.
export const SESSION_COOKIE = "wc_session";
export const SESSION_DURACION_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

async function hmacHex(secret: string, mensaje: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(mensaje));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function firmarSesion(secret: string, expiraEpochMs: number): Promise<string> {
  const cuerpo = `v1.${expiraEpochMs}`;
  return `${cuerpo}.${await hmacHex(secret, cuerpo)}`;
}

export async function verificarSesion(secret: string, valor: string, ahoraMs: number): Promise<boolean> {
  const partes = valor.split(".");
  if (partes.length !== 3 || partes[0] !== "v1") return false;
  const expira = Number(partes[1]);
  if (!Number.isFinite(expira) || expira <= ahoraMs) return false;
  const esperado = await hmacHex(secret, `v1.${partes[1]}`);
  if (esperado.length !== partes[2].length) return false;
  let dif = 0; // comparación en tiempo constante
  for (let i = 0; i < esperado.length; i++) dif |= esperado.charCodeAt(i) ^ partes[2].charCodeAt(i);
  return dif === 0;
}
