import { EditorError } from "@/src/editor/errors";
import { hashPassword, verificarPassword } from "./password";
import { generarToken, hashToken, DURACION_MS } from "./tokens";
import { MSG_ENLACE_INVALIDO, plantilla } from "./verificacion";
import { enviarCorreo } from "@/src/email/enviar";
import { textosCuenta } from "@/src/i18n/cuenta";
import { rellenar } from "@/src/i18n/rellenar";
import { IDIOMA_POR_DEFECTO, type Idioma } from "@/src/i18n/idiomas";
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
  store: CuentaStore, input: { userId: string; nuevoEmail: unknown; base: string; idioma?: Idioma }
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
  // Se pasa a usar la MISMA plantilla que los demás correos: este iba con su
  // propio HTML copiado, sin el logotipo de la cabecera, así que era el único que
  // llegaba sin marca. Al traducirlo se notaba todavía más.
  const c = textosCuenta(input.idioma ?? IDIOMA_POR_DEFECTO).correos;
  await enviarCorreo({
    para: email,
    asunto: c.cambioEmail.asunto,
    html: plantilla(c.cambioEmail.titulo, c.cambioEmail.cuerpo, { texto: c.cambioEmail.boton, enlace }, c.cambioEmail.pie),
    texto: rellenar(c.cambioEmail.texto, { enlace }),
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
