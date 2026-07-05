# Incremento 3c — Editor v2 (texto mixto) + Caja de herramientas: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer editable el texto suelto de elementos mixtos (`<p><strong>x</strong> texto</p>`) y añadir la caja de herramientas del sitio (verificación de Google, Analytics GA4, favicon, og:image) como ediciones quirúrgicas reales del `<head>` de todas las páginas.

**Architecture:** El walk de parse5 expone los nodos de texto significativos con sus rangos fuente; annotate los envuelve SOLO en preview con `<wc-t data-wc-tn="padre:índice">`; una nueva op `textNode` los reemplaza quirúrgicamente en el HTML limpio. Las herramientas usan un módulo puro que reemplaza/inserta/quita etiquetas del `<head>` por elemento localizado, y un flujo de snapshot compartido (helper extraído de `saveEdits`) las aplica a todas las páginas creando un snapshot tipo `edit` (historial/revertir/borrador≠publicado gratis).

**Tech Stack:** parse5 `sourceCodeLocationInfo` (patrón existente), vitest, Next.js 16 App Router, vanilla ES5 en `public/wc-editor.js`.

**Spec:** `docs/superpowers/specs/2026-07-05-incremento-3c-editor-v2-herramientas-design.md`

## Global Constraints

- Rama: `feat/incremento-3c-editor-v2` (crear desde master antes de la Tarea 1).
- Código, comentarios y UI en español, estilo del código circundante.
- **El HTML guardado nunca contiene marcadores** (`data-wc-id`, `wc-t`, `data-wc-tn`): annotate es solo-preview; apply trabaja sobre el HTML limpio.
- Serving público byte-idéntico intacto; publicar = puntero; snapshots inmutables.
- Regla única compartida annotate/apply: nodo de texto **significativo** = hijo directo de tipo texto con `/\S/` **y cuyo rango fuente no contiene marcado** (`/<[a-zA-Z/!?]/` sobre el slice crudo — parse5 fusiona fragmentos separados por tags reales en foster parenting y texto tras `</body>`, y su rango incluiría esos tags: tales nodos NO son direccionables y no consumen índice); índice 0-based entre los significativos del mismo padre en orden documental; subárboles excluidos: `head`, `script`, `style`, `textarea`, `svg`, `math` (el propio elemento excluido también cuenta como excluido).
- Mensajes de error byte-exactos:
  - `Código de verificación no válido (pega la etiqueta de Google o solo el código)` (400)
  - `ID de Analytics no válido (ejemplo: G-ABC1DE23FG)` (400)
  - `Imagen no válida` (400)
  - `Esta página no tiene cabecera editable` (400)
  - `Herramienta desconocida` (400)
  - `Proyecto no encontrado` (404), `El proyecto no tiene snapshot actual` (400) (patrón actual)
- La API de herramientas queda TRAS el candado (no se añade nada a las exenciones del middleware).
- Suite existente (186 tests) y `npm run typecheck` verdes tras cada tarea. TDD.

---

### Task 1: walk v2 — nodos de texto significativos, `endTagEnd` y bandera de exclusión

**Files:**
- Modify: `src/editor/walk.ts`
- Test: `src/tests/walk.test.ts` (añadir al final; los tests existentes no se tocan)

**Interfaces:**
- Consumes: parse5 `parse` con `sourceCodeLocationInfo` (ya en uso).
- Produces (las usan Tareas 2, 3 y 6): `WalkedElement` gana
  `textNodes: { index: number; start: number; end: number; raw: string }[]`,
  `endTagEnd: number | null` y `textoExcluido: boolean`. Export nuevo
  `type TextNodeInfo`. Los campos existentes no cambian.

- [ ] **Step 1: Tests** (añadir al final de `src/tests/walk.test.ts`)

```ts
describe("walk v2: nodos de texto significativos", () => {
  it("elemento mixto: índices 0-based solo de los significativos, con rangos fuente", () => {
    const html = `<p>Hola <strong>mundo</strong> adios</p>`;
    const p = walkElementsInOrder(html).find((e) => e.tagName === "p")!;
    expect(p.textNodes).toHaveLength(2);
    expect(p.textNodes[0]).toMatchObject({ index: 0, raw: "Hola " });
    expect(p.textNodes[1]).toMatchObject({ index: 1, raw: " adios" });
    expect(html.slice(p.textNodes[1].start, p.textNodes[1].end)).toBe(" adios");
  });
  it("texto solo-blanco no cuenta ni consume índice", () => {
    const html = `<div>\n  <span>a</span> visible <span>b</span>\n</div>`;
    const div = walkElementsInOrder(html).find((e) => e.tagName === "div")!;
    expect(div.textNodes).toHaveLength(1);
    expect(div.textNodes[0]).toMatchObject({ index: 0, raw: " visible " });
  });
  it("raw conserva las entidades del fuente", () => {
    const html = `<p><b>x</b>a &amp; b</p>`;
    const p = walkElementsInOrder(html).find((e) => e.tagName === "p")!;
    expect(p.textNodes[0].raw).toBe("a &amp; b");
  });
  it("textoExcluido: dentro de svg y en head, y en el propio elemento excluido", () => {
    const html = `<html><head><title>t</title></head><body><svg><text>hola</text></svg><p>ok</p></body></html>`;
    const els = walkElementsInOrder(html);
    expect(els.find((e) => e.tagName === "text")!.textoExcluido).toBe(true);
    expect(els.find((e) => e.tagName === "title")!.textoExcluido).toBe(true);
    expect(els.find((e) => e.tagName === "head")!.textoExcluido).toBe(true);
    expect(els.find((e) => e.tagName === "p")!.textoExcluido).toBe(false);
  });
  it("endTagEnd: fin del tag de cierre; null en void elements", () => {
    const html = `<p>x</p><img src="a.png">`;
    const els = walkElementsInOrder(html);
    const p = els.find((e) => e.tagName === "p")!;
    expect(html.slice(p.endTagStart!, p.endTagEnd!)).toBe("</p>");
    expect(els.find((e) => e.tagName === "img")!.endTagEnd).toBeNull();
  });
});
```

(Import ya existente en el archivo: `walkElementsInOrder` desde `@/src/editor/walk`.)

- [ ] **Step 2: Ver fallar** — `npx vitest run src/tests/walk.test.ts` → FAIL (campos inexistentes).

- [ ] **Step 3: Implementación — `src/editor/walk.ts`** (archivo completo)

```ts
import { parse } from "parse5";

export type TextNodeInfo = { index: number; start: number; end: number; raw: string };

export type WalkedElement = {
  id: number;
  tagName: string;
  startTagStart: number;
  startTagEnd: number;
  endTagStart: number | null;
  endTagEnd: number | null;
  hasElementChildren: boolean;
  text: string;
  attrs: Record<string, string>;
  attrLocations: Record<string, { start: number; end: number }>;
  /** Nodos de texto significativos (hijos directos con algo no-blanco), en orden documental. */
  textNodes: TextNodeInfo[];
  /** true si el elemento ES un excluido para edición de texto o vive dentro de uno. */
  textoExcluido: boolean;
};

// Subárboles donde no se edita texto suelto (regla compartida con annotate/apply).
const EXCLUIDOS = new Set(["head", "script", "style", "textarea", "svg", "math"]);

export function walkElementsInOrder(html: string): WalkedElement[] {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const out: WalkedElement[] = [];
  let nextId = 0;

  const visit = (node: unknown, excluido: boolean) => {
    const n = node as {
      tagName?: string;
      attrs?: { name: string; value: string }[];
      childNodes?: unknown[];
      sourceCodeLocation?: {
        startOffset: number;
        startTag?: { endOffset: number };
        endTag?: { startOffset: number; endOffset: number };
        attrs?: Record<string, { startOffset: number; endOffset: number }>;
      } | null;
    };
    const loc = n.sourceCodeLocation;
    let excluidoHijos = excluido;
    if (typeof n.tagName === "string" && loc && loc.startTag) {
      const propioExcluido = excluido || EXCLUIDOS.has(n.tagName);
      const kids = (n.childNodes ?? []) as {
        tagName?: string; nodeName?: string; value?: string;
        sourceCodeLocation?: { startOffset: number; endOffset: number } | null;
      }[];
      const attrs: Record<string, string> = {};
      for (const a of n.attrs ?? []) attrs[a.name] = a.value;
      const attrLocations: Record<string, { start: number; end: number }> = {};
      for (const [name, l] of Object.entries(loc.attrs ?? {})) {
        attrLocations[name] = { start: l.startOffset, end: l.endOffset };
      }
      const textNodes: TextNodeInfo[] = [];
      let idx = 0;
      for (const c of kids) {
        if (c.nodeName !== "#text") continue;
        if (!/\S/.test(c.value ?? "")) continue;
        const tl = c.sourceCodeLocation;
        if (!tl) continue; // texto sintetizado sin posición en el fuente: no direccionable
        textNodes.push({
          index: idx++,
          start: tl.startOffset,
          end: tl.endOffset,
          raw: html.slice(tl.startOffset, tl.endOffset),
        });
      }
      out.push({
        id: nextId++,
        tagName: n.tagName,
        startTagStart: loc.startOffset,
        startTagEnd: loc.startTag.endOffset,
        endTagStart: loc.endTag ? loc.endTag.startOffset : null,
        endTagEnd: loc.endTag ? loc.endTag.endOffset : null,
        hasElementChildren: kids.some((c) => typeof c.tagName === "string"),
        text: kids.filter((c) => c.nodeName === "#text").map((c) => c.value ?? "").join(""),
        attrs,
        attrLocations,
        textNodes,
        textoExcluido: propioExcluido,
      });
      excluidoHijos = propioExcluido;
    }
    if (n.childNodes) for (const c of n.childNodes) visit(c, excluidoHijos);
  };
  visit(doc, false);
  return out;
}
```

