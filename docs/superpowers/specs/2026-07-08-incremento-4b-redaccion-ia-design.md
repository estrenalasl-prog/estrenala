# Incremento 4b — Redacción de artículos con IA (diseño)

Fecha: 2026-07-08 · Estado: aprobado en conversación, pendiente de revisión del spec

## Contexto y objetivo

El 4a (fusionado) dejó el blog funcionando: plantillas con IA, artículos en markdown a mano,
publicación por snapshots. El 4b añade el **pipeline editorial de 6 etapas** del proyecto hermano
`Creador de Blog/` para que el usuario **genere el borrador del artículo con IA** en vez de
escribirlo a mano. Fuente y principio: se portan las etapas casi verbatim; la IA produce el
markdown + título/slug/meta, y el usuario revisa en el **editor de artículos del 4a ya existente**.

Decisiones del usuario (2026-07-08):
1. **Pipeline completo de 6 etapas**, incluida la investigación web (máxima calidad; el usuario ya
   lo usa y le funciona).
2. La **keyword/tema la escribe el usuario** a mano (el radar automático de tendencias es el 4c).
3. **Nicho**: un campo de texto que el usuario rellena una vez («De qué va tu blog»). Idioma: `es`
   por defecto (columna configurable, sin UI de idioma en 4b).

## Enfoque de almacenamiento

Un `posts` del 4a es un artículo **ya guardado** (está en el snapshot). El borrador que el pipeline
construye es una entidad distinta con su propio ciclo de vida. Se usa una tabla **`article_drafts`
separada** (no se toca `posts`): guarda keyword + los artefactos de cada etapa + estado. Cuando el
borrador llega a `revision`, el editor del 4a se **pre-rellena** con título/slug/meta/markdown; el
usuario sube la portada y pulsa **Guardar artículo** (flujo 4a existente → post + snapshot). Tras
guardar con éxito, el cliente borra el borrador.

Se descartó extender `posts` con campos de pipeline (mezcla borrador-en-construcción con
artículo-guardado y ensucia el 4a).

## Modelo de datos (Drizzle/Postgres, SQL manual aplicado como en 4a)

```
article_drafts:
  id uuid pk default random, project_id uuid notnull → projects(id),
  keyword text notnull,
  analisis_json text, plan_md text, investigacion_md text, articulo_md text,
  links_hechos integer notnull default 0,
  titulo text, slug text, meta_descripcion text,
  estado text notnull default 'pipeline',   -- pipeline | revision | error
  error_msg text,
  created_at timestamptz notnull default now, updated_at timestamptz notnull default now

blog_settings:                              -- config del blog por proyecto (nicho, idioma, futuro)
  id uuid pk default random, project_id uuid notnull unique → projects(id),
  nicho text notnull default '',
  idioma text notnull default 'es',
  created_at timestamptz notnull default now, updated_at timestamptz notnull default now
```

`blog_settings` es tabla propia (no columnas en `blog_templates`) para desacoplar la config del blog
de las plantillas y dar sitio a ajustes futuros (dashboard). Acceso vía extensión de `BlogStore`:
`getBlogSettings`, `setBlogSettings`, `createDraft`, `getDraft`, `listDrafts`, `updateDraft`,
`deleteDraft` (todas org-scoped por join con `projects`, patrón 4a).

## Cliente OpenRouter — lo que falta portar (`src/ia/claude.ts`)

El 4a portó solo `pedirJson`/`limpiarJson`/`probarConexionModelo`/`PlantillasSchema`/`OpenRouterError`.
El 4b añade (verbatim del Creador de Blog salvo el error tipado ya existente):
- `pedirTexto(prompt, maxTokens=8000)` — completación de texto.
- `pedirConBusquedaWeb(prompt, maxTokens=8000, maxBusquedas=6)` — usa el plugin `web` de OpenRouter
  (`plugins:[{id:"web", max_results:maxBusquedas}]`) para la etapa de investigación.
- `AnalisisSchema` = `{ keyword_principal: string, keywords_secundarias: string[], intencion_busqueda: string }`, `type Analisis`.
- `MetadatosSchema` = `{ titulo: string, slug: string, meta_descripcion: string }`, `type Metadatos`.
- `completar` ya mapea errores a `OpenRouterError` (incluido 402); las etapas heredan esa barrera.

## Pipeline (`src/blog/pipeline/`, port de las 6 etapas)

