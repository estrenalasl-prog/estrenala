# Incremento 4b — Redacción de artículos con IA · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El usuario escribe una keyword y el pipeline editorial de 6 etapas (análisis → plan → investigación web → redacción → enlaces internos → metadatos) genera el borrador del artículo con IA; al llegar a `revision`, el editor de artículos del 4a se pre-rellena y el usuario sube la portada y guarda (flujo 4a intacto). Spec: `docs/superpowers/specs/2026-07-08-incremento-4b-redaccion-ia-design.md`.

**Architecture:** Tabla nueva `article_drafts` (borrador con artefactos por etapa y estado `pipeline|revision|error`) + `blog_settings` (nicho/idioma por proyecto), ambas tras `BlogStore` (org-scoped). Port casi verbatim de las 6 etapas de `Creador de Blog/src/services/pipeline/` a `src/blog/pipeline/` (Drizzle/Postgres asíncrono, `sitio` → `Contexto` del proyecto). El cliente `src/ia/claude.ts` gana `pedirTexto`/`pedirConBusquedaWeb` + `AnalisisSchema`/`MetadatosSchema`. Rutas API finas patrón 4a. UI: `ArticleAiWorkspace.tsx` + ampliación de `BlogPanel.tsx`.

**Tech Stack:** Next.js 16 App Router, TS strict, Drizzle/Postgres (Supabase pooler), vitest, OpenRouter (plugin `web` para investigación). **Sin dependencias nuevas.**

## Global Constraints

- Mensajes de error **byte-exactos** (nuevos del 4b): «Escribe una keyword o tema para el artículo», «Configura primero de qué va tu blog (campo Nicho)», «Borrador no encontrado», «Etapa desconocida», «Antes hay que completar la etapa "<previa>"», «La keyword es demasiado larga (máx. 200 caracteres)», «La instrucción es demasiado larga (máx. 1000 caracteres)», «El nicho es demasiado largo (máx. 2000 caracteres)», «No se pudo generar un slug válido a partir del título; reintenta la etapa de metadatos». Se reutilizan del 4a: «Proyecto no encontrado», «Error interno».
- Origen del porte: `Creador de Blog/` (copia dentro del repo, ignorada por git). Leer los archivos ahí; NO reescribir de memoria. Los prompts de las etapas se conservan **verbatim** salvo el mapeo `sitio.nombre/nicho/idioma/dominio` → `ctx.nombre/nicho/idioma/base`, `post.keywordTexto` → `draft.keyword` y las consultas SQLite→`blog.listPosts`.
- La clave OpenRouter solo en servidor; el error 402 (sin saldo) ya llega claro vía `OpenRouterError` del 4a.
- `article_drafts` NO toca `posts` ni los snapshots: el borrador solo entra al sitio por el flujo «Guardar artículo» del 4a. Tras guardar OK, el cliente hace DELETE del borrador.
- Rutas nuevas bajo `/api/projects/*` → cubiertas por el candado del middleware. Org-scoping por join con `projects` en `BlogStore` (patrón 4a).
- DDL: SQL manual con `scripts/db-apply.mjs` (drizzle-kit push sigue roto upstream).
- Al terminar cada tarea: `npx vitest run` verde + `npx tsc --noEmit` limpio + commit.
- Rama de trabajo: `feat/incremento-4b-redaccion-ia`; merge a master tras el e2e (patrón 4a).

---

### Task 1: Cliente IA — `pedirTexto`, `pedirConBusquedaWeb`, `AnalisisSchema`, `MetadatosSchema`

**Files:**
- Modify: `src/ia/claude.ts`
- Test: `src/tests/ia-claude.test.ts` (ampliar)

**Interfaces (Produces):**
```ts
export const AnalisisSchema: z.ZodObject<…>; // { keyword_principal: string, keywords_secundarias: string[], intencion_busqueda: string }
export type Analisis = z.infer<typeof AnalisisSchema>;
export const MetadatosSchema: z.ZodObject<…>; // { titulo: string, slug: string, meta_descripcion: string }
export type Metadatos = z.infer<typeof MetadatosSchema>;
export function pedirTexto(prompt: string, maxTokens?: number): Promise<string>;          // default 8000
export function pedirConBusquedaWeb(prompt: string, maxTokens?: number, maxBusquedas?: number): Promise<string>; // 8000, 6
```