- [ ] **Step 4: Verde total** — `npx vitest run` (los 186 existentes + nuevos) y `npm run typecheck`.

- [ ] **Step 5: Commit** — `git add -A; git commit -m "feat(3c): walk v2 — nodos de texto significativos, endTagEnd y exclusiones"`

---

### Task 2: annotate v2 — wrappers `<wc-t>` en elementos mixtos (solo preview)

**Files:**
- Modify: `src/editor/annotate.ts`
- Test: `src/tests/annotate.test.ts` (añadir al final)

**Interfaces:**
- Consumes: `walkElementsInOrder` v2 (Tarea 1: `textNodes`, `textoExcluido`, `hasElementChildren`).
- Produces: `annotateForEdit(html)` además de `data-wc-id` envuelve cada nodo de texto
  significativo de un elemento MIXTO en `<wc-t data-wc-tn="<idPadre>:<índice>">…</wc-t>`.
  La Tarea 4 (cliente) depende del formato exacto `id:índice`.

- [ ] **Step 1: Tests** (añadir al final de `src/tests/annotate.test.ts`)

```ts
describe("annotate v2: wrappers wc-t en elementos mixtos", () => {
  it("envuelve el texto suelto de un mixto con el id del padre y el índice", () => {
    const html = `<p>Hola <strong>mundo</strong> adios</p>`;
    const out = annotateForEdit(html);
    const p = walkElementsInOrder(html).find((e) => e.tagName === "p")!;
    expect(out).toContain(`<wc-t data-wc-tn="${p.id}:0">Hola </wc-t>`);
    expect(out).toContain(`<wc-t data-wc-tn="${p.id}:1"> adios</wc-t>`);
  });
  it("un elemento de texto puro (hoja) NO se envuelve", () => {
    const out = annotateForEdit(`<p>solo texto</p>`);
    expect(out).not.toContain("wc-t");
  });
  it("no envuelve dentro de subárboles excluidos", () => {
    const out = annotateForEdit(
      `<html><head><title>t</title><script>var x = 1;</script></head>` +
      `<body><svg><text>a<tspan>b</tspan>c</text></svg></body></html>`
    );
    expect(out).not.toContain("wc-t");
  });
  it("el texto envuelto conserva las entidades del fuente", () => {
    const out = annotateForEdit(`<p><b>x</b>a &amp; b</p>`);
    expect(out).toContain(`>a &amp; b</wc-t>`);
  });
  it("los data-wc-id existentes no cambian de valor por los wrappers", () => {
    const html = `<div><p>Hola <b>x</b></p><span>y</span></div>`;
    const sinWrap = walkElementsInOrder(html);
    const out = annotateForEdit(html);
    for (const e of sinWrap) expect(out).toContain(`data-wc-id="${e.id}"`);
  });
});
```

(Imports del archivo ya existentes: `annotateForEdit`; añadir `walkElementsInOrder` si falta.)

- [ ] **Step 2: Ver fallar** — `npx vitest run src/tests/annotate.test.ts`.

- [ ] **Step 3: Implementación — `src/editor/annotate.ts`** (archivo completo)

```ts
import { walkElementsInOrder } from "./walk";

// Marcado solo-preview (jamás se guarda): data-wc-id en cada elemento y, en los
// elementos MIXTOS (hijos elemento + texto suelto), cada nodo de texto significativo
// envuelto en <wc-t data-wc-tn="<idPadre>:<índice>">…</wc-t>. `wc-t` no existe en
// HTML: es inline, sin estilos de navegador, y el CSS del sitio no lo conoce.
export function annotateForEdit(html: string): string {
  const inserts: { at: number; text: string }[] = [];
  for (const e of walkElementsInOrder(html)) {
    inserts.push({ at: e.startTagStart + 1 + e.tagName.length, text: ` data-wc-id="${e.id}"` });
    if (e.hasElementChildren && !e.textoExcluido) {
      for (const t of e.textNodes) {
        inserts.push({ at: t.start, text: `<wc-t data-wc-tn="${e.id}:${t.index}">` });
        inserts.push({ at: t.end, text: `</wc-t>` });
      }
    }
  }
  inserts.sort((a, b) => b.at - a.at);
  let out = html;
  for (const ins of inserts) out = out.slice(0, ins.at) + ins.text + out.slice(ins.at);
  return out;
}
```

Nota para el implementador: `Array.prototype.sort` es estable — dos inserciones en el
mismo offset conservan su orden de push, y los offsets de apertura/cierre de wrapper
nunca coinciden entre sí (parse5 fusiona textos adyacentes).

- [ ] **Step 4: Verde total + typecheck.**

- [ ] **Step 5: Commit** — `git add -A; git commit -m "feat(3c): annotate v2 — texto suelto de mixtos envuelto en wc-t (solo preview)"`

---

### Task 3: op `textNode` — apply, validate-op y save-edits

**Files:**
- Modify: `src/editor/apply.ts`, `src/editor/validate-op.ts`, `src/editor/save-edits.ts`
- Test: `src/tests/apply.test.ts`, `src/tests/validate-op.test.ts` (añadir al final)

**Interfaces:**
- Consumes: `walkElementsInOrder` v2 (`textNodes`, `textoExcluido`).
- Produces (las usan Tareas 4 y 9):
  - `EditOp` += `{ page: string; nodeId: number; kind: "textNode"; index: number; value: string }`
  - `PageOp` += `{ nodeId: number; kind: "textNode"; index: number; value: string }`
  - `isValidOp` acepta el variant; `saveEdits` lo pasa a página; `applyEdits` lo aplica.

- [ ] **Step 1: Tests de apply** (añadir al final de `src/tests/apply.test.ts`)

```ts
describe("op textNode (texto mixto)", () => {
  const html = `<p>Hola <strong>mundo</strong> adios &amp; fin</p>`;
  const idP = () => walkElementsInOrder(html).find((e) => e.tagName === "p")!.id;

  it("reemplaza el nodo de texto por índice, escapando y sin tocar el resto", () => {
    const out = applyEdits(html, [{ nodeId: idP(), kind: "textNode", index: 1, value: "y <fin>" }]);
    expect(out).toBe(`<p>Hola <strong>mundo</strong>y &lt;fin&gt;</p>`);
  });
  it("índice 0 y 1 en la misma pasada", () => {
    const out = applyEdits(html, [
      { nodeId: idP(), kind: "textNode", index: 0, value: "A " },
      { nodeId: idP(), kind: "textNode", index: 1, value: " B" },
    ]);
    expect(out).toBe(`<p>A <strong>mundo</strong> B</p>`);
  });
  it("índice inexistente → op ignorada", () => {
    expect(applyEdits(html, [{ nodeId: idP(), kind: "textNode", index: 7, value: "x" }])).toBe(html);
  });
  it("elemento excluido → op ignorada", () => {
    const conSvg = `<svg><text>a<tspan>b</tspan>c</text></svg>`;
    const idText = walkElementsInOrder(conSvg).find((e) => e.tagName === "text")!.id;
    expect(applyEdits(conSvg, [{ nodeId: idText, kind: "textNode", index: 0, value: "x" }])).toBe(conSvg);
  });
  it("dedup: la última op del mismo (nodo, índice) gana; índices distintos conviven", () => {
    const out = applyEdits(html, [
      { nodeId: idP(), kind: "textNode", index: 0, value: "primera " },
      { nodeId: idP(), kind: "textNode", index: 0, value: "ultima " },
    ]);
    expect(out).toBe(`<p>ultima <strong>mundo</strong> adios &amp; fin</p>`);
  });
  it("convive con ops de atributo en el mismo elemento", () => {
    const conA = `<a href="/x">ver <b>más</b> aquí</a>`;
    const idA = walkElementsInOrder(conA).find((e) => e.tagName === "a")!.id;
    const out = applyEdits(conA, [
      { nodeId: idA, kind: "href", value: "https://nuevo.com" },
      { nodeId: idA, kind: "textNode", index: 1, value: " allí" },
    ]);
    expect(out).toBe(`<a href="https://nuevo.com">ver <b>más</b> allí</a>`);
  });
});
```

(Import a añadir si falta: `walkElementsInOrder` desde `@/src/editor/walk`.)

- [ ] **Step 2: Tests de validate-op** (añadir al final de `src/tests/validate-op.test.ts`)

```ts
describe("isValidOp: textNode", () => {
  it("acepta value string e index entero ≥0", () => {
    expect(isValidOp({ page: "i.html", nodeId: 1, kind: "textNode", index: 0, value: "x" } as never)).toBe(true);
  });
  it("rechaza index negativo, no entero o value no string", () => {
    expect(isValidOp({ page: "i.html", nodeId: 1, kind: "textNode", index: -1, value: "x" } as never)).toBe(false);
    expect(isValidOp({ page: "i.html", nodeId: 1, kind: "textNode", index: 1.5, value: "x" } as never)).toBe(false);
    expect(isValidOp({ page: "i.html", nodeId: 1, kind: "textNode", index: 0, value: 3 } as never)).toBe(false);
  });
});
```

