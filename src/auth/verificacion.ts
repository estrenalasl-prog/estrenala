import { EditorError } from "@/src/editor/errors";
import { generarToken, hashToken, DURACION_MS, type TipoToken } from "./tokens";
import { enviarCorreo, envioActivo } from "@/src/email/enviar";
import { textosCuenta } from "@/src/i18n/cuenta";
import { rellenar } from "@/src/i18n/rellenar";
import { IDIOMA_POR_DEFECTO, type Idioma } from "@/src/i18n/idiomas";
import type { AccountStore, TokenRow } from "@/src/repositories/accounts";

// Mensaje único para cualquier token inválido/caducado/usado: no distingue el
// motivo (menos información para un atacante). Byte-exacto (lo fijan los tests).
export const MSG_ENLACE_INVALIDO = "Este enlace ya no es válido. Pide uno nuevo.";
export const MSG_PASSWORD_CORTA = "La contraseña necesita al menos 8 caracteres";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Correo de marca, autocontenido (los clientes de email no cargan CSS externo).
// El aviso del pie viaja como parámetro: es texto traducible, y dejarlo escrito
// aquí dentro sería el único trozo del correo que se quedaría en español.
export function plantilla(
  titulo: string, cuerpo: string, boton: { texto: string; enlace: string }, pie: string
): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#141509">
<div style="font-weight:700;font-size:18px;letter-spacing:-.02em;margin-bottom:20px">Estrénal<span style="background:#C4F000;padding:0 4px;border-radius:4px">a</span></div>
<h1 style="font-size:22px;margin:0 0 12px">${esc(titulo)}</h1>
<p style="color:#55584C;font-size:15px;line-height:1.6;margin:0 0 24px">${cuerpo}</p>
<a href="${esc(boton.enlace)}" style="display:inline-block;background:#C4F000;color:#141509;font-weight:600;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:9px">${esc(boton.texto)}</a>
<p style="color:#9A9C8F;font-size:12.5px;line-height:1.6;margin:24px 0 0">${esc(pie)}</p>
</div>`;
}

// Crea un token de verificación y envía el correo de confirmación.
export async function enviarVerificacion(
  store: AccountStore,
  input: { userId: string; email: string; nombre: string; base: string; idioma?: Idioma }
): Promise<void> {
  const { token, hash } = generarToken();
  await store.crearToken({
    email: input.email, userId: input.userId, tipo: "verificacion",
    tokenHash: hash, expiraAt: new Date(Date.now() + DURACION_MS.verificacion),
  });
  const enlace = `${input.base}/verificar?token=${token}`;
  // `idioma` es opcional para no obligar a cada sitio que ya llamaba a esto a
  // saber de idiomas; sin él sale en español, que es lo que hacía antes.
  const c = textosCuenta(input.idioma ?? IDIOMA_POR_DEFECTO).correos;
  await enviarCorreo({
    para: input.email,
    asunto: c.verificacion.asunto,
    html: plantilla(
      // El nombre lo escribe el usuario: al HTML entra escapado, al texto plano
      // tal cual. Se rellena la plantilla YA escapada para que el `esc` del
      // título no vuelva a escapar las entidades y salga «Jos&amp;eacute;».
      rellenar(c.verificacion.titulo, { nombre: input.nombre }),
      c.verificacion.cuerpo,
      { texto: c.verificacion.boton, enlace },
      c.verificacion.pie
    ),
    texto: rellenar(c.verificacion.texto, { nombre: input.nombre, enlace }),
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
  store: AccountStore, email: string, base: string, idioma?: Idioma
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
  const c = textosCuenta(idioma ?? IDIOMA_POR_DEFECTO).correos;
  await enviarCorreo({
    para: email,
    asunto: c.reset.asunto,
    html: plantilla(c.reset.titulo, c.reset.cuerpo, { texto: c.reset.boton, enlace }, c.reset.pie),
    texto: rellenar(c.reset.texto, { enlace }),
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
