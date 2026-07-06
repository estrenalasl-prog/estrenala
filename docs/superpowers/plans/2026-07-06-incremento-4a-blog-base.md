# Incremento 4a — Blog base · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Blog por proyecto dentro de Wordclicks: plantillas generadas con IA desde la portada, artículos en markdown renderizados de forma determinista a archivos del snapshot (`blog/*.html`, imagen, `sitemap.xml`), publicados con el circuito existente.

**Architecture:** Se portan las libs deterministas de `c:/Users/Sebas/Desktop/Carpeta de Proyectos/Creador de Blog/` a `src/blog/`; una tabla `posts` + `blog_templates` (fuente de verdad) se proyecta a archivos vía `crearSnapshotEditado` (extendido con `excluir` y `tipo`); rutas API finas sobre `src/blog/apply.ts`; panel `BlogPanel.tsx` estilo ToolsPanel. Spec: `docs/superpowers/specs/2026-07-06-incremento-4a-blog-base-design.md`.

**Tech Stack:** Next.js 16 App Router, TS strict, Drizzle/Postgres (Supabase pooler), vitest, **marked** (dep nueva), OpenRouter (solo generar plantillas).

## Global Constraints

- Mensajes de error **byte-exactos** (todos): «Falta el título», «Falta el slug», «El slug solo puede llevar minúsculas, números y guiones», «El slug "<slug>" ya existe en este sitio», «Falta la meta descripción», «La meta descripción tiene <N> caracteres (máximo 160)», «Falta la imagen de portada», «Huecos sin rellenar en la plantilla: <lista>», «La plantilla de artículo debe contener los huecos {{titulo}}, {{meta_descripcion}} y {{contenido}}», «La plantilla de índice debe contener los marcadores <!--POST--> y <!--/POST-->», «La plantilla usa huecos desconocidos: <lista>», «El proyecto no tiene plantilla de blog (créala en la sección Blog)», «Falta OPENROUTER_API_KEY en .env.local», «No se pudo generar la plantilla del blog, vuelve a intentarlo», «Proyecto no encontrado», «Artículo no encontrado», «El proyecto no tiene snapshot actual», «El proyecto no tiene página de entrada», «El título es demasiado largo (máx. 300 caracteres)», «El slug es demasiado largo (máx. 100 caracteres)», «El artículo es demasiado largo (máx. 200000 caracteres)», «Ese subdominio ya está en uso».
- Validaciones de artículo fallidas → 400 con `{ error: errores.join(" · ") }`.
- Única dependencia nueva: `marked`. Nada de `sharp` ni variables `NEXT_PUBLIC`.
- La clave `OPENROUTER_API_KEY` solo se lee en servidor. Modelo default `anthropic/claude-sonnet-4.6` (`OPENROUTER_MODEL` lo cambia).
- Los snapshots de blog usan `tipo: "blog"`. `crearSnapshotEditado` sigue siendo retro-compatible (default `"edit"`).
- El espacio `blog/*` y `sitemap.xml` los posee el generador (excluir + extras; nunca doble-put).
- La IA nunca genera HTML final de artículos: render determinista (plantilla + marked).
- Al terminar cada tarea: suite entera verde (`npx vitest run`) y `npx tsc --noEmit` limpio.
- Rutas de origen del porte: `c:/Users/Sebas/Desktop/Carpeta de Proyectos/Creador de Blog/` (leer los archivos ahí; NO copiar a mano de memoria).

---

### Task 1: Libs deterministas portadas (`src/blog/`) + dep `marked`

**Files:**
- Create: `src/blog/slug.ts`, `src/blog/markdown.ts`, `src/blog/template.ts`, `src/blog/blog-index.ts`, `src/blog/validate.ts`, `src/blog/sitemap.ts`
- Test: `src/tests/blog-slug.test.ts`, `src/tests/blog-markdown.test.ts`, `src/tests/blog-template.test.ts`, `src/tests/blog-index.test.ts`, `src/tests/blog-validate.test.ts`, `src/tests/blog-sitemap.test.ts`
- Modify: `package.json` (dep `marked`)

**Interfaces (Produces):** `slugify(texto, maxPalabras=5)`, `slugUnico(slug, existentes)`, `mdAHtml(md)`, `renderTemplate(tpl, valores)`, `huecosSinRellenar(html): string[]`, `renderIndex(tplIndex, posts: PostIndice[])` con `PostIndice = {titulo,slug,metaDescripcion,fecha,imagen}`, `validarPrePublicacion(d): string[]`, `sitemapBase()`, `actualizarSitemap(xml|null, entradas)`, `quitarDelSitemap(xml, loc)`.

- [ ] **Step 1:** `npm install marked` (queda `"marked": "^18.x"` en dependencies).
- [ ] **Step 2:** Copiar **verbatim** estos archivos del proyecto hermano (origen → destino):
  - `Creador de Blog/src/lib/slug.ts` → `src/blog/slug.ts`
  - `Creador de Blog/src/lib/markdown.ts` → `src/blog/markdown.ts`
  - `Creador de Blog/src/lib/template.ts` → `src/blog/template.ts`
  - `Creador de Blog/src/lib/blog-index.ts` → `src/blog/blog-index.ts`
  - `Creador de Blog/src/lib/validate.ts` → `src/blog/validate.ts`
  - `Creador de Blog/src/lib/sitemap.ts` → `src/blog/sitemap.ts`
  Los imports internos `./template` etc. funcionan sin cambios.
- [ ] **Step 3:** Copiar sus tests: `Creador de Blog/src/tests/{slug,markdown,template,blog-index,validate,sitemap}.test.ts` → `src/tests/blog-<nombre>.test.ts` (el de `blog-index.test.ts` mantiene su nombre), cambiando SOLO los imports `@/src/lib/<x>` → `@/src/blog/<x>`. Ejecutar: deben pasar todos.
- [ ] **Step 4 (TDD de lo nuevo):** añadir a `src/tests/blog-sitemap.test.ts`:

```ts
import { quitarDelSitemap } from "@/src/blog/sitemap";

describe("quitarDelSitemap", () => {
  const xml = actualizarSitemap(null, [
    { loc: "https://x.com/blog/a.html", lastmod: "2026-01-01" },
    { loc: "https://x.com/blog/b.html", lastmod: "2026-01-02" },
  ]);
  it("elimina el bloque <url> completo de la loc y deja las demás", () => {
    const r = quitarDelSitemap(xml, "https://x.com/blog/a.html");
    expect(r).not.toContain("blog/a.html");
    expect(r).toContain("<loc>https://x.com/blog/b.html</loc>");
    expect(r).not.toContain("2026-01-01");
  });
  it("no-op si la loc no está", () => {
    expect(quitarDelSitemap(xml, "https://x.com/blog/z.html")).toBe(xml);
  });
  it("no confunde una loc que empieza igual", () => {
    const dos = actualizarSitemap(xml, [{ loc: "https://x.com/blog/a.html.old", lastmod: "2026-02-02" }]);
    const r = quitarDelSitemap(dos, "https://x.com/blog/a.html");
    expect(r).toContain("<loc>https://x.com/blog/a.html.old</loc>");
    expect(r).not.toContain("<loc>https://x.com/blog/a.html</loc>");
  });
});
```

Correr → FALLA (quitarDelSitemap no existe).
- [ ] **Step 5:** implementar en `src/blog/sitemap.ts`:

```ts
// Elimina el bloque <url>…</url> cuyo <loc> coincide EXACTO (no-op si no está).
export function quitarDelSitemap(xml: string, loc: string): string {
  const re = new RegExp(
    `[ \\t]*<url>(?:(?!</url>)[\\s\\S])*?<loc>${escaparRegex(loc)}</loc>(?:(?!</url>)[\\s\\S])*?</url>[ \\t]*\\r?\\n?`
  );
  return xml.replace(re, "");
}
```

- [ ] **Step 6:** `npx vitest run` (todo verde) + `npx tsc --noEmit`.
- [ ] **Step 7:** Commit: `feat(4a): libs del blog portadas de Creador de Blog + quitarDelSitemap`

---

