import { EditorError } from "@/src/editor/errors";
import { generarToken, hashToken, DURACION_MS } from "./tokens";
import { MSG_ENLACE_INVALIDO, plantilla } from "./verificacion";
import { enviarCorreo } from "@/src/email/enviar";
import { textosCuenta } from "@/src/i18n/cuenta";
import { rellenar } from "@/src/i18n/rellenar";
import { IDIOMA_POR_DEFECTO, conIdioma, type Idioma } from "@/src/i18n/idiomas";
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
  input: { orgId: string; orgNombre: string; email: string; rol: unknown; base: string; idioma?: Idioma }
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
  const enlace = conIdioma(`${input.base}/invitacion?token=${token}`, input.idioma ?? IDIOMA_POR_DEFECTO);
  // El idioma es el de QUIEN INVITA: a quien recibe el correo no lo conocemos
  // todavía —puede que ni tenga cuenta—, así que no hay nada mejor que suponer.
  const c = textosCuenta(input.idioma ?? IDIOMA_POR_DEFECTO).correos;
  const nombreRol = rol === "owner" ? c.invitacion.propietario : c.invitacion.editor;
  await enviarCorreo({
    para: email,
    asunto: rellenar(c.invitacion.asunto, { org: input.orgNombre }),
    html: plantilla(
      rellenar(c.invitacion.titulo, { org: input.orgNombre }),
      // El cuerpo entra SIN escapar en la plantilla (para poder llevar <b>), así
      // que aquí se escapa lo que venga de fuera. El rol es nuestro; el nombre
      // de la organización lo escribe un cliente.
      rellenar(c.invitacion.cuerpo, { rol: `<b>${esc(nombreRol)}</b>`, org: esc(input.orgNombre) }),
      { texto: c.invitacion.boton, enlace },
      c.invitacion.pie
    ),
    texto: rellenar(c.invitacion.texto, { org: input.orgNombre, rol: nombreRol, enlace }),
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
