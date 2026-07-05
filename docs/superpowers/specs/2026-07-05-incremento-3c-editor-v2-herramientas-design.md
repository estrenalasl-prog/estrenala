# Incremento 3c — Editor v2 (texto mixto) + Caja de herramientas

**Fecha:** 2026-07-05
**Estado:** aprobado por el usuario (diseño validado en conversación)
**Prerequisito:** Incremento 3b fusionado a master (fe9b18b).

## Objetivo

1. **Texto mixto editable:** el texto suelto que convive con elementos dentro del mismo
   padre (`<p><strong>x</strong> texto suelto</p>`) se edita in-situ como cualquier otro
   texto. Es la frontera documentada del 2b y bloquea al usuario en su web Quantiva.
2. **Caja de herramientas del sitio** (4 herramientas): Verificación de Google,
   Google Analytics (GA4), Favicon e Imagen para compartir (og:image) — aplicadas a la
   cabecera de TODAS las páginas como **ediciones quirúrgicas reales** (historial,
   revertir y borrador≠publicado gratis; el serving publicado sigue byte-idéntico).
3. **Ayudas mínimas:** texto corto «¿qué es esto?» en cada herramienta. El sistema de
   ayudas completo va a la sesión de diseño (docs/design-brief.md §4.6).

## Invariantes que NO cambian

- El HTML guardado nunca contiene marcadores del editor (ni `data-wc-id` ni los nuevos
  wrappers): annotate es solo-preview; apply trabaja sobre el HTML limpio con
  source locations de parse5.
- Serving público byte-idéntico; publicar = puntero; snapshots inmutables.
- Toda la lógica nueva es pura y testeable sin servidor (patrón walk/annotate/apply).

## Parte 1 — Texto mixto

### Definiciones (regla única, compartida por annotate y apply)

- **Nodo de texto significativo:** hijo DIRECTO de tipo texto cuyo contenido no es solo
  espacio en blanco (`/\S/`).
- **Elemento mixto:** tiene ≥1 hijo elemento **y** ≥1 nodo de texto significativo.
- **Índice de un nodo de texto:** posición 0-based entre los nodos de texto
  significativos del MISMO padre, en orden documental. El cliente nunca cuenta nodos:
  lee el índice que calculó el servidor.
- **Subárboles excluidos** (no se envuelve nada dentro): `head`, `script`, `style`,
  `textarea`, `svg`, `math`.

### Annotate v2 (`src/editor/annotate.ts` + `src/editor/walk.ts`)

- `walkElementsInOrder` expone además, por elemento, sus nodos de texto significativos
  directos: `{ index, start, end, raw }` (rangos fuente de parse5; `raw` = texto tal
  cual en el fuente, con entidades).
- `annotateForEdit` añade, SOLO en elementos mixtos (fuera de subárboles excluidos),
  un wrapper alrededor de cada nodo de texto significativo:
  `<wc-t data-wc-tn="<parentId>:<index>">…texto…</wc-t>`.
  - `wc-t` es un elemento inexistente en HTML: inline por defecto, sin estilos de
    navegador, y prácticamente imposible que el CSS del sitio lo seleccione.
    Riesgo aceptado (solo preview): selectores de hijo directo (`p > *`) podrían
    aplicarse al wrapper en casos raros; la web publicada jamás lo lleva.
- Los elementos de texto puro (hoja) siguen exactamente como hoy.

### Editor (`public/wc-editor.js`)

- `wc-t[data-wc-tn]` se trata como editable de texto: mismo flujo contenteditable,
  mismo popover, mismos guards de blur/focus. Al confirmar emite la op nueva
  `{ page, nodeId: <parentId>, kind: "textNode", index, value }`.
- Prioridad de resolución: si el clic cae en (o dentro de) un `wc-t`, gana el `wc-t`;
  el padre (p. ej. un `<a>` mixto) se sigue seleccionando haciendo clic en sus zonas
  no-texto, como hoy con los iconos.

### Apply v2 (`src/editor/apply.ts`, `validate-op`, `save-edits`)

- `EditOp`/`PageOp` ganan el variant
  `{ nodeId: number; kind: "textNode"; index: number; value: string }`.
- Aplicación: localizar en el HTML limpio el nodo de texto `index` del elemento
  `nodeId` (misma regla de significativos) y reemplazar su rango fuente por
  `escapeHtmlText(value)`. Índice o nodo inexistentes → op ignorada (mismo criterio
  que hoy con `nodeId` desconocido).
- Dedup de `applyEdits`: la clave incluye el índice
  (`${nodeId}#textNode#${index}`). El acumulador de ops del panel (`PreviewPane`)
  usa la misma clave.
- Los rangos de texto viven entre tags: no solapan ni entre sí ni con los tramos de
  atributos → el orden descendente actual de aplicación sigue siendo válido.

## Parte 2 — Caja de herramientas

### Módulo puro `src/editor/head-tools.ts`

```
type Herramienta =
  | { tipo: "google-verification"; codigo: string }     // token de Search Console
  | { tipo: "analytics"; medicion: string }              // "G-XXXXXXX"
  | { tipo: "favicon"; ruta: string }                    // "/wc-uploads/<assetId>.<ext>"
  | { tipo: "og-image"; ruta: string };
```

