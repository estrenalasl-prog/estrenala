# Wordclicks — Incremento 2b: imagen, enlace y color

- **Fecha:** 2026-06-26
- **Estado:** Aprobado (diseño). Pendiente de revisión del spec antes del plan.
- **Construye sobre:** Incremento 2 (editor de texto in-situ), ya en `master`. Reutiliza toda la maquinaria: modo edición, `data-wc-id`, ops, snapshots, revertir, aplicación quirúrgica.

---

## 1. Objetivo

Completar el editor con tres tipos de edición más, sobre la misma maquinaria del Incremento 2:
- **Enlace:** editar el `href` de un `<a>`.
- **Imagen:** reemplazar el `src` de un `<img>` subiendo un archivo; la imagen queda **auto-contenida** dentro del proyecto (lista para desplegar en el Incremento 3).
- **Color:** cambiar el color del texto de un elemento (CSS inline `color`).

El HTML guardado sigue **limpio y quirúrgico** (solo cambian los bytes editados; nunca `data-wc-id` ni el script).

---

## 2. Operaciones (generalizadas)

`EditOp` pasa de un único `kind:"text"` a una unión discriminada:

```ts
type EditOp =
  | { page: string; nodeId: number; kind: "text";  value: string }
  | { page: string; nodeId: number; kind: "href";  value: string }
  | { page: string; nodeId: number; kind: "src";   value: string; assetId: string }
  | { page: string; nodeId: number; kind: "style"; property: "color"; value: string };
```

- **Dedup** en el panel y en `applyEdits` por clave `page#nodeId#kind#property` (así una edición de texto y una de color sobre el mismo nodo conviven; la última de cada (nodo,kind,property) gana).

---

## 3. Aplicación quirúrgica de atributos (núcleo, puro y testeable)

### 3.1 `walkElementsInOrder` extendido
Además de lo actual, expone por elemento (todo viene de `parse5` `sourceCodeLocation.attrs` + `node.attrs`):
- `attrs: Record<string, string>` — valores de atributos parseados (para leer el `style` o `href` existente).
- `attrLocations: Record<string, { start: number; end: number }>` — el tramo `name="value"` de cada atributo en la cadena original.
- (ya existe) `startTagStart`, `tagName` → el punto de inserción de un atributo nuevo es `startTagStart + 1 + tagName.length` (tras `<tag`), igual que `data-wc-id`.

### 3.2 `applyEdits(html, ops)` (renombra/generaliza `applyTextEdits`)
Para cada op (deduplicada), localiza el elemento por id y construye un reemplazo en la cadena original; todo se aplica **en orden de offset descendente** (los tramos de atributos viven dentro del start-tag y el de contenido tras él → no se solapan):
- **`text`**: reemplaza el tramo de contenido `[startTagEnd, endTagStart)` por `escapeHtmlText(value)`. Ignora si `hasElementChildren` o void (igual que hoy).
- **`href` / `src`**: si el atributo existe → reemplaza su tramo `attrLocations[name]` por `name="escapeAttr(value)"`; si no existe → inserta ` name="escapeAttr(value)"` en el punto de inserción.
- **`style`**: `nuevoStyle = mergeStyleProperty(attrs.style ?? "", property, value)`; si `style` existe → reemplaza su tramo por `style="escapeAttr(nuevoStyle)"`; si no → inserta ` style="escapeAttr(nuevoStyle)"`.

### 3.3 Helpers puros
- `escapeHtmlText(s)` (ya existe): `&`,`<`,`>`.
- `escapeAttr(s)`: `&`→`&amp;`, `"`→`&quot;`, `<`→`&lt;` (valor entre comillas dobles).
- `mergeStyleProperty(style, prop, value)` (`src/editor/style.ts`): parsea `"a:b; c:d"` en pares, fija `prop=value` (case-insensitive en la propiedad), re-serializa `"a:b; prop:value"`. Devuelve el valor interno (sin `style="…"`).

---

## 4. Imágenes — auto-contenidas

