# Incremento 4e — Publicación programada · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** desde el editor de artículos, elegir fecha y hora y que el artículo se publique solo (snapshot + sitio público) en ese momento. Spec: `docs/superpowers/specs/2026-07-16-incremento-4e-publicacion-programada-design.md`.

**Architecture:** tabla `scheduled_posts` con el contenido completo del post; módulo `src/blog/programados/` con `programarPost` (validación completa al programar) y `publicarVencidos` (runner que reclama filas vencidas y ejecuta `guardarPost` + `publishSite`); disparadores: `instrumentation.ts` (tick 60 s en nodejs) y `POST /api/cron/publicar` (con `CRON_SECRET` opcional). Sin dependencias nuevas; cero llamadas a IA/SerpAPI.

## Global Constraints

- Mensajes byte-exactos nuevos: «Elige fecha y hora para programar», «La fecha de publicación debe ser futura», «Programación no encontrada». Reusados de `guardarPost`/`validarPrePublicacion`: longitudes, «Falta el título», «El slug "x" ya existe en este sitio», MSG_SIN_PLANTILLA, «Falta la imagen de portada», etc.
- Programar NO tiene efectos laterales fuera de `scheduled_posts` (la validación renderiza con `basePublica ?? "https://ejemplo.local"`, sin asignar subdominio); publicar (runner) sí: snapshot nuevo + sitio publicado (asigna subdominio si falta, como el Publicar manual).
- El runner reclama con `UPDATE … WHERE estado='pendiente' AND publicar_en <= now() … RETURNING` (dos ticks solapados no publican dos veces); un fallo marca SU fila `error` y sigue con las demás.
- Al terminar cada tarea: `npx vitest run` verde + `npx tsc --noEmit` + commit. Rama `feat/incremento-4e-publicacion-programada`, merge ff a master tras el e2e.
- E2e sin gastar y SIN tocar `org_settings` (claves reales del usuario — guarda del 2026-07-15).

### Task 1: BD — `scheduled_posts` + métodos del store

**Files:** Create `drizzle/manual/2026-07-16-4e-scheduled-posts.sql`; Modify `src/db/schema.ts`, `src/repositories/blog.ts`.

**Interfaces (Produces):**
```ts
export type ProgramadoRow = { id: string; projectId: string; titulo: string; slug: string;
  metaDescripcion: string; md: string; imagenAssetId: string; publicarEn: string; // ISO
  estado: string; // pendiente | publicando | publicado | error
  errorMsg: string | null; postId: string | null; createdAt: string; updatedAt: string };
export type ProgramadoNuevo = Pick<ProgramadoRow, "titulo" | "slug" | "metaDescripcion" | "md" | "imagenAssetId" | "publicarEn">;
// BlogStore + (org-scoped):
crearProgramado(orgId, projectId, input: ProgramadoNuevo): Promise<{ programadoId: string }>;
listProgramados(orgId, projectId): Promise<ProgramadoRow[]>;      // publicarEn asc
borrarProgramado(orgId, projectId, programadoId): Promise<boolean>; // false si no existe
// BlogStore + (globales, para el runner):
reclamarProgramadosVencidos(limite: number): Promise<(ProgramadoRow & { orgId: string })[]>; // pendiente→publicando, RETURNING con org_id del join a projects
resolverProgramado(programadoId: string, r: { estado: "publicado" | "error"; errorMsg?: string | null; postId?: string | null }): Promise<void>;
```

- [ ] SQL `CREATE TABLE IF NOT EXISTS scheduled_posts` (spec) → aplicar con `node scripts/db-apply.mjs` y verificar.
- [ ] Schema drizzle + métodos (guard `proyectoDeOrg` en los org-scoped; timestamps → ISO). El reclamo: `db.update(...).set({ estado: "publicando" }).where(and(eq(estado,'pendiente'), lte(publicarEn, new Date()))).returning()` + lookup de `org_id` (o subquery); si drizzle no permite LIMIT en update, reclamar ids con select y actualizar `where inArray(id) and estado='pendiente'` devolviendo solo las realmente reclamadas.
- [ ] Commit: `feat(4e): tabla scheduled_posts + metodos del store (SQL aplicado)`

### Task 2: `programarPost` (TDD)

**Files:** Create `src/blog/programados/index.ts`, `src/tests/programados.test.ts`; Modify `src/blog/apply.ts` (exportar helpers si hace falta factorizar).

**Interfaces:** `programarPost(deps: { store: ProjectStore; blog: BlogStore; storage: StorageAdapter }, input: { orgId; projectId; titulo; slug; metaDescripcion; md; imagenAssetId; publicarEn: string }): Promise<{ programadoId: string }>`.

- [ ] Tests primero (fakes en memoria, patrón radar/apply): crea la fila con todos los campos; fecha vacía/no parseable → 400 «Elige fecha y hora para programar»; fecha pasada → 400 «La fecha de publicación debe ser futura»; sin plantilla → 400 MSG_SIN_PLANTILLA; sin imagen válida → 400 con «Falta la imagen de portada»; slug ya en posts → 400 «El slug "x" ya existe en este sitio»; slug ya en OTRA programación pendiente → mismo 400; título >300 → mensaje de guardarPost; nada de lo anterior escribe fila.
- [ ] Implementar: longitudes (mismos límites/mensajes que `guardarPost`) → contexto (proyecto, plantilla) → fecha (parse ISO, > now) → imagen (mismo resolutor: asset + ext por contentType) → `renderPost` con `basePublica ?? "https://ejemplo.local"` → `validarPrePublicacion` con `slugsExistentes` = posts + programados `pendiente|publicando` → `crearProgramado`.
- [ ] Commit: `feat(4e): programarPost - validacion completa al programar, no a las 3 AM`