- [ ] **Step 3: Ver fallar** — `npx vitest run src/tests/apply.test.ts src/tests/validate-op.test.ts`.

- [ ] **Step 4: Implementación.**

En `src/editor/apply.ts`:
- `EditOp` añade `| { page: string; nodeId: number; kind: "textNode"; index: number; value: string }`.
- `PageOp` añade `| { nodeId: number; kind: "textNode"; index: number; value: string }`.
- En `applyEdits`, la clave de dedup pasa a:

```ts
    const extra = op.kind === "style" ? op.property : op.kind === "textNode" ? String(op.index) : "";
    dedup.set(`${op.nodeId}#${op.kind}#${extra}`, op);
```

- Rama nueva en el bucle de edits (antes del `else` de style):

```ts
    } else if (op.kind === "textNode") {
      if (el.textoExcluido) continue;
      const t = el.textNodes.find((x) => x.index === op.index);
      if (!t) continue;
      edits.push({ start: t.start, end: t.end, text: escapeHtmlText(op.value) });
    } else {
```

(Los rangos de texto viven entre tags: no solapan con los tramos de atributos ni con
otros textos → el orden descendente actual sigue siendo válido. OJO — enmienda de la
revisión: en un nodo HOJA el rango de su único nodo de texto coincide con el rango de
contenido de la op `text` clásica; para evitar solapamiento, `applyEdits` aplica
exclusión mutua por nodo: si un `nodeId` tiene alguna op `textNode` en el lote, sus
ops `text` clásicas se ignoran (gana la más específica). Además la op `text` clásica
respeta `textoExcluido`, igual que `textNode`.)

En `src/editor/validate-op.ts`, caso nuevo en el switch:

```ts
    case "textNode":
      return typeof op.value === "string" && Number.isInteger(op.index) && op.index >= 0;
```

En `src/editor/save-edits.ts`, caso nuevo en `toPageOp`:

```ts
    case "textNode": return { nodeId: op.nodeId, kind: "textNode", index: op.index, value: op.value };
```

- [ ] **Step 5: Verde total + typecheck** — `npx vitest run` y `npm run typecheck`.

- [ ] **Step 6: Commit** — `git add -A; git commit -m "feat(3c): op textNode — texto mixto aplicado quirúrgicamente por índice"`

---

### Task 4: Cliente — `wc-editor.js` edita `wc-t` y `PreviewPane` acumula la op

**Files:**
- Modify: `public/wc-editor.js`
- Modify: `app/projects/[id]/PreviewPane.tsx` (tipo `EditOp` local y `opKey`)

**Interfaces:**
- Consumes: wrappers `<wc-t data-wc-tn="id:índice">` (Tarea 2) y op `textNode` (Tarea 3).
- Produces: el iframe emite `{ page, nodeId, kind: "textNode", index, value }` vía
  postMessage `wc-edit` (misma tubería que el resto).

- [ ] **Step 1: `public/wc-editor.js`** — cambios exactos (el resto del archivo no se toca):

1. Tras la función `esBoton` (línea ~16), añadir:

```js
  function esTextoMixto(el) {
    return !!(el && el.nodeType === 1 && el.tagName.toLowerCase() === "wc-t" && el.hasAttribute("data-wc-tn"));
  }
```

2. En `resolverEditable`, primera comprobación (antes de `esTextoHoja || esImagen || esEnlace`):

```js
    if (esTextoMixto(el)) return el;
```

3. En `marcar`, el cursor de texto también para mixtos — sustituir la línea por:

```js
  function marcar(el) { el.style.outline = "2px dashed #6366f1"; el.style.outlineOffset = "2px"; if (esTextoHoja(el) || esTextoMixto(el)) el.style.cursor = "text"; }
```

4. En `terminarEdicion`, la emisión distingue el wrapper — sustituir el bloque `if (guardar && valor !== valorPrevio)`:

```js
    if (guardar && valor !== valorPrevio) {
      if (esTextoMixto(el)) {
        var tn = (el.getAttribute("data-wc-tn") || "").split(":");
        emitir({ page: PAGE, nodeId: Number(tn[0]), kind: "textNode", index: Number(tn[1]), value: valor });
      } else {
        emitir({ page: PAGE, nodeId: idDe(el), kind: "text", value: valor });
      }
    } else if (!guardar) { el.textContent = valorPrevio; }
```

5. En el listener de `click`, permitir iniciar edición sobre el wrapper — sustituir la condición final:

```js
    if ((esTextoHoja(objetivoClick) || esTextoMixto(objetivoClick)) && !esBoton(objetivoClick) && objetivoClick !== editando) {
      iniciarEdicion(objetivoClick);
    }
```

Notas de diseño que el implementador debe respetar: los `wc-t` NO ofrecen selector de
color ni edición de href propios (el popover puede quedar vacío para un `wc-t` suelto:
`mostrar()` ya lo oculta si no tiene hijos); si el `wc-t` vive dentro de un `<a>`, el
enlace se sigue editando haciendo clic en las zonas no-texto del `<a>` (comportamiento
actual de iconos).

- [ ] **Step 2: `app/projects/[id]/PreviewPane.tsx`** — dos cambios exactos:

Tipo local `EditOp` (línea ~4-9): añadir el variant

```ts
  | { page: string; nodeId: number; kind: "textNode"; index: number; value: string }
```

`opKey` (línea ~12-15) — sustituir por:

```ts
function opKey(op: EditOp): string {
  const extra = op.kind === "style" ? op.property : op.kind === "textNode" ? String(op.index) : "";
  return `${op.page}#${op.nodeId}#${op.kind}#${extra}`;
}
```

- [ ] **Step 3: Verificación manual con curl + navegador headless.** Con `npm run dev` en background (login `dev1234` → cookie como en tareas anteriores del proyecto):
  1. Importar un ZIP con `index.html` = `<!doctype html><html><head><title>t</title></head><body><p>Hola <strong>mundo</strong> adios</p></body></html>` (curl -F con la cookie).
  2. `GET /api/projects/<id>/preview/?edit=1` → el HTML contiene `<wc-t data-wc-tn="` (anotado).
  3. `POST /api/projects/<id>/edits` con `{"ops":[{"page":"index.html","nodeId":<idDelP>,"kind":"textNode","index":1,"value":" EDITADO"}]}` (el `nodeId` del `<p>` se lee del preview anotado: atributo `data-wc-id` del `<p>`) → 201.
  4. `GET /api/projects/<id>/preview/` (sin edit) → contiene `<strong>mundo</strong> EDITADO` y NO contiene `wc-t`.
  5. Matar el dev server.

- [ ] **Step 4: Suite + typecheck** — `npx vitest run` y `npm run typecheck` (sin regresiones).

- [ ] **Step 5: Commit** — `git add -A; git commit -m "feat(3c): el editor in-situ edita texto mixto (wc-t) y emite ops textNode"`

---

### Task 5: helper compartido `crearSnapshotEditado` + refactor de `saveEdits`

**Files:**
- Create: `src/editor/snapshot-copy.ts`
- Modify: `src/editor/save-edits.ts`
- Test: la suite existente de save-edits (`src/tests/save-edits.test.ts`) es la red — NO se modifica.

**Interfaces:**
- Consumes: `snapshotPrefix`, `StorageAdapter`, `ProjectStore` (existentes).
- Produces (la usa la Tarea 7):

```ts
crearSnapshotEditado(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: {
    orgId: string; projectId: string;
    currentSnapshot: { id: string; storagePrefix: string };
    /** null = la página no cambia (se copian los bytes tal cual, sin recodificar). */
    transformar: (rel: string, html: string) => string | null;
    extras?: Map<string, { body: Buffer; contentType: string }>;
    operacionesJson: unknown;
  }
): Promise<{ snapshotId: string }>
```

- [ ] **Step 1: Crear `src/editor/snapshot-copy.ts`** (archivo completo)

```ts
import { snapshotPrefix } from "@/src/storage/keys";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

// Copia el snapshot actual a uno nuevo (tipo "edit"): las páginas .html pasan por
// `transformar` (null = sin cambios, se copian los bytes originales sin recodificar);
// `extras` añade archivos (p. ej. assets a wc-uploads/). Si el alta del snapshot en
// BD falla, se limpia el storage escrito (compensación). Mecánica compartida por
// saveEdits y por las herramientas del sitio.
export async function crearSnapshotEditado(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: {
    orgId: string;
    projectId: string;
    currentSnapshot: { id: string; storagePrefix: string };
    transformar: (rel: string, html: string) => string | null;
    extras?: Map<string, { body: Buffer; contentType: string }>;
    operacionesJson: unknown;
  }
): Promise<{ snapshotId: string }> {
  const snapshotId = crypto.randomUUID();
  const newPrefix = snapshotPrefix(input.projectId, snapshotId);
  const written: string[] = [];

  const keys = await deps.storage.list(input.currentSnapshot.storagePrefix);
  for (const key of keys) {
    const rel = key.slice(input.currentSnapshot.storagePrefix.length);
    const file = await deps.storage.get(key);
    if (!file) continue;
    let body = file.body;
    if (/\.html?$/i.test(rel)) {
      const nuevo = input.transformar(rel, body.toString("utf-8"));
      if (nuevo !== null) body = Buffer.from(nuevo, "utf-8");
    }
    await deps.storage.put(newPrefix + rel, body);
    written.push(newPrefix + rel);
  }
  for (const [path, asset] of input.extras ?? new Map<string, { body: Buffer; contentType: string }>()) {
    await deps.storage.put(newPrefix + path, asset.body, asset.contentType);
    written.push(newPrefix + path);
  }

  try {
    await deps.store.createSnapshot({
      snapshotId, projectId: input.projectId, parentId: input.currentSnapshot.id,
      tipo: "edit", storagePrefix: newPrefix, operacionesJson: input.operacionesJson,
    });
  } catch (e) {
    for (const k of written) { try { await deps.storage.delete(k); } catch { /* best-effort */ } }
    throw e;
  }
  await deps.store.setCurrentSnapshot(input.orgId, input.projectId, snapshotId);
  return { snapshotId };
}
```

- [ ] **Step 2: Refactor de `src/editor/save-edits.ts`** — la parte de copia/creación
  (desde `const snapshotId = crypto.randomUUID();` hasta el `return`) se sustituye por:

```ts
  return crearSnapshotEditado(deps, {
    orgId: input.orgId,
    projectId: input.projectId,
    currentSnapshot: { id: current.id, storagePrefix: current.storagePrefix },
    transformar: (rel, html) => {
      const ops = porPagina.get(rel);
      return ops ? applyEdits(html, ops) : null;
    },
    extras: assetCopias,
    operacionesJson: input.ops,
  });
```

(Import nuevo: `crearSnapshotEditado` desde `./snapshot-copy`; quitar los imports que
queden sin uso: `snapshotPrefix`. La validación previa, la separación por página y la
carga de assets NO cambian.)

- [ ] **Step 3: Verde total** — `npx vitest run` (los tests de save-edits/restore/assets
  existentes son la red del refactor: deben pasar sin tocarlos) y `npm run typecheck`.

- [ ] **Step 4: Commit** — `git add -A; git commit -m "refactor(3c): crearSnapshotEditado compartido (saveEdits lo usa; las herramientas lo reutilizarán)"`

---

### Task 6: `head-tools` — módulo puro de herramientas de cabecera

**Files:**
- Create: `src/editor/head-tools.ts`
- Test: `src/tests/head-tools.test.ts` (nuevo)

**Interfaces:**
- Consumes: `walkElementsInOrder` v2 (attrs, rangos, `endTagEnd`), `escapeAttr` (apply),
  `ALLOWED_IMAGE_EXTS` (validate-op).
- Produces (las usan Tareas 7 y 8):
  - `type Herramienta = { tipo: "google-verification"; codigo: string } | { tipo: "analytics"; medicion: string } | { tipo: "favicon"; ruta: string } | { tipo: "og-image"; ruta: string }`
  - `type TipoHerramienta = Herramienta["tipo"]`
  - `type EstadoHerramientas = { googleVerification: string | null; analytics: string | null; favicon: string | null; ogImage: string | null }`
  - `normalizarVerificacion(input: string): string | null`
  - `normalizarMedicion(input: string): string | null`
  - `rutaDeAssetValida(ruta: string): boolean`
  - `aplicarHerramienta(html: string, h: Herramienta): string` (lanza `HeadToolsError`)
  - `quitarHerramienta(html: string, tipo: TipoHerramienta): string`
  - `estadoHerramientas(html: string): EstadoHerramientas`
  - `class HeadToolsError extends Error { status: number }`

- [ ] **Step 1: Tests — `src/tests/head-tools.test.ts`** (archivo completo)

```ts
import { describe, it, expect } from "vitest";
import {
  aplicarHerramienta, quitarHerramienta, estadoHerramientas,
  normalizarVerificacion, normalizarMedicion, rutaDeAssetValida, HeadToolsError,
} from "@/src/editor/head-tools";

const BASE = `<!doctype html><html><head><title>t</title></head><body><p>x</p></body></html>`;
const RUTA = "/wc-uploads/01234567-89ab-4cde-8f01-23456789abcd.png";

describe("normalizadores", () => {
  it("verificación: token pelado y etiqueta completa", () => {
    expect(normalizarVerificacion("  Abc123_-Abc123_-XYZ  ")).toBe("Abc123_-Abc123_-XYZ");
    expect(normalizarVerificacion(`<meta name="google-site-verification" content="Abc123_-Abc123_-XYZ" />`))
      .toBe("Abc123_-Abc123_-XYZ");
    expect(normalizarVerificacion("corto")).toBeNull();
    expect(normalizarVerificacion("con espacios no vale 12345678")).toBeNull();
  });
  it("analytics: mayúsculas y formato G-", () => {
    expect(normalizarMedicion("  g-abc1de23fg ")).toBe("G-ABC1DE23FG");
    expect(normalizarMedicion("UA-12345")).toBeNull();
    expect(normalizarMedicion("G-!!")).toBeNull();
  });
  it("ruta de asset", () => {
    expect(rutaDeAssetValida(RUTA)).toBe(true);
    expect(rutaDeAssetValida("/otra/cosa.png")).toBe(false);
    expect(rutaDeAssetValida("/wc-uploads/x.png")).toBe(false);
  });
});

describe("aplicarHerramienta", () => {
  it("inserta la meta de verificación antes de </head>", () => {
    const out = aplicarHerramienta(BASE, { tipo: "google-verification", codigo: "Abc123_-Abc123_-XYZ" });
    expect(out).toContain(`<meta name="google-site-verification" content="Abc123_-Abc123_-XYZ"></head>`);
  });
  it("reemplaza la verificación existente sin duplicar", () => {
    const con = aplicarHerramienta(BASE, { tipo: "google-verification", codigo: "Abc123_-Abc123_-XYZ" });
    const out = aplicarHerramienta(con, { tipo: "google-verification", codigo: "Nuevo456_-Nuevo456_-Q" });
    expect(out.match(/google-site-verification/g)).toHaveLength(1);
    expect(out).toContain(`content="Nuevo456_-Nuevo456_-Q"`);
  });
  it("analytics: dos scripts marcados con data-wc-tool", () => {
    const out = aplicarHerramienta(BASE, { tipo: "analytics", medicion: "G-ABC1DE23FG" });
    expect(out.match(/data-wc-tool="analytics"/g)).toHaveLength(2);
    expect(out).toContain(`https://www.googletagmanager.com/gtag/js?id=G-ABC1DE23FG`);
    expect(out).toContain(`gtag('config','G-ABC1DE23FG')`);
  });
  it("re-aplicar analytics reemplaza ambos scripts", () => {
    const con = aplicarHerramienta(BASE, { tipo: "analytics", medicion: "G-ABC1DE23FG" });
    const out = aplicarHerramienta(con, { tipo: "analytics", medicion: "G-ZZZ9YYY8XX" });
    expect(out.match(/data-wc-tool="analytics"/g)).toHaveLength(2);
    expect(out).not.toContain("G-ABC1DE23FG");
  });
  it("favicon: elimina los icon existentes (incl. shortcut icon) y respeta apple-touch-icon", () => {
    const conIconos = `<!doctype html><html><head><link rel="shortcut icon" href="/a.ico">` +
      `<link rel="ICON" href="/b.png"><link rel="apple-touch-icon" href="/c.png"><title>t</title></head><body></body></html>`;
    const out = aplicarHerramienta(conIconos, { tipo: "favicon", ruta: RUTA });
    expect(out).not.toContain("/a.ico");
    expect(out).not.toContain("/b.png");
    expect(out).toContain("apple-touch-icon");
    expect(out).toContain(`<link rel="icon" href="${RUTA}">`);
  });
  it("og-image: inserta y reemplaza", () => {
    const con = aplicarHerramienta(BASE, { tipo: "og-image", ruta: RUTA });
    expect(con).toContain(`<meta property="og:image" content="${RUTA}">`);
    const out = aplicarHerramienta(con, { tipo: "og-image", ruta: RUTA.replace(".png", ".webp") });
    expect(out.match(/og:image/g)).toHaveLength(1);
  });
  it("sin </head> con posición: inserta antes de <body>; sin body → error 400", () => {
    const sinHead = `<body><p>x</p></body>`;
    const out = aplicarHerramienta(sinHead, { tipo: "og-image", ruta: RUTA });
    expect(out.indexOf("og:image")).toBeLessThan(out.indexOf("<p>"));
    expect(() => aplicarHerramienta(`<p>solo</p>`, { tipo: "og-image", ruta: RUTA }))
      .toThrowError(HeadToolsError);
  });
});

