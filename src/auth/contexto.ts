import { cookies } from "next/headers";
import { verificarSesion, SESSION_COOKIE } from "./session-cookie";
import type { AccountStore, MembershipInfo } from "@/src/repositories/accounts";
import { EditorError } from "@/src/editor/errors";

// Identidad de la petición: quién es, en qué organización trabaja y con qué rol.
// Sustituye al stub de desarrollo. Sin sesión válida o sin membership → 401.
export type Contexto = { userId: string; orgId: string; rol: string };

// Cookie hermana con la organización activa (un usuario puede estar en varias).
// Siempre se valida contra los memberships del usuario: no basta con ponerla.
// Lleva `__Host-` por lo mismo que la de sesión: que una web publicada en
// *.estrenala.com no pueda empujarte otro espacio activo.
export const ORG_COOKIE = "__Host-wc_org";

// ¿Hay cookie de sesión válida? Comprobación BARATA (solo HMAC, sin tocar la BD)
// para decidir qué se pinta en la raíz pública: la landing o el panel.
export async function haySesion(): Promise<boolean> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return false;
  return !!(await verificarSesion(secret, cookie, Date.now()));
}

// El store concreto (que abre la conexión a la BD) se importa de forma perezosa
// para no arrastrar db/client al bundle de tests que inyectan un store falso.
export async function getContexto(store?: AccountStore): Promise<Contexto> {
  const secret = process.env.SESSION_SECRET;
  const cookieStore = await cookies();
  const cookie = secret ? cookieStore.get(SESSION_COOKIE)?.value : undefined;
  const sesion = secret && cookie ? await verificarSesion(secret, cookie, Date.now()) : null;
  if (!sesion) throw new EditorError("No autorizado", 401);

  const s = store ?? (await import("@/src/repositories/accounts")).accountStore;
  const orgActiva = cookieStore.get(ORG_COOKIE)?.value;
  let m: MembershipInfo | null = null;
  if (orgActiva) m = await s.getMembership(orgActiva, sesion.userId); // solo si pertenece
  if (!m) m = await s.getMembershipByUser(sesion.userId); // por defecto, su primer espacio
  if (!m) throw new EditorError("No autorizado", 401);
  return { userId: sesion.userId, orgId: m.orgId, rol: m.rol };
}
