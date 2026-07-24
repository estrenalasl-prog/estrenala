import { EditorError } from "@/src/editor/errors";
import { hashPassword, verificarPassword } from "./password";
import { generarToken, hashToken, DURACION_MS } from "./tokens";
import { MSG_ENLACE_INVALIDO } from "./verificacion";
import { enviarCorreo } from "@/src/email/enviar";
import type { UserRow, TokenRow } from "@/src/repositories/accounts";

// Cambios sobre la propia cuenta: nombre, contraseña (pide la actual) y correo
// (doble confirmación: el cambio no se aplica hasta abrir el enlace del correo
// NUEVO). Mensajes byte-exactos (los fijan los tests).
export const MSG_NOMBRE = "Escribe tu nombre";
export const MSG_PASSWORD_CORTA = "La contraseña necesita al menos 8 caracteres";
export const MSG_PASSWORD_ACTUAL = "La contraseña actual no es correcta";
export const MSG_EMAIL_INVALIDO = "Ese correo no parece válido";
export const MSG_EMAIL_EN_USO = "Ese correo ya está en uso";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CuentaStore {
  getUserById(userId: string): Promise<UserRow | null>;
  getUserByEmail(email: string): Promise<UserRow | null>;
  setNombre(userId: string, nombre: string): Promise<void>;
  setPassword(userId: string, passwordHash: string): Promise<void>;
  setEmail(userId: string, email: string): Promise<void>;
  crearToken(input: {
    email: string; userId: string | null; tipo: string; tokenHash: string;
    payloadJson?: unknown; expiraAt: Date;
  }): Promise<void>;
  getTokenPorHash(tokenHash: string): Promise<TokenRow | null>;
  marcarTokenUsado(id: string): Promise<void>;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function cambiarNombre(store: CuentaStore, userId: string, nombre: unknown): Promise<void> {
  const n = typeof nombre === "string" ? nombre.trim() : "";
  if (!n) throw new EditorError(MSG_NOMBRE, 400);
  await store.setNombre(userId, n);
}

export async function cambiarPassword(
  store: CuentaStore, input: { userId: string; actual: unknown; nueva: unknown }
): Promise<void> {
  const user = await store.getUserById(input.userId);
  if (!user) throw new EditorError("No autorizado", 401);
  // Si ya tiene contraseña, hay que acertar la actual. Las cuentas solo-Google
  // (sin contraseña) pueden ponerse una sin pedir la anterior.
  if (user.passwordHash) {
    const ok = await verificarPassword(typeof input.actual === "string" ? input.actual : "", user.passwordHash);
    if (!ok) throw new EditorError(MSG_PASSWORD_ACTUAL, 400);
  }
  if (typeof input.nueva !== "string" || input.nueva.length < 8) throw new EditorError(MSG_PASSWORD_CORTA, 400);
  await store.setPassword(input.userId, await hashPassword(input.nueva));
}

export async function solicitarCambioEmail(
  store: CuentaStore, input: { userId: string; nuevoEmail: unknown; base: string }
): Promise<void> {
  const email = (typeof input.nuevoEmail === "string" ? input.nuevoEmail : "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new EditorError(MSG_EMAIL_INVALIDO, 400);
  const existe = await store.getUserByEmail(email);
  if (existe && existe.id !== input.userId) throw new EditorError(MSG_EMAIL_EN_USO, 409);

  const { token, hash } = generarToken();
  await store.crearToken({
    email, userId: input.userId, tipo: "cambio-email", tokenHash: hash,
    payloadJson: { userId: input.userId, nuevoEmail: email },
    expiraAt: new Date(Date.now() + DURACION_MS.reset),
  });
  const enlace = `${input.base}/cambiar-email?token=${token}`;
  await enviarCorreo({
    para: email,
    asunto: "Confirma tu nuevo correo en Estrénala",
    html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#141509">
<h1 style="font-size:22px;margin:0 0 12px">Confirma tu nuevo correo</h1>
<p style="color:#55584C;font-size:15px;line-height:1.6;margin:0 0 24px">Toca el botón para usar esta dirección como tu correo en Estrénala. Hasta que lo confirmes, seguirá el anterior.</p>
<a href="${esc(enlace)}" style="display:inline-block;background:#C4F000;color:#141509;font-weight:600;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:9px">Confirmar este correo</a>
<p style="color:#9A9C8F;font-size:12.5px;margin:24px 0 0">Si no fuiste tú, ignora este correo. El enlace caduca en una hora.</p></div>`,
    texto: `Confirma tu nuevo correo en Estrénala abriendo este enlace (caduca en 1 hora):\n${enlace}`,
  });
}

export async function confirmarCambioEmail(store: CuentaStore, tokenPlano: string): Promise<{ userId: string }> {
  const row = tokenPlano ? await store.getTokenPorHash(hashToken(tokenPlano)) : null;
  if (!row || row.tipo !== "cambio-email" || row.usadoAt || Date.parse(row.expiraAt) <= Date.now()) {
    throw new EditorError(MSG_ENLACE_INVALIDO, 400);
  }
  const payload = row.payloadJson as { userId?: string; nuevoEmail?: string } | null;
  if (!payload?.userId || !payload.nuevoEmail) throw new EditorError(MSG_ENLACE_INVALIDO, 400);

  const chocado = await store.getUserByEmail(payload.nuevoEmail);
  if (chocado && chocado.id !== payload.userId) throw new EditorError(MSG_EMAIL_EN_USO, 409);

  await store.setEmail(payload.userId, payload.nuevoEmail);
  await store.marcarTokenUsado(row.id);
  return { userId: payload.userId };
}
