# Wordclicks — Incremento 2: Editor de texto in-situ

- **Fecha:** 2026-06-26
- **Estado:** Aprobado (diseño). Pendiente de revisión del spec antes del plan.
- **Construye sobre:** Incremento 1 (importar ZIP → preview), ya en `master`.

---

## 1. Objetivo

En la página de proyecto, un botón **"Editar"** pone el `<iframe>` del preview en **modo edición**: al pasar el ratón sobre un texto se resalta; al hacer click se edita in-situ (contentEditable); al **Guardar**, el servidor aplica los cambios al HTML **original guardado** de forma **quirúrgica** (solo cambian los bytes editados) y crea un **snapshot nuevo** de tipo `edit`. La edición es **reversible** (historial + restaurar).

**Alcance de este incremento: solo edición de TEXTO.** Toda la "maquinaria" (modo edición, identificación de nodos, captura de operaciones, guardado → aplicación en servidor → snapshot, revertir) se construye end-to-end aquí; imagen, enlace y color (Incremento 2b) reutilizarán esta misma maquinaria.

---

## 2. Decisiones arquitectónicas

| # | Decisión | Razón |
|---|----------|-------|
| D1 | **Identificación de nodos por `data-wc-id` inyectado por el servidor** | El navegador normaliza el DOM (añade `<tbody>`, recoloca etiquetas); un selector recalculado en cliente puede no coincidir con el HTML parseado en servidor. El navegador **conserva atributos**, así que el id viaja con el nodo. Cliente y servidor recorren **el mismo HTML guardado con el mismo algoritmo** → los ids coinciden por posición. |
| D2 | **Aplicación quirúrgica con `parse5` + source locations** | Localizamos el tramo exacto del contenido a editar y lo reemplazamos en la cadena original; todo lo no editado queda **byte-idéntico**. Máxima fidelidad a "HTML publicado limpio" y diffs mínimos entre versiones. |
| D3 | **Materializar el árbol completo por snapshot de edición** | Cada `edit` snapshot copia el árbol del padre + aplica las ops a la página editada. Servir el preview no cambia (lee archivos de un prefijo, igual que en Incremento 1). Coste de almacenamiento asumible en webs estáticas pequeñas. Las ops también se guardan en `operaciones_json` (provenance). |
| D4 | **Editar una página por guardado** | El modo edición opera sobre la página mostrada. La op lleva su `page`, así que ampliar a multi-página en un futuro no rompe el modelo. |
| D5 | **El panel (mismo origen) hace el guardado; el script del iframe solo emite ops por `postMessage`** | El iframe es `sandbox="allow-scripts"` (origen opaco): no debe llamar a nuestra API directamente (CORS). Mantiene el sandbox estrecho. |

`parse5` es una dependencia nueva (parser HTML conforme al estándar, con `sourceCodeLocationInfo`).

---

## 3. La pieza clave: identificación estable de nodos

Una única función de recorrido, compartida por anotación (modo edición) y aplicación (guardado), garantiza que los ids coincidan:

```
walkElementsInOrder(html): Array<{ id: number; element; loc }>
  - Parsea html con parse5 (sourceCodeLocationInfo: true).
  - Recorre los ELEMENTOS en orden de documento (depth-first).
  - Asigna id = entero incremental (0,1,2,…) a cada elemento que TIENE
    source location (los nodos auto-insertados por parse5 sin location se omiten
    y NO consumen id).
```

- **Anotación (modo edición):** `annotateForEdit(html)` recorre con `walkElementsInOrder` e inyecta ` data-wc-id="N"` en el start-tag de cada elemento, **quirúrgicamente** (inserciones en orden de offset **descendente** para no desplazar posiciones). El resultado se sirve al iframe; nunca se almacena.
- **Aplicación (guardado):** `applyTextEdits(html, ops)` recorre el **mismo HTML guardado** (sin `data-wc-id`) con `walkElementsInOrder` → mismos ids por posición. El cliente solo usa `data-wc-id` como "asa"; el servidor recalcula offsets desde el HTML limpio.

> Invariante: `annotateForEdit` y `applyTextEdits` deben usar exactamente el mismo `walkElementsInOrder`. Es la garantía de que el id que ve el navegador apunta al mismo nodo que edita el servidor.

---

## 4. Qué es "editable" (acotación del MVP de texto)

Un **elemento hoja de texto**:
- Etiqueta en la lista blanca: `h1, h2, h3, h4, h5, h6, p, span, li, a, button, blockquote, figcaption, label, strong, em, small, td, th`.
- **Sin hijos-elemento** (solo nodos de texto dentro).
- Con texto no vacío (tras `trim`).

Ejemplo: en `<p>Hola <b>mundo</b></p>` es editable el `<b>` ("mundo"), no el "Hola " suelto del `<p>` (porque `<p>` tiene un hijo-elemento). Limitación conocida y razonable: cubre la mayoría de webs generadas con IA (cada texto en su etiqueta). El servidor **valida** esta condición al aplicar (si un `nodeId` no es hoja de texto, se ignora esa op).

