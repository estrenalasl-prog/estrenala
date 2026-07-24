import { randomBytes, createHash } from "node:crypto";

// Tokens de un solo uso para verificación de email, reset de contraseña e
// invitaciones. El token en claro viaja en el enlace del correo; en la BD SOLO
// se guarda su hash SHA-256 (si alguien lee la tabla, no puede usar los enlaces).
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generarToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export const DURACION_MS = {
  verificacion: 24 * 60 * 60 * 1000, // 24 h
  reset: 60 * 60 * 1000,             // 1 h
  invitacion: 7 * 24 * 60 * 60 * 1000, // 7 días
} as const;

export type TipoToken = keyof typeof DURACION_MS;
