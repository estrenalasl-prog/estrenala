# Incremento 9 — Zona de peligro (eliminar proyecto y eliminar cuenta)

Fecha: 2026-07-25. Estado: diseño.

Borrados irreversibles con confirmación en dos pasos (escribir para confirmar).
El esquema usa `references()` **sin `onDelete cascade`** → hay que borrar los hijos
en orden dentro de una transacción y limpiar el storage aparte.

## Eliminar proyecto

**Quién:** solo el **propietario** (`exigirOwner`). Un editor no borra webs.

**Dominio** `src/projects/eliminar.ts`:
- `BorradoProyectoStore` (interfaz estructural): `getProject`, `deleteProjectCascade`.
- `eliminarProyecto(deps{store,storage}, {orgId, projectId})`:
  1. `getProject` (scoped a la org) → 404 si no existe.
  2. `deleteProjectCascade` (BD, transacción) — PRIMERO la BD: si luego falla el
     storage solo quedan archivos huérfanos (inertes), nunca filas que apunten a
     archivos ausentes.
  3. Borra el storage bajo `projects/{projectId}/` (best-effort: fallos → se ignoran,
     solo dejan archivos sueltos).

**Store concreto** `DrizzleProjectStore.deleteProjectCascade(orgId, projectId)`
(fuera del interfaz `ProjectStore`, como `getProjectById`): transacción que borra en
orden `posts → scheduled_posts → trends_cache → blog_keywords → article_drafts →
blog_settings → blog_templates → assets → snapshots → projects` (project scoped a org).

**Ruta:** `DELETE /api/projects/[id]` (se añade al route existente). owner-only.

## Eliminar cuenta

**Política (segura, sin huérfanos ni sorpresas a terceros):** para cada espacio del
usuario:
- Si NO es el único propietario (hay otro owner) → solo se quita su membership.
- Si es el **único propietario**:
  - y es el **único miembro** → se borra el espacio ENTERO (sus proyectos + storage +
    org_settings + memberships + la org).
  - y hay **más miembros** → se **BLOQUEA** todo el borrado con
    `MSG_ULTIMO_OWNER_CUENTA` (que pase la propiedad o quite a la gente primero). No se
    borra nada (validación ANTES de ejecutar).

**Dominio** `src/auth/eliminar-cuenta.ts`:
- `BorradoCuentaStore`: `listOrgsDeUsuario`, `contarPropietarios`, `contarMiembros`,
  `eliminarEspacio`, `eliminarUsuario`.
- `eliminarCuenta(deps{cuentas, proyectos{listProjects,deleteProjectCascade}, storage}, {userId})`:
  1. Valida TODOS los espacios (si alguno bloquea, no se toca nada).
  2. Por cada espacio único-propietario-único-miembro: borra sus proyectos
     (BD+storage, reutiliza `deleteProjectCascade`) y `eliminarEspacio(orgId)`.
  3. `eliminarUsuario(userId)` — borra sus memberships restantes (espacios con más
     owners), sus `auth_tokens` y el usuario.

**Store concreto** `DrizzleAccountStore`:
- `contarMiembros(orgId)`.
- `eliminarEspacio(orgId)`: transacción `org_settings → memberships → organizations`
  (los proyectos ya se borraron antes en el dominio).
- `eliminarUsuario(userId)`: transacción `memberships(userId) → auth_tokens(userId) → users`.

**Ruta:** `DELETE /api/cuenta` → `eliminarCuenta` + **cierra sesión** (caduca
`wc_session` y `wc_org`).

## UI
- **Proyecto** (`app/projects/[id]/`): tarjeta «Zona de peligro» con botón que abre
  confirmación en dos pasos (escribir el nombre del proyecto). Solo visible/efectiva
  para propietario (el 403 del servidor es la barrera real). Tras borrar → a `/`.
- **Settings** (`app/settings/page.tsx`): la sección `#peligro` deja de ser
  «Próximamente»; «Eliminar mi cuenta» con confirmación (escribir el email). Tras
  borrar → a `/login`.

## Mensajes byte-exactos (fijados por tests)
- `MSG_ULTIMO_OWNER_CUENTA` = "Eres el único propietario de un espacio con más gente dentro. Pasa la propiedad o quita a los demás antes de borrar tu cuenta."
- Proyecto no encontrado → "Proyecto no encontrado" (404). owner-only → `MSG_SOLO_OWNER` (403).

## Tests
- `eliminar-proyecto.test.ts`: 404 si no existe; borra storage del prefijo y llama
  `deleteProjectCascade`; el orden BD-antes-que-storage.
- `eliminar-cuenta.test.ts`: usuario solo (un espacio, único miembro) → borra proyectos
  + espacio + usuario; editor en un espacio → solo se va (no borra el espacio); único
  owner con más miembros → lanza `MSG_ULTIMO_OWNER_CUENTA` y NO borra nada; varios
  espacios mezclados.
- e2e-9: usuario **desechable** (NO el `e2e@wordclicks.local` compartido) para no
  romper otros e2e; crea proyecto → DELETE → 404 + storage vacío; luego crea cuenta
  aparte, la borra y comprueba que ya no puede iniciar sesión. Nunca toca la org de dev.

## Fuera de alcance (apuntado)
- Transferir propiedad de un espacio (desbloquearía el borrado de cuenta con equipo).
- Exportar los datos antes de borrar.