- [ ] **Step 1 (tests primero):** ampliar `src/tests/ia-claude.test.ts`:
  - `AnalisisSchema` acepta un análisis válido / `MetadatosSchema` rechaza campos ausentes (port de `Creador de Blog/src/tests/claude.test.ts`, sin `RelevanciaSchema` que no se porta).
  - `pedirTexto`: con `fetch` mockeado (mismo helper `respuesta()` del describe de `pedirJson`), devuelve el contenido y el body NO lleva `response_format` ni `plugins`.
  - `pedirConBusquedaWeb`: el body lleva `plugins: [{ id: "web", max_results: 6 }]` (default) y respeta `maxBusquedas` explícito.
  Correr → FALLA.
- [ ] **Step 2:** implementar en `src/ia/claude.ts` (port verbatim de `Creador de Blog/src/services/claude.ts`; `completar` ya existe con `OpenRouterError`):

```ts
export const AnalisisSchema = z.object({
  keyword_principal: z.string(),
  keywords_secundarias: z.array(z.string()),
  intencion_busqueda: z.string(),
});
export type Analisis = z.infer<typeof AnalisisSchema>;

export const MetadatosSchema = z.object({
  titulo: z.string(),
  slug: z.string(),
  meta_descripcion: z.string(),
});
export type Metadatos = z.infer<typeof MetadatosSchema>;

export async function pedirTexto(prompt: string, maxTokens = 8000): Promise<string> {
  const messages: Mensaje[] = [{ role: "user", content: prompt }];
  return completar({ max_tokens: maxTokens, messages });
}

// Investigación con búsqueda web. OpenRouter añade resultados de búsqueda
// vía el plugin "web" (Exa) al contexto del modelo.
export async function pedirConBusquedaWeb(
  prompt: string,
  maxTokens = 8000,
  maxBusquedas = 6
): Promise<string> {
  const messages: Mensaje[] = [{ role: "user", content: prompt }];
  return completar({
    max_tokens: maxTokens,
    messages,
    plugins: [{ id: "web", max_results: maxBusquedas }],
  });
}
```

- [ ] **Step 3:** `npx vitest run` verde + `npx tsc --noEmit`.
- [ ] **Step 4:** Commit: `feat(4b): pedirTexto y pedirConBusquedaWeb + schemas de análisis y metadatos`

---

### Task 2: BD — `article_drafts`, `blog_settings` y `BlogStore` ampliado

**Files:**
- Modify: `src/db/schema.ts`, `src/repositories/blog.ts`
- Create: `drizzle/manual/2026-07-10-4b-drafts.sql`

**Interfaces (Produces):**
```ts
export type DraftRow = {
  id: string; projectId: string; keyword: string;
  analisisJson: string | null; planMd: string | null; investigacionMd: string | null; articuloMd: string | null;
  linksHechos: number;
  titulo: string | null; slug: string | null; metaDescripcion: string | null;
  estado: string;            // pipeline | revision | error
  errorMsg: string | null;
  createdAt: string; updatedAt: string;
};
export type DraftPatch = Partial<Pick<DraftRow,
  "analisisJson" | "planMd" | "investigacionMd" | "articuloMd" | "linksHechos" |
  "titulo" | "slug" | "metaDescripcion" | "estado" | "errorMsg">>;
export type BlogSettings = { nicho: string; idioma: string };

export interface BlogStore {
  // …lo del 4a, más:
  getBlogSettings(orgId: string, projectId: string): Promise<BlogSettings | null>;
  setBlogSettings(orgId: string, projectId: string, s: BlogSettings): Promise<void>; // upsert
  createDraft(orgId: string, projectId: string, keyword: string): Promise<{ draftId: string }>;
  getDraft(orgId: string, projectId: string, draftId: string): Promise<DraftRow | null>;
  listDrafts(orgId: string, projectId: string): Promise<DraftRow[]>; // createdAt desc
  updateDraft(orgId: string, projectId: string, draftId: string, patch: DraftPatch): Promise<void>;
  deleteDraft(orgId: string, projectId: string, draftId: string): Promise<void>;
}
```

