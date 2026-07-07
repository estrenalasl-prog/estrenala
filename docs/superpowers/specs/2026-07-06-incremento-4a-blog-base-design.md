# Incremento 4a — Blog base (diseño)

Fecha: 2026-07-06 · Estado: aprobado en conversación, pendiente de revisión del spec

## Contexto y objetivo

Wordclicks promete «webs hechas con IA con blog automático». El incremento 4 se trocea en:
**4a (este spec)** = la base del blog funcionando dentro de Wordclicks; **4b** = redacción con IA
(pipeline editorial de 6 etapas); **4c** = radar de keywords. La fuente es el proyecto hermano
`Creador de Blog/` (app local ya validada por el usuario): se portan sus libs deterministas y su
principio de oro — **la IA nunca genera el HTML final**; un artículo siempre se renderiza de forma
determinista (plantilla + markdown).

Decisiones del usuario (2026-07-06):
1. Alcance: 4a base ahora; IA de redacción y radar después.
2. Plantillas del blog: generadas **con IA desde la portada del proyecto** (una llamada a Claude
   vía OpenRouter por proyecto; revisables, editables y regenerables). Única pieza de IA del 4a.
3. Contenido del artículo: **markdown pegado/escrito a mano** + campos (título, slug, meta,
   portada) + vista previa con la plantilla real. El 4b solo añadirá «que lo escriba solo».

## Enfoque

**El blog son archivos del sitio.** Cada operación de blog regenera los archivos afectados dentro
de un **snapshot nuevo** del proyecto (borrador), con la mecánica ya existente
(`crearSnapshotEditado`). Publicar, dominios, historial/restaurar, preview y SEO estático
funcionan sin tocar el serving ni el middleware. Se descartó el blog «dinámico desde BD» (rompería
el modelo sitio = snapshot de archivos).

Un solo modelo mental para el usuario: guardar un artículo (o la plantilla, o borrar) deja el
cambio en el **borrador** → aviso existente «Tienes cambios sin publicar» → el botón **Publicar**
del proyecto lo saca a internet.

## Archivos generados en el snapshot

| Ruta | Contenido |
|---|---|
| `blog/<slug>.html` | Artículo renderizado (plantilla post + markdown) |
| `blog/index.html` | Índice del blog regenerado completo (siempre, aunque haya 0 artículos) |
| `blog/img/<slug>.<ext>` | Imagen de portada, bytes tal cual del asset subido (sin conversión; ext derivada del contentType del asset: png/jpg/gif/webp/avif/svg) |
| `sitemap.xml` | En la raíz; se actualiza el existente del sitio o se crea uno base |

El espacio `blog/*` y `sitemap.xml` pertenecen al generador: si el sitio importado traía archivos
en esas rutas, las operaciones de blog los reemplazan.

## Modelo de datos (Drizzle/Postgres, patrón del schema existente)

```
blog_templates: id uuid pk, project_id uuid notnull unique → projects.id,
                tpl_post text notnull, tpl_index text notnull,
                created_at timestamptz notnull default now, updated_at timestamptz notnull default now

posts: id uuid pk default random, project_id uuid notnull → projects.id,
       titulo text notnull, slug text notnull, meta_descripcion text notnull, md text notnull,
       imagen_asset_id uuid notnull, imagen_ext text notnull,
       fecha text notnull (YYYY-MM-DD, fijada al crear; no cambia al editar),
       created_at timestamptz notnull default now, updated_at timestamptz notnull default now,
       unique(project_id, slug)
```

Acceso vía interfaz nueva `BlogStore` (en `src/repositories/`, impl. Drizzle; org scoping por join
con `projects` como el resto): `getBlogTemplate`, `setBlogTemplate`, `listPosts` (orden `fecha`
desc, desempate `created_at` desc), `getPost`, `createPost`, `updatePost`, `deletePost`.
La lista de posts en BD es **la fuente de verdad** del blog; los archivos del snapshot son su
proyección.