`tipos.ts`: `ETAPAS = ["analisis","plan","investigacion","redaccion","links","metadatos"]`, `type Etapa`.
`type Contexto = { nombre: string; nicho: string; idioma: string; base: string }` (base = `basePublica`
del proyecto, para los enlaces internos/URLs). `type FnEtapa = (draft, ctx, deps, instruccion?) =>
Promise<Partial<DraftFields>>` donde `deps = { store: ProjectStore; blog: BlogStore }`.

Etapas (prompts portados; se adapta `sitio.nombre/nicho/idioma/dominio` → `ctx`, `post.keywordTexto`
→ `draft.keyword`, y las consultas a posts publicados → `blog.listPosts`):
- **analisis** → `pedirJson(AnalisisSchema, 2000)` → `{ analisisJson: JSON.stringify(...) }`.
- **plan** → `pedirTexto(3000)`; incluye títulos de posts existentes para no repetir tema → `{ planMd }`.
- **investigacion** → `pedirConBusquedaWeb(8000)` → `{ investigacionMd }`.
- **redaccion** → `pedirTexto(16000)` (~2000 palabras, H1 con keyword, FAQ, citas) → `{ articuloMd }`.
- **links** → si hay posts previos, `pedirTexto(16000)` inserta 3-5 enlaces internos a
  `base + /blog/<slug>.html`; si no hay, no-op → `{ articuloMd, linksHechos: 1 }` (o solo `linksHechos: 1`).
- **metadatos** → `pedirJson(MetadatosSchema, 1500)` + `slugify`/`slugUnico` contra slugs existentes
  (`blog.listPosts`) → `{ titulo, slug, metaDescripcion }`.

`index.ts` (orquestador, port de `ejecutarEtapa`, en async/Postgres):
- `etapaCompletada(draft, etapa)`: analisis=!!analisis_json, plan=!!plan_md, investigacion=!!investigacion_md,
  redaccion=!!articulo_md, links=links_hechos===1, metadatos=!!(titulo && slug && meta_descripcion).
- `siguienteEtapa(draft)`: primera etapa no completada, o null.
- `ejecutarEtapa(deps, draftId, etapa, instruccion?)`: valida prerrequisitos (todas las previas
  completas, si no → lanza `Antes hay que completar la etapa "<previa>"`); ejecuta la fn; persiste
  los cambios con `errorMsg=null, estado="pipeline"`; si `siguienteEtapa===null` → `estado="revision"`.
  Si la fn lanza: persiste `estado="error", errorMsg="[<etapa>] <msg>"` y devuelve `{ ok:false, error }`.

## API (tras el candado, org-scoped, patrón 4a: runtime nodejs, conError con EditorError→status / 500 «Error interno»)

| Ruta | Métodos | OK | Errores |
|---|---|---|---|
| `/api/projects/[id]/blog/settings` | GET → `{ nicho, idioma }` (defaults `{ nicho:"", idioma:"es" }` si no hay fila) · PUT `{ nicho, idioma? }` → 200 (upsert) | | 404 «Proyecto no encontrado» |
| `/api/projects/[id]/blog/drafts` | GET → `[{ id, keyword, estado, titulo, createdAt }]` · POST `{ keyword }` → 201 `{ draftId }` | | 400 «Escribe una keyword o tema para el artículo» (keyword vacía) · 400 «Configura primero de qué va tu blog (campo Nicho)» si `blog_settings.nicho` vacío |
| `/api/projects/[id]/blog/drafts/[draftId]` | GET → `{ draft, etapas:[{nombre,completada}], siguiente }` · DELETE → 200 | | 404 «Borrador no encontrado» |
| `/api/projects/[id]/blog/drafts/[draftId]/stage` | POST `{ etapa, instruccion? }` → 200 `{ ok:true }` o 500 `{ ok:false, error }` | | 400 «Etapa desconocida» · 404 «Borrador no encontrado» · 400 prerrequisito «Antes hay que completar la etapa "<x>"» |

- Límite: `keyword` ≤ 200 chars; `instruccion` ≤ 1000; `nicho` ≤ 2000.
- El **guardado del artículo** reusa el `POST /api/projects/[id]/blog/posts` del 4a con
  título/slug/meta/markdown del borrador + `imagenAssetId` (portada subida por el usuario). No hay
  endpoint «promover»: el editor 4a se pre-rellena y guarda como siempre; luego el cliente hace
  `DELETE` del borrador.