- [ ] **Step 1:** añadir a `src/db/schema.ts`:

```ts
export const blogSettings = pgTable("blog_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().unique().references(() => projects.id),
  nicho: text("nicho").notNull().default(""),
  idioma: text("idioma").notNull().default("es"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const articleDrafts = pgTable("article_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  keyword: text("keyword").notNull(),
  analisisJson: text("analisis_json"),
  planMd: text("plan_md"),
  investigacionMd: text("investigacion_md"),
  articuloMd: text("articulo_md"),
  linksHechos: integer("links_hechos").notNull().default(0),
  titulo: text("titulo"),
  slug: text("slug"),
  metaDescripcion: text("meta_descripcion"),
  estado: text("estado").notNull().default("pipeline"), // pipeline | revision | error
  errorMsg: text("error_msg"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2:** crear `drizzle/manual/2026-07-10-4b-drafts.sql` (mismo DDL con `CREATE TABLE IF NOT EXISTS`, tipos `uuid/text/integer/timestamptz`, defaults idénticos) y aplicarlo: `node scripts/db-apply.mjs drizzle/manual/2026-07-10-4b-drafts.sql` → «Aplicado: …». Verificar con un `select count(*)` de ambas tablas (devuelve 0).
- [ ] **Step 3:** ampliar `src/repositories/blog.ts` con los tipos y métodos de arriba. Todos con el guard `proyectoDeOrg` existente; `toDraftRow` mapea timestamps a ISO (patrón `toPostRow`); `setBlogSettings` con `.onConflictDoUpdate({ target: blogSettings.projectId, … updatedAt: new Date() })`; `updateDraft` set `updatedAt: new Date()`; `listDrafts` con `orderBy(desc(articleDrafts.createdAt))`; `createDraft` lanza «Proyecto no encontrado en la organización» si no es de la org (patrón `createPost`).
- [ ] **Step 4:** `npx vitest run` + `npx tsc --noEmit` (el store se ejercita en e2e, patrón 4a).
- [ ] **Step 5:** Commit: `feat(4b): tablas article_drafts y blog_settings + BlogStore ampliado (SQL aplicado)`

---

### Task 3: Pipeline de 6 etapas (`src/blog/pipeline/`)

**Files:**
- Modify: `src/blog/apply.ts` (exportar `sitesBaseDomain`)
- Create: `src/blog/pipeline/tipos.ts`, `analisis.ts`, `plan.ts`, `investigacion.ts`, `redaccion.ts`, `links.ts`, `metadatos.ts`, `index.ts`
- Test: `src/tests/blog-pipeline.test.ts`

**Interfaces (Produces):**
```ts
// tipos.ts
export const ETAPAS = ["analisis", "plan", "investigacion", "redaccion", "links", "metadatos"] as const;
export type Etapa = (typeof ETAPAS)[number];
export type Contexto = { nombre: string; nicho: string; idioma: string; base: string };
export type DepsPipeline = { store: ProjectStore; blog: BlogStore; orgId: string; projectId: string };
export type FnEtapa = (draft: DraftRow, ctx: Contexto, deps: DepsPipeline, instruccion?: string) => Promise<DraftPatch>;
// index.ts
export function etapaCompletada(draft: DraftRow, etapa: Etapa): boolean;
export function siguienteEtapa(draft: DraftRow): Etapa | null;
export function ejecutarEtapa(deps: DepsPipeline, draftId: string, etapa: Etapa, instruccion?: string):
  Promise<{ ok: true } | { ok: false; error: string }>;