## Libs portadas de `Creador de Blog/` (con sus tests, adaptados a rutas Wordclicks)

Destino `src/blog/`:

| Módulo | Cambios respecto al original |
|---|---|
| `slug.ts` (`slugify`, `slugUnico`) | Ninguno |
| `markdown.ts` (`mdAHtml`, dep nueva **marked**) | Ninguno |
| `template.ts` (`renderTemplate`, `huecosSinRellenar`) | Ninguno |
| `blog-index.ts` (`renderIndex`, marcadores `<!--POST-->`/`<!--/POST-->`) | Ninguno (conserva su error byte-exacto: «La plantilla de índice debe contener los marcadores <!--POST--> y <!--/POST-->») |
| `sitemap.ts` (`sitemapBase`, `actualizarSitemap`) | + nueva `quitarDelSitemap(xml, loc)`: elimina el bloque `<url>…</url>` cuyo `<loc>` coincide exacto (no-op si no está) |
| `validate.ts` (`validarPrePublicacion`) | Mensajes byte-idénticos (ver Validaciones) |

## Render del artículo (`src/blog/render.ts`, adaptación de `renderPost`)

- Huecos de la plantilla de artículo: `{{titulo}}`, `{{meta_descripcion}}`, `{{contenido}}`,
  `{{imagen}}`, `{{fecha}}`, `{{canonical}}`, `{{json_ld}}`. Ítem del índice: `{{titulo}}`,
  `{{slug}}`, `{{meta_descripcion}}`, `{{fecha}}`, `{{imagen}}`.
- `imagen` = `/blog/img/<slug>.<ext>` (relativa a la raíz del sitio).
- **Base pública** = `https://` + (`dominio` del proyecto, o `subdominio.SITES_BASE_DOMAIN`).
  `canonical` = base + `/blog/<slug>.html`. JSON-LD (`@type: Article`) con `image` absoluta,
  `inLanguage: "es"` fijo en 4a, y el escape `</` → `<\/` del original.
- **Escape HTML** (mejora sobre el original): `titulo`, `meta_descripcion` y `fecha` pasan por
  `escapeHtmlText` (ya exportado por `src/editor/apply.ts`) antes de entrar en la plantilla. `contenido` (HTML del
  markdown), `imagen`, `canonical` y `json_ld` se insertan tal cual (los construye el sistema;
  el slug está validado por regex).
- Si el proyecto no tiene ni dominio ni subdominio al escribir el snapshot, se le **asigna
  subdominio** en ese momento (exportar y reusar `generarSubdominio` de `publish-site.ts`), igual
  que haría el primer Publicar.

## Generación de plantillas con IA

- `src/ia/claude.ts`: port mínimo del cliente OpenRouter del Creador de Blog — `pedirJson`
  (respuesta JSON validada con zod + 1 reintento), `limpiarJson`, `probarConexionModelo`.
  Env: `OPENROUTER_API_KEY` (obligatoria para generar; error byte-exacto «Falta OPENROUTER_API_KEY
  en .env.local»), `OPENROUTER_MODEL` (default `anthropic/claude-sonnet-4.6`). `X-Title:
  "Wordclicks"`. La clave vive SOLO en el servidor (.env.local / env de Dokploy).
- `src/blog/site-template.ts`: `generarPlantillas` lee del **snapshot actual** la página de entrada
  (`entryPath`), extrae TODAS sus hojas de estilo LOCALES (las de CDN externo se ignoran) y las
  normaliza a ruta ABSOLUTA desde la raíz del sitio; adjunta el contenido de la primera como
  referencia de clases. El prompt (recortes a 30k chars) pide `plantilla_post` y `plantilla_index`
  con el look&feel del sitio que **ENLAZAN** esas hojas (`<link rel="stylesheet" href="/…">`) en vez
  de incrustarlas. Decisión (2026-07-07, tras validación): el blog se sirve dentro del mismo sitio,
  así que enlazar el CSS —en lugar de la incrustación inline del Creador de Blog, pensada para un
  repo separado— produce una salida ~10× menor. Incrustar los ~40KB de CSS de una web real ×2
  reventaba el tope de 16k tokens de salida y truncaba el JSON (502), además de costar ~$0.60 por
  intento; enlazar lo baja a céntimos y segundos, y el preview ya resuelve las rutas absolutas por su
  reescritura + `<base>`. El blog queda visualmente sincronizado con el sitio (comportamiento deseado).
