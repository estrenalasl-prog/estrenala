import { cookies } from "next/headers";
import { verificarSesion, SESSION_COOKIE } from "./session-cookie";
import type { AccountStore } from "@/src/repositories/accounts";
import { EditorError } from "@/src/editor/errors";

// Identidad de la petición: quién es, en qué organización trabaja y con qué rol.
// Sustituye al stub de desarrollo. Sin sesión válida o sin membership → 401.
// La org activa es, por ahora, la primera del usuario (multi-espacio llega en 6d).
export type Contexto = { userId: string; orgId: string; rol: string };

// El store concreto (que abre la conexión a la BD) se importa de forma perezosa
// para no arrastrar db/client al bundle de tests que inyectan un store falso.
export async function getContexto(store?: AccountStore): Promise<Contexto> {
  const secret = process.env.SESSION_SECRET;
  const cookie = secret ? (await cookies()).get(SESSION_COOKIE)?.value : undefined;
  const sesion = secret && cookie ? await verificarSesion(secret, cookie, Date.now()) : null;
  if (!sesion) throw new EditorError("No autorizado", 401);

  const s = store ?? (await import("@/src/repositories/accounts")).accountStore;
  const m = await s.getMembershipByUser(sesion.userId);
  if (!m) throw new EditorError("No autorizado", 401);
  return { userId: sesion.userId, orgId: m.orgId, rol: m.rol };
}
