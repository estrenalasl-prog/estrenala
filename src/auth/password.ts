import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Contraseñas con scrypt de node:crypto (N=16384, r=8, p=1 — los defaults de
// Node): sin dependencias. Formato guardado: `s1.<salt b64url>.<hash b64url>`.
// '' significa «sin contraseña» (cuentas dadas de alta solo con Google) y
// NUNCA verifica. Jamás se loguea material de contraseñas ni hashes.

const scrypt = promisify(scryptCb) as (pwd: string, salt: Buffer, len: number) => Promise<Buffer>;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await scrypt(password, salt, HASH_BYTES);
  return `s1.${salt.toString("base64url")}.${hash.toString("base64url")}`;
}

export async function verificarPassword(password: string, guardado: string): Promise<boolean> {
  const partes = guardado.split(".");
  if (partes.length !== 3 || partes[0] !== "s1") return false;
  let salt: Buffer, esperado: Buffer;
  try {
    salt = Buffer.from(partes[1], "base64url");
    esperado = Buffer.from(partes[2], "base64url");
  } catch {
    return false;
  }
  if (salt.length !== SALT_BYTES || esperado.length !== HASH_BYTES) return false;
  const hash = await scrypt(password, salt, HASH_BYTES);
  return timingSafeEqual(hash, esperado);
}