- **Validación de plantillas** (tanto generadas como editadas a mano, al guardar):
  - Artículo: debe contener `{{titulo}}`, `{{meta_descripcion}}` y `{{contenido}}` →
    «La plantilla de artículo debe contener los huecos {{titulo}}, {{meta_descripcion}} y {{contenido}}».
  - Índice: marcadores `<!--POST-->` y `<!--/POST-->` presentes y en orden → mensaje byte-exacto
    del renderIndex original.
  - Ningún hueco `{{…}}` fuera de la lista permitida (artículo: los 7; índice: los 5 del ítem) →
    «La plantilla usa huecos desconocidos: <lista>».
- Si la IA falla o su respuesta no valida tras el reintento: 502 «No se pudo generar la plantilla
  del blog, vuelve a intentarlo». Generar **no persiste nada**: devuelve la propuesta y el usuario
  la revisa/edita y la guarda con PUT.

## Regeneración y snapshots

`crearSnapshotEditado` gana dos parámetros opcionales retro-compatibles:
- `excluir?: Set<string>` — rutas relativas del snapshot origen que NO se copian.
- `tipo?: string` — default `"edit"`; las operaciones de blog usan `"blog"` (visible en Historial).

`src/blog/apply.ts` orquesta cada operación (patrón de `tools.ts`; siempre valida → snapshot →
BD del post al final, con la compensación de limpieza ya integrada en el helper):

| Operación | `excluir` | `extras` |
|---|---|---|
| Crear artículo | — | su html + su imagen + índice regenerado + sitemap actualizado (loc del post y del índice, lastmod = hoy) |
| Editar (mismo slug) | su html + su imagen previa (`imagen_ext` de la fila previa) | los mismos 4, re-renderizados |
| Editar (slug nuevo) | html e imagen del slug VIEJO | los 4 nuevos; sitemap: `quitarDelSitemap(loc vieja)` + añadir la nueva |
| Borrar artículo | su html + su imagen | índice regenerado + sitemap sin su loc (lastmod del índice = hoy) |
| Guardar plantilla con ≥1 post | todos los `blog/<slug>.html` + `blog/index.html` | todos los artículos re-renderizados + índice (imágenes se copian tal cual; sitemap: lastmod de todo el blog = hoy) |
| Guardar plantilla con 0 posts | (sin snapshot: solo BD) | — |

El orden BD/snapshot: el snapshot se crea primero; si falla, la BD del post no se toca (y el
helper limpia el storage). Si la escritura en BD del post falla después, el snapshot borrador queda
creado pero coherente con la siguiente regeneración (la lista de BD manda). El índice se regenera
SIEMPRE desde `listPosts` completo.

## API (todas tras el candado del middleware, org scoping como el resto)

