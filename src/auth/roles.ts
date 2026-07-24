import { EditorError } from "@/src/editor/errors";

// Roles dentro de un espacio (organización):
//  - owner  (Propietario): todo, incluida Configuración (claves/equipo/plan) y
//    las acciones destructivas (despublicar, borrar, cambiar dirección).
//  - editor: todo el TRABAJO (editar, blog, publicar, subir assets), pero NO
//    la Configuración del espacio ni lo destructivo.
export type Rol = "owner" | "editor";

export const MSG_SOLO_OWNER = "Solo el propietario del espacio puede hacer esto";

export function esOwner(rol: string): boolean {
  return rol === "owner";
}

// Lanza 403 si el rol no es propietario. Para las rutas owner-only.
export function exigirOwner(rol: string): void {
  if (!esOwner(rol)) throw new EditorError(MSG_SOLO_OWNER, 403);
}