### Task 2: BD — schema, DDL aplicado y `BlogStore`

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/manual/2026-07-06-4a-blog.sql`, `scripts/db-apply.mjs`, `src/repositories/blog.ts`

**Interfaces (Produces):**
```ts
export type PostRow = { id: string; projectId: string; titulo: string; slug: string; metaDescripcion: string; md: string; imagenAssetId: string; imagenExt: string; fecha: string; createdAt: string; updatedAt: string };
export type PostInput = { titulo: string; slug: string; metaDescripcion: string; md: string; imagenAssetId: string; imagenExt: string };
export interface BlogStore {
  getBlogTemplate(orgId: string, projectId: string): Promise<{ tplPost: string; tplIndex: string } | null>;
  setBlogTemplate(orgId: string, projectId: string, tpl: { tplPost: string; tplIndex: string }): Promise<void>;
  listPosts(orgId: string, projectId: string): Promise<PostRow[]>; // fecha desc, createdAt desc
  getPost(orgId: string, projectId: string, postId: string): Promise<PostRow | null>;
  createPost(orgId: string, projectId: string, input: PostInput & { fecha: string }): Promise<{ postId: string }>;
  updatePost(orgId: string, projectId: string, postId: string, input: PostInput): Promise<void>;
  deletePost(orgId: string, projectId: string, postId: string): Promise<void>;
}
export const blogStore: BlogStore; // impl Drizzle, singleton como projectStore
```

- [ ] **Step 1:** añadir a `src/db/schema.ts` (mismo estilo que las tablas existentes):

```ts
export const blogTemplates = pgTable("blog_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().unique().references(() => projects.id),
  tplPost: text("tpl_post").notNull(),
  tplIndex: text("tpl_index").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  titulo: text("titulo").notNull(),
  slug: text("slug").notNull(),
  metaDescripcion: text("meta_descripcion").notNull(),
  md: text("md").notNull(),
  imagenAssetId: uuid("imagen_asset_id").notNull(),
  imagenExt: text("imagen_ext").notNull(),
  fecha: text("fecha").notNull(), // YYYY-MM-DD, fijada al crear
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.projectId, t.slug)]);
```

- [ ] **Step 2:** crear `drizzle/manual/2026-07-06-4a-blog.sql` (drizzle-kit push está roto upstream; patrón del proyecto = SQL directo):

```sql
CREATE TABLE IF NOT EXISTS blog_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES projects(id),
  tpl_post text NOT NULL,
  tpl_index text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id),
  titulo text NOT NULL,
  slug text NOT NULL,
  meta_descripcion text NOT NULL,
  md text NOT NULL,
  imagen_asset_id uuid NOT NULL,
  imagen_ext text NOT NULL,
  fecha text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, slug)
);
```

- [ ] **Step 3:** crear `scripts/db-apply.mjs` (aplicador genérico, servirá también en el estreno):

```js
import { readFileSync } from "node:fs";
import postgres from "postgres";
const archivo = process.argv[2];
if (!archivo) { console.error("Uso: node scripts/db-apply.mjs <archivo.sql>"); process.exit(1); }
const env = readFileSync(".env.local", "utf8");
const url = env.match(/^DATABASE_URL=(.+)$/m)[1].trim();
const sql = postgres(url, { prepare: false });
await sql.unsafe(readFileSync(archivo, "utf8"));
console.log("Aplicado:", archivo);
await sql.end();
```

Ejecutar: `node scripts/db-apply.mjs drizzle/manual/2026-07-06-4a-blog.sql` → «Aplicado: …». Verificar: `node -e` con `select count(*) from posts` devuelve 0 (tabla existe).
- [ ] **Step 4:** crear `src/repositories/blog.ts` con la interfaz de arriba y la impl Drizzle. Org scoping: cada método comprueba primero que el proyecto es de la org (igual que hace `projectStore`):

```ts
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { blogTemplates, posts, projects } from "@/src/db/schema";

async function proyectoDeOrg(orgId: string, projectId: string): Promise<boolean> {
  const r = await db.select({ id: projects.id }).from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId))).limit(1);
  return r.length > 0;
}
```

(Ojo: mirar `src/repositories/projects.ts` y usar exactamente el mismo import del cliente `db`.) Métodos:
  - `getBlogTemplate`: null si el proyecto no es de la org o no hay fila.
  - `setBlogTemplate`: upsert — `insert … on conflict (project_id) do update set tpl_post, tpl_index, updated_at = now()` (en Drizzle: `.onConflictDoUpdate({ target: blogTemplates.projectId, set: { tplPost, tplIndex, updatedAt: new Date() } })`). No-op si el proyecto no es de la org.
  - `listPosts`: `orderBy(desc(posts.fecha), desc(posts.createdAt))`; `[]` si no es de la org. Timestamps → string con `.toISOString()` (mapear filas al tipo `PostRow`).
  - `getPost` / `createPost` / `updatePost` (set también `updatedAt: new Date()`) / `deletePost`: todas con el guard.
- [ ] **Step 5:** `npx tsc --noEmit` + `npx vitest run` (sin tests nuevos: el repo se ejercita en e2e, como `projectStore`).
- [ ] **Step 6:** Commit: `feat(4a): tablas blog_templates y posts + BlogStore (SQL manual aplicado)`

---

### Task 3: `crearSnapshotEditado` — `excluir` y `tipo` (retro-compatible)

**Files:**
- Modify: `src/editor/snapshot-copy.ts`
- Test: `src/tests/snapshot-copy.test.ts` (nuevo)

**Interfaces (Produces):** `crearSnapshotEditado(deps, input)` acepta además `excluir?: Set<string>` (rutas relativas del snapshot origen que NO se copian) y `tipo?: string` (default `"edit"`).

- [ ] **Step 1 (test primero):** `src/tests/snapshot-copy.test.ts` con fakes mínimos (modelar los fakes de store/storage sobre los de `src/tests/tools.test.ts`, que ya simulan `list/get/put/delete` y `createSnapshot`):

```ts
// casos:
it("copia todo por defecto y crea snapshot tipo 'edit'", …);
it("excluir omite esas rutas del copiado (no aparecen en el snapshot nuevo)", …);
it("extras escriben aunque la ruta esté en excluir (excluir+extra = reemplazo sin doble put)", …);
it("tipo 'blog' llega a createSnapshot", …);
```

En el fake de storage, registrar los `put` en un array para afirmar exactamente qué rutas se escribieron (y que una ruta excluida+extra se escribe UNA vez). Correr → FALLA.
- [ ] **Step 2:** implementar en `src/editor/snapshot-copy.ts`:
  - firma: `excluir?: Set<string>; tipo?: string;` en `input`.
  - en el bucle de copia, tras calcular `rel`: `if (input.excluir?.has(rel)) continue;`
  - en `createSnapshot`: `tipo: input.tipo ?? "edit"`.
  - actualizar el comentario de cabecera del archivo (una línea: extras/excluir).
- [ ] **Step 3:** `npx vitest run` (los 4 nuevos + TODOS los previos verdes: retro-compatibilidad) + `npx tsc --noEmit`.
- [ ] **Step 4:** Commit: `feat(4a): crearSnapshotEditado admite excluir rutas y tipo de snapshot`

---

### Task 4: Render del blog (`src/blog/render.ts`)

**Files:**
- Create: `src/blog/render.ts`
- Test: `src/tests/blog-render.test.ts`

**Interfaces (Produces):**
```ts
export type DatosPost = { titulo: string; slug: string; metaDescripcion: string; md: string; imagenExt: string };
export function basePublica(p: { dominio: string | null; subdominio: string | null }, sitesBaseDomain: string): string | null;
export function renderPost(tplPost: string, post: DatosPost, fecha: string, base: string, imagenSrc?: string): string;
export function itemsIndice(posts: { titulo: string; slug: string; metaDescripcion: string; fecha: string; imagenExt: string }[]): PostIndice[];
export const DATOS_EJEMPLO: DatosPost; export const IMAGEN_EJEMPLO: string; // data-URI SVG gris
```

- [ ] **Step 1 (tests primero):** `src/tests/blog-render.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { renderPost, itemsIndice, basePublica, DATOS_EJEMPLO, IMAGEN_EJEMPLO } from "@/src/blog/render";

const TPL = `<html><head><title>{{titulo}}</title><meta name="description" content="{{meta_descripcion}}">
<link rel="canonical" href="{{canonical}}">{{json_ld}}</head>
<body><img src="{{imagen}}"><time>{{fecha}}</time><article>{{contenido}}</article></body></html>`;

describe("basePublica", () => {
  it("dominio propio gana", () => expect(basePublica({ dominio: "acme.com", subdominio: "acme" }, "wc.app")).toBe("https://acme.com"));
  it("subdominio con base", () => expect(basePublica({ dominio: null, subdominio: "acme" }, "wc.app")).toBe("https://acme.wc.app"));
  it("null sin ninguno", () => expect(basePublica({ dominio: null, subdominio: null }, "wc.app")).toBeNull());
});