### 4.1 Subida
- **`POST /api/projects/[id]/assets`** (multipart): valida que el archivo es **imagen** (extensión en `png,jpg,jpeg,gif,webp,avif,svg`) y tamaño ≤ 10 MB. Guarda en `projects/<id>/assets/<assetId>.<ext>` (helper `assetKey`, ya existe), crea fila `Asset`, devuelve `{ assetId, ext, url: "/api/projects/<id>/assets/<assetId>.<ext>" }`.
- **`GET /api/projects/[id]/assets/[asset]`**: sirve el asset desde storage (org-scoped vía `getAsset`); `[asset]` = `<assetId>.<ext>`.

### 4.2 Op y guardado
- **Op:** `{ kind:"src", nodeId, value:"/wc-uploads/<assetId>.<ext>", assetId }`.
- **`saveEdits`**, por cada op `src` con `assetId`: **copia** `projects/<id>/assets/<assetId>.<ext>` dentro del nuevo snapshot en `wc-uploads/<assetId>.<ext>`, y fija el `src` del `<img>` a `/wc-uploads/<assetId>.<ext>` (root-absoluta; el preview del Inc.1 ya reescribe root-absolutas y al desplegar en raíz funcionan nativas). La web queda **auto-contenida**.

### 4.3 Store y esquema
- El esquema ya tiene la tabla `Asset` (sin uso hasta ahora). Se añaden al `ProjectStore`: `createAsset(input)` y `getAsset(orgId, projectId, assetId): AssetRow | null` (org-scoped). Sin migración.

---

## 5. El editor (script + panel)

### 5.1 Detección de editables (script en el iframe)
- **Texto / color:** elementos hoja de texto (lista blanca del Inc.2).
- **Enlace:** elementos `<a>` con `data-wc-id` (editan su `href`; además su texto sigue siendo editable in-situ).
- **Imagen:** elementos `<img>` con `data-wc-id` (editan su `src`).

### 5.2 Popover del editor
Al **seleccionar** (hover/click) un editable, el script renderiza un **popover propio** (DOM creado por el script; sin `data-wc-id`, así que nunca es editable ni llega al HTML guardado; no usa `prompt()`/`alert()` para no requerir `allow-modals`):
- elemento de texto → **selector de color** (`<input type="color">`);
- `<a>` → campo de **href** (input de texto) + botón aplicar;
- `<img>` → botón **"Cambiar imagen"**.
El script aplica el cambio al **DOM en vivo** (color/href directamente; imagen tras el round-trip) y **emite la op** al panel por `postMessage`.

### 5.3 Mensajería (bidireccional, validada por `source`)
- **iframe → panel:** `{ type:"wc-edit", op }` (text/href/style) y `{ type:"wc-image-request", nodeId }` (imagen).
- **panel → iframe:** `{ type:"wc-image-set", nodeId, previewUrl }` (tras subir, para ver la imagen al instante).
- El iframe sigue `sandbox="allow-scripts"` (origen opaco). El panel valida `event.source === iframe.contentWindow`; el script valida `event.source === window.parent`.

### 5.4 Panel (`PreviewPane`)
- Maneja `wc-image-request`: abre file-picker, sube (`POST /assets`), responde al iframe con `wc-image-set` (previewUrl), y **registra la op** `src` (tiene `assetId`/`value`).
- Acumula ops de todos los tipos (dedup por `page#nodeId#kind#property`). Guardar / Cancelar / Historial igual que el Inc.2.

---

## 6. Seguridad

- **Texto:** escapado (ya).
- **`href`:** validar el esquema en servidor — permitir relativas, `http(s):`, `mailto:`, `tel:`, `#…`; **rechazar `javascript:` y `data:`** (evita XSS en el sitio publicado). `escapeAttr` sobre el valor.
- **`src` (imagen):** el valor debe casar con `^/wc-uploads/<uuid>\.<ext>$` y `assetId` debe ser un asset existente del proyecto (org-scoped). `escapeAttr`.
- **`style`:** solo `property:"color"`; `value` debe casar con un patrón de color seguro (hex `#rgb`/`#rrggbb`/`#rrggbbaa`, `rgb()/rgba()`, o nombre de color simple); rechazar lo demás. `escapeAttr`.
- **Subida:** solo imágenes (extensión permitida), ≤ 10 MB; `assetId` = uuid generado en servidor.
- `data-wc-id`, el script y el popover **nunca** se almacenan.