describe("quitarHerramienta y estadoHerramientas", () => {
  it("quitar elimina; estado refleja lo aplicado", () => {
    let html = aplicarHerramienta(BASE, { tipo: "google-verification", codigo: "Abc123_-Abc123_-XYZ" });
    html = aplicarHerramienta(html, { tipo: "analytics", medicion: "G-ABC1DE23FG" });
    html = aplicarHerramienta(html, { tipo: "favicon", ruta: RUTA });
    const estado = estadoHerramientas(html);
    expect(estado).toEqual({
      googleVerification: "Abc123_-Abc123_-XYZ",
      analytics: "G-ABC1DE23FG",
      favicon: RUTA,
      ogImage: null,
    });
    const sinAna = quitarHerramienta(html, "analytics");
    expect(sinAna).not.toContain("data-wc-tool");
    expect(estadoHerramientas(sinAna).analytics).toBeNull();
    expect(quitarHerramienta(BASE, "favicon")).toBe(BASE); // sin objetivo → intacto
  });
});
```

- [ ] **Step 2: Ver fallar** — `npx vitest run src/tests/head-tools.test.ts`.

- [ ] **Step 3: Implementación — `src/editor/head-tools.ts`** (archivo completo)

```ts
import { walkElementsInOrder, type WalkedElement } from "./walk";
import { escapeAttr } from "./apply";
import { ALLOWED_IMAGE_EXTS } from "./validate-op";

