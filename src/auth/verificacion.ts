import { EditorError } from "@/src/editor/errors";
import { generarToken, hashToken, DURACION_MS, type TipoToken } from "./tokens";
import { enviarCorreo, envioActivo } from "@/src/email/enviar";
import type { AccountStore, TokenRow } from "@/src/repositories/accounts";

// Mensaje único para cualquier token inválido/caducado/usado: no distingue el
// motivo (menos información para un atacante). Byte-exacto (lo fijan los tests).
export const MSG_ENLACE_INVALIDO = "Este enlace ya no es válido. Pide uno nuevo.";
export const MSG_PASSWORD_CORTA = "La contraseña necesita al menos 8 caracteres";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Correo de marca, autocontenido (los clientes de email no cargan CSS externo).
function plantilla(titulo: string, cuerpo: string, boton: { texto: string; enlace: string }): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#141509">
<div style="font-weight:700;font-size:18px;letter-spacing:-.02em;margin-bottom:20px">Estrénal<span style="background:#C4F000;padding:0 4px;border-radius:4px">a</span></div>
<h1 style="font-size:22px;margin:0 0 12px">${esc(titulo)}</h1>
<p style="color:#55584C;font-size:15px;line-height:1.6;margin:0 0 24px">${cuerpo}</p>
<a href="${esc(boton.enlace)}" style="display:inline-block;background:#C4F000;color:#141509;font-weight:600;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:9px">${esc(boton.texto)}</a>
<p style="color:#9A9C8F;font-size:12.5px;line-height:1.6;margin:24px 0 0">Si no fuiste tú, ignora este correo. El enlace deja de funcionar solo.</p>
</div>`;
}

// Crea un token de verificación y envía el correo de confirmación.
export async function enviarVerificacion(
  store: AccountStore,
  input: { userId: string; email: string; nombre: string; base: string }
): Promise<void> {
  const { token, hash } = generarToken();
  await store.crearToken({
    email: input.email, userId: input.userId, tipo: "verificacion",
    tokenHash: hash, expiraAt: new Date(Date.now() + DURACION_MS.verificacion),
  });
  const enlace = `${input.base}/verificar?token=${token}`;
  await enviarCorreo({
    para: input.email,
    asunto: "Confirma tu correo en Estrénala",
    html: plantilla(
      `Hola ${esc(input.nombre)}, confirma tu correo`,
      "Toca el botón para activar tu cuenta de Estrénala y empezar a publicar tus webs.",
      { texto: "Confirmar mi correo", enlace }
    ),
    texto: `Hola ${input.nombre}, confirma tu correo en Estrénala abriendo este enlace:\n${enlace}\n\nSi no fuiste tú, ignora este correo.`,
  });
}

// Valida un token de un solo uso del tipo esperado. No lo marca usado (eso lo
// hace quien consume, tras aplicar su efecto en la misma operación).
export async function validarToken(
  store: AccountStore, tokenPlano: string, tipo: TipoToken
): Promise<TokenRow> {
  const row = tokenPlano ? await store.getTokenPorHash(hashToken(tokenPlano)) : null;
  if (!row || row.tipo !== tipo || row.usadoAt || Date.parse(row.expiraAt) <= Date.now()) {
    throw new EditorError(MSG_ENLACE_INVALIDO, 400);
  }
  return row;
}

// Exige tener el correo confirmado para una acción sensible (publicar, invitar).
// En dev (sin envío real de correo) NO se exige: no habría forma de confirmarlo.
export async function exigirEmailVerificado(
  store: AccountStore, userId: string, accion: string
): Promise<void> {
  if (!envioActivo()) return;
  const user = await store.getUserById(userId);
  if (!user || !user.emailVerificadoAt) {
    throw new EditorError(`Confirma tu correo antes de ${accion}`, 403);
  }
}

// Verifica el email a partir del token del enlace.
export async function verificarEmail(store: AccountStore, tokenPlano: string): Promise<void> {
  const row = await validarToken(store, tokenPlano, "verificacion");
  if (row.userId) await store.marcarEmailVerificado(row.userId);
  await store.marcarTokenUsado(row.id);
}

// Solicita el reset: SIEMPRE termina sin revelar si el correo existe. Solo si la
// cuenta existe se crea el token y se envía el correo.
export async function solicitarReset(
  store: AccountStore, email: string, base: string
): Promise<void> {
  const user = email ? await store.getUserByEmail(email) : null;
  if (!user) return;
  await store.invalidarTokens(email, "reset");
  const { token, hash } = generarToken();
  await store.crearToken({
    email, userId: user.id, tipo: "reset",
    tokenHash: hash, expiraAt: new Date(Date.now() + DURACION_MS.reset),
  });
  const enlace = `${base}/restablecer?token=${token}`;
  await enviarCorreo({
    para: email,
    asunto: "Restablece tu contraseña en Estrénala",
    html: plantilla(
      "¿Olvidaste tu contraseña?",
      "Toca el botón para elegir una nueva. El enlace caduca en una hora.",
      { texto: "Cambiar mi contraseña", enlace }
    ),
    texto: `Para cambiar tu contraseña en Estrénala, abre este enlace (caduca en 1 hora):\n${enlace}\n\nSi no fuiste tú, ignora este correo.`,
  });
}

// Aplica la nueva contraseña a partir del token del enlace.
export async function aplicarReset(
  store: AccountStore, tokenPlano: string, nuevaPassword: string,
  hashPassword: (p: string) => Promise<string>
): Promise<void> {
  if (typeof nuevaPassword !== "string" || nuevaPassword.length < 8) {
    throw new EditorError(MSG_PASSWORD_CORTA, 400);
  }
  const row = await validarToken(store, tokenPlano, "reset");
  if (row.userId) await store.setPassword(row.userId, await hashPassword(nuevaPassword));
  await store.marcarTokenUsado(row.id);
}