## UI (BlogPanel + `ArticleAiWorkspace.tsx` a nivel de módulo)

Amplía `app/projects/[id]/BlogPanel.tsx` (sin romper el 4a; subcomponentes a NIVEL DE MÓDULO por la
regla de foco):
1. **Config del blog**: campo «De qué va tu blog» (textarea del nicho) + guardar, en la vista lista.
2. Botón **«Escribir artículo con IA»** → input de keyword/tema → crea borrador → **workspace**.
3. **`ArticleAiWorkspace`** (port de `PostWorkspace`): las 6 etapas con estado (○/⏳/✅), **«▶ Ejecutar
   <etapa>»**, **«⏩ Auto hasta revisión»** (corre en bucle hasta `revision` o error; con aviso de que
   consume IA), **«⏹ Detener»**, y por etapa completada **«↻ Regenerar»** + instrucción opcional;
   cada etapa muestra su resultado en un desplegable. Errores de etapa visibles (draft.error_msg).
4. En **`revision`**: botón **«Usar este borrador»** → abre el editor de artículos del 4a
   pre-rellenado (título/slug/meta/markdown); el usuario sube la portada y **Guarda artículo**
   (flujo 4a). Tras guardar OK, `DELETE` del borrador y `router.refresh()`.
5. Errores de red → «Error de conexión» (patrón 4a). Sin saldo (402) → el mensaje claro de OpenRouter
   heredado del 4a.

## Coste y seguridad

- El pipeline son 6 llamadas IA (redacción 16k tokens, investigación con web) → ~$0.30-0.60/artículo
  con Sonnet 4.6; el modelo sale de `OPENROUTER_MODEL` (cambiable); la elección por usuario llega con
  el BYOK (fuera de 4b). El «Auto hasta revisión» avisa de que gasta IA; el diseño por etapas evita
  rehacer todo. Clave solo en servidor.
- Rutas nuevas bajo `/api/projects/*` → cubiertas por el candado. Org-scoping por join en BlogStore.
- El markdown generado es contenido del usuario que acaba en SU sitio (mismo nivel de confianza que
  el 4a); el render del 4a ya escapa título/meta/fecha.

## Casos borde

- **Regenerar una etapa intermedia** no invalida las posteriores automáticamente (igual que el
  original): si regeneras el plan, la redacción previa sigue ahí hasta que la regeneres tú. Se
  documenta en la UI (el usuario controla qué regenerar).
- **Borrador sin nicho**: crear borrador exige `nicho` no vacío (400 con mensaje que apunta al campo).
- **Sin posts previos**: la etapa de enlaces es no-op; el plan no lista títulos previos.
- **Borrador huérfano**: si el usuario no lo termina, queda en la lista de borradores (puede borrarlo);
  no genera snapshot ni toca el sitio hasta «Guardar artículo».
- **Fallo a mitad de auto**: se detiene en la etapa que falló con `estado="error"`; el usuario ve el
  error y puede reintentar esa etapa.

## Testing

- **Unit**: orquestador (prerrequisitos, `siguienteEtapa`, `etapaCompletada`, persistencia de error
  con mensaje `[<etapa>] ...`, transición a `revision`) con IA mockeada y fakes de store/draft; cada
  etapa (prompt contiene keyword/nicho/plan según corresponda; mapeo del campo devuelto; links no-op
  sin posts previos; metadatos deduplica slug) con `pedirTexto`/`pedirJson`/`pedirConBusquedaWeb`
  mockeados; cliente IA nuevo (`pedirTexto`, `pedirConBusquedaWeb` con `fetch` mockeado — payload del
  plugin web correcto); guards de las rutas.
- **E2e** (dev server + Supabase real) **sin gastar IA**: settings PUT/GET; crear borrador (400 si
  falta nicho); prerrequisitos (ejecutar `redaccion` antes de `analisis` → 400); **sembrando los
  artefactos de etapa directamente en BD** (no IA), el borrador llega a `revision`; el handoff
  pre-rellena y `POST /blog/posts` crea el post + snapshot con el markdown del borrador; DELETE del
  borrador. La generación IA real (con su clave/coste) la valida el usuario en navegador.

## Fuera de alcance (explícito)

Radar de keywords automático (4c) · generación de imagen de portada (la sube el usuario) · selección
de modelo por usuario (BYOK) · programación/publicación automática · edición rich-text del cuerpo
(backlog de blog, ver design-brief).