describe("renderPost", () => {
  const post = { titulo: "Tú & yo", slug: "tu-y-yo", metaDescripcion: 'Meta "fina"', md: "## Hola\n\nParrafo.", imagenExt: "webp" };
  const html = renderPost(TPL, post, "2026-07-06", "https://acme.wc.app");
  it("escapa titulo/meta/fecha", () => {
    expect(html).toContain("Tú &amp; yo");
    expect(html).not.toContain('content="Meta "fina""');
  });
  it("markdown → HTML en contenido", () => expect(html).toContain("<h2>Hola</h2>"));
  it("imagen relativa y canonical absoluta", () => {
    expect(html).toContain('src="/blog/img/tu-y-yo.webp"');
    expect(html).toContain('href="https://acme.wc.app/blog/tu-y-yo.html"');
  });
  it("JSON-LD Article con image absoluta y </ escapado", () => {
    const h = renderPost(TPL, { ...post, titulo: "x</script><b>" }, "2026-07-06", "https://a.b");
    expect(h).toContain('"@type":"Article"');
    expect(h).toContain("https://a.b/blog/tu-y-yo.webp".replace("tu-y-yo.webp", "tu-y-yo.webp")); // image absoluta
    expect(h).not.toContain("</script><b>\"");
  });
  it("imagenSrc sustituye la ruta de imagen (preview)", () => {
    const h = renderPost(TPL, post, "2026-07-06", "https://a.b", IMAGEN_EJEMPLO);
    expect(h).toContain(`src="${IMAGEN_EJEMPLO}"`);
  });
});

describe("itemsIndice", () => {
  it("escapa y construye la ruta de imagen", () => {
    const [i] = itemsIndice([{ titulo: "A&B", slug: "ab", metaDescripcion: "m", fecha: "2026-07-06", imagenExt: "png" }]);
    expect(i.titulo).toBe("A&amp;B");
    expect(i.imagen).toBe("/blog/img/ab.png");
  });
});
```

Correr → FALLA.
- [ ] **Step 2:** implementar `src/blog/render.ts`:

```ts
import { mdAHtml } from "./markdown";
import { renderTemplate } from "./template";
import type { PostIndice } from "./blog-index";
import { escapeHtmlText } from "@/src/editor/apply";

export type DatosPost = { titulo: string; slug: string; metaDescripcion: string; md: string; imagenExt: string };

export function basePublica(
  p: { dominio: string | null; subdominio: string | null },
  sitesBaseDomain: string
): string | null {
  if (p.dominio) return `https://${p.dominio}`;
  if (p.subdominio) return `https://${p.subdominio}.${sitesBaseDomain}`;
  return null;
}

// Render determinista del artículo (la IA nunca toca esto). `imagenSrc` solo
// para la vista previa efímera (URL del asset o placeholder); el guardado real
// usa siempre /blog/img/<slug>.<ext>.
export function renderPost(tplPost: string, post: DatosPost, fecha: string, base: string, imagenSrc?: string): string {
  const imagen = `/blog/img/${post.slug}.${post.imagenExt}`;
  const canonical = `${base}/blog/${post.slug}.html`;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.titulo,
    description: post.metaDescripcion,
    datePublished: fecha,
    image: `${base}${imagen}`,
    inLanguage: "es",
  }).replace(/<\//g, "<\\/");
  return renderTemplate(tplPost, {
    titulo: escapeHtmlText(post.titulo),
    contenido: mdAHtml(post.md),
    meta_descripcion: escapeHtmlText(post.metaDescripcion),
    imagen: imagenSrc ?? imagen,
    fecha: escapeHtmlText(fecha),
    canonical,
    json_ld: `<script type="application/ld+json">${jsonLd}</script>`,
  });
}

export function itemsIndice(
  posts: { titulo: string; slug: string; metaDescripcion: string; fecha: string; imagenExt: string }[]
): PostIndice[] {
  return posts.map((p) => ({
    titulo: escapeHtmlText(p.titulo),
    slug: p.slug,
    metaDescripcion: escapeHtmlText(p.metaDescripcion),
    fecha: escapeHtmlText(p.fecha),
    imagen: `/blog/img/${p.slug}.${p.imagenExt}`,
  }));
}

export const IMAGEN_EJEMPLO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='630'%3E%3Crect width='100%25' height='100%25' fill='%23e5e7eb'/%3E%3C/svg%3E";

export const DATOS_EJEMPLO: DatosPost = {
  titulo: "Título de ejemplo",
  slug: "titulo-de-ejemplo",
  metaDescripcion: "Así se verá la descripción del artículo en Google y al compartir.",
  md: "## Un apartado\n\nEste es un párrafo de ejemplo del artículo. Aquí iría tu contenido.\n\n- Un punto\n- Otro punto",
  imagenExt: "png",
};
```

- [ ] **Step 3:** `npx vitest run` verde + `npx tsc --noEmit`.
- [ ] **Step 4:** Commit: `feat(4a): render determinista del blog (post, índice, base pública, datos de ejemplo)`

---

### Task 5: Cliente OpenRouter (`src/ia/claude.ts`) + plantillas desde la portada (`src/blog/site-template.ts`)

**Files:**
- Create: `src/ia/claude.ts`, `src/blog/site-template.ts`
- Test: `src/tests/ia-claude.test.ts` (port), `src/tests/blog-site-template.test.ts`

**Interfaces:**
- Consumes: `StorageAdapter.get`, `ProjectStore.getProject/getCurrentSnapshot`, `EditorError`.
- Produces:
```ts
// src/ia/claude.ts (port de Creador de Blog/src/services/claude.ts)
export const MODELO: string;
export function limpiarJson(texto: string): string;
export function pedirJson<S extends z.ZodType>(prompt: string, schema: S, maxTokens?: number): Promise<z.infer<S>>;
export function probarConexionModelo(): Promise<string>;
export const PlantillasSchema: z.ZodObject<…>; // { plantilla_post, plantilla_index }
// src/blog/site-template.ts
export const MSG_SIN_PLANTILLA = "El proyecto no tiene plantilla de blog (créala en la sección Blog)";
export function validarPlantillas(tplPost: string, tplIndex: string): string[];
export function generarPlantillas(deps: { store: ProjectStore; storage: StorageAdapter }, input: { orgId: string; projectId: string }): Promise<{ tplPost: string; tplIndex: string }>;
```

- [ ] **Step 1:** `src/ia/claude.ts` = port de `Creador de Blog/src/services/claude.ts` **quitando** lo que 4a no usa (`AnalisisSchema`, `MetadatosSchema`, `RelevanciaSchema`, `pedirTexto`, `pedirConBusquedaWeb`) y cambiando `X-Title` a `"Wordclicks"`. Conservar: `MODELO`, `clave()` (error «Falta OPENROUTER_API_KEY en .env.local»), `cabeceras()`, `completar()`, `limpiarJson`, `pedirJson` (con su reintento), `probarConexionModelo`, `PlantillasSchema`. `zod` ya está en el proyecto.
- [ ] **Step 2:** port del test: `Creador de Blog/src/tests/claude.test.ts` → `src/tests/ia-claude.test.ts`, import `@/src/ia/claude`, y eliminar los casos de las funciones no portadas (mantener los de `limpiarJson` y `pedirJson` con `fetch` mockeado y `vi.stubEnv("OPENROUTER_API_KEY", …)`). Correr → verde.
- [ ] **Step 3 (tests primero de lo nuevo):** `src/tests/blog-site-template.test.ts`:

```ts
// validarPlantillas:
it("acepta plantillas con los huecos/marcadores requeridos (con espacios {{ titulo }})", …); // → []
it("artículo sin {{contenido}} → mensaje byte-exacto de huecos requeridos", …);
it("índice sin marcadores o en orden inverso → mensaje byte-exacto de marcadores", …);
it("hueco desconocido → «La plantilla usa huecos desconocidos: precio»", …);
// generarPlantillas (con vi.mock de @/src/ia/claude y fakes de store/storage):
it("sin OPENROUTER_API_KEY → EditorError 500 «Falta OPENROUTER_API_KEY en .env.local»", …);
it("lee entryPath del snapshot y adjunta el CSS local referenciado (link relativo resuelto)", …); // el prompt contiene ambos
it("css absoluto (https://) se ignora", …);
it("pedirJson lanza → EditorError 502 «No se pudo generar la plantilla del blog, vuelve a intentarlo»", …);
it("respuesta que no valida (validarPlantillas) → mismo 502", …);
it("proyecto inexistente → 404 «Proyecto no encontrado»; sin snapshot → 400 «El proyecto no tiene snapshot actual»; sin entrada en storage → 400 «El proyecto no tiene página de entrada»", …);
```

Correr → FALLA.
- [ ] **Step 4:** implementar `src/blog/site-template.ts`:

```ts
import { EditorError } from "@/src/editor/errors";
import { pedirJson, PlantillasSchema } from "@/src/ia/claude";
import { huecosSinRellenar } from "./template";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

const HUECOS_POST = ["titulo", "meta_descripcion", "contenido", "imagen", "fecha", "canonical", "json_ld"];
const HUECOS_INDEX = ["titulo", "slug", "meta_descripcion", "fecha", "imagen"];
export const MSG_SIN_PLANTILLA = "El proyecto no tiene plantilla de blog (créala en la sección Blog)";

