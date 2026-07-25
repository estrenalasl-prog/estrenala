import { EditorError } from "@/src/editor/errors";
import type { StorageAdapter } from "@/src/storage/types";

export const MSG_ULTIMO_OWNER_CUENTA =
  "Eres el único propietario de un espacio con más gente dentro. Pasa la propiedad o quita a los demás antes de borrar tu cuenta.";

// Interfaces estructurales (para testear sin BD).
export interface BorradoCuentaStore {
  listOrgsDeUsuario(userId: string): Promise<{ orgId: string; rol: string }[]>;
  contarPropietarios(orgId: string): Promise<number>;
  contarMiembros(orgId: string): Promise<number>;
  eliminarEspacio(orgId: string): Promise<void>;
  eliminarUsuario(userId: string): Promise<void>;
}
export interface BorradoProyectosDeOrg {
  listProjects(orgId: string): Promise<{ id: string }[]>;
  deleteProjectCascade(orgId: string, projectId: string): Promise<void>;
}

// Borra la cuenta del usuario. Política segura:
//  - espacio con otro propietario → solo se quita su membership (en eliminarUsuario).
//  - único propietario y único miembro → se borra el espacio entero (proyectos +
//    storage + org).
//  - único propietario pero con más miembros → se BLOQUEA todo (no orfanar a nadie).
// Se valida TODO antes de ejecutar: si algún espacio bloquea, no se borra nada.
export async function eliminarCuenta(
  deps: { cuentas: BorradoCuentaStore; proyectos: BorradoProyectosDeOrg; storage: StorageAdapter },
  input: { userId: string }
): Promise<void> {
  const orgs = await deps.cuentas.listOrgsDeUsuario(input.userId);

  // Fase 1: validación (no se toca nada).
  for (const o of orgs) {
    if (o.rol === "owner" && (await deps.cuentas.contarPropietarios(o.orgId)) === 1) {
      if ((await deps.cuentas.contarMiembros(o.orgId)) > 1) {
        throw new EditorError(MSG_ULTIMO_OWNER_CUENTA, 409);
      }
    }
  }

  // Fase 2: ejecución. Los espacios único-propietario-único-miembro se borran enteros.
  for (const o of orgs) {
    const soloDueño = o.rol === "owner" && (await deps.cuentas.contarPropietarios(o.orgId)) === 1;
    if (!soloDueño) continue; // el resto: su membership se quita en eliminarUsuario
    for (const p of await deps.proyectos.listProjects(o.orgId)) {
      await deps.proyectos.deleteProjectCascade(o.orgId, p.id);
      const prefijo = `projects/${p.id}/`;
      try {
        for (const k of await deps.storage.list(prefijo)) {
          try { await deps.storage.delete(k); } catch { /* huérfano inerte */ }
        }
      } catch { /* archivos sueltos no rompen nada */ }
    }
    await deps.cuentas.eliminarEspacio(o.orgId);
  }

  await deps.cuentas.eliminarUsuario(input.userId);
}