- `aplicarHerramienta(html, h): string` — con parse5 + locations sobre UNA página:
  reemplaza el objetivo existente o inserta antes de `</head>`.
  - google-verification → `<meta name="google-site-verification" content="…">`
    (objetivo: el `meta[name="google-site-verification"]` existente).
  - analytics → los 2 tags oficiales de GA4, ambos con el atributo marcador
    `data-wc-tool="analytics"` (se sirve publicado: atributo inocuo que hace el
    reemplazo/borrado exacto sin heurísticas):
    `<script async src="https://www.googletagmanager.com/gtag/js?id=G-X" data-wc-tool="analytics"></script>` +
    `<script data-wc-tool="analytics">window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-X');</script>`.
  - favicon → elimina los `link` con `rel` `icon`/`shortcut icon` existentes e inserta
    `<link rel="icon" href="<ruta>">` (los `apple-touch-icon` no se tocan).
  - og-image → `<meta property="og:image" content="<ruta absoluta>">` (objetivo: el
    `meta[property="og:image"]` existente). La ruta guardada es root-absoluta
    (`/wc-uploads/…`): al compartir, el dominio la resuelve.
- `quitarHerramienta(html, tipo): string` — elimina los nodos objetivo (rangos fuente).
- `estadoHerramientas(html)` → `{ googleVerification?, analytics?, favicon?, ogImage? }`
  (valores actuales leídos del HTML de la página de entrada, para pintar la UI).
- Página sin `</head>` con location: insertar justo antes del inicio de `<body>`;
  si tampoco hay `<body>` localizable → error 400 «Esta página no tiene cabecera
  editable». (parse5 sintetiza head/body sin locations en HTML degenerado.)

### Normalización de entrada

- Verificación: acepta la meta-etiqueta completa pegada (se extrae su `content`) o el
  token pelado; token válido = `/^[A-Za-z0-9_-]{16,100}$/`.
  Inválido → 400 «Código de verificación no válido (pega la etiqueta de Google o solo el código)».
- Analytics: trim + mayúsculas; válido = `/^G-[A-Z0-9]{4,20}$/`.
  Inválido → 400 «ID de Analytics no válido (ejemplo: G-ABC1DE23FG)».
- Favicon/og-image: la `ruta` debe casar el patrón de assets del 2b
  (`/wc-uploads/<uuid>.<ext permitida>`); inválida → 400 «Imagen no válida».
- Matching de favicon: se eliminan los `<link>` cuyo atributo `rel` (lista separada
  por espacios, case-insensitive) contenga el token `icon` y NO contenga
  `apple-touch-icon`.

### Flujo de aplicación (`src/editor/tools.ts` servidor)

`aplicarHerramientaAlProyecto({store, storage}, {orgId, projectId, herramienta})`:
carga el snapshot actual → aplica `aplicarHerramienta` a **cada página .html** del
snapshot (listado existente) → crea snapshot nuevo tipo `edit` con
`operacionesJson: { herramienta }` (auditable) copiando los archivos no tocados
(misma mecánica que `saveEdits`) → `setCurrentSnapshot`. `quitarHerramientaDelProyecto`
igual con `quitarHerramienta`. Favicon/og-image: la imagen se sube ANTES con el
endpoint de assets existente (mismas validaciones/formatos del 2b) y aquí llega solo
la `ruta`.

### API y UI

- `GET /api/projects/[id]/tools` → estado (de la página de entrada).
- `POST /api/projects/[id]/tools` con `{ herramienta }` → aplica; 400 con mensaje
  claro si la entrada no valida; 200 con el estado nuevo.
- `DELETE /api/projects/[id]/tools` con `{ tipo }` → quita.
- Todo tras el candado (son escrituras/estado del panel; nada de esto se exime).
- UI `ToolsPanel.tsx` (client) en la página del proyecto, bajo la PublishBar:
  sección «Herramientas» con las 4 tarjetas — input o subida + botón Aplicar/Quitar +
  estado actual + ayuda corta «¿qué es esto?» en gris. Tras aplicar: `router.refresh()`
  (la barra mostrará «Tienes cambios sin publicar», como cualquier edición).

## Errores (mensajes exactos en el plan)

- Entradas inválidas de herramientas → 400 con mensaje específico por herramienta.
- Página sin cabecera editable → 400 (mensaje de arriba).
- Proyecto inexistente → 404 «Proyecto no encontrado» (patrón actual).

## Testing

- **Unit:** walk de nodos de texto (índices, blancos, anidados, entidades, exclusiones);
  annotate v2 (mixtos envueltos, puros intactos, `wc-t` bien formado, exclusiones);
  apply textNode (reemplazo por rango, escape, índice inexistente ignorado, dedup con
  índice); head-tools (insertar/reemplazar/quitar cada herramienta, estado, sin head,
  varios links icon, idempotencia); normalizadores de verificación y analytics.
- **e2e local:** página mixta real → editar texto suelto → guardar → HTML limpio sin
  `wc-t` y con el texto nuevo; aplicar verificación + analytics + favicon + og:image →
  presentes en el `<head>` de TODAS las páginas; quitar una → desaparece; revertir en
  el historial deshace una herramienta; lo publicado no cambia hasta Republicar.
- **Validación del usuario:** editar en su web Quantiva la frase mixta que marcó, y
  aplicar la verificación de Google de verdad.

## Fuera de alcance (3c)

- Fragmento libre en `<head>` (código arbitrario), otros píxeles (Meta, TikTok…).
- Tour interactivo / sistema de ayudas completo (sesión de diseño).
- Generación de favicon multi-tamaño (.ico); se usa la imagen subida tal cual.
- Edición de `<title>`/metadescripción (candidato natural a herramienta futura).