---

## 5. Operaciones

```
type EditOp = {
  page: string;      // ruta relativa de la página editada, p. ej. "index.html"
  nodeId: number;    // el data-wc-id
  kind: "text";      // único tipo en el Incremento 2
  value: string;     // texto nuevo (texto plano; el servidor lo escapa)
}
```

- El panel acumula ops; **dedup por `page+nodeId`** (la última edición de un nodo gana).
- El servidor **escapa** `value` (`&`→`&amp;`, `<`→`&lt;`, `>`→`&gt;`) antes de insertarlo: no se puede inyectar markup/`<script>` editando un texto.

`applyTextEdits(html, ops)`:
1. `walkElementsInOrder(html)` → mapa `id → {element, loc}`.
2. Por cada op: localiza el elemento; valida que es hoja de texto; calcula el **tramo de contenido** = `[startTag.endOffset, endTag.startOffset)`; encola `(start, end, escape(value))`.
3. Aplica los reemplazos en orden de `start` **descendente** (splicing sobre la cadena original) → HTML nuevo. Lo no editado queda intacto.

---

## 6. Modelo de datos (sin cambios de esquema)

El esquema del Incremento 1 ya soporta esto: `snapshots(parent_id, tipo, storage_prefix, operaciones_json)`. No hay migración. Se añaden métodos al `ProjectStore`:

```
createSnapshot(input: { snapshotId, projectId, parentId, tipo, storagePrefix, operacionesJson }): Promise<void>
setCurrentSnapshot(orgId, projectId, snapshotId): Promise<void>   // valida pertenencia a la org
listSnapshots(orgId, projectId): Promise<SnapshotInfo[]>          // id, tipo, parentId, createdAt, esActual
getSnapshotById(orgId, projectId, snapshotId): Promise<SnapshotRow | null>
```

`SnapshotInfo = { id, tipo, parentId: string | null, createdAt: string, esActual: boolean }` (para el panel de historial). `setCurrentSnapshot`/`getSnapshotById` van scoping por org (vía join con projects), igual que el resto del store.

---

## 7. Guardado, snapshots y revertir (orquestadores con DI)

**`saveEdits({ store, storage }, { orgId, projectId, ops })`** → `{ snapshotId }`:
1. `getProject(orgId, projectId)` (404 si no existe/otra org).
2. `current = getCurrentSnapshot(orgId, projectId)` (error si no hay).
3. `newSnapshotId = randomUUID()`; `newPrefix = snapshotPrefix(projectId, newSnapshotId)`.
4. `files = storage.list(current.storagePrefix)`; agrupa ops por `page`.
5. Por cada archivo: si es la página editada (`rel` coincide con un grupo de ops) y es `.html` → `applyTextEdits`; si no, copia tal cual. Escribe en `newPrefix + rel`.
6. `createSnapshot({ snapshotId, projectId, parentId: current.id, tipo: "edit", storagePrefix: newPrefix, operacionesJson: ops })`.
7. `setCurrentSnapshot(orgId, projectId, newSnapshotId)`. Devuelve `{ snapshotId }`.

**`restoreSnapshot({ store }, { orgId, projectId, snapshotId })`**: verifica `getSnapshotById` (pertenece al proyecto) → `setCurrentSnapshot`. Revertir es solo cambiar el puntero (cada snapshot tiene su árbol materializado).

Ambos son testeables con fakes (`FakeStorage`/`FakeStore`), como en el Incremento 1.

---

## 8. Modo edición del preview

Se amplía la resolución del preview con un flag `edit`:
- **Ruta:** `GET /api/projects/[id]/preview/[[...path]]?edit=1`. Autoriza con `getProject(orgId, id)` antes de servir, igual que el preview normal.
- **Documento HTML de entrada en modo edición:** `annotateForEdit(htmlGuardado)` → luego `rewriteHtml(base)` (la reescritura de rutas del Incremento 1) → inyecta antes de `</body>` un `<script src="/wc-editor.js" data-project="<id>" data-page="<page>"></script>`. Los assets se sirven igual.
- `data-wc-id` y el script **solo** aparecen en la respuesta de modo edición; el HTML guardado nunca los lleva.

**Script del editor (`public/wc-editor.js`, JS vanilla, sin framework):**
- Al cargar, marca como editables los elementos con `data-wc-id` que cumplen la condición de §4.
- Hover → resalta (outline). Click → `contentEditable=true` + foco; Esc cancela; blur/Enter → si el texto cambió, emite `window.parent.postMessage({ type:"wc-edit", op:{ page, nodeId, kind:"text", value } }, "*")`.
- No llama a ninguna API; solo `postMessage`.