```

- [ ] **Step 1:** exportar `sitesBaseDomain` en `src/blog/apply.ts` (añadir `export` delante; el pipeline la usa para `ctx.base`).
- [ ] **Step 2 (tests primero):** `src/tests/blog-pipeline.test.ts` con `vi.mock("@/src/ia/claude")` (mockear `pedirTexto`, `pedirJson`, `pedirConBusquedaWeb`) y fakes en memoria de `BlogStore` (drafts en un `Map`, `listPosts` configurable) y `ProjectStore` (`getProject` devuelve `{ nombre: "Quantiva", subdominio: "quantiva", dominio: null, … }`). Casos (adaptación de `Creador de Blog/src/tests/pipeline.test.ts` + spec):
  - `siguienteEtapa` avanza en orden según artefactos; `ETAPAS` define el orden completo del spec.
  - `ejecutarEtapa` analisis guarda el JSON validado; el prompt contiene la keyword y el nicho.
  - Prerrequisitos: `redaccion` sin `analisis` → rechaza con `Antes hay que completar la etapa "analisis"` (EditorError 400).
  - Borrador inexistente → EditorError 404 «Borrador no encontrado».
  - Etapa que falla → `{ ok: false }`, `estado="error"`, `errorMsg` con `[analisis] …`; checkpoints previos intactos.
  - Reintentar tras error limpia `errorMsg` y vuelve a `pipeline`.
  - `plan` incluye los títulos ya guardados en el prompt (y no los pide si no hay posts).
  - `links` sin posts previos → `linksHechos: 1` sin llamar a la IA; con posts → el prompt lleva `base/blog/<slug>.html`.
  - `metadatos` deduplica slug contra los existentes (`slugUnico` → `-2`) y al completar pasa el draft a `revision`.
  - `instruccion` llega al prompt («Instrucción adicional del editor»).
  Correr → FALLA.
- [ ] **Step 3:** implementar. `tipos.ts` como arriba. Etapas: port de `Creador de Blog/src/services/pipeline/*.ts` con el mapeo de Global Constraints; firma `FnEtapa` nueva. Ejemplo (analisis, patrón para todas):

```ts
import { pedirJson, AnalisisSchema } from "@/src/ia/claude";
import type { FnEtapa } from "./tipos";

export const etapaAnalisis: FnEtapa = async (draft, ctx, _deps, instruccion) => {
  const prompt = `Eres un analista SEO experto en contenido estratégico.
Sitio: ${ctx.nombre}${ctx.base ? ` (${ctx.base})` : ""}. Nicho: ${ctx.nicho}. Idioma del blog: ${ctx.idioma}.
Keyword elegida (está en tendencia ahora mismo): "${draft.keyword}"
…resto del prompt VERBATIM del original…`;
  const analisis = await pedirJson(prompt, AnalisisSchema, 2000);
  return { analisisJson: JSON.stringify(analisis) };
};
```

  - `plan.ts`: `previos = await deps.blog.listPosts(deps.orgId, deps.projectId)` → títulos; `pedirTexto(prompt, 3000)` → `{ planMd }`.
  - `investigacion.ts`: `pedirConBusquedaWeb(prompt, 8000)` → `{ investigacionMd }`.
  - `redaccion.ts`: `pedirTexto(prompt, 16000)` → `{ articuloMd }`.
  - `links.ts`: publicados = `listPosts`; si 0 → `{ linksHechos: 1 }` (sin IA); lista `- "titulo" → ${ctx.base}/blog/${slug}.html`; `pedirTexto(prompt, 16000)` → `{ articuloMd, linksHechos: 1 }`.
  - `metadatos.ts`: `pedirJson(prompt, MetadatosSchema, 1500)`; `slugUnico(slugify(meta.slug), existentes)` con los slugs de `listPosts`; si vacío → `throw new Error("No se pudo generar un slug válido a partir del título; reintenta la etapa de metadatos")`; → `{ titulo, slug, metaDescripcion }`.
  - `index.ts` (orquestador, port de `ejecutarEtapa` en async/Postgres):

```ts
export async function ejecutarEtapa(deps: DepsPipeline, draftId: string, etapa: Etapa, instruccion?: string) {
  const draft = await deps.blog.getDraft(deps.orgId, deps.projectId, draftId);
  if (!draft) throw new EditorError("Borrador no encontrado", 404);
  const project = await deps.store.getProject(deps.orgId, deps.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const settings = await deps.blog.getBlogSettings(deps.orgId, deps.projectId);
  const ctx: Contexto = {
    nombre: project.nombre,
    nicho: settings?.nicho ?? "",
    idioma: settings?.idioma ?? "es",
    base: basePublica(project, sitesBaseDomain()) ?? "",
  };
  const idx = ETAPAS.indexOf(etapa);
  for (const previa of ETAPAS.slice(0, idx)) {
    if (!etapaCompletada(draft, previa)) {
      throw new EditorError(`Antes hay que completar la etapa "${previa}"`, 400);
    }
  }
  try {
    const cambios = await FUNCIONES[etapa](draft, ctx, deps, instruccion);
    await deps.blog.updateDraft(deps.orgId, deps.projectId, draftId, { ...cambios, errorMsg: null, estado: "pipeline" });
    const actualizado = await deps.blog.getDraft(deps.orgId, deps.projectId, draftId);
    if (actualizado && siguienteEtapa(actualizado) === null) {
      await deps.blog.updateDraft(deps.orgId, deps.projectId, draftId, { estado: "revision" });
    }
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await deps.blog.updateDraft(deps.orgId, deps.projectId, draftId, { estado: "error", errorMsg: `[${etapa}] ${msg}` });
    return { ok: false as const, error: msg };
  }
}
```

  `etapaCompletada`: analisis=`!!analisisJson`, plan=`!!planMd`, investigacion=`!!investigacionMd`, redaccion=`!!articuloMd`, links=`linksHechos === 1`, metadatos=`!!(titulo && slug && metaDescripcion)`.
- [ ] **Step 4:** `npx vitest run` verde + `npx tsc --noEmit`.
- [ ] **Step 5:** Commit: `feat(4b): pipeline editorial de 6 etapas portado (orquestador + prompts verbatim)`

---

### Task 4: Rutas API de borradores y settings

**Files:**
- Create: `app/api/projects/[id]/blog/settings/route.ts`, `app/api/projects/[id]/blog/drafts/route.ts`, `app/api/projects/[id]/blog/drafts/[draftId]/route.ts`, `app/api/projects/[id]/blog/drafts/[draftId]/stage/route.ts`

**Interfaces:** wiring idéntico al 4a (`getDevContext`, `projectStore`, `blogStore`, `conError` con `EditorError`→status / 500 «Error interno», `export const runtime = "nodejs"`). Deps del pipeline: `{ store: projectStore, blog: blogStore, orgId, projectId: id }`.

| Ruta | Métodos |
|---|---|
| `blog/settings` | GET → 200 `{ nicho, idioma }` (defaults `{ nicho: "", idioma: "es" }` si no hay fila; 404 «Proyecto no encontrado» si el proyecto no existe) · PUT `{ nicho, idioma? }` → 200 `{ ok: true }` (upsert; nicho > 2000 → 400; idioma ausente conserva el previo o `es`) |
| `blog/drafts` | GET → 200 `[{ id, keyword, estado, titulo, createdAt }]` · POST `{ keyword }` → 201 `{ draftId }` (keyword vacía tras trim → 400 «Escribe una keyword o tema para el artículo»; > 200 → 400 «La keyword es demasiado larga (máx. 200 caracteres)»; `blog_settings.nicho` vacío → 400 «Configura primero de qué va tu blog (campo Nicho)») |
| `blog/drafts/[draftId]` | GET → 200 `{ draft, etapas: [{ nombre, completada }], siguiente }` (404 «Borrador no encontrado») · DELETE → 200 `{ ok: true }` (404 si no existe) |
| `blog/drafts/[draftId]/stage` | POST `{ etapa, instruccion? }` → 200 `{ ok: true }` o 500 `{ ok: false, error }` (400 «Etapa desconocida» si no está en `ETAPAS`; instruccion > 1000 → 400; 404 «Borrador no encontrado»; prerrequisito → 400) |

- [ ] **Step 1:** `settings/route.ts` — GET valida proyecto con `projectStore.getProject` (404) y devuelve settings o defaults; PUT valida y hace upsert conservando el idioma previo si no llega.
- [ ] **Step 2:** `drafts/route.ts` — GET mapea `listDrafts` a la vista de lista; POST valida keyword y nicho y crea el borrador.
- [ ] **Step 3:** `drafts/[draftId]/route.ts` — GET compone `etapas` con `etapaCompletada` y `siguiente` con `siguienteEtapa`; DELETE borra (404 si `getDraft` da null).
- [ ] **Step 4:** `drafts/[draftId]/stage/route.ts` — valida `etapa` contra `ETAPAS` e `instruccion`; llama a `ejecutarEtapa`; `{ ok: true }` → 200, `{ ok: false, error }` → 500 (los EditorError del orquestador van por `conError`).
- [ ] **Step 5:** `npx tsc --noEmit` + `npx vitest run` (lógica testada en Task 3; circuito HTTP en e2e, patrón del proyecto).
- [ ] **Step 6:** Commit: `feat(4b): API de settings del blog y borradores IA (crear, estado, etapa, borrar)`

---

### Task 5: UI — `ArticleAiWorkspace` + ampliación de `BlogPanel`

**Files:**
- Create: `app/projects/[id]/ArticleAiWorkspace.tsx`
- Modify: `app/projects/[id]/BlogPanel.tsx`

**Interfaces:**
- Consumes: API de Task 4 + flujo 4a existente (editor de artículo, `POST/PUT blog/posts`, assets).
- Reglas del patrón: subcomponentes a NIVEL DE MÓDULO (regla de foco), «Error de conexión» en fallos de red, `router.refresh()` tras guardar.

```tsx
export type DraftDetalle = {
  draft: { id: string; keyword: string; estado: string; errorMsg: string | null;
    analisisJson: string | null; planMd: string | null; investigacionMd: string | null; articuloMd: string | null;
    linksHechos: number; titulo: string | null; slug: string | null; metaDescripcion: string | null };
  etapas: { nombre: string; completada: boolean }[];
  siguiente: string | null;
};
export function ArticleAiWorkspace(props: {
  projectId: string; draftId: string;
  onUsar: (d: DraftDetalle) => void;  // borrador en revision → pre-rellenar editor 4a
  onSalir: () => void;                 // volver a la lista
}): JSX.Element;
```

- [ ] **Step 1:** `ArticleAiWorkspace.tsx` (client):
  - Carga `GET drafts/[draftId]` al montar y tras cada acción. Estado: `detalle`, `ocupado`, `auto` (bucle en marcha), `error`, `instruccion` (por etapa), desplegables abiertos.
  - Nombres legibles de etapa: analisis «Análisis SEO», plan «Plan del artículo», investigacion «Investigación web», redaccion «Redacción», links «Enlaces internos», metadatos «Metadatos SEO».
  - Cada etapa: icono (✅ completada / ⏳ en curso / ○ pendiente), botón «▶ Ejecutar» solo en la siguiente, «↻ Regenerar» + input de instrucción opcional en las completadas, desplegable con el artefacto (`<pre>` con el md/JSON legible).
  - «⏩ Auto hasta revisión» con `confirm()` avisando de que encadena llamadas de IA con coste; bucle: mientras haya `siguiente` y no se pulse «⏹ Detener» → POST stage → recargar; para en `revision` o en el primer error.
  - `estado === "error"` → `draft.errorMsg` visible en rojo + reintento (el botón Ejecutar de la etapa fallida).
  - `estado === "revision"` → aviso verde + botón «Usar este borrador» → `props.onUsar(detalle)`.
  - Nota fija: regenerar una etapa intermedia NO rehace las posteriores (el usuario decide qué regenerar).
- [ ] **Step 2:** ampliar `BlogPanel.tsx` (el 4a queda intacto):
  - `type Vista = "lista" | "plantillas" | "editor" | "ia"`.
  - En la vista lista (cuando hay plantilla): bloque **Config**: textarea «De qué va tu blog» (nicho, cargado de `GET blog/settings` al abrir) + botón «Guardar» (PUT). Botón **«Escribir artículo con IA»** → input de keyword + «Crear borrador» → `POST blog/drafts` → abre vista `ia` con el draftId. Lista de **borradores en curso** (`GET blog/drafts`): keyword + estado legible (pipeline «⏳ en marcha», revision «✅ para revisar», error «⚠ error») + abrir/borrar.
  - Vista `ia`: `<ArticleAiWorkspace projectId draftId onSalir={volver a lista y recargar borradores} onUsar={usarBorrador} />`.
  - `usarBorrador(det)`: pre-rellena el editor 4a (`setPostId(null)`, `titulo/slug/meta/md` del draft, `slugTocado=true`, imagen vacía) + guarda `draftOrigenId` y pasa a vista `editor`. El usuario sube la portada y pulsa «Guardar artículo» (flujo 4a).
  - En `guardarArticulo`, tras éxito: si hay `draftOrigenId` → `DELETE blog/drafts/<id>` (silencioso si falla: el borrador queda en la lista) y limpiar.
- [ ] **Step 3:** `npx tsc --noEmit` + `npx vitest run`; arrancar `npm run dev` y comprobar a mano que la sección aparece (login `dev1234`).
- [ ] **Step 4:** Commit: `feat(4b): ArticleAiWorkspace y BlogPanel — nicho, borradores IA y handoff al editor`

---

### Task 6: E2e sin IA + verificación final

**Files:**
- Create: `<scratchpad>/e2e-4b.mjs` (fuera del repo, patrón e2e-4a)

**Interfaces:** dev server (`npm run dev`) + Supabase real. Sin gastar IA: los artefactos de etapa se siembran directamente en BD (cliente `postgres` del propio node_modules + `DATABASE_URL` de `.env.local`). La generación IA real la valida el usuario en navegador.

- [ ] **Step 1:** escribir `e2e-4b.mjs`. Checks (≈18):
  1. Login `dev1234` → cookie; crear proyecto con ZIP mínimo (`index.html`).
  2. `GET blog/settings` → `{ nicho: "", idioma: "es" }` (defaults sin fila).
  3. `POST blog/drafts` con keyword y SIN nicho → 400 «Configura primero de qué va tu blog (campo Nicho)».
  4. `PUT blog/settings { nicho }` → 200; GET devuelve lo guardado (idioma `es` conservado).
  5. `POST blog/drafts { keyword: "" }` → 400 «Escribe una keyword o tema para el artículo».
  6. `POST blog/drafts { keyword }` → 201 `{ draftId }`; `GET blog/drafts` lo lista con `estado: "pipeline"`.
  7. `GET drafts/[id]` → 6 etapas incompletas, `siguiente: "analisis"`.
  8. `POST stage { etapa: "redaccion" }` → 400 «Antes hay que completar la etapa "analisis"».
  9. `POST stage { etapa: "nada" }` → 400 «Etapa desconocida».
  10. Sembrar en BD los 6 artefactos + `estado='revision'` (UPDATE directo a `article_drafts`).
  11. `GET drafts/[id]` → todas completadas, `siguiente: null`, `estado: "revision"`.
  12. Handoff: PUT plantillas fixture (sin IA) → subir portada PNG 1px → `POST blog/posts` con título/slug/meta/md del borrador → 201; el preview sirve `blog/<slug>.html` con el contenido.
  13. `DELETE drafts/[id]` → 200; `GET blog/drafts` → vacío; segundo DELETE → 404 «Borrador no encontrado».
- [ ] **Step 2:** arrancar dev server, `node e2e-4b.mjs` → TODOS los checks PASS (arreglar lo que falle antes de seguir).
- [ ] **Step 3:** `npx vitest run` (suite entera) + `npx tsc --noEmit` limpios.
- [ ] **Step 4:** Commit de arreglos si los hay + merge a master (ff) como en 4a.

---

## Self-review del plan

- Cobertura del spec 4b: cliente IA (T1), modelo de datos y settings (T2), pipeline verbatim con orquestador y mensajes exactos (T3), API org-scoped tras el candado (T4), UI con workspace/auto/regenerar/handoff sin tocar el flujo de guardado del 4a (T5), e2e sin coste de IA sembrando BD (T6).
- Diferencias deliberadas respecto al pseudocódigo del spec: `DepsPipeline` incluye `orgId/projectId` (el spec no resolvía el org-scoping de las consultas de las etapas); `ctx.base` cae a `""` si el proyecto aún no tiene subdominio/dominio (solo afecta al texto del prompt; los enlaces internos solo se insertan cuando ya hay posts, y entonces siempre hay base).
- El borrador nunca toca snapshots ni `posts`: el único camino al sitio es el «Guardar artículo» del 4a; tras guardar, DELETE del borrador (si el DELETE falla, el borrador queda visible y borrable — caso borde del spec).