// Herramientas de cabecera: se materializan como ediciones quirúrgicas del <head>
// (reemplazar el objetivo existente o insertar antes de </head>). El HTML publicado
// las lleva tal cual (byte-idéntico): el único rastro añadido es el atributo marcador
// data-wc-tool en los scripts de Analytics, necesario para reemplazar/quitar sin
// heurísticas.

export type Herramienta =
  | { tipo: "google-verification"; codigo: string }
  | { tipo: "analytics"; medicion: string }
  | { tipo: "favicon"; ruta: string }
  | { tipo: "og-image"; ruta: string };

export type TipoHerramienta = Herramienta["tipo"];

export type EstadoHerramientas = {
  googleVerification: string | null;
  analytics: string | null;
  favicon: string | null;
  ogImage: string | null;
};

export class HeadToolsError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

const TOKEN_RE = /^[A-Za-z0-9_-]{16,100}$/;
const MEDICION_RE = /^G-[A-Z0-9]{4,20}$/;
const RUTA_RE = new RegExp(
  `^/wc-uploads/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(${ALLOWED_IMAGE_EXTS.join("|")})$`,
  "i"
);

export function normalizarVerificacion(input: string): string | null {
  let s = input.trim();
  const meta = s.match(/content\s*=\s*["']([^"']+)["']/i);
  if (meta) s = meta[1].trim();
  return TOKEN_RE.test(s) ? s : null;
}

export function normalizarMedicion(input: string): string | null {
  const s = input.trim().toUpperCase();
  return MEDICION_RE.test(s) ? s : null;
}

export function rutaDeAssetValida(ruta: string): boolean {
  return RUTA_RE.test(ruta);
}

function relTokens(el: WalkedElement): string[] {
  return (el.attrs["rel"] ?? "").toLowerCase().split(/\s+/).filter(Boolean);
}

function esObjetivo(el: WalkedElement, tipo: TipoHerramienta): boolean {
  if (tipo === "google-verification") {
    return el.tagName === "meta" && (el.attrs["name"] ?? "").toLowerCase() === "google-site-verification";
  }
  if (tipo === "analytics") {
    return el.tagName === "script" && el.attrs["data-wc-tool"] === "analytics";
  }
  if (tipo === "favicon") {
    const rel = relTokens(el);
    return el.tagName === "link" && rel.includes("icon") && !rel.includes("apple-touch-icon");
  }
  return el.tagName === "meta" && (el.attrs["property"] ?? "").toLowerCase() === "og:image";
}

function snippetDe(h: Herramienta): string {
  switch (h.tipo) {
    case "google-verification":
      return `<meta name="google-site-verification" content="${escapeAttr(h.codigo)}">`;
    case "analytics":
      return (
        `<script async src="https://www.googletagmanager.com/gtag/js?id=${h.medicion}" data-wc-tool="analytics"></script>` +
        `<script data-wc-tool="analytics">window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${h.medicion}');</script>`
      );
    case "favicon":
      return `<link rel="icon" href="${escapeAttr(h.ruta)}">`;
    case "og-image":
      return `<meta property="og:image" content="${escapeAttr(h.ruta)}">`;
  }
}

// Rango fuente completo de un elemento (para eliminarlo). En void elements no hay
// tag de cierre: el rango es el propio start tag.
function rangoDe(el: WalkedElement): { start: number; end: number } {
  return { start: el.startTagStart, end: el.endTagEnd ?? el.startTagEnd };
}

function puntoDeInsercion(els: WalkedElement[]): number {
  const head = els.find((e) => e.tagName === "head" && e.endTagStart != null);
  if (head) return head.endTagStart as number;
  // HTML sin </head> localizable (parse5 lo sintetiza sin posición): justo antes de <body>.
  const body = els.find((e) => e.tagName === "body");
  if (body) return body.startTagStart;
  throw new HeadToolsError("Esta página no tiene cabecera editable", 400);
}

function aplicarEdits(html: string, edits: { start: number; end: number; text: string }[]): string {
  edits.sort((a, b) => b.start - a.start);
  let out = html;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}

export function aplicarHerramienta(html: string, h: Herramienta): string {
  const els = walkElementsInOrder(html);
  const edits = els.filter((e) => esObjetivo(e, h.tipo)).map((e) => ({ ...rangoDe(e), text: "" }));
  const at = puntoDeInsercion(els);
  edits.push({ start: at, end: at, text: snippetDe(h) });
  return aplicarEdits(html, edits);
}

export function quitarHerramienta(html: string, tipo: TipoHerramienta): string {
  const els = walkElementsInOrder(html);
  const edits = els.filter((e) => esObjetivo(e, tipo)).map((e) => ({ ...rangoDe(e), text: "" }));
  if (edits.length === 0) return html;
  return aplicarEdits(html, edits);
}

export function estadoHerramientas(html: string): EstadoHerramientas {
  const els = walkElementsInOrder(html);
  const ver = els.find((e) => esObjetivo(e, "google-verification"));
  const ana = els.find((e) => esObjetivo(e, "analytics") && !!e.attrs["src"]);
  const fav = els.find((e) => esObjetivo(e, "favicon"));
  const og = els.find((e) => esObjetivo(e, "og-image"));
  const medicion = ana?.attrs["src"]?.match(/[?&]id=(G-[A-Z0-9]+)/i)?.[1] ?? null;
  return {
    googleVerification: ver?.attrs["content"] ?? null,
    analytics: medicion ? medicion.toUpperCase() : null,
    favicon: fav?.attrs["href"] ?? null,
    ogImage: og?.attrs["content"] ?? null,
  };
}
```

- [ ] **Step 4: Verde total + typecheck.**

- [ ] **Step 5: Commit** — `git add -A; git commit -m "feat(3c): head-tools — aplicar/quitar/estado de herramientas de cabecera (puro)"`

---

### Task 7: Flujo de proyecto + API `/api/projects/[id]/tools`

**Files:**
- Create: `src/editor/tools.ts`
- Create: `app/api/projects/[id]/tools/route.ts`
- Test: `src/tests/tools.test.ts` (nuevo)

**Interfaces:**
- Consumes: `crearSnapshotEditado` (Tarea 5); `aplicarHerramienta`/`quitarHerramienta`/
  `estadoHerramientas`/normalizadores/`HeadToolsError` (Tarea 6); `EditorError` existente;
  `getAsset`/`storage.get` (patrón de saveEdits para copiar la imagen a wc-uploads).
- Produces (las usa la Tarea 8):
  - `aplicarHerramientaAlProyecto(deps: {store; storage}, input: {orgId; projectId; herramienta: Herramienta}): Promise<{ snapshotId: string }>`
  - `quitarHerramientaDelProyecto(deps, input: {orgId; projectId; tipo: TipoHerramienta}): Promise<{ snapshotId: string }>`
  - `estadoDeHerramientas(deps, input: {orgId; projectId}): Promise<EstadoHerramientas>`
  - Rutas: `GET /api/projects/[id]/tools` → `EstadoHerramientas`;
    `POST` body `{herramienta}` → `{snapshotId}`; `DELETE` body `{tipo}` → `{snapshotId}`.

- [ ] **Step 1: Tests — `src/tests/tools.test.ts`** (archivo completo; fakes en memoria
  siguiendo el patrón de `src/tests/save-edits.test.ts` — leerlo antes para replicar
  su fake de store/storage; si difiere, usar estos fakes autónomos)

```ts
import { describe, it, expect } from "vitest";
import { aplicarHerramientaAlProyecto, quitarHerramientaDelProyecto, estadoDeHerramientas } from "@/src/editor/tools";
import type { ProjectStore } from "@/src/repositories/types";
import type { StorageAdapter } from "@/src/storage/types";

const ASSET_ID = "01234567-89ab-4cde-8f01-23456789abcd";
const RUTA = `/wc-uploads/${ASSET_ID}.png`;

function fakes() {
  const archivos = new Map<string, { body: Buffer; contentType: string }>();
  const snapshots: Record<string, { id: string; storagePrefix: string }> = {
    s1: { id: "s1", storagePrefix: "p/s1/" },
  };
  let current = "s1";
  archivos.set("p/s1/index.html", { body: Buffer.from(`<html><head><title>a</title></head><body><p>uno</p></body></html>`), contentType: "text/html" });
  archivos.set("p/s1/otra.html", { body: Buffer.from(`<html><head><title>b</title></head><body><p>dos</p></body></html>`), contentType: "text/html" });
  archivos.set("p/s1/styles.css", { body: Buffer.from("body{}"), contentType: "text/css" });
  archivos.set("assets/p1/logo.png", { body: Buffer.from("PNGBYTES"), contentType: "image/png" });

  const storage = {
    async put(k: string, b: Buffer | string, ct?: string) { archivos.set(k, { body: Buffer.isBuffer(b) ? b : Buffer.from(b), contentType: ct ?? "" }); },
    async get(k: string) { return archivos.get(k) ?? null; },
    async list(prefix: string) { return [...archivos.keys()].filter((k) => k.startsWith(prefix)); },
    async delete(k: string) { archivos.delete(k); },
  } as unknown as StorageAdapter;

  const store = {
    async getProject() { return { id: "p1", orgId: "o1", nombre: "X", entryPath: "index.html", currentSnapshotId: current, subdominio: null, dominio: null, publishedSnapshotId: null, createdAt: "" }; },
    async getCurrentSnapshot() { return { ...snapshots[current], projectId: "p1", tipo: "edit" }; },
    async createSnapshot(i: { snapshotId: string; storagePrefix: string }) { snapshots[i.snapshotId] = { id: i.snapshotId, storagePrefix: i.storagePrefix }; },
    async setCurrentSnapshot(_o: string, _p: string, id: string) { current = id; },
    async getAsset(_o: string, _p: string, assetId: string) {
      if (assetId.toLowerCase() !== ASSET_ID) return null;
      return { id: assetId, projectId: "p1", storageKey: "assets/p1/logo.png", contentType: "image/png", bytes: 8, createdAt: "" };
    },
  } as unknown as ProjectStore;

  return { store, storage, archivos, actual: () => snapshots[current] };
}

