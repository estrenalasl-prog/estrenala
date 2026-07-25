import { EditorError } from "@/src/editor/errors";
import { generarToken, hashToken, DURACION_MS } from "./tokens";
import { MSG_ENLACE_INVALIDO } from "./verificacion";
import { enviarCorreo } from "@/src/email/enviar";
import type { UserRow, MembershipInfo, TokenRow } from "@/src/repositories/accounts";

export const MSG_ROL_INVALIDO = "Rol no válido";
export const MSG_EMAIL_INVALIDO = "Ese correo no parece válido";
export const MSG_ULTIMO_OWNER = "No puedes dejar el espacio sin ningún propietario";
export const MSG_YA_MIEMBRO = "Esa persona ya está en el espacio";
export const MSG_ELIGE_OTRA = "Elige a otra persona del espacio";
export const MSG_NO_MIEMBRO = "Esa persona no está en el espacio";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Rol = "owner" | "editor";

export function validarRol(rol: unknown): Rol {
  if (rol === "owner" || rol === "editor") return rol;
  throw new EditorError(MSG_ROL_INVALIDO, 400);
}

// Métodos del store que la lógica de equipo necesita (subconjunto estructural).
export interface EquipoStore {
  getUserByEmail(email: string): Promise<UserRow | null>;
  getOrg(orgId: string): Promise<{ id: string; nombre: string } | null>;
  getMembership(orgId: string, userId: string): Promise<MembershipInfo | null>;
  crearMembership(orgId: string, userId: string, rol: string): Promise<void>;
  crearToken(input: {
    email: string; userId: string | null; tipo: string; tokenHash: string;
    payloadJson?: unknown; expiraAt: Date;
  }): Promise<void>;
  getTokenPorHash(tokenHash: string): Promise<TokenRow | null>;
  marcarTokenUsado(id: string): Promise<void>;
}

// Métodos del store para ceder la propiedad (subconjunto estructural).
export interface TransferenciaStore {
  getMembership(orgId: string, userId: string): Promise<MembershipInfo | null>;
  aplicarTransferencia(orgId: string, deUserId: string, aUserId: string): Promise<void>;
}

// Cede la propiedad del espacio: el destino pasa a propietario y quien la cede baja
// a editor (atómico en el store). El destino debe ser OTRO miembro del espacio.
export async function transferirPropiedad(
  store: TransferenciaStore,
  input: { orgId: string; actualUserId: string; nuevoUserId: string }
): Promise<void> {
  if (!input.nuevoUserId || input.nuevoUserId === input.actualUserId) {
    throw new EditorError(MSG_ELIGE_OTRA, 400);
  }
  const objetivo = await store.getMembership(input.orgId, input.nuevoUserId);
  if (!objetivo) throw new EditorError(MSG_NO_MIEMBRO, 404);
  await store.aplicarTransferencia(input.orgId, input.actualUserId, input.nuevoUserId);
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Invita a un email a la organización con un rol. Crea un token de 7 días con el
// destino en el payload y manda el correo con el enlace. Si la persona ya es
// miembro, no reinvita.
export async function invitar(
  store: EquipoStore,
  input: { orgId: string; orgNombre: string; email: string; rol: unknown; base: string }
): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new EditorError(MSG_EMAIL_INVALIDO, 400);
  const rol = validarRol(input.rol);

  const ya = await store.getUserByEmail(email);
  if (ya && (await store.getMembership(input.orgId, ya.id))) {
    throw new EditorError(MSG_YA_MIEMBRO, 409);
  }

  const { token, hash } = generarToken();
  await store.crearToken({
    email, userId: null, tipo: "invitacion", tokenHash: hash,
    payloadJson: { orgId: input.orgId, rol }, expiraAt: new Date(Date.now() + DURACION_MS.invitacion),
  });
  const enlace = `${input.base}/invitacion?token=${token}`;
  await enviarCorreo({
    para: email,
    asunto: `Te han invitado a «${input.orgNombre}» en Estrénala`,
    html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#141509">
<h1 style="font-size:22px;margin:0 0 12px">Únete a «${esc(input.orgNombre)}»</h1>
<p style="color:#55584C;font-size:15px;line-height:1.6;margin:0 0 24px">Te han invitado a colaborar en un espacio de Estrénala como <b>${rol === "owner" ? "propietario" : "editor"}</b>.</p>
<a href="${esc(enlace)}" style="display:inline-block;background:#C4F000;color:#141509;font-weight:600;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:9px">Unirme al espacio</a>
<p style="color:#9A9C8F;font-size:12.5px;margin:24px 0 0">Si no esperabas esto, ignora el correo. El enlace caduca en 7 días.</p></div>`,
    texto: `Te han invitado a «${input.orgNombre}» en Estrénala como ${rol === "owner" ? "propietario" : "editor"}. Únete abriendo este enlace (caduca en 7 días):\n${enlace}`,
  });
}

// Acepta una invitación: valida el token, mete al usuario en la organización con
// el rol invitado y marca el token usado. Devuelve la org para activarla.
export async function aceptarInvitacion(
  store: EquipoStore, input: { tokenPlano: string; userId: string }
): Promise<{ orgId: string }> {
  const row = input.tokenPlano ? await store.getTokenPorHash(hashToken(input.tokenPlano)) : null;
  if (!row || row.tipo !== "invitacion" || row.usadoAt || Date.parse(row.expiraAt) <= Date.now()) {
    throw new EditorError(MSG_ENLACE_INVALIDO, 400);
  }
  const payload = row.payloadJson as { orgId?: string; rol?: string } | null;
  if (!payload?.orgId) throw new EditorError(MSG_ENLACE_INVALIDO, 400);
  const rol: Rol = payload.rol === "owner" ? "owner" : "editor";

  await store.crearMembership(payload.orgId, input.userId, rol); // no duplica (onConflictDoNothing)
  await store.marcarTokenUsado(row.id);
  return { orgId: payload.orgId };
}