---

## 7. "Dejarlo fino" — atomicidad

Como `saveEdits` ahora escribe más archivos (las imágenes), añado **limpieza compensatoria**: las escrituras al nuevo prefijo y la creación del snapshot van en una secuencia que, si `createSnapshot` falla tras escribir el storage, **borra todo lo escrito bajo el nuevo prefijo** (evita árboles/`wc-uploads` huérfanos). Cierra la deuda de atomicidad anotada en el Inc.2.

---

## 8. Modelo de datos

Sin migración. Usa `Asset(id, projectId, storageKey, contentType, bytes, createdAt)` (ya en el esquema). `AssetRow` se añade a los tipos del store.

---

## 9. Rutas API (nuevas)

- `POST /api/projects/[id]/assets` — subir imagen → `{ assetId, ext, url }`.
- `GET /api/projects/[id]/assets/[asset]` — servir la imagen subida (vista previa en vivo).
- (sin cambios) `POST /edits`, `GET/POST snapshots`, preview `?edit=1`.

---

## 10. Estructura de archivos (prevista)

```
src/editor/walk.ts            — expone attrs + attrLocations            (modifica) [TDD]
src/editor/style.ts           — mergeStyleProperty                      (nuevo) [TDD]
src/editor/apply.ts           — applyEdits (text/href/src/style) + escapeAttr (modifica) [TDD]
src/editor/save-edits.ts      — nuevos kinds + copia de asset + cleanup (modifica) [TDD fakes]
src/editor/validate-op.ts     — validación de href/src/style/color      (nuevo) [TDD]
src/editor/assets.ts          — uploadAsset (DI) + validación de imagen (nuevo) [TDD fakes]
src/repositories/types.ts     — EditOp unión + AssetRow + createAsset/getAsset (modifica)
src/repositories/projects.ts  — impl. Drizzle de createAsset/getAsset   (modifica)
app/api/projects/[id]/assets/route.ts          — POST subir            (nuevo)
app/api/projects/[id]/assets/[asset]/route.ts  — GET servir            (nuevo)
public/wc-editor.js           — popover + detección img/a + mensajería bidireccional (modifica) [e2e]
app/projects/[id]/PreviewPane.tsx — subida de imagen + ops nuevas       (modifica) [e2e]
```

---

## 11. Manejo de errores
- Op de `kind` desconocido, o `href`/`src`/`style` que no pasa validación → se ignora esa op; si tras filtrar no queda ninguna válida → 400 (igual que hoy).
- Subida no-imagen o > 10 MB → 400.
- `src` con `assetId` inexistente/ajeno → esa op se ignora (no rompe el guardado).
- Fallo al crear el snapshot tras escribir storage → limpieza del prefijo nuevo + propagar error.

---

## 12. Testing y verificación
- **Unit (puro):** `walkElementsInOrder` (attrs + attrLocations), `escapeAttr`, `mergeStyleProperty` (set, reemplazo, sin style previo), `applyEdits` (href existente/ausente, src, style, escapado de atributos, byte-identidad de lo no editado, múltiples kinds sobre un nodo), `validate-op` (rechaza `javascript:`/`data:`, color inválido, src fuera de patrón).
- **Integración (fakes):** `uploadAsset` (valida + guarda + crea Asset); `saveEdits` (aplica los 4 kinds, copia la imagen a `wc-uploads/`, fija src; limpieza compensatoria si createSnapshot falla).
- **e2e / visual (definición de hecho):** importar web → Editar → cambiar un **href**, **reemplazar una imagen** (subiendo archivo), **cambiar el color** de un texto → Guardar → preview lo refleja → HTML guardado **limpio y quirúrgico** (href/src/style nuevos, sin `data-wc-id`, resto byte-idéntico) y la **imagen en `wc-uploads/` dentro del snapshot** → Revertir restaura. Captura.

---

## 13. Fuera de alcance (Fase 2)
`background-image`, color de fondo, otros estilos, mover/añadir/borrar secciones, constructor visual, white-label.