const deps = (f: ReturnType<typeof fakes>) => ({ store: f.store, storage: f.storage });

describe("aplicarHerramientaAlProyecto", () => {
  it("aplica a TODAS las páginas html, crea snapshot nuevo y no toca el css", async () => {
    const f = fakes();
    const r = await aplicarHerramientaAlProyecto(deps(f), {
      orgId: "o1", projectId: "p1",
      herramienta: { tipo: "google-verification", codigo: "  Abc123_-Abc123_-XYZ " },
    });
    const pref = f.actual().storagePrefix;
    expect(f.actual().id).toBe(r.snapshotId);
    for (const page of ["index.html", "otra.html"]) {
      const html = (await f.storage.get(pref + page))!.body.toString();
      expect(html).toContain(`google-site-verification" content="Abc123_-Abc123_-XYZ"`);
    }
    expect((await f.storage.get(pref + "styles.css"))!.body.toString()).toBe("body{}");
  });
  it("verificación inválida → 400 con mensaje exacto y sin snapshot nuevo", async () => {
    const f = fakes();
    await expect(aplicarHerramientaAlProyecto(deps(f), {
      orgId: "o1", projectId: "p1", herramienta: { tipo: "google-verification", codigo: "corto" },
    })).rejects.toMatchObject({ message: "Código de verificación no válido (pega la etiqueta de Google o solo el código)", status: 400 });
    expect(f.actual().id).toBe("s1");
  });
  it("analytics inválido → 400 exacto; válido se normaliza a mayúsculas", async () => {
    const f = fakes();
    await expect(aplicarHerramientaAlProyecto(deps(f), {
      orgId: "o1", projectId: "p1", herramienta: { tipo: "analytics", medicion: "UA-1" },
    })).rejects.toMatchObject({ message: "ID de Analytics no válido (ejemplo: G-ABC1DE23FG)", status: 400 });
    await aplicarHerramientaAlProyecto(deps(f), {
      orgId: "o1", projectId: "p1", herramienta: { tipo: "analytics", medicion: "g-abc1de23fg" },
    });
    const html = (await f.storage.get(f.actual().storagePrefix + "index.html"))!.body.toString();
    expect(html).toContain("G-ABC1DE23FG");
  });
  it("favicon: copia la imagen del asset a wc-uploads del snapshot nuevo", async () => {
    const f = fakes();
    await aplicarHerramientaAlProyecto(deps(f), {
      orgId: "o1", projectId: "p1", herramienta: { tipo: "favicon", ruta: RUTA },
    });
    const pref = f.actual().storagePrefix;
    expect((await f.storage.get(pref + RUTA.slice(1)))!.body.toString()).toBe("PNGBYTES");
    expect((await f.storage.get(pref + "index.html"))!.body.toString()).toContain(`<link rel="icon" href="${RUTA}">`);
  });
  it("ruta inválida o asset ajeno → 400 «Imagen no válida»", async () => {
    const f = fakes();
    await expect(aplicarHerramientaAlProyecto(deps(f), {
      orgId: "o1", projectId: "p1", herramienta: { tipo: "favicon", ruta: "/x.png" },
    })).rejects.toMatchObject({ message: "Imagen no válida", status: 400 });
    await expect(aplicarHerramientaAlProyecto(deps(f), {
      orgId: "o1", projectId: "p1",
      herramienta: { tipo: "favicon", ruta: "/wc-uploads/99999999-9999-4999-8999-999999999999.png" },
    })).rejects.toMatchObject({ message: "Imagen no válida", status: 400 });
  });
});

describe("quitar y estado", () => {
  it("quitar crea snapshot sin la herramienta; estado lo refleja", async () => {
    const f = fakes();
    await aplicarHerramientaAlProyecto(deps(f), {
      orgId: "o1", projectId: "p1", herramienta: { tipo: "analytics", medicion: "G-ABC1DE23FG" },
    });
    expect((await estadoDeHerramientas(deps(f), { orgId: "o1", projectId: "p1" })).analytics).toBe("G-ABC1DE23FG");
    await quitarHerramientaDelProyecto(deps(f), { orgId: "o1", projectId: "p1", tipo: "analytics" });
    expect((await estadoDeHerramientas(deps(f), { orgId: "o1", projectId: "p1" })).analytics).toBeNull();
    const html = (await f.storage.get(f.actual().storagePrefix + "otra.html"))!.body.toString();
    expect(html).not.toContain("data-wc-tool");
  });
  it("tipo desconocido → 400 «Herramienta desconocida»", async () => {
    const f = fakes();
    await expect(quitarHerramientaDelProyecto(deps(f), { orgId: "o1", projectId: "p1", tipo: "nada" as never }))
      .rejects.toMatchObject({ message: "Herramienta desconocida", status: 400 });
  });
});
```

- [ ] **Step 2: Ver fallar** — `npx vitest run src/tests/tools.test.ts`.

- [ ] **Step 3: Implementación — `src/editor/tools.ts`** (archivo completo)

```ts
import { crearSnapshotEditado } from "./snapshot-copy";
import { EditorError } from "./errors";
import {
  aplicarHerramienta, quitarHerramienta, estadoHerramientas, HeadToolsError,
  normalizarVerificacion, normalizarMedicion, rutaDeAssetValida,
  type Herramienta, type TipoHerramienta, type EstadoHerramientas,
} from "./head-tools";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

type Deps = { store: ProjectStore; storage: StorageAdapter };

const TIPOS: TipoHerramienta[] = ["google-verification", "analytics", "favicon", "og-image"];