| Ruta | Métodos | Respuesta OK | Errores |
|---|---|---|---|
| `/api/projects/[id]/blog` | GET | 200 `{ tienePlantilla, posts: [{id, titulo, slug, fecha}] }` | 404 «Proyecto no encontrado» |
| `/api/projects/[id]/blog/template` | GET | 200 `{ tplPost, tplIndex }` (ambos `null` si no hay) | 404 «Proyecto no encontrado» |
| | POST (generar con IA) | 200 `{ tplPost, tplIndex }` (no persiste) | 500 clave ausente · 502 IA · 400 sin snapshot/entrada |
| | PUT `{ tplPost, tplIndex }` | 200 `{ snapshotId }` o `{ snapshotId: null }` si no había posts | 400 validación de plantilla |
| `/api/projects/[id]/blog/preview` | POST `{ cual?: "post"\|"index", tplPost?, tplIndex?, titulo?, slug?, metaDescripcion?, md?, imagenUrl? }` | 200 `{ html }` — render efímero, nada persiste | 400 «El proyecto no tiene plantilla de blog (créala en la sección Blog)» si no hay plantilla guardada ni override |
| `/api/projects/[id]/blog/posts` | POST `{ titulo, slug, metaDescripcion, md, imagenAssetId }` | 201 `{ postId, snapshotId }` | 400 validación (mensajes unidos con « · ») |
| `/api/projects/[id]/blog/posts/[postId]` | GET | 200 fila completa | 404 «Artículo no encontrado» |
| | PUT (mismo cuerpo que POST) | 200 `{ snapshotId }` | como POST |
| | DELETE | 200 `{ snapshotId }` | 404 |

- **Vista previa** — un solo endpoint para dos usos: (a) el editor de artículo manda sus campos
  reales (`cual: "post"`, sin override) y se renderiza con la plantilla guardada, con `imagen` =
  `imagenUrl` (la URL de preview del asset subido); (b) la revisión de plantillas manda la
  plantilla en edición como override (`tplPost` o `tplIndex` según `cual`) y el servidor rellena
  con datos de ejemplo fijos (título/meta/párrafos de muestra, un solo ítem en el índice).
- La imagen de portada se sube con el flujo de assets existente (`POST /api/projects/[id]/assets`);
  el cliente manda solo `imagenAssetId` y el servidor re-verifica el asset (del proyecto, archivo
  presente) y deriva `imagen_ext` del contentType — nunca confía en el cliente.
- Crear/editar exigen plantilla guardada: 400 «El proyecto no tiene plantilla de blog (créala en
  la sección Blog)».
- Límites: `md` ≤ 200.000 caracteres («El artículo es demasiado largo (máx. 200000 caracteres)»),
  `titulo` ≤ 300, `slug` ≤ 100 (cubiertos por la validación general si se exceden:
  «El título es demasiado largo (máx. 300 caracteres)», «El slug es demasiado largo (máx. 100 caracteres)»).
- 500 genérico: `{ error: "Error interno" }` (patrón de `tools/`, sin filtrar `e.message`).

## Validaciones del artículo (mensajes byte-exactos, port de `validate.ts`)

- «Falta el título»
- «Falta el slug» · «El slug solo puede llevar minúsculas, números y guiones» (regex
  `^[a-z0-9]+(-[a-z0-9]+)*$`) · «El slug "<slug>" ya existe en este sitio» (contra los slugs de los
  demás posts del proyecto; el unique de BD queda de red de seguridad ante carreras)
- «Falta la meta descripción» · «La meta descripción tiene <N> caracteres (máximo 160)»
- «Falta la imagen de portada» (asset inexistente/ajeno/sin archivo también cae aquí)
- «Huecos sin rellenar en la plantilla: <lista>» (sobre el HTML final renderizado)

El slug se auto-rellena en la UI con `slugify(titulo)` (editable); `slugUnico` sugiere `-2`, `-3`…
si ya existe.

## UI — sección «Blog» (`BlogPanel.tsx`, patrón ToolsPanel: plegable, subcomponentes a nivel de módulo)

En la página del proyecto, debajo de «Herramientas»:

1. **Sin plantilla**: ayuda corta («El blog de tu web: artículos con tu diseño, índice y sitemap
   automáticos») + botón «Crear la plantilla del blog con IA» → muestra las dos plantillas en
   textareas editables + vista previa (iframe con datos de ejemplo fijos) + «Guardar plantillas».
   Botón «Volver a generar» disponible mientras se revisa.