export function validarPlantillas(tplPost: string, tplIndex: string): string[] {
  const errores: string[] = [];
  const presentes = huecosSinRellenar(tplPost);
  if (!["titulo", "meta_descripcion", "contenido"].every((h) => presentes.includes(h))) {
    errores.push("La plantilla de artículo debe contener los huecos {{titulo}}, {{meta_descripcion}} y {{contenido}}");
  }
  const i = tplIndex.indexOf("<!--POST-->");
  const f = tplIndex.indexOf("<!--/POST-->");
  if (i === -1 || f === -1 || f < i) {
    errores.push("La plantilla de índice debe contener los marcadores <!--POST--> y <!--/POST-->");
  }
  const desconocidos = [...new Set([
    ...presentes.filter((h) => !HUECOS_POST.includes(h)),
    ...huecosSinRellenar(tplIndex).filter((h) => !HUECOS_INDEX.includes(h)),
  ])];
  if (desconocidos.length) errores.push(`La plantilla usa huecos desconocidos: ${desconocidos.join(", ")}`);
  return errores;
}

// Lee la portada (y su primer CSS local) del snapshot actual y pide a Claude las
// dos plantillas. No persiste nada: el usuario revisa y guarda con PUT.
export async function generarPlantillas(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string }
): Promise<{ tplPost: string; tplIndex: string }> {
  if (!process.env.OPENROUTER_API_KEY) throw new EditorError("Falta OPENROUTER_API_KEY en .env.local", 500);
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const current = await deps.store.getCurrentSnapshot(input.orgId, input.projectId);
  if (!current) throw new EditorError("El proyecto no tiene snapshot actual", 400);
  const entrada = await deps.storage.get(current.storagePrefix + project.entryPath);
  if (!entrada) throw new EditorError("El proyecto no tiene página de entrada", 400);
  const indexHtml = entrada.body.toString("utf-8");

  let css = "";
  const linkCss = indexHtml.match(/<link[^>]+href=["']([^"']+\.css)["']/i);
  if (linkCss && !/^https?:\/\//.test(linkCss[1])) {
    const dir = project.entryPath.includes("/") ? project.entryPath.slice(0, project.entryPath.lastIndexOf("/") + 1) : "";
    const partes: string[] = [];
    for (const seg of (dir + linkCss[1].replace(/^\//, "")).split("/")) {
      if (seg === "..") partes.pop(); else if (seg && seg !== ".") partes.push(seg);
    }
    const archivo = await deps.storage.get(current.storagePrefix + partes.join("/"));
    if (archivo) css = archivo.body.toString("utf-8");
  }

  const prompt = `Eres un desarrollador frontend senior. Aquí tienes la portada de un sitio web y su CSS.
Genera DOS plantillas HTML completas para la sección de blog de este sitio, manteniendo su header, footer,
colores, tipografías y estética. Las plantillas deben ser AUTOCONTENIDAS: incluye el CSS necesario inline
en una etiqueta <style> dentro del <head> (no dependas de archivos externos del sitio).

1. plantilla_post — página de un artículo. Debe usar EXACTAMENTE estos placeholders donde corresponda:
   {{titulo}} (título del artículo, en el <title> y en el hero/cabecera del artículo),
   {{meta_descripcion}} (en <meta name="description"> y en Open Graph og:description),
   {{contenido}} (el cuerpo del artículo, ya en HTML, dentro de un <article> con buena tipografía para lectura),
   {{imagen}} (URL de la imagen de portada, en un <img> y en og:image),
   {{fecha}} (fecha de publicación),
   {{canonical}} (en <link rel="canonical"> y og:url),
   {{json_ld}} (justo antes de </head>; es un <script> completo que se inyecta tal cual).
   Incluye también las meta Open Graph básicas (og:title, og:description, og:image, og:url) y lang="es".
   Incluye un enlace "← Volver al blog" hacia /blog/.

2. plantilla_index — página índice del blog (lista de artículos). El bloque que se repite por artículo debe ir
   delimitado EXACTAMENTE por los marcadores <!--POST--> y <!--/POST-->, y dentro puede usar los placeholders
   {{titulo}}, {{slug}}, {{meta_descripcion}}, {{fecha}} e {{imagen}}. El enlace de cada artículo es /blog/{{slug}}.html.
   Incluye un <title> y meta description fijos razonables para "Blog de ${project.nombre}".

No uses ningún otro placeholder {{...}} distinto de los listados.

=== index.html del sitio ===
${indexHtml.slice(0, 30000)}

=== CSS del sitio ===
${css.slice(0, 30000)}`;

  let r: { plantilla_post: string; plantilla_index: string };
  try {
    r = await pedirJson(prompt, PlantillasSchema, 16000);
  } catch {
    throw new EditorError("No se pudo generar la plantilla del blog, vuelve a intentarlo", 502);
  }
  if (validarPlantillas(r.plantilla_post, r.plantilla_index).length) {
    throw new EditorError("No se pudo generar la plantilla del blog, vuelve a intentarlo", 502);
  }
  return { tplPost: r.plantilla_post, tplIndex: r.plantilla_index };
}
```

- [ ] **Step 5:** `npx vitest run` verde + `npx tsc --noEmit`.
- [ ] **Step 6:** Commit: `feat(4a): cliente OpenRouter mínimo + generación y validación de plantillas del blog`

---

### Task 6: Operaciones del blog sobre snapshots (`src/blog/apply.ts`)

**Files:**
- Create: `src/blog/apply.ts`
- Modify: `src/publish/publish-site.ts:7` (añadir `export` a `generarSubdominio`)
- Test: `src/tests/blog-apply.test.ts`

**Interfaces:**
- Consumes: `crearSnapshotEditado` (con `excluir`/`tipo` de Task 3), `renderPost/itemsIndice/basePublica` (Task 4), `renderIndex`, `actualizarSitemap/quitarDelSitemap/sitemapBase`, `validarPrePublicacion` (Task 1), `validarPlantillas/MSG_SIN_PLANTILLA` (Task 5), `BlogStore` (Task 2), `generarSubdominio` (export nuevo).
- Produces:
```ts
type Deps = { store: ProjectStore; blog: BlogStore; storage: StorageAdapter };
export function estadoBlog(deps, input: { orgId; projectId }): Promise<{ tienePlantilla: boolean; posts: { id; titulo; slug; fecha }[] }>;
export function guardarPost(deps, input: { orgId; projectId; postId?: string | null; titulo; slug; metaDescripcion; md; imagenAssetId }): Promise<{ postId: string; snapshotId: string }>;
export function borrarPost(deps, input: { orgId; projectId; postId }): Promise<{ snapshotId: string }>;
export function guardarPlantillas(deps, input: { orgId; projectId; tplPost; tplIndex }): Promise<{ snapshotId: string | null }>;
export function previewBlog(deps, input: { orgId; projectId; cual?: "post" | "index"; tplPost?; tplIndex?; titulo?; slug?; metaDescripcion?; md?; imagenUrl? }): Promise<{ html: string }>;
```

- [ ] **Step 1:** exportar `generarSubdominio` en `src/publish/publish-site.ts` (solo añadir `export` delante de `async function generarSubdominio`).
- [ ] **Step 2 (tests primero):** `src/tests/blog-apply.test.ts` con fakes de `ProjectStore`/`BlogStore`/`StorageAdapter` (base: los fakes de `src/tests/tools.test.ts`; el fake de storage guarda un mapa clave→Buffer y registra los `put`). Sembrar un snapshot actual con `index.html`, `sitemap.xml` opcional y un asset de imagen. Casos (todos con mensajes byte-exactos donde aplique):

```ts
// guardarPost (crear)
it("crea snapshot tipo 'blog' con blog/<slug>.html, blog/img/<slug>.<ext>, blog/index.html y sitemap.xml", …);
it("deriva la ext del contentType del asset (image/jpeg → jpg)", …);
it("el índice contiene el artículo y el sitemap ambas locs con la base pública", …);
it("asigna subdominio si el proyecto no tiene ni dominio ni subdominio", …);
it("validaciones: sin título/slug inválido/meta larga/sin imagen → 400 con join ' · '", …);
it("slug duplicado → «El slug \"x\" ya existe en este sitio»", …);
it("sin plantilla → 400 MSG_SIN_PLANTILLA", …);
it("límites: md>200000 / titulo>300 / slug>100 → mensajes exactos", …);
// guardarPost (editar)
it("mismo slug: excluye su html e imagen previos y reescribe", …);
it("slug nuevo: excluye los archivos del slug viejo y el sitemap pierde la loc vieja", …);
it("la fecha NO cambia al editar", …);
it("postId inexistente → 404 «Artículo no encontrado»", …);
// borrarPost
it("excluye sus archivos, regenera índice sin él y sitemap sin su loc; borra la fila", …);
// guardarPlantillas
it("con 0 posts: guarda en BD y snapshotId null (sin snapshot)", …);
it("con posts: re-renderiza todos los html con la plantilla nueva (excluye los viejos), imágenes intactas", …);
it("plantilla inválida → 400 con mensajes de validarPlantillas", …);
// previewBlog
it("post con override y sin plantilla guardada funciona; imagen = imagenUrl o placeholder", …);
it("index con un ítem de ejemplo", …);
it("sin plantilla guardada ni override → 400 MSG_SIN_PLANTILLA", …);
```

Correr → FALLA.
- [ ] **Step 3:** implementar `src/blog/apply.ts`:

```ts
import { EditorError } from "@/src/editor/errors";
import { crearSnapshotEditado } from "@/src/editor/snapshot-copy";
import { renderPost, itemsIndice, basePublica, DATOS_EJEMPLO, IMAGEN_EJEMPLO } from "./render";
import { renderIndex } from "./blog-index";
import { actualizarSitemap, quitarDelSitemap } from "./sitemap";
import { validarPrePublicacion } from "./validate";
import { validarPlantillas, MSG_SIN_PLANTILLA } from "./site-template";
import { generarSubdominio } from "@/src/publish/publish-site";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore, ProjectRow, SnapshotRow } from "@/src/repositories/types";
import type { BlogStore, PostRow } from "@/src/repositories/blog";

type Deps = { store: ProjectStore; blog: BlogStore; storage: StorageAdapter };

const EXT_POR_CONTENT_TYPE: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif",
  "image/webp": "webp", "image/avif": "avif", "image/svg+xml": "svg",
};
const XML = "application/xml";
const HTML = "text/html; charset=utf-8";