**Panel (componente cliente de la página de proyecto):**
- Toggle **"Editar"**: al activarlo, el iframe pasa a `?edit=1` y aparece la barra de edición.
- Escucha `message` y valida `event.source === iframe.contentWindow` (el `origin` es `"null"` por el sandbox, así que NO se filtra por origin). Acumula ops (dedup por `page+nodeId`), muestra **"N cambios" · Guardar · Cancelar**.
- **Guardar** → `POST /api/projects/[id]/edits` con `{ ops }` → al recibir `{ snapshotId }`, recarga el iframe (preview normal del nuevo snapshot actual) y sale de modo edición.
- **Cancelar** → descarta ops y recarga el preview normal.
- **Historial:** `GET /api/projects/[id]/snapshots` lista los snapshots; cada uno con **"Restaurar"** → `POST /api/projects/[id]/snapshots/[snapshotId]/restore` → recarga el preview.

---

## 9. Rutas API (nuevas)

- `GET /api/projects/[id]/preview/[[...path]]?edit=1` — modo edición (extensión de la ruta existente).
- `POST /api/projects/[id]/edits` — body `{ ops: EditOp[] }` → `{ snapshotId }` (400 si ops inválidas/vacías; 404 si el proyecto no existe).
- `GET /api/projects/[id]/snapshots` — `{ snapshots: SnapshotInfo[] }`.
- `POST /api/projects/[id]/snapshots/[snapshotId]/restore` — `{ ok: true }` (404 si el snapshot no es del proyecto).

Todas autorizan vía `getDevContext()` (org de dev) + scoping por org en el store, igual que el Incremento 1.

---

## 10. Estructura de archivos (prevista)

```
src/editor/walk.ts            — walkElementsInOrder (parse5)             [puro, TDD]
src/editor/annotate.ts        — annotateForEdit                          [puro, TDD]
src/editor/apply.ts           — applyTextEdits + escape                  [puro, TDD]
src/editor/save-edits.ts      — saveEdits (DI)                           [TDD con fakes]
src/editor/restore.ts         — restoreSnapshot (DI)                     [TDD con fakes]
src/repositories/types.ts     — amplía ProjectStore + SnapshotInfo
src/repositories/projects.ts  — impl. Drizzle de los métodos nuevos
src/preview/resolve.ts        — flag edit (annotate + script)            [extiende, TDD]
public/wc-editor.js           — script del editor (vanilla)             [verificación e2e]
app/api/projects/[id]/edits/route.ts
app/api/projects/[id]/snapshots/route.ts
app/api/projects/[id]/snapshots/[snapshotId]/restore/route.ts
app/projects/[id]/PreviewPane.tsx — añade modo edición + toolbar + historial
```

---

## 11. Manejo de errores
- Ops vacías o malformadas → 400.
- `nodeId` inexistente o que no es hoja de texto → esa op se ignora (no rompe el guardado); si ninguna op aplica, igualmente se crea el snapshot (no-op) o se devuelve aviso — **decisión:** si tras filtrar no queda ninguna op válida, responder 400 ("ninguna edición válida") sin crear snapshot.
- Restaurar un snapshot que no es del proyecto → 404.
- `applyTextEdits` sobre un elemento sin `endTag` (void/auto-cerrado) → se ignora esa op (no tiene contenido de texto).

---

## 12. Testing y verificación
- **Unit (puro):** `walkElementsInOrder` (orden e ids estables; omite nodos sin location), `annotateForEdit` (inyecta ids sin tocar lo demás; descendente sin desplazamientos), `applyTextEdits` (reemplazo del tramo correcto; escapado de `<`/`&`; múltiples ops; byte-identidad de lo no editado; ignora no-hoja y void), `escape`.
- **Integración (fakes):** `saveEdits` (copia el árbol, aplica a la página correcta, crea snapshot edit con parent, fija actual), `restoreSnapshot` (cambia el puntero; rechaza snapshot ajeno).
- **e2e / visual (definición de hecho):** importar una web → "Editar" → cambiar un titular y un párrafo → Guardar → el preview muestra el cambio → inspeccionar el HTML guardado: **solo cambió ese texto, el resto byte-idéntico, sin `data-wc-id`** → "Restaurar" la versión anterior y verificar que vuelve. Captura de pantalla del modo edición.

---

## 13. Seguridad
- Script en iframe `sandbox="allow-scripts"` (origen opaco); comunica por `postMessage`; el panel valida `event.source`.
- `value` escapado en servidor antes de insertar (no inyección de markup).
- Rutas org-scoped; restaurar valida pertenencia del snapshot al proyecto.
- `data-wc-id` y el script jamás se almacenan ni se publican.

---

## 14. Fuera de alcance (Incremento 2b y posterior)
- **Imagen** (reemplazo + subida → tabla `Asset` + storage), **enlace** (`href`), **color** (toolbar) — reutilizan esta maquinaria (nodos `data-wc-id`, ops, saveEdits con nuevos `kind`).
- Edición de texto en nodos de contenido mixto (runs de texto sueltos).
- Mover/añadir/borrar secciones; constructor visual — Fase 2.
- Multi-página en un único guardado (el modelo de op ya lo permite; la UI no).