2. **Con plantilla**: lista de artículos (título, fecha, Editar, Borrar con `confirm()`) + botón
   «Nuevo artículo» + enlace discreto «Editar plantillas» (vuelve a la vista 1 con lo guardado).
3. **Editor de artículo**: campos título / slug (auto, editable) / meta descripción (contador
   /160) / imagen de portada (BotonSubir del ToolsPanel, con miniatura) / textarea de markdown +
   botón «Vista previa» (iframe `srcDoc` sandbox con el render efímero) + «Guardar artículo».
4. Aviso fijo en la sección: «Las páginas del blog se generan desde aquí; si las tocas con el
   editor visual, la próxima regeneración del blog deshará esos cambios.»
5. Tras cualquier guardado: `router.refresh()` → el badge «Tienes cambios sin publicar» y el
   Historial reflejan el snapshot nuevo (mismo circuito que herramientas). Errores de red:
   «Error de conexión».

## Seguridad

- Rutas nuevas bajo `/api/projects/*` → cubiertas por el candado del middleware sin cambios.
- Org scoping en `BlogStore` por join con `projects` (patrón existente).
- Las plantillas y el markdown son contenido del propio usuario que acaba en SU sitio — mismo
  nivel de confianza que el HTML que importa (no se sanea `contenido`); `titulo`/`meta`/`fecha`
  sí se escapan al renderizar (barrera barata contra HTML roto/inyección accidental).
- La clave de OpenRouter no sale del servidor; ninguna variable `NEXT_PUBLIC` nueva.

## Casos borde y comportamiento conocido

- **Restaurar historial**: cambia archivos, no la tabla `posts`; la siguiente operación de blog
  vuelve a imponer la lista de BD. Documentado como regla: la lista de artículos manda.
- **Cambiar subdominio/dominio después de tener blog**: los canonicals/sitemap de los archivos ya
  generados quedan con la base antigua hasta la siguiente operación de blog (follow-up: regenerar
  al conectar dominio).
- **Sitio importado con su propio `blog/` o `sitemap.xml`**: el generador los reemplaza (regla
  documentada arriba).
- **0 artículos** (todos borrados): `blog/index.html` sigue existiendo con lista vacía — el enlace
  «Blog» del menú del sitio no rompe.
- Páginas del blog en el editor visual: editables técnicamente, pero la regeneración las pisa
  (aviso fijo en la UI; sin maquinaria de exclusión en 4a).

## Testing

- **Unit**: los 6 módulos portados llegan con sus tests (adaptados); nuevos para `quitarDelSitemap`,
  render (escape, canonical, JSON-LD `</`), `site-template` (extracción de CSS del snapshot, prompt),
  validación de plantillas (huecos/marcadores/desconocidos), `apply.ts` con fakes de store/storage
  (qué excluye y escribe cada operación de la tabla), extensiones `excluir`/`tipo` de
  `crearSnapshotEditado` (y retro-compatibilidad), y guards de las rutas API.
- **E2e** (scratchpad, dev server + BD real, patrón de incrementos previos) **sin IA**: plantillas
  fixture vía PUT; crear artículo → snapshot nuevo tipo `blog` con los 4 archivos y contenido
  esperado; preview sirve `blog/index.html` y `blog/<slug>.html`; editar re-renderiza; renombrar
  slug limpia los archivos viejos y el sitemap; borrar limpia archivos + índice + sitemap; publicar
  → el sitio público sirve el blog; borrador≠publicado intacto.
- **La generación con IA se valida en la validación de usuario** (su clave, coste de céntimos),
  no en e2e.

## Fuera de alcance del 4a (explícito)

Pipeline editorial IA (4b) · radar de keywords (4c) · editor rich-text · idioma configurable ·
robots.txt · regeneración automática al cambiar dominio · RSS · estados borrador/publicado por
artículo (un artículo guardado siempre está en el borrador del sitio).