### Task 3: runner `publicarVencidos` (TDD)

**Files:** Modify `src/blog/programados/index.ts`, `src/tests/programados.test.ts`.

**Interfaces:** `publicarVencidos(deps: { store; blog; storage; deploy: DeployTarget }): Promise<{ publicados: number; errores: number }>`.

- [ ] Tests: publica las vencidas (crea post con el contenido de la fila + `publishSite` llamado) y resuelve `publicado` con `postId`; las futuras ni se tocan; una que falla (p. ej. slug duplicado surgido después) → su fila `error` con mensaje y las demás siguen; segunda llamada inmediata no re-publica (el fake de reclamar respeta estado).
- [ ] Implementar: `reclamarProgramadosVencidos(10)`; por fila `guardarPost({store,blog,storage}, { …fila, postId: null })` → `publishSite({store, deploy}, { orgId, projectId })` → `resolverProgramado(id, { estado:"publicado", postId })`; catch → `resolverProgramado(id, { estado:"error", errorMsg })`. Devuelve contadores.
- [ ] Commit: `feat(4e): publicarVencidos - reclama, materializa el post y publica el sitio`

### Task 4: Rutas API

**Files:** Create `app/api/projects/[id]/blog/programados/route.ts`, `…/programados/[progId]/route.ts`, `app/api/cron/publicar/route.ts`; Modify `.env.example`.

- [ ] `programados` GET → 200 lista (id, titulo, slug, publicarEn, estado, errorMsg, postId; md/meta/imagen también para «Editar» en la UI). POST `{ …campos, publicarEn, borradorId? }` → `programarPost`; si `borradorId` llega y todo fue bien, `deleteDraft` (mismo patrón que el guardado del editor); 201 `{ programadoId }`.
- [ ] `programados/[progId]` DELETE → `borrarProgramado`; false → 404 «Programación no encontrada»; → 200 `{ ok: true }`.
- [ ] `cron/publicar` POST (SIN candado de org): si `process.env.CRON_SECRET` y el header `authorization` no es `Bearer <secret>` → 401 `{ error: "No autorizado" }`; si no → `publicarVencidos` → 200 `{ publicados, errores }`.
- [ ] `.env.example`: `# CRON_SECRET=` comentado con nota.
- [ ] Commit: `feat(4e): API de programados + endpoint cron de publicacion`

### Task 5: `instrumentation.ts`

**Files:** Create `instrumentation.ts` (raíz).

- [ ] `register()`: solo `NEXT_RUNTIME === "nodejs"`; guarda `globalThis` contra el hot reload; primer tick a los 15 s y luego cada 60 s; cada tick hace `import()` dinámico del runner + deps y `try/catch` con `console.error` (un tick roto no tumba el server). 
- [ ] Probar en dev: programar con fecha a +1 min y ver el post aparecer solo (log del tick).
- [ ] Commit: `feat(4e): tick de publicacion cada 60 s al arrancar el servidor`

### Task 6: UI — programar desde el editor + bloque «Programados»

**Files:** Modify `app/projects/[id]/BlogPanel.tsx`.

- [ ] Editor: bajo Guardar, fila «Programar publicación»: `input type="datetime-local"` + botón «Programar» (deshabilitado sin fecha). POST programados (`new Date(valor).toISOString()`); con `borradorId` del handoff se envía para que el server borre el borrador. Éxito → vista lista + aviso «Artículo programado para el {toLocaleString()}».
- [ ] Lista: bloque «Programados» (GET al cargar, solo si hay filas): título · fecha/hora local · badge (⏳ pendiente / ✓ publicado / ⚠ error + errorMsg). Acciones: pendiente|error → «Editar» (carga campos en el editor y DELETE de la fila) · publicado → «Ocultar» (DELETE). Refresco tras publicar: al volver a la lista se recarga junto con posts/borradores.
- [ ] Errores visibles (patrón actual). `npx tsc` + suite.
- [ ] Commit: `feat(4e): programar publicacion desde el editor + lista de programados`

### Task 7: E2e sin gastar + merge

- [ ] `e2e-4e.mjs` (scratchpad, patrón 4c/4d; NO toca org_settings): proyecto nuevo + plantilla + asset png por API → POST programados fecha futura → 201 y GET lo lista `pendiente`; validaciones 400 byte-exactas (sin fecha, fecha pasada, sin título, slug duplicado); SQL fuerza `publicar_en` al pasado → POST `/api/cron/publicar` → `{ publicados: 1 }`; el post existe en GET posts, el proyecto quedó publicado, la fila quedó `publicado` con `postId`; DELETE fila → ok; DELETE repetido → 404.
- [ ] Dev server + e2e PASS + suite completa + tsc + merge ff a master + actualizar memoria (estado del proyecto).

## Self-review

- Programar valida TODO lo que validaría publicar (menos lo que puede cambiar entre medias, que el runner revalida vía `guardarPost`): el usuario se entera de los problemas al programar, no cuando ya no está delante.
- El reclamo pendiente→publicando hace el runner idempotente frente a ticks solapados (instrumentation + cron externo a la vez).
- El contenido nunca se pierde: vive en la fila hasta que hay post (`publicado`) o el usuario lo recupera («Editar» carga y borra).
- Cero IA/SerpAPI en todo el incremento; el e2e no toca claves reales.