// Normaliza y valida la herramienta; para favicon/og-image comprueba que el asset es
// del proyecto y su archivo existe, y devuelve los bytes para copiarlos a wc-uploads
// (misma mecánica que las ops src de saveEdits: la web queda auto-contenida).
async function prepararHerramienta(
  deps: Deps, orgId: string, projectId: string, h: Herramienta
): Promise<{ herramienta: Herramienta; extras: Map<string, { body: Buffer; contentType: string }> }> {
  const extras = new Map<string, { body: Buffer; contentType: string }>();
  if (h.tipo === "google-verification") {
    const codigo = normalizarVerificacion(h.codigo ?? "");
    if (!codigo) throw new EditorError("Código de verificación no válido (pega la etiqueta de Google o solo el código)", 400);
    return { herramienta: { tipo: h.tipo, codigo }, extras };
  }
  if (h.tipo === "analytics") {
    const medicion = normalizarMedicion(h.medicion ?? "");
    if (!medicion) throw new EditorError("ID de Analytics no válido (ejemplo: G-ABC1DE23FG)", 400);
    return { herramienta: { tipo: h.tipo, medicion }, extras };
  }
  if (h.tipo === "favicon" || h.tipo === "og-image") {
    const ruta = (h.ruta ?? "").trim();
    if (!rutaDeAssetValida(ruta)) throw new EditorError("Imagen no válida", 400);
    const assetId = ruta.slice("/wc-uploads/".length).split(".")[0];
    const row = await deps.store.getAsset(orgId, projectId, assetId);
    if (!row) throw new EditorError("Imagen no válida", 400);
    const file = await deps.storage.get(row.storageKey);
    if (!file) throw new EditorError("Imagen no válida", 400);
    extras.set(ruta.replace(/^\//, ""), { body: file.body, contentType: row.contentType });
    return { herramienta: { tipo: h.tipo, ruta }, extras };
  }
  throw new EditorError("Herramienta desconocida", 400);
}

async function proyectoYActual(deps: Deps, orgId: string, projectId: string) {
  const project = await deps.store.getProject(orgId, projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const current = await deps.store.getCurrentSnapshot(orgId, projectId);
  if (!current) throw new EditorError("El proyecto no tiene snapshot actual", 400);
  return { project, current };
}

export async function aplicarHerramientaAlProyecto(
  deps: Deps, input: { orgId: string; projectId: string; herramienta: Herramienta }
): Promise<{ snapshotId: string }> {
  const { current } = await proyectoYActual(deps, input.orgId, input.projectId);
  const { herramienta, extras } = await prepararHerramienta(deps, input.orgId, input.projectId, input.herramienta);
  try {
    return await crearSnapshotEditado(deps, {
      orgId: input.orgId, projectId: input.projectId,
      currentSnapshot: { id: current.id, storagePrefix: current.storagePrefix },
      transformar: (_rel, html) => aplicarHerramienta(html, herramienta),
      extras,
      operacionesJson: { herramienta },
    });
  } catch (e) {
    if (e instanceof HeadToolsError) throw new EditorError(e.message, e.status);
    throw e;
  }
}

export async function quitarHerramientaDelProyecto(
  deps: Deps, input: { orgId: string; projectId: string; tipo: TipoHerramienta }
): Promise<{ snapshotId: string }> {
  if (!TIPOS.includes(input.tipo)) throw new EditorError("Herramienta desconocida", 400);
  const { current } = await proyectoYActual(deps, input.orgId, input.projectId);
  return crearSnapshotEditado(deps, {
    orgId: input.orgId, projectId: input.projectId,
    currentSnapshot: { id: current.id, storagePrefix: current.storagePrefix },
    transformar: (_rel, html) => quitarHerramienta(html, input.tipo),
    operacionesJson: { quitarHerramienta: input.tipo },
  });
}

export async function estadoDeHerramientas(
  deps: Deps, input: { orgId: string; projectId: string }
): Promise<EstadoHerramientas> {
  const { project, current } = await proyectoYActual(deps, input.orgId, input.projectId);
  const file = await deps.storage.get(current.storagePrefix + project.entryPath);
  if (!file) return { googleVerification: null, analytics: null, favicon: null, ogImage: null };
  return estadoHerramientas(file.body.toString("utf-8"));
}
```

- [ ] **Step 4: Ruta — `app/api/projects/[id]/tools/route.ts`** (archivo completo)

```ts
import { NextResponse } from "next/server";
import { getDevContext } from "@/src/auth/dev-stub";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { aplicarHerramientaAlProyecto, quitarHerramientaDelProyecto, estadoDeHerramientas } from "@/src/editor/tools";
import { EditorError } from "@/src/editor/errors";
import type { Herramienta, TipoHerramienta } from "@/src/editor/head-tools";

export const runtime = "nodejs";

function conError(e: unknown) {
  if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getDevContext();
  try {
    const estado = await estadoDeHerramientas({ store: projectStore, storage: getStorage() }, { orgId, projectId: id });
    return NextResponse.json(estado);
  } catch (e) { return conError(e); }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getDevContext();
  const body = (await req.json().catch(() => ({}))) as { herramienta?: Herramienta };
  if (!body.herramienta || typeof body.herramienta !== "object") {
    return NextResponse.json({ error: "Herramienta desconocida" }, { status: 400 });
  }
  try {
    const r = await aplicarHerramientaAlProyecto(
      { store: projectStore, storage: getStorage() },
      { orgId, projectId: id, herramienta: body.herramienta }
    );
    return NextResponse.json(r, { status: 201 });
  } catch (e) { return conError(e); }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getDevContext();
  const body = (await req.json().catch(() => ({}))) as { tipo?: TipoHerramienta };
  if (!body.tipo) return NextResponse.json({ error: "Herramienta desconocida" }, { status: 400 });
  try {
    const r = await quitarHerramientaDelProyecto(
      { store: projectStore, storage: getStorage() },
      { orgId, projectId: id, tipo: body.tipo }
    );
    return NextResponse.json(r);
  } catch (e) { return conError(e); }
}
```

- [ ] **Step 5: Verde total + typecheck.**

- [ ] **Step 6: Commit** — `git add -A; git commit -m "feat(3c): herramientas por proyecto — snapshot nuevo en todas las páginas + API tools"`

---

### Task 8: UI — `ToolsPanel` con ayudas cortas

**Files:**
- Create: `app/projects/[id]/ToolsPanel.tsx`
- Modify: `app/projects/[id]/page.tsx` (renderizarlo entre `PublishBar` y `PreviewPane`)

**Interfaces:**
- Consumes: `GET/POST/DELETE /api/projects/[id]/tools` (Tarea 7);
  `POST /api/projects/[id]/assets` existente (subida de imagen → `{assetId, ext}`).
- Produces: sección «Herramientas» plegable con 4 tarjetas.

- [ ] **Step 1: `app/projects/[id]/ToolsPanel.tsx`** (archivo completo)

```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Estado = {
  googleVerification: string | null;
  analytics: string | null;
  favicon: string | null;
  ogImage: string | null;
};

type Herramienta =
  | { tipo: "google-verification"; codigo: string }
  | { tipo: "analytics"; medicion: string }
  | { tipo: "favicon"; ruta: string }
  | { tipo: "og-image"; ruta: string };

export function ToolsPanel({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [verificacion, setVerificacion] = useState("");
  const [medicion, setMedicion] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    const res = await fetch(`/api/projects/${projectId}/tools`);
    if (res.ok) setEstado((await res.json()) as Estado);
  }
  useEffect(() => { if (abierto && !estado) void cargar(); }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  async function aplicar(herramienta: Herramienta) {
    setOcupado(true); setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/tools`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ herramienta }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); return; }
      await cargar(); router.refresh();
    } finally { setOcupado(false); }
  }

  async function quitar(tipo: Herramienta["tipo"]) {
    setOcupado(true); setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/tools`, {
        method: "DELETE", headers: { "content-type": "application/json" },
        body: JSON.stringify({ tipo }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); return; }
      await cargar(); router.refresh();
    } finally { setOcupado(false); }
  }

  async function subirYAplicar(tipo: "favicon" | "og-image", file: File) {
    setOcupado(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/projects/${projectId}/assets`, { method: "POST", body: fd });
      const d = (await res.json().catch(() => ({}))) as { error?: string; assetId?: string; ext?: string };
      if (!res.ok || !d.assetId || !d.ext) { setError(d.error ?? "Error al subir la imagen"); return; }
      await aplicar({ tipo, ruta: `/wc-uploads/${d.assetId}.${d.ext}` } as Herramienta);
    } finally { setOcupado(false); }
  }

  function Tarjeta({ titulo, ayuda, children }: { titulo: string; ayuda: string; children: React.ReactNode }) {
    return (
      <div className="rounded-lg border bg-white p-3">
        <p className="text-sm font-medium">{titulo}</p>
        <p className="mb-2 text-xs text-gray-500">{ayuda}</p>
        {children}
      </div>
    );
  }

  function BotonQuitar({ tipo }: { tipo: Herramienta["tipo"] }) {
    return (
      <button onClick={() => void quitar(tipo)} disabled={ocupado} className="text-xs text-gray-500 underline">
        quitar
      </button>
    );
  }

  return (
    <div className="mb-3 rounded-lg border bg-gray-50 px-3 py-2">
      <button onClick={() => setAbierto(!abierto)} className="text-sm font-medium">
        {abierto ? "▾" : "▸"} Herramientas
      </button>
      {abierto && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Tarjeta titulo="Verificación de Google"
            ayuda="Demuestra a Google que la web es tuya (Search Console). Pega aquí la etiqueta o el código que te da Google.">
            {estado?.googleVerification ? (
              <p className="flex items-center gap-2 text-xs text-emerald-700">
                Activa: <code className="rounded bg-gray-100 px-1">{estado.googleVerification.slice(0, 18)}…</code>
                <BotonQuitar tipo="google-verification" />
              </p>
            ) : (
              <span className="flex items-center gap-1">
                <input value={verificacion} onChange={(e) => setVerificacion(e.target.value)}
                  placeholder='<meta name="google-site-verification" …' className="w-full rounded border px-2 py-1 text-xs" />
                <button onClick={() => void aplicar({ tipo: "google-verification", codigo: verificacion })}
                  disabled={ocupado} className="rounded border px-2 py-1 text-xs">Aplicar</button>
              </span>
            )}
          </Tarjeta>

          <Tarjeta titulo="Google Analytics"
            ayuda="Mide las visitas de tu web. Pega tu ID de medición de GA4 (empieza por G-).">
            {estado?.analytics ? (
              <p className="flex items-center gap-2 text-xs text-emerald-700">
                Activo: <code className="rounded bg-gray-100 px-1">{estado.analytics}</code>
                <BotonQuitar tipo="analytics" />
              </p>
            ) : (
              <span className="flex items-center gap-1">
                <input value={medicion} onChange={(e) => setMedicion(e.target.value)}
                  placeholder="G-ABC1DE23FG" className="w-full rounded border px-2 py-1 text-xs" />
                <button onClick={() => void aplicar({ tipo: "analytics", medicion })}
                  disabled={ocupado} className="rounded border px-2 py-1 text-xs">Aplicar</button>
              </span>
            )}
          </Tarjeta>

          <Tarjeta titulo="Favicon"
            ayuda="El icono que sale en la pestaña del navegador. Sube una imagen cuadrada (png recomendado).">
            <span className="flex items-center gap-2">
              {estado?.favicon && <img src={`/api/projects/${projectId}/preview${estado.favicon}`} alt="" className="h-5 w-5 rounded" />}
              <input type="file" accept="image/*" disabled={ocupado} className="text-xs"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void subirYAplicar("favicon", f); e.target.value = ""; }} />
              {estado?.favicon && <BotonQuitar tipo="favicon" />}
            </span>
          </Tarjeta>

          <Tarjeta titulo="Imagen para compartir"
            ayuda="La imagen que aparece al enviar tu web por WhatsApp o redes sociales (og:image).">
            <span className="flex items-center gap-2">
              {estado?.ogImage && <img src={`/api/projects/${projectId}/preview${estado.ogImage}`} alt="" className="h-8 w-14 rounded object-cover" />}
              <input type="file" accept="image/*" disabled={ocupado} className="text-xs"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void subirYAplicar("og-image", f); e.target.value = ""; }} />
              {estado?.ogImage && <BotonQuitar tipo="og-image" />}
            </span>
          </Tarjeta>
        </div>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: `app/projects/[id]/page.tsx`** — import `ToolsPanel` y renderizar
  `<ToolsPanel projectId={id} />` entre `<PublishBar …/>` y `<PreviewPane …/>`.

- [ ] **Step 3: Verificación manual** — `npm run dev` (login `dev1234`): abrir un proyecto,
  desplegar «Herramientas», aplicar una verificación de prueba
  (`Abc123_-Abc123_-XYZ`) → aparece «Activa», la PublishBar muestra «Tienes cambios sin
  publicar» si estaba publicado, y el Historial tiene un snapshot nuevo; quitar → vuelve
  el input. Subir un favicon (cualquier png) → miniatura visible. Matar el server.

- [ ] **Step 4: Suite + typecheck** — `npx vitest run` y `npm run typecheck`.

- [ ] **Step 5: Commit** — `git add -A; git commit -m "feat(3c): ToolsPanel — caja de herramientas con ayudas cortas en el panel"`

---

### Task 9: e2e integral 3c

**Files:**
- Create: `<scratchpad>/e2e-3c.mjs` (NO se commitea)

**Interfaces:**
- Consumes: todo el incremento. Server dev con env por defecto + candado
  (`PANEL_PASSWORD=dev1234` ya está en `.env.local`).

- [ ] **Step 1: Lanzar `npm run dev`** (background, esperar a que responda).

- [ ] **Step 2: Script `e2e-3c.mjs`** (scratchpad; fetch de Node vale — mismo host):

```js
const BASE = "http://127.0.0.1:3000";
let pass = 0, fail = 0, COOKIE = "";
const ok = (c, m) => { (c ? pass++ : fail++); console.log((c ? "PASS  " : "FAIL  ") + m); };
const h = (extra = {}) => ({ cookie: COOKIE, ...extra });

// login
{
  const res = await fetch(`${BASE}/api/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "dev1234" }) });
  COOKIE = (res.headers.get("set-cookie") || "").split(";")[0];
  ok(res.ok && COOKIE.startsWith("wc_session="), "login");
}

// importar ZIP con 2 páginas y contenido mixto
import { execSync } from "node:child_process";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const dir = mkdtempSync(join(tmpdir(), "wc3c-"));
writeFileSync(join(dir, "index.html"),
  `<!doctype html><html><head><title>t</title></head><body><p>Hola <strong>mundo</strong> adios</p></body></html>`);
writeFileSync(join(dir, "otra.html"),
  `<!doctype html><html><head><title>o</title></head><body><h1>Otra</h1></body></html>`);
const zip = join(dir, "site.zip");
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${join(dir, "index.html")}','${join(dir, "otra.html")}' -DestinationPath '${zip}' -Force"`);
const fd = new FormData();
fd.append("file", new Blob([readFileSync(zip)], { type: "application/zip" }), "site.zip");
fd.append("nombre", "Web E2E TresC");
const imp = await fetch(`${BASE}/api/projects`, { method: "POST", headers: h(), body: fd });
const pid = (await imp.json()).projectId;
ok(imp.status === 201 && !!pid, "import 201 — " + pid);

// 1) texto mixto: el preview anotado trae wc-t con el id del <p>
let html = await (await fetch(`${BASE}/api/projects/${pid}/preview/?edit=1`, { headers: h() })).text();
const mTn = html.match(/<wc-t data-wc-tn="(\d+):1">/);
ok(!!mTn, "preview anotado contiene wc-t (índice 1)");
const idP = Number(mTn[1]);

// 2) guardar una op textNode
const save = await fetch(`${BASE}/api/projects/${pid}/edits`, {
  method: "POST", headers: h({ "content-type": "application/json" }),
  body: JSON.stringify({ ops: [{ page: "index.html", nodeId: idP, kind: "textNode", index: 1, value: " EDITADO <x>" }] }),
});
ok(save.status === 201, "edición textNode guardada");
html = await (await fetch(`${BASE}/api/projects/${pid}/preview/`, { headers: h() })).text();
ok(html.includes("<strong>mundo</strong> EDITADO &lt;x&gt;"), "texto suelto editado y escapado");
ok(!html.includes("wc-t"), "el HTML guardado no contiene wc-t");
ok(html.includes("Hola "), "el primer nodo de texto quedó intacto");

// 3) herramientas: verificación + analytics en TODAS las páginas
const tool = (body, method = "POST") => fetch(`${BASE}/api/projects/${pid}/tools`, {
  method, headers: h({ "content-type": "application/json" }), body: JSON.stringify(body),
});
ok((await tool({ herramienta: { tipo: "google-verification", codigo: "corto" } })).status === 400, "verificación inválida → 400");
ok((await tool({ herramienta: { tipo: "google-verification", codigo: "Abc123_-Abc123_-XYZ" } })).status === 201, "verificación aplicada");
ok((await tool({ herramienta: { tipo: "analytics", medicion: "g-abc1de23fg" } })).status === 201, "analytics aplicado (normalizado)");
for (const page of ["", "otra.html"]) {
  const t = await (await fetch(`${BASE}/api/projects/${pid}/preview/${page}`, { headers: h() })).text();
  ok(t.includes(`google-site-verification" content="Abc123_-Abc123_-XYZ"`), `verificación presente en ${page || "index"}`);
  ok(t.includes("G-ABC1DE23FG"), `analytics presente en ${page || "index"}`);
}

// 4) favicon con subida real
const png = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
  "1f15c4890000000d49444154789c626001000000ffff03000006000557bfabd40000000049454e44ae426082", "hex");
const fdImg = new FormData();
fdImg.append("file", new Blob([png], { type: "image/png" }), "fav.png");
const up = await fetch(`${BASE}/api/projects/${pid}/assets`, { method: "POST", headers: h(), body: fdImg });
const { assetId, ext } = await up.json();
ok(up.status === 201 && !!assetId, "subida de favicon 201");
ok((await tool({ herramienta: { tipo: "favicon", ruta: `/wc-uploads/${assetId}.${ext}` } })).status === 201, "favicon aplicado");
html = await (await fetch(`${BASE}/api/projects/${pid}/preview/`, { headers: h() })).text();
ok(html.includes(`<link rel="icon" href="/wc-uploads/${assetId}.${ext}">`), "link icon presente");
const fav = await fetch(`${BASE}/api/projects/${pid}/preview/wc-uploads/${assetId}.${ext}`, { headers: h() });
ok(fav.status === 200, "el archivo del favicon existe en el snapshot");

// 5) estado y quitar
let estado = await (await fetch(`${BASE}/api/projects/${pid}/tools`, { headers: h() })).json();
ok(estado.googleVerification === "Abc123_-Abc123_-XYZ" && estado.analytics === "G-ABC1DE23FG", "GET estado correcto");
ok((await tool({ tipo: "analytics" }, "DELETE")).status === 200, "quitar analytics 200");
estado = await (await fetch(`${BASE}/api/projects/${pid}/tools`, { headers: h() })).json();
ok(estado.analytics === null, "estado sin analytics");

// 6) historial: restaurar el snapshot anterior deshace el quitar
const snaps = await (await fetch(`${BASE}/api/projects/${pid}/snapshots`, { headers: h() })).json();
const previo = snaps.find((s) => !s.esActual);
const rest = await fetch(`${BASE}/api/projects/${pid}/snapshots/${previo.id}/restore`, { method: "POST", headers: h() });
ok(rest.ok, "restore del snapshot previo");
estado = await (await fetch(`${BASE}/api/projects/${pid}/tools`, { headers: h() })).json();
ok(estado.analytics === "G-ABC1DE23FG", "revertir devuelve el analytics");

// 7) publicado intacto hasta republicar
await fetch(`${BASE}/api/projects/${pid}/publish`, { method: "POST", headers: h() });
await tool({ herramienta: { tipo: "og-image", ruta: `/wc-uploads/${assetId}.${ext}` } });
const pub = await (await fetch(`${BASE}/api/projects/${pid}/preview/`, { headers: h() })).text();
ok(pub.includes("og:image"), "borrador tiene og:image");
// nota: el host publicado se comprueba con curl -H Host en los e2e 3/3b; aquí basta
// verificar que publishedSnapshotId ≠ currentSnapshotId vía la página del proyecto.

console.log(`\n=== ${pass}/${pass + fail} checks PASS ===`);
process.exit(fail ? 1 : 0);
```

Nota: `snapshots` responde la lista `SnapshotInfo[]` (ver `app/api/projects/[id]/snapshots/route.ts` si el shape difiere, y ajustar el parse — no cambiar producto).

- [ ] **Step 3: Ejecutar** — `node <scratchpad>/e2e-3c.mjs` → `=== 21/21 checks PASS ===`
  (o el total real). Si algo falla: systematic-debugging; si es bug de producto,
  reportarlo como BLOCKED, no parchear a ciegas.

- [ ] **Step 4: Cierre** — `npx vitest run` + `npm run typecheck` verdes; matar el dev server.

- [ ] **Step 5: Commit (solo si hubo fixes de repo)** — `git add -A; git commit -m "test(3c): e2e integral texto mixto + herramientas"`

---

## Post-plan

- Validación del usuario en navegador con su web Quantiva: editar la frase mixta marcada
  y aplicar su verificación de Google real. Después: merge con
  superpowers:finishing-a-development-branch.
- Follow-ups que NO entran: fragmento libre en head, otros píxeles, tour interactivo,
  favicon .ico multi-tamaño, edición de `<title>`/metadescripción.