function sitesBaseDomain(): string {
  return process.env.SITES_BASE_DOMAIN ?? process.env.PLATFORM_HOST ?? "localhost:3000";
}
function hoy(): string { return new Date().toISOString().slice(0, 10); }

async function contexto(deps: Deps, orgId: string, projectId: string) {
  const project = await deps.store.getProject(orgId, projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const current = await deps.store.getCurrentSnapshot(orgId, projectId);
  if (!current) throw new EditorError("El proyecto no tiene snapshot actual", 400);
  return { project, current };
}

// Base pública para canonicals/sitemap; si el proyecto aún no tiene subdominio
// ni dominio, se le asigna aquí (igual que haría el primer Publicar).
async function baseDelProyecto(deps: Deps, orgId: string, project: ProjectRow): Promise<string> {
  const base = basePublica(project, sitesBaseDomain());
  if (base) return base;
  const sub = await generarSubdominio(deps.store, project.nombre);
  const ok = await deps.store.setSubdominio(orgId, project.id, sub);
  if (!ok) throw new EditorError("Ese subdominio ya está en uso", 409);
  return `https://${sub}.${sitesBaseDomain()}`;
}

async function sitemapPrevio(deps: Deps, current: SnapshotRow): Promise<string | null> {
  const f = await deps.storage.get(current.storagePrefix + "sitemap.xml");
  return f ? f.body.toString("utf-8") : null;
}

function ordenar(posts: { fecha: string; createdAt: string }[]): void {
  posts.sort((a, b) => (b.fecha.localeCompare(a.fecha)) || (b.createdAt.localeCompare(a.createdAt)));
}

export async function estadoBlog(deps: Deps, input: { orgId: string; projectId: string }) {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const tpl = await deps.blog.getBlogTemplate(input.orgId, input.projectId);
  const posts = await deps.blog.listPosts(input.orgId, input.projectId);
  return { tienePlantilla: !!tpl, posts: posts.map((p) => ({ id: p.id, titulo: p.titulo, slug: p.slug, fecha: p.fecha })) };
}

export async function guardarPost(deps: Deps, input: {
  orgId: string; projectId: string; postId?: string | null;
  titulo: string; slug: string; metaDescripcion: string; md: string; imagenAssetId: string;
}): Promise<{ postId: string; snapshotId: string }> {
  if (input.titulo.length > 300) throw new EditorError("El título es demasiado largo (máx. 300 caracteres)", 400);
  if (input.slug.length > 100) throw new EditorError("El slug es demasiado largo (máx. 100 caracteres)", 400);
  if (input.md.length > 200000) throw new EditorError("El artículo es demasiado largo (máx. 200000 caracteres)", 400);
  const { project, current } = await contexto(deps, input.orgId, input.projectId);
  const tpl = await deps.blog.getBlogTemplate(input.orgId, input.projectId);
  if (!tpl) throw new EditorError(MSG_SIN_PLANTILLA, 400);
  const previa = input.postId ? await deps.blog.getPost(input.orgId, input.projectId, input.postId) : null;
  if (input.postId && !previa) throw new EditorError("Artículo no encontrado", 404);

  // Imagen: asset del proyecto con archivo presente; ext derivada del contentType.
  let imagen: { body: Buffer; contentType: string; ext: string } | null = null;
  if (input.imagenAssetId) {
    const row = await deps.store.getAsset(input.orgId, input.projectId, input.imagenAssetId);
    const ext = row ? EXT_POR_CONTENT_TYPE[row.contentType] : undefined;
    const file = row && ext ? await deps.storage.get(row.storageKey) : null;
    if (row && ext && file) imagen = { body: file.body, contentType: row.contentType, ext };
  }

  const todos = await deps.blog.listPosts(input.orgId, input.projectId);
  const slugsExistentes = todos.filter((p) => p.id !== (input.postId ?? "")).map((p) => p.slug);
  const fecha = previa?.fecha ?? hoy();
  const base = await baseDelProyecto(deps, input.orgId, project);
  const ext = imagen?.ext ?? "png";
  const html = renderPost(tpl.tplPost, { titulo: input.titulo, slug: input.slug, metaDescripcion: input.metaDescripcion, md: input.md, imagenExt: ext }, fecha, base);

  const errores = validarPrePublicacion({
    titulo: input.titulo, slug: input.slug, slugsExistentes,
    metaDescripcion: input.metaDescripcion,
    imagenPath: imagen ? `/blog/img/${input.slug}.${ext}` : null,
    htmlFinal: html,
  });
  if (errores.length) throw new EditorError(errores.join(" · "), 400);

  // Índice futuro: la lista de BD manda (sin la versión previa, con la nueva).
  const futuros = todos.filter((p) => p.id !== (input.postId ?? "")).map((p) => ({
    titulo: p.titulo, slug: p.slug, metaDescripcion: p.metaDescripcion, fecha: p.fecha, imagenExt: p.imagenExt, createdAt: p.createdAt,
  }));
  futuros.push({ titulo: input.titulo, slug: input.slug, metaDescripcion: input.metaDescripcion, fecha, imagenExt: ext, createdAt: previa?.createdAt ?? "9999" });
  ordenar(futuros);
  const indice = renderIndex(tpl.tplIndex, itemsIndice(futuros));

  let xml = await sitemapPrevio(deps, current);
  if (previa && previa.slug !== input.slug) xml = quitarDelSitemap(xml ?? "", `${base}/blog/${previa.slug}.html`) || null;
  const sitemap = actualizarSitemap(xml, [
    { loc: `${base}/blog/${input.slug}.html`, lastmod: hoy() },
    { loc: `${base}/blog/index.html`, lastmod: hoy() },
  ]);

  const excluir = new Set(["blog/index.html", "sitemap.xml", `blog/${input.slug}.html`, `blog/img/${input.slug}.${ext}`]);
  if (previa) { excluir.add(`blog/${previa.slug}.html`); excluir.add(`blog/img/${previa.slug}.${previa.imagenExt}`); }
  const extras = new Map<string, { body: Buffer; contentType: string }>([
    [`blog/${input.slug}.html`, { body: Buffer.from(html, "utf-8"), contentType: HTML }],
    [`blog/img/${input.slug}.${ext}`, { body: imagen!.body, contentType: imagen!.contentType }],
    ["blog/index.html", { body: Buffer.from(indice, "utf-8"), contentType: HTML }],
    ["sitemap.xml", { body: Buffer.from(sitemap, "utf-8"), contentType: XML }],
  ]);

  const { snapshotId } = await crearSnapshotEditado(deps, {
    orgId: input.orgId, projectId: input.projectId,
    currentSnapshot: { id: current.id, storagePrefix: current.storagePrefix },
    transformar: () => null, extras, excluir, tipo: "blog",
    operacionesJson: { blog: { accion: previa ? "editar" : "crear", slug: input.slug } },
  });

  const datos = { titulo: input.titulo, slug: input.slug, metaDescripcion: input.metaDescripcion, md: input.md, imagenAssetId: input.imagenAssetId, imagenExt: ext };
  if (previa) { await deps.blog.updatePost(input.orgId, input.projectId, previa.id, datos); return { postId: previa.id, snapshotId }; }
  const { postId } = await deps.blog.createPost(input.orgId, input.projectId, { ...datos, fecha });
  return { postId, snapshotId };
}

export async function borrarPost(deps: Deps, input: { orgId: string; projectId: string; postId: string }): Promise<{ snapshotId: string }> {
  const { project, current } = await contexto(deps, input.orgId, input.projectId);
  const tpl = await deps.blog.getBlogTemplate(input.orgId, input.projectId);
  if (!tpl) throw new EditorError(MSG_SIN_PLANTILLA, 400);
  const previa = await deps.blog.getPost(input.orgId, input.projectId, input.postId);
  if (!previa) throw new EditorError("Artículo no encontrado", 404);
  const base = await baseDelProyecto(deps, input.orgId, project);

  const futuros = (await deps.blog.listPosts(input.orgId, input.projectId)).filter((p) => p.id !== previa.id);
  const indice = renderIndex(tpl.tplIndex, itemsIndice(futuros));
  const xml = quitarDelSitemap((await sitemapPrevio(deps, current)) ?? "", `${base}/blog/${previa.slug}.html`);
  const sitemap = actualizarSitemap(xml || null, [{ loc: `${base}/blog/index.html`, lastmod: hoy() }]);

  const { snapshotId } = await crearSnapshotEditado(deps, {
    orgId: input.orgId, projectId: input.projectId,
    currentSnapshot: { id: current.id, storagePrefix: current.storagePrefix },
    transformar: () => null,
    extras: new Map([
      ["blog/index.html", { body: Buffer.from(indice, "utf-8"), contentType: HTML }],
      ["sitemap.xml", { body: Buffer.from(sitemap, "utf-8"), contentType: XML }],
    ]),
    excluir: new Set(["blog/index.html", "sitemap.xml", `blog/${previa.slug}.html`, `blog/img/${previa.slug}.${previa.imagenExt}`]),
    tipo: "blog",
    operacionesJson: { blog: { accion: "borrar", slug: previa.slug } },
  });
  await deps.blog.deletePost(input.orgId, input.projectId, previa.id);
  return { snapshotId };
}

export async function guardarPlantillas(deps: Deps, input: { orgId: string; projectId: string; tplPost: string; tplIndex: string }): Promise<{ snapshotId: string | null }> {
  const errores = validarPlantillas(input.tplPost, input.tplIndex);
  if (errores.length) throw new EditorError(errores.join(" · "), 400);
  const { project, current } = await contexto(deps, input.orgId, input.projectId);
  const posts = await deps.blog.listPosts(input.orgId, input.projectId);
  if (posts.length === 0) {
    await deps.blog.setBlogTemplate(input.orgId, input.projectId, { tplPost: input.tplPost, tplIndex: input.tplIndex });
    return { snapshotId: null };
  }
  const base = await baseDelProyecto(deps, input.orgId, project);
  const excluir = new Set(["blog/index.html", "sitemap.xml"]);
  const extras = new Map<string, { body: Buffer; contentType: string }>();
  const entradas: { loc: string; lastmod: string }[] = [{ loc: `${base}/blog/index.html`, lastmod: hoy() }];
  for (const p of posts) {
    const html = renderPost(input.tplPost, { titulo: p.titulo, slug: p.slug, metaDescripcion: p.metaDescripcion, md: p.md, imagenExt: p.imagenExt }, p.fecha, base);
    excluir.add(`blog/${p.slug}.html`);
    extras.set(`blog/${p.slug}.html`, { body: Buffer.from(html, "utf-8"), contentType: HTML });
    entradas.push({ loc: `${base}/blog/${p.slug}.html`, lastmod: hoy() });
  }
  const ordenados = posts.map((p) => ({ titulo: p.titulo, slug: p.slug, metaDescripcion: p.metaDescripcion, fecha: p.fecha, imagenExt: p.imagenExt, createdAt: p.createdAt }));
  ordenar(ordenados);
  extras.set("blog/index.html", { body: Buffer.from(renderIndex(input.tplIndex, itemsIndice(ordenados)), "utf-8"), contentType: HTML });
  extras.set("sitemap.xml", { body: Buffer.from(actualizarSitemap(await sitemapPrevio(deps, current), entradas), "utf-8"), contentType: XML });

  const { snapshotId } = await crearSnapshotEditado(deps, {
    orgId: input.orgId, projectId: input.projectId,
    currentSnapshot: { id: current.id, storagePrefix: current.storagePrefix },
    transformar: () => null, extras, excluir, tipo: "blog",
    operacionesJson: { blog: { accion: "plantilla" } },
  });
  await deps.blog.setBlogTemplate(input.orgId, input.projectId, { tplPost: input.tplPost, tplIndex: input.tplIndex });
  return { snapshotId };
}

export async function previewBlog(deps: Deps, input: {
  orgId: string; projectId: string; cual?: "post" | "index";
  tplPost?: string; tplIndex?: string;
  titulo?: string; slug?: string; metaDescripcion?: string; md?: string; imagenUrl?: string;
}): Promise<{ html: string }> {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const guardada = await deps.blog.getBlogTemplate(input.orgId, input.projectId);
  const cual = input.cual ?? "post";
  const base = basePublica(project, sitesBaseDomain()) ?? "https://ejemplo.local";
  if (cual === "index") {
    const tplIndex = input.tplIndex ?? guardada?.tplIndex;
    if (!tplIndex) throw new EditorError(MSG_SIN_PLANTILLA, 400);
    const item = { ...DATOS_EJEMPLO, fecha: hoy() };
    let html: string;
    try {
      html = renderIndex(tplIndex, [{ titulo: item.titulo, slug: item.slug, metaDescripcion: item.metaDescripcion, fecha: item.fecha, imagen: IMAGEN_EJEMPLO }]);
    } catch (e) {
      throw new EditorError(e instanceof Error ? e.message : "Plantilla no válida", 400);
    }
    return { html };
  }
  const tplPost = input.tplPost ?? guardada?.tplPost;
  if (!tplPost) throw new EditorError(MSG_SIN_PLANTILLA, 400);
  const datos = {
    titulo: input.titulo?.trim() ? input.titulo : DATOS_EJEMPLO.titulo,
    slug: input.slug?.trim() ? input.slug : DATOS_EJEMPLO.slug,
    metaDescripcion: input.metaDescripcion?.trim() ? input.metaDescripcion : DATOS_EJEMPLO.metaDescripcion,
    md: input.md?.trim() ? input.md : DATOS_EJEMPLO.md,
    imagenExt: "png",
  };
  return { html: renderPost(tplPost, datos, hoy(), base, input.imagenUrl ?? IMAGEN_EJEMPLO) };
}
```

- [ ] **Step 4:** `npx vitest run` verde (todos los casos del Step 2) + `npx tsc --noEmit`.
- [ ] **Step 5:** Commit: `feat(4a): operaciones del blog — guardar/editar/borrar artículo, plantillas y preview sobre snapshots`

---

### Task 7: Rutas API del blog

**Files:**
- Create: `app/api/projects/[id]/blog/route.ts`, `app/api/projects/[id]/blog/template/route.ts`, `app/api/projects/[id]/blog/preview/route.ts`, `app/api/projects/[id]/blog/posts/route.ts`, `app/api/projects/[id]/blog/posts/[postId]/route.ts`

**Interfaces:**
- Consumes: `estadoBlog/guardarPost/borrarPost/guardarPlantillas/previewBlog` (Task 6), `generarPlantillas` (Task 5), `blogStore` (Task 2). Wiring idéntico a `app/api/projects/[id]/tools/route.ts` (`getDevContext`, `projectStore`, `getStorage`, `conError` con `EditorError` → status, resto → 500 «Error interno», `export const runtime = "nodejs"`).
- Produces: la API del spec (tabla «API»). Deps para todas: `{ store: projectStore, blog: blogStore, storage: getStorage() }`.

- [ ] **Step 1:** `app/api/projects/[id]/blog/route.ts` — GET → `estadoBlog` → 200.
- [ ] **Step 2:** `app/api/projects/[id]/blog/template/route.ts`:
  - GET → `blogStore.getBlogTemplate` (404 «Proyecto no encontrado» si `projectStore.getProject` da null; si no hay plantilla → `{ tplPost: null, tplIndex: null }`).
  - POST → `generarPlantillas` → 200 `{ tplPost, tplIndex }`.
  - PUT (body `{ tplPost, tplIndex }`, strings; si faltan → 400 con el mensaje de huecos requeridos vía `validarPlantillas("","")`) → `guardarPlantillas` → 200 `{ snapshotId }`.
- [ ] **Step 3:** `app/api/projects/[id]/blog/preview/route.ts` — POST body → `previewBlog` → 200 `{ html }`.
- [ ] **Step 4:** `app/api/projects/[id]/blog/posts/route.ts` — POST body `{ titulo, slug, metaDescripcion, md, imagenAssetId }` (defaults `""` si faltan; tipos no-string → `""`) → `guardarPost` sin `postId` → **201** `{ postId, snapshotId }`.
- [ ] **Step 5:** `app/api/projects/[id]/blog/posts/[postId]/route.ts` — GET → `blogStore.getPost` (404 «Artículo no encontrado» si null; también «Proyecto no encontrado» si el proyecto no existe) → 200 fila completa; PUT (mismo body que POST) → `guardarPost` con `postId` → 200; DELETE → `borrarPost` → 200.

Ejemplo del patrón (aplicar a todas):

```ts
import { NextResponse } from "next/server";
import { getDevContext } from "@/src/auth/dev-stub";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { blogStore } from "@/src/repositories/blog";
import { guardarPost } from "@/src/blog/apply";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

function conError(e: unknown) {
  if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getDevContext();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  try {
    const r = await guardarPost(
      { store: projectStore, blog: blogStore, storage: getStorage() },
      { orgId, projectId: id, titulo: s(b.titulo), slug: s(b.slug), metaDescripcion: s(b.metaDescripcion), md: s(b.md), imagenAssetId: s(b.imagenAssetId) }
    );
    return NextResponse.json(r, { status: 201 });
  } catch (e) { return conError(e); }
}
```

- [ ] **Step 6:** `npx tsc --noEmit` + `npx vitest run` (sin tests de ruta: la lógica está testada en Task 6; el circuito HTTP se cubre en e2e, patrón del proyecto).
- [ ] **Step 7:** Commit: `feat(4a): API del blog — estado, plantillas (generar/guardar), preview y CRUD de artículos`

---

### Task 8: UI — `BlogPanel.tsx` + wiring

**Files:**
- Create: `app/projects/[id]/BlogPanel.tsx`
- Modify: `app/projects/[id]/ToolsPanel.tsx` (exportar `BotonSubir`: cambiar `function BotonSubir` → `export function BotonSubir`), `app/projects/[id]/page.tsx` (añadir `<BlogPanel projectId={id} />` entre `<ToolsPanel …>` y `<PreviewPane …>`, con su import)

**Interfaces:**
- Consumes: API de Task 7; `BotonSubir` de ToolsPanel; `slugify` de `@/src/blog/slug`; flujo de assets `POST /api/projects/[id]/assets` → `{ assetId, ext, url }`.
- Reglas del patrón establecido (¡findings previos!): **subcomponentes a NIVEL DE MÓDULO** (nunca dentro del componente: pérdida de foco al teclear), errores de red visibles («Error de conexión»), `router.refresh()` tras cada guardado (badge «cambios sin publicar» + Historial).

- [ ] **Step 1:** crear `app/projects/[id]/BlogPanel.tsx` (client). Estructura completa:

```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/src/blog/slug";
import { BotonSubir } from "./ToolsPanel";

type EstadoBlog = { tienePlantilla: boolean; posts: { id: string; titulo: string; slug: string; fecha: string }[] };
type Vista = "lista" | "plantillas" | "editor";

const AVISO = "Las páginas del blog se generan desde aquí; si las tocas con el editor visual, la próxima regeneración del blog deshará esos cambios.";

function IframePreview({ html }: { html: string }) {
  return <iframe srcDoc={html} sandbox="" className="h-96 w-full rounded border bg-white" title="vista previa" />;
}

export function BlogPanel({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<Vista>("lista");
  const [estado, setEstado] = useState<EstadoBlog | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // plantillas
  const [tplPost, setTplPost] = useState("");
  const [tplIndex, setTplIndex] = useState("");
  const [previewTpl, setPreviewTpl] = useState<string | null>(null);
  // editor de artículo
  const [postId, setPostId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTocado, setSlugTocado] = useState(false);
  const [meta, setMeta] = useState("");
  const [md, setMd] = useState("");
  const [imagenAssetId, setImagenAssetId] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [previewArt, setPreviewArt] = useState<string | null>(null);

  async function cargar() {
    try {
      const res = await fetch(`/api/projects/${projectId}/blog`);
      if (res.ok) setEstado((await res.json()) as EstadoBlog);
    } catch { /* silencioso: se reintenta al reabrir */ }
  }
  useEffect(() => { if (abierto && !estado) void cargar(); }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  async function llamar(url: string, init: RequestInit): Promise<Record<string, unknown> | null> {
    setOcupado(true); setError(null);
    try {
      const res = await fetch(url, init);
      const d = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) { setError((d.error as string) ?? "Error"); return null; }
      return d;
    } catch { setError("Error de conexión"); return null; }
    finally { setOcupado(false); }
  }

  async function generarPlantillas() {
    const d = await llamar(`/api/projects/${projectId}/blog/template`, { method: "POST" });
    if (d) { setTplPost(d.tplPost as string); setTplIndex(d.tplIndex as string); setPreviewTpl(null); }
  }
  async function abrirPlantillas() {
    setVista("plantillas"); setPreviewTpl(null);
    const d = await llamar(`/api/projects/${projectId}/blog/template`, { method: "GET" });
    if (d && d.tplPost) { setTplPost(d.tplPost as string); setTplIndex(d.tplIndex as string); }
  }
  async function guardarPlantillas() {
    const d = await llamar(`/api/projects/${projectId}/blog/template`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ tplPost, tplIndex }),
    });
    if (d) { setVista("lista"); setEstado(null); await cargar(); router.refresh(); }
  }
  async function verPreview(cual: "post" | "index") {
    const body = cual === "post" ? { cual, tplPost } : { cual, tplIndex };
    const d = await llamar(`/api/projects/${projectId}/blog/preview`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    if (d) setPreviewTpl(d.html as string);
  }

  function nuevoArticulo() {
    setPostId(null); setTitulo(""); setSlug(""); setSlugTocado(false); setMeta(""); setMd("");
    setImagenAssetId(""); setImagenUrl(""); setPreviewArt(null); setVista("editor");
  }
  async function editarArticulo(id: string) {
    const d = await llamar(`/api/projects/${projectId}/blog/posts/${id}`, { method: "GET" });
    if (!d) return;
    setPostId(id); setTitulo(d.titulo as string); setSlug(d.slug as string); setSlugTocado(true);
    setMeta(d.metaDescripcion as string); setMd(d.md as string);
    setImagenAssetId(d.imagenAssetId as string);
    setImagenUrl(`/api/projects/${projectId}/preview/blog/img/${d.slug}.${d.imagenExt}`);
    setPreviewArt(null); setVista("editor");
  }
  async function subirPortada(f: File) {
    setOcupado(true); setError(null);
    try {
      const fd = new FormData(); fd.append("file", f);
      const res = await fetch(`/api/projects/${projectId}/assets`, { method: "POST", body: fd });
      const d = (await res.json().catch(() => ({}))) as { error?: string; assetId?: string; url?: string };
      if (!res.ok || !d.assetId) { setError(d.error ?? "Error al subir la imagen"); return; }
      setImagenAssetId(d.assetId); setImagenUrl(d.url ?? "");
    } catch { setError("Error de conexión"); }
    finally { setOcupado(false); }
  }
  async function verPreviewArticulo() {
    const d = await llamar(`/api/projects/${projectId}/blog/preview`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ cual: "post", titulo, slug, metaDescripcion: meta, md, imagenUrl: imagenUrl || undefined }),
    });
    if (d) setPreviewArt(d.html as string);
  }
  async function guardarArticulo() {
    const body = JSON.stringify({ titulo, slug, metaDescripcion: meta, md, imagenAssetId });
    const d = postId
      ? await llamar(`/api/projects/${projectId}/blog/posts/${postId}`, { method: "PUT", headers: { "content-type": "application/json" }, body })
      : await llamar(`/api/projects/${projectId}/blog/posts`, { method: "POST", headers: { "content-type": "application/json" }, body });
    if (d) { setVista("lista"); setEstado(null); await cargar(); router.refresh(); }
  }
  async function borrarArticulo(id: string, tituloPost: string) {
    if (!confirm(`¿Borrar el artículo "${tituloPost}"? Esta acción no se puede deshacer.`)) return;
    const d = await llamar(`/api/projects/${projectId}/blog/posts/${id}`, { method: "DELETE" });
    if (d) { setEstado(null); await cargar(); router.refresh(); }
  }
  // …render (Step 2)
}
```

- [ ] **Step 2:** el render del componente (mismo archivo), tres vistas:

```tsx
  return (
    <div className="mb-3 rounded-lg border bg-gray-50 px-3 py-2">
      <button onClick={() => setAbierto(!abierto)} className="text-sm font-medium">
        {abierto ? "▾" : "▸"} Blog
      </button>
      {abierto && (
        <div className="mt-2">
          <p className="mb-2 text-xs text-gray-500">{AVISO}</p>

          {vista === "lista" && (
            <div>
              {estado && !estado.tienePlantilla ? (
                <div className="rounded-lg border bg-white p-3">
                  <p className="text-sm font-medium">El blog de tu web</p>
                  <p className="mb-2 text-xs text-gray-500">Artículos con tu diseño, índice y sitemap automáticos. Primero crea la plantilla: la IA lee tu portada y propone el diseño del blog.</p>
                  <button onClick={() => { setVista("plantillas"); void generarPlantillas(); }} disabled={ocupado}
                    className="rounded bg-indigo-600 px-3 py-1 text-sm text-white disabled:opacity-50">Crear la plantilla del blog con IA</button>
                </div>
              ) : (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <button onClick={nuevoArticulo} className="rounded bg-indigo-600 px-3 py-1 text-sm text-white">Nuevo artículo</button>
                    <button onClick={() => void abrirPlantillas()} className="text-xs text-gray-500 underline">Editar plantillas</button>
                    {ocupado && <span className="text-sm text-gray-400">cargando…</span>}
                  </div>
                  <ul className="space-y-1">
                    {(estado?.posts ?? []).map((p) => (
                      <li key={p.id} className="flex items-center justify-between rounded border bg-white px-2 py-1 text-sm">
                        <span>{p.titulo} <span className="text-xs text-gray-400">· {p.fecha} · /blog/{p.slug}.html</span></span>
                        <span className="flex gap-2">
                          <button onClick={() => void editarArticulo(p.id)} disabled={ocupado} className="rounded border px-2 py-0.5 text-xs">Editar</button>
                          <button onClick={() => void borrarArticulo(p.id, p.titulo)} disabled={ocupado} className="text-xs text-gray-500 underline">borrar</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {vista === "plantillas" && (
            <div className="space-y-2">
              {ocupado && !tplPost && <p className="text-sm text-gray-500">Generando la plantilla con IA (puede tardar un minuto)…</p>}
              {tplPost && (
                <>
                  <label className="block text-xs font-medium">Plantilla de artículo</label>
                  <textarea value={tplPost} onChange={(e) => setTplPost(e.target.value)} rows={8} className="w-full rounded border p-2 font-mono text-xs" />
                  <label className="block text-xs font-medium">Plantilla del índice</label>
                  <textarea value={tplIndex} onChange={(e) => setTplIndex(e.target.value)} rows={8} className="w-full rounded border p-2 font-mono text-xs" />
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => void guardarPlantillas()} disabled={ocupado} className="rounded bg-indigo-600 px-3 py-1 text-sm text-white disabled:opacity-50">Guardar plantillas</button>
                    <button onClick={() => void verPreview("post")} disabled={ocupado} className="rounded border px-2 py-1 text-xs">Vista previa artículo</button>
                    <button onClick={() => void verPreview("index")} disabled={ocupado} className="rounded border px-2 py-1 text-xs">Vista previa índice</button>
                    <button onClick={() => void generarPlantillas()} disabled={ocupado} className="rounded border px-2 py-1 text-xs">Volver a generar</button>
                    <button onClick={() => setVista("lista")} className="rounded border px-2 py-1 text-xs">Cancelar</button>
                  </div>
                  {previewTpl && <IframePreview html={previewTpl} />}
                </>
              )}
            </div>
          )}

          {vista === "editor" && (
            <div className="space-y-2">
              <input value={titulo} placeholder="Título del artículo"
                onChange={(e) => { setTitulo(e.target.value); if (!slugTocado) setSlug(slugify(e.target.value)); }}
                className="w-full rounded border px-2 py-1 text-sm" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">/blog/</span>
                <input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTocado(true); }}
                  className="w-64 rounded border px-2 py-1 text-xs" />
                <span className="text-xs text-gray-500">.html</span>
              </div>
              <div>
                <input value={meta} placeholder="Meta descripción (para Google)"
                  onChange={(e) => setMeta(e.target.value)} className="w-full rounded border px-2 py-1 text-sm" />
                <span className={"text-xs " + (meta.length > 160 ? "text-red-600" : "text-gray-400")}>{meta.length}/160</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Imagen de portada:</span>
                {imagenUrl && <img src={imagenUrl} alt="" className="h-8 w-14 rounded object-cover" />}
                <BotonSubir texto={imagenAssetId ? "Cambiar imagen" : "Subir imagen"} ocupado={ocupado} onFile={(f) => void subirPortada(f)} />
              </div>
              <textarea value={md} onChange={(e) => setMd(e.target.value)} rows={14}
                placeholder="Escribe o pega aquí el artículo en markdown (por ejemplo, el que te escribió tu IA)…"
                className="w-full rounded border p-2 font-mono text-xs" />
              <div className="flex gap-2">
                <button onClick={() => void guardarArticulo()} disabled={ocupado} className="rounded bg-indigo-600 px-3 py-1 text-sm text-white disabled:opacity-50">Guardar artículo</button>
                <button onClick={() => void verPreviewArticulo()} disabled={ocupado} className="rounded border px-2 py-1 text-xs">Vista previa</button>
                <button onClick={() => setVista("lista")} className="rounded border px-2 py-1 text-xs">Cancelar</button>
              </div>
              {previewArt && <IframePreview html={previewArt} />}
            </div>
          )}

          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
```

- [ ] **Step 3:** exportar `BotonSubir` en `ToolsPanel.tsx` y añadir `<BlogPanel projectId={id} />` (+ import) en `page.tsx` justo después de `<ToolsPanel projectId={id} />`.
- [ ] **Step 4:** `npx tsc --noEmit` + `npx vitest run` + `node --check` no aplica (TSX); arrancar `npm run dev` y comprobar a mano que la sección aparece y el GET de estado responde (login `dev1234`).
- [ ] **Step 5:** Commit: `feat(4a): BlogPanel — plantillas con IA, editor de artículos con preview y lista`

---

### Task 9: E2e real + verificación final

**Files:**
- Create: `<scratchpad>/e2e-4a.mjs` (fuera del repo, como e2e-3b/3c)

**Interfaces:** Consumes: dev server (`npm run dev`) + Supabase real + API completa. Patrón del script: `e2e-3c.mjs` del scratchpad (login `dev1234` → cookie; helper `check(nombre, cond)`; crea proyecto vía `POST /api/projects` con ZIP mínimo).

- [ ] **Step 1:** escribir `e2e-4a.mjs`. Sitio mínimo: `index.html` con `<link rel="stylesheet" href="estilos.css">` y un `sitemap.xml` previo con una loc ajena (`https://otro.com/x.html`). **Plantillas fixture vía PUT** (sin IA):
  - tplPost: html mínimo con los 7 huecos.
  - tplIndex: con marcadores y los 5 huecos del ítem.
  Checks (≈20):
  1. PUT plantillas sin posts → 200 `{ snapshotId: null }`; GET template devuelve lo guardado; GET blog → `tienePlantilla: true`.
  2. Subir imagen de portada (PNG 1px) → assetId.
  3. POST post inválido (sin título, meta larga) → 400 y mensaje contiene «Falta el título» y « · ».
  4. POST post válido → 201; snapshot nuevo (GET snapshots: el más reciente `tipo: "blog"`).
  5. Preview del borrador sirve `/preview/blog/<slug>.html` (contiene el H2 del markdown renderizado y el título escapado) y `/preview/blog/index.html` (contiene el título).
  6. `sitemap.xml` del borrador: contiene la loc del post, la del índice Y la ajena previa.
  7. POST preview efímero (cual: post, campos) → html con el contenido.
  8. PUT post con slug nuevo → 200; el html viejo ya NO está en el preview (404) y el sitemap perdió la loc vieja.
  9. Slug duplicado (crear 2º post con el mismo slug) → 400 «ya existe en este sitio».
  10. PUT plantillas nuevas (con posts) → 200 con snapshotId; el html del post refleja la plantilla nueva.
  11. DELETE post → 200; su html 404 en preview; índice sin él; sitemap sin su loc; la fila desaparece de GET blog.
  12. Publicar el proyecto → el HOST público (`Host: <subdominio>.localhost:3000` contra `/`) sirve `blog/index.html` y el post; borrador≠publicado sigue funcionando (editar tras publicar no cambia lo público).
- [ ] **Step 2:** arrancar dev server, ejecutar `node e2e-4a.mjs` → TODOS los checks PASS (arreglar lo que falle antes de seguir).
- [ ] **Step 3:** `npx vitest run` (suite entera) + `npx tsc --noEmit` limpios.
- [ ] **Step 4:** Commit final si hubo arreglos: `fix(4a): ajustes de e2e`

---

## Self-review del plan (hecho)

- Cobertura del spec: modelo de datos (T2), libs portadas (T1), render+escape+base (T4), IA plantillas + validación (T5), operaciones/snapshots/subdominio (T6), API completa (T7), UI (T8), e2e sin IA (T9). Los mensajes byte-exactos del spec están todos en Global Constraints.
- La validación con IA real (generar plantilla con la clave del usuario) queda para la validación de usuario en navegador, como dice el spec.
- Tipos coherentes entre tareas (PostRow/BlogStore de T2 usados en T6; renderPost de T4 en T5/T6; excluir/tipo de T3 en T6).
