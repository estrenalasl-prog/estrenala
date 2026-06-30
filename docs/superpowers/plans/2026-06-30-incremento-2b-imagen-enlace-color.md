# Incremento 2b (imagen, enlace, color) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ampliar el editor in-situ del Incremento 2 con edición de **enlace** (`href`), **imagen** (`src`, auto-contenida en el snapshot) y **color** de texto (CSS inline `color`), manteniendo el HTML guardado limpio y quirúrgico.

**Architecture:** Se reutiliza toda la maquinaria del Inc.2 (`data-wc-id`, ops, snapshots, revertir). `EditOp` pasa a unión discriminada; `walkElementsInOrder` expone offsets de atributos; `applyEdits` reemplaza/inserta atributos de forma quirúrgica por offset descendente. Las imágenes se suben a `projects/<id>/assets/` y `saveEdits` las copia dentro del snapshot en `wc-uploads/` para que el sitio quede auto-contenido. Validación de seguridad pura (`validate-op`) rechaza `javascript:`/`data:`, colores inseguros y `src` fuera de patrón. `saveEdits` gana limpieza compensatoria del prefijo nuevo si falla `createSnapshot`.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript strict, Drizzle + postgres-js (Supabase), parse5 (`sourceCodeLocationInfo`), vitest. Editor: vanilla JS (`public/wc-editor.js`).

## Global Constraints

- TypeScript **strict**; sin `any` salvo casts puntuales justificados.
- El HTML almacenado **nunca** contiene `data-wc-id`, el script del editor ni el popover: solo cambian los bytes editados (identidad byte a byte del resto).
- Mismo recorrido (`walkElementsInOrder`) para anotar y para aplicar (invariante de identidad de `nodeId`).
- `EditOp.value` ≤ 50000 caracteres; ≤ 1000 ops por guardado (límites ya existentes en `saveEdits`).
- Imágenes: extensión en `png,jpg,jpeg,gif,webp,avif,svg`; ≤ 10 MB; `assetId` = UUID generado en servidor.
- Adaptadores (`StorageAdapter`, `ProjectStore`) inyectados; la lógica pura no importa `db` ni `fs`.
- Todo el texto de UI y mensajes de error en español (patrón del repo).
- Commits frecuentes, uno por tarea como mínimo.

---

### Task 1: `walkElementsInOrder` expone atributos y sus offsets

**Files:**
- Modify: `src/editor/walk.ts`
- Test: `src/tests/walk.test.ts`

**Interfaces:**
- Consumes: parse5 `parse(html, { sourceCodeLocationInfo: true })`.
- Produces: `WalkedElement` ahora incluye `attrs: Record<string,string>` y `attrLocations: Record<string,{ start: number; end: number }>`. Lo consumen Task 3 (`applyEdits`).

- [ ] **Step 1: Añadir los casos de test (fallarán)**

En `src/tests/walk.test.ts`, dentro de `describe("walkElementsInOrder", ...)`, añade:

```ts
  it("expone los valores de atributos en attrs", () => {
    const els = walkElementsInOrder(`<a href="/x" class="c">hi</a>`);
    expect(els[0].attrs.href).toBe("/x");
    expect(els[0].attrs.class).toBe("c");
  });

  it("expone el tramo name=\"value\" de cada atributo en attrLocations", () => {
    const src = `<a href="/x">hi</a>`;
    const a = walkElementsInOrder(src)[0];
    const loc = a.attrLocations.href;
    expect(src.slice(loc.start, loc.end)).toBe(`href="/x"`);
  });

  it("attrs vacío y attrLocations vacío cuando no hay atributos", () => {
    const els = walkElementsInOrder(`<p>hi</p>`);
    expect(els[0].attrs).toEqual({});
    expect(els[0].attrLocations).toEqual({});
  });

  it("el punto de inserción startTagStart+1+tagName.length cae tras '<tag'", () => {
    const src = `<a href="/x">hi</a>`;
    const a = walkElementsInOrder(src)[0];
    expect(src.slice(a.startTagStart, a.startTagStart + 1 + a.tagName.length)).toBe("<a");
  });
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `npx vitest run src/tests/walk.test.ts`
Expected: FAIL (`attrs`/`attrLocations` no existen en el tipo / undefined).

- [ ] **Step 3: Implementar la exposición de atributos**

Reemplaza el contenido de `src/editor/walk.ts` por:

```ts
import { parse } from "parse5";

export type WalkedElement = {
  id: number;
  tagName: string;
  startTagStart: number;
  startTagEnd: number;
  endTagStart: number | null;
  hasElementChildren: boolean;
  text: string;
  attrs: Record<string, string>;
  attrLocations: Record<string, { start: number; end: number }>;
};

export function walkElementsInOrder(html: string): WalkedElement[] {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const out: WalkedElement[] = [];
  let nextId = 0;

  const visit = (node: unknown) => {
    const n = node as {
      tagName?: string;
      attrs?: { name: string; value: string }[];
      childNodes?: unknown[];
      sourceCodeLocation?: {
        startOffset: number;
        startTag?: { endOffset: number };
        endTag?: { startOffset: number };
        attrs?: Record<string, { startOffset: number; endOffset: number }>;
      } | null;
    };
    const loc = n.sourceCodeLocation;
    if (typeof n.tagName === "string" && loc && loc.startTag) {
      const kids = (n.childNodes ?? []) as { tagName?: string; nodeName?: string; value?: string }[];
      const attrs: Record<string, string> = {};
      for (const a of n.attrs ?? []) attrs[a.name] = a.value;
      const attrLocations: Record<string, { start: number; end: number }> = {};
      for (const [name, l] of Object.entries(loc.attrs ?? {})) {
        attrLocations[name] = { start: l.startOffset, end: l.endOffset };
      }
      out.push({
        id: nextId++,
        tagName: n.tagName,
        startTagStart: loc.startOffset,
        startTagEnd: loc.startTag.endOffset,
        endTagStart: loc.endTag ? loc.endTag.startOffset : null,
        hasElementChildren: kids.some((c) => typeof c.tagName === "string"),
        text: kids.filter((c) => c.nodeName === "#text").map((c) => c.value ?? "").join(""),
        attrs,
        attrLocations,
      });
    }
    if (n.childNodes) for (const c of n.childNodes) visit(c);
  };
  visit(doc);
  return out;
}
```

- [ ] **Step 4: Ejecutar y verificar que pasan**

Run: `npx vitest run src/tests/walk.test.ts`
Expected: PASS (todos, incluidos los previos del Inc.2).

- [ ] **Step 5: Commit**

```bash
git add src/editor/walk.ts src/tests/walk.test.ts
git commit -m "feat(2b): walkElementsInOrder expone attrs y attrLocations"
```

---

### Task 2: `mergeStyleProperty` (helper puro de estilo inline)

**Files:**
- Create: `src/editor/style.ts`
- Test: `src/tests/style.test.ts`

**Interfaces:**
- Produces: `mergeStyleProperty(style: string, prop: string, value: string): string` — fija `prop=value` en una cadena `style` inline (reemplaza si existe, case-insensitive en el nombre; conserva el resto y el orden) y devuelve el valor interno sin `style="…"`. Lo consume Task 3.

- [ ] **Step 1: Escribir los tests (fallarán)**

Crea `src/tests/style.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mergeStyleProperty } from "@/src/editor/style";

describe("mergeStyleProperty", () => {
  it("añade la propiedad cuando no había style", () => {
    expect(mergeStyleProperty("", "color", "red")).toBe("color: red");
  });

  it("añade la propiedad conservando las existentes", () => {
    expect(mergeStyleProperty("font-weight: bold", "color", "red"))
      .toBe("font-weight: bold; color: red");
  });

  it("reemplaza el valor si la propiedad ya existe", () => {
    expect(mergeStyleProperty("color: blue; margin: 0", "color", "red"))
      .toBe("color: red; margin: 0");
  });

  it("reemplaza de forma case-insensitive en el nombre", () => {
    expect(mergeStyleProperty("COLOR: blue", "color", "red")).toBe("color: red");
  });

  it("ignora declaraciones vacías o sin ':'", () => {
    expect(mergeStyleProperty("color: blue;; foo", "color", "red")).toBe("color: red");
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npx vitest run src/tests/style.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

Crea `src/editor/style.ts`:

```ts
// Fija prop=value en una cadena `style` inline. Reemplaza si la propiedad ya
// existe (case-insensitive en el nombre), conservando el resto y el orden.
// Devuelve el valor interno (sin `style="…"`).
export function mergeStyleProperty(style: string, prop: string, value: string): string {
  const pares: [string, string][] = [];
  let reemplazado = false;
  for (const decl of style.split(";")) {
    const t = decl.trim();
    if (!t) continue;
    const i = t.indexOf(":");
    if (i === -1) continue;
    const nombre = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim();
    if (nombre.toLowerCase() === prop.toLowerCase()) {
      pares.push([prop, value]);
      reemplazado = true;
    } else {
      pares.push([nombre, val]);
    }
  }
  if (!reemplazado) pares.push([prop, value]);
  return pares.map(([n, v]) => `${n}: ${v}`).join("; ");
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npx vitest run src/tests/style.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/editor/style.ts src/tests/style.test.ts
git commit -m "feat(2b): mergeStyleProperty (estilo inline)"
```

---

### Task 3: `EditOp` unión + `escapeAttr` + `applyEdits` quirúrgico

**Files:**
- Modify: `src/editor/apply.ts`
- Modify: `src/editor/save-edits.ts` (solo el call-site, sigue siendo text-only hasta Task 9)
- Test: `src/tests/apply.test.ts`

**Interfaces:**
- Consumes: `walkElementsInOrder` (Task 1, con `attrs`/`attrLocations`), `mergeStyleProperty` (Task 2), `escapeHtmlText` (existente).
- Produces:
  - `type EditOp` (unión discriminada con `page`): text/href/src(+`assetId`)/style(`property:"color"`).
  - `type PageOp` (sin `page`, sin `assetId`): la entrada de `applyEdits`.
  - `escapeAttr(s: string): string`.
  - `applyEdits(html: string, ops: PageOp[]): string`.
  - Lo consumen Task 9 (`saveEdits`), Task 10 (`PreviewPane`, solo el tipo `EditOp`), el route `edits` (ya importa `EditOp`).

- [ ] **Step 1: Reescribir los tests de apply (fallarán)**

Reemplaza el contenido de `src/tests/apply.test.ts` por:

```ts
import { describe, it, expect } from "vitest";
import { applyEdits, escapeHtmlText, escapeAttr } from "@/src/editor/apply";

describe("escapeHtmlText", () => {
  it("escapa &, < y >", () => {
    expect(escapeHtmlText(`a < b & c > d`)).toBe(`a &lt; b &amp; c &gt; d`);
  });
});

describe("escapeAttr", () => {
  it("escapa &, comilla doble y <", () => {
    expect(escapeAttr(`a"&<b`)).toBe(`a&quot;&amp;&lt;b`);
  });
});

describe("applyEdits — text", () => {
  const html = `<h1>Hola</h1><p>Uno <b>dos</b></p>`; // ids: h1=0, p=1, b=2

  it("reemplaza el texto del nodo y deja el resto byte-idéntico", () => {
    expect(applyEdits(html, [{ nodeId: 0, kind: "text", value: "Adiós" }]))
      .toBe(`<h1>Adiós</h1><p>Uno <b>dos</b></p>`);
  });

  it("escapa el valor nuevo", () => {
    expect(applyEdits(`<h1>x</h1>`, [{ nodeId: 0, kind: "text", value: `<script>&` }]))
      .toBe(`<h1>&lt;script&gt;&amp;</h1>`);
  });

  it("ignora un nodo con hijos-elemento", () => {
    expect(applyEdits(html, [{ nodeId: 1, kind: "text", value: "x" }])).toBe(html);
  });

  it("ignora un id inexistente y un void (img)", () => {
    expect(applyEdits(html, [{ nodeId: 99, kind: "text", value: "x" }])).toBe(html);
    const h = `<img src="x.png">`;
    expect(applyEdits(h, [{ nodeId: 0, kind: "text", value: "y" }])).toBe(h);
  });
});

describe("applyEdits — href / src", () => {
  it("reemplaza un href existente", () => {
    expect(applyEdits(`<a href="/old">x</a>`, [{ nodeId: 0, kind: "href", value: "/new" }]))
      .toBe(`<a href="/new">x</a>`);
  });

  it("inserta href cuando no existe (tras '<a')", () => {
    expect(applyEdits(`<a class="c">x</a>`, [{ nodeId: 0, kind: "href", value: "/n" }]))
      .toBe(`<a href="/n" class="c">x</a>`);
  });

  it("reemplaza el src de una imagen", () => {
    expect(applyEdits(`<img src="/a.png">`, [{ nodeId: 0, kind: "src", value: "/wc-uploads/u.png" }]))
      .toBe(`<img src="/wc-uploads/u.png">`);
  });

  it("escapa comillas en el valor del atributo", () => {
    expect(applyEdits(`<a href="/o">x</a>`, [{ nodeId: 0, kind: "href", value: `/a"b` }]))
      .toBe(`<a href="/a&quot;b">x</a>`);
  });
});

describe("applyEdits — style:color", () => {
  it("inserta style cuando no existe", () => {
    expect(applyEdits(`<p>x</p>`, [{ nodeId: 0, kind: "style", property: "color", value: "#ff0000" }]))
      .toBe(`<p style="color: #ff0000">x</p>`);
  });

  it("mezcla color en un style existente conservando lo demás", () => {
    expect(applyEdits(`<p style="margin: 0">x</p>`, [{ nodeId: 0, kind: "style", property: "color", value: "red" }]))
      .toBe(`<p style="margin: 0; color: red">x</p>`);
  });
});

describe("applyEdits — combinados", () => {
  it("aplica texto + href + color sobre el mismo <a> sin corromper", () => {
    const out = applyEdits(`<a href="/o">hi</a>`, [
      { nodeId: 0, kind: "href", value: "/n" },
      { nodeId: 0, kind: "style", property: "color", value: "red" },
      { nodeId: 0, kind: "text", value: "bye" },
    ]);
    expect(out).toBe(`<a href="/n" style="color: red">bye</a>`);
  });

  it("dedup por (nodeId,kind,property): la última gana", () => {
    expect(applyEdits(`<a href="/o">x</a>`, [
      { nodeId: 0, kind: "href", value: "/a" },
      { nodeId: 0, kind: "href", value: "/b" },
    ])).toBe(`<a href="/b">x</a>`);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npx vitest run src/tests/apply.test.ts`
Expected: FAIL (`applyEdits`/`escapeAttr` no existen).

- [ ] **Step 3: Reescribir `apply.ts`**

Reemplaza el contenido de `src/editor/apply.ts` por:

```ts
import { walkElementsInOrder, type WalkedElement } from "./walk";
import { mergeStyleProperty } from "./style";

export type EditOp =
  | { page: string; nodeId: number; kind: "text"; value: string }
  | { page: string; nodeId: number; kind: "href"; value: string }
  | { page: string; nodeId: number; kind: "src"; value: string; assetId: string }
  | { page: string; nodeId: number; kind: "style"; property: "color"; value: string };

// Op por página (sin `page`, sin `assetId`): lo que recibe applyEdits.
export type PageOp =
  | { nodeId: number; kind: "text"; value: string }
  | { nodeId: number; kind: "href"; value: string }
  | { nodeId: number; kind: "src"; value: string }
  | { nodeId: number; kind: "style"; property: "color"; value: string };

export function escapeHtmlText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Valor entre comillas dobles: basta con &, " y <.
export function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

type Edit = { start: number; end: number; text: string };

function pushAttrEdit(edits: Edit[], el: WalkedElement, name: string, value: string): void {
  const text = `${name}="${escapeAttr(value)}"`;
  const loc = el.attrLocations[name];
  if (loc) {
    edits.push({ start: loc.start, end: loc.end, text });
  } else {
    const at = el.startTagStart + 1 + el.tagName.length; // tras "<tag"
    edits.push({ start: at, end: at, text: " " + text });
  }
}

export function applyEdits(html: string, ops: PageOp[]): string {
  const byId = new Map(walkElementsInOrder(html).map((e) => [e.id, e]));
  // dedup: la última op por (nodeId, kind, property) gana
  const dedup = new Map<string, PageOp>();
  for (const op of ops) {
    const prop = op.kind === "style" ? op.property : "";
    dedup.set(`${op.nodeId}#${op.kind}#${prop}`, op);
  }
  const edits: Edit[] = [];
  for (const op of dedup.values()) {
    const el = byId.get(op.nodeId);
    if (!el) continue;
    if (op.kind === "text") {
      if (el.hasElementChildren) continue;
      if (el.endTagStart == null) continue;
      edits.push({ start: el.startTagEnd, end: el.endTagStart, text: escapeHtmlText(op.value) });
    } else if (op.kind === "href") {
      pushAttrEdit(edits, el, "href", op.value);
    } else if (op.kind === "src") {
      pushAttrEdit(edits, el, "src", op.value);
    } else {
      const nuevo = mergeStyleProperty(el.attrs.style ?? "", op.property, op.value);
      pushAttrEdit(edits, el, "style", nuevo);
    }
  }
  // Orden descendente por offset. Los tramos de atributos viven dentro del
  // start-tag y el de contenido tras él → no se solapan; dos inserciones en el
  // mismo punto se aplican ambas (ambos atributos quedan presentes).
  edits.sort((a, b) => b.start - a.start);
  let out = html;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}
```

- [ ] **Step 4: Adaptar el call-site de `save-edits.ts` (sigue text-only)**

En `src/editor/save-edits.ts`, cambia la línea de import:

```ts
import { applyTextEdits, type EditOp } from "./apply";
```

por:

```ts
import { applyEdits, type EditOp } from "./apply";
```

y dentro del bucle de copia, cambia:

```ts
    if (ops && /\.html?$/i.test(rel)) {
      body = Buffer.from(applyTextEdits(body.toString("utf-8"), ops), "utf-8");
    }
```

por:

```ts
    if (ops && /\.html?$/i.test(rel)) {
      const pageOps = ops.map((o) => ({ nodeId: o.nodeId, kind: "text" as const, value: o.value }));
      body = Buffer.from(applyEdits(body.toString("utf-8"), pageOps), "utf-8");
    }
```

(Task 9 reemplaza esta lógica por completo; aquí solo se mantiene verde la compilación y el comportamiento text-only.)

- [ ] **Step 5: Ejecutar la suite completa**

Run: `npx vitest run`
Expected: PASS (apply + save-edits + resto siguen verdes).

- [ ] **Step 6: Commit**

```bash
git add src/editor/apply.ts src/editor/save-edits.ts src/tests/apply.test.ts
git commit -m "feat(2b): EditOp unión + applyEdits quirúrgico (text/href/src/style)"
```

---

### Task 4: `validate-op` (seguridad de href/src/style)

**Files:**
- Create: `src/editor/validate-op.ts`
- Test: `src/tests/validate-op.test.ts`

**Interfaces:**
- Consumes: `EditOp` (Task 3).
- Produces:
  - `ALLOWED_IMAGE_EXTS: readonly string[]`
  - `isUuid(s: string): boolean`
  - `isSafeHref(href: string): boolean`
  - `isValidOp(op: EditOp): boolean`
  - Lo consumen Task 6 (`uploadAsset`, usa `ALLOWED_IMAGE_EXTS`), Task 8 (route GET asset, usa `isUuid`), Task 9 (`saveEdits`, usa `isValidOp`).

- [ ] **Step 1: Escribir los tests (fallarán)**

Crea `src/tests/validate-op.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isValidOp, isSafeHref, isUuid } from "@/src/editor/validate-op";

const UUID = "11111111-2222-4333-8444-555555555555";

describe("isUuid", () => {
  it("acepta un uuid y rechaza basura", () => {
    expect(isUuid(UUID)).toBe(true);
    expect(isUuid("nope")).toBe(false);
  });
});

describe("isSafeHref", () => {
  it("acepta relativas, ancla, http(s), mailto, tel", () => {
    for (const h of ["/x", "x", "#a", "http://a.com", "https://a.com", "mailto:a@b.com", "tel:+1"]) {
      expect(isSafeHref(h)).toBe(true);
    }
  });
  it("rechaza javascript:, data: y esquemas desconocidos", () => {
    for (const h of ["javascript:alert(1)", " JavaScript:x", "data:text/html,x", "ftp://a"]) {
      expect(isSafeHref(h)).toBe(false);
    }
  });
  it("rechaza vacío", () => {
    expect(isSafeHref("   ")).toBe(false);
  });
});

describe("isValidOp", () => {
  it("text: válido si value es string", () => {
    expect(isValidOp({ page: "i", nodeId: 0, kind: "text", value: "x" })).toBe(true);
  });
  it("href: depende de isSafeHref", () => {
    expect(isValidOp({ page: "i", nodeId: 0, kind: "href", value: "/ok" })).toBe(true);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "href", value: "javascript:x" })).toBe(false);
  });
  it("src: exige patrón /wc-uploads/<uuid>.<ext> y assetId que coincide", () => {
    expect(isValidOp({ page: "i", nodeId: 0, kind: "src", value: `/wc-uploads/${UUID}.png`, assetId: UUID })).toBe(true);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "src", value: `/wc-uploads/${UUID}.exe`, assetId: UUID })).toBe(false);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "src", value: `/otro/${UUID}.png`, assetId: UUID })).toBe(false);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "src", value: `/wc-uploads/${UUID}.png`, assetId: "otro" })).toBe(false);
  });
  it("style: solo color con valor seguro", () => {
    expect(isValidOp({ page: "i", nodeId: 0, kind: "style", property: "color", value: "#ff0000" })).toBe(true);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "style", property: "color", value: "rgb(1,2,3)" })).toBe(true);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "style", property: "color", value: "red" })).toBe(true);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "style", property: "color", value: "red; x: y" })).toBe(false);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "style", property: "color", value: "url(x)" })).toBe(false);
  });
  it("rechaza kind desconocido", () => {
    expect(isValidOp({ kind: "otro" } as unknown as Parameters<typeof isValidOp>[0])).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npx vitest run src/tests/validate-op.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

Crea `src/editor/validate-op.ts`:

```ts
import type { EditOp } from "./apply";

export const ALLOWED_IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "avif", "svg"] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SRC_RE = new RegExp(
  `^/wc-uploads/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\\.(${ALLOWED_IMAGE_EXTS.join("|")})$`,
  "i"
);
// hex (#rgb/#rrggbb/#rrggbbaa), rgb()/rgba() solo con números/%/comas/espacios, o
// nombre de color (palabra simple). Sin ';' ni '(' fuera de rgb → no se puede
// inyectar otra declaración.
const COLOR_RE = /^(#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\(\s*[\d.,%\s]+\)|[a-z]{1,32})$/i;

export function isUuid(s: string): boolean {
  return typeof s === "string" && UUID_RE.test(s);
}

export function isSafeHref(href: string): boolean {
  if (typeof href !== "string") return false;
  const t = href.trim();
  if (t === "") return false;
  if (/^(javascript|data|vbscript):/i.test(t)) return false;
  const m = t.match(/^([a-z][a-z0-9+.-]*):/i);
  if (m) return ["http", "https", "mailto", "tel"].includes(m[1].toLowerCase());
  return true; // sin esquema → relativa, ancla, root-absoluta
}

export function isValidOp(op: EditOp): boolean {
  if (!op || typeof op !== "object") return false;
  switch (op.kind) {
    case "text":
      return typeof op.value === "string";
    case "href":
      return isSafeHref(op.value);
    case "src": {
      if (typeof op.value !== "string" || typeof op.assetId !== "string") return false;
      const m = op.value.match(SRC_RE);
      return !!m && m[1].toLowerCase() === op.assetId.toLowerCase();
    }
    case "style":
      return op.property === "color" && typeof op.value === "string" && COLOR_RE.test(op.value.trim());
    default:
      return false;
  }
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npx vitest run src/tests/validate-op.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/editor/validate-op.ts src/tests/validate-op.test.ts
git commit -m "feat(2b): validate-op (href/src/color seguros)"
```

---

### Task 5: `AssetRow` + `createAsset`/`getAsset` en el store

**Files:**
- Modify: `src/repositories/types.ts`
- Modify: `src/repositories/projects.ts`
- Modify: `src/tests/save-edits.test.ts` (completar el `FakeStore` con los nuevos métodos)

**Interfaces:**
- Produces:
  - `type AssetRow = { id; projectId; storageKey; contentType; bytes; createdAt }`
  - `type CreateAssetInput = { assetId; projectId; storageKey; contentType; bytes }`
  - `ProjectStore.createAsset(input: CreateAssetInput): Promise<void>`
  - `ProjectStore.getAsset(orgId, projectId, assetId): Promise<AssetRow | null>` (org-scoped vía join al proyecto)
  - Lo consumen Task 6 (`uploadAsset`), Task 8 (route GET), Task 9 (`saveEdits`).

- [ ] **Step 1: Añadir tipos y firmas al store**

En `src/repositories/types.ts`, antes de `export interface ProjectStore {`, añade:

```ts
export type AssetRow = {
  id: string;
  projectId: string;
  storageKey: string;
  contentType: string;
  bytes: number;
  createdAt: string;
};

export type CreateAssetInput = {
  assetId: string;
  projectId: string;
  storageKey: string;
  contentType: string;
  bytes: number;
};
```

y dentro de `interface ProjectStore`, añade estas dos líneas al final (antes de `}`):

```ts
  createAsset(input: CreateAssetInput): Promise<void>;
  getAsset(orgId: string, projectId: string, assetId: string): Promise<AssetRow | null>;
```

- [ ] **Step 2: Implementar en Drizzle**

En `src/repositories/projects.ts`, amplía el import de `./types`:

```ts
import type {
  AssetRow, CreateAssetInput, CreateProjectInput, CreateSnapshotInput,
  ProjectRow, ProjectStore, SnapshotInfo, SnapshotRow,
} from "./types";
```

añade `assets` al import de schema:

```ts
import { assets, projects, snapshots } from "@/src/db/schema";
```

y dentro de `class DrizzleProjectStore`, antes del cierre `}` de la clase (tras `getSnapshotById`), añade:

```ts
  async createAsset(input: CreateAssetInput): Promise<void> {
    await db.insert(assets).values({
      id: input.assetId,
      projectId: input.projectId,
      storageKey: input.storageKey,
      contentType: input.contentType,
      bytes: input.bytes,
    });
  }

  async getAsset(orgId: string, projectId: string, assetId: string): Promise<AssetRow | null> {
    const proj = await db.select().from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId))).limit(1);
    if (!proj[0]) return null;
    const r = await db.select().from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.projectId, projectId))).limit(1);
    if (!r[0]) return null;
    return {
      id: r[0].id,
      projectId: r[0].projectId,
      storageKey: r[0].storageKey,
      contentType: r[0].contentType,
      bytes: r[0].bytes,
      createdAt: r[0].createdAt.toISOString(),
    };
  }
```

- [ ] **Step 3: Completar el `FakeStore` de los tests existentes**

En `src/tests/save-edits.test.ts`, amplía el import de tipos:

```ts
import type {
  ProjectStore, ProjectRow, SnapshotRow, SnapshotInfo, CreateProjectInput, CreateSnapshotInput,
  AssetRow, CreateAssetInput,
} from "@/src/repositories/types";
```

y dentro de `class FakeStore implements ProjectStore`, añade (antes del cierre `}`):

```ts
  assets = new Map<string, AssetRow>();
  async createAsset(i: CreateAssetInput) {
    this.assets.set(i.assetId, {
      id: i.assetId, projectId: i.projectId, storageKey: i.storageKey,
      contentType: i.contentType, bytes: i.bytes, createdAt: "",
    });
  }
  async getAsset(_o: string, _p: string, id: string): Promise<AssetRow | null> {
    return this.assets.get(id) ?? null;
  }
```

- [ ] **Step 4: Ejecutar la suite y typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS (la interfaz `ProjectStore` queda satisfecha por `DrizzleProjectStore` y `FakeStore`).

- [ ] **Step 5: Commit**

```bash
git add src/repositories/types.ts src/repositories/projects.ts src/tests/save-edits.test.ts
git commit -m "feat(2b): store createAsset/getAsset (org-scoped)"
```

---

### Task 6: `uploadAsset` (subida validada, DI)

**Files:**
- Create: `src/editor/assets.ts`
- Test: `src/tests/assets.test.ts`

**Interfaces:**
- Consumes: `ALLOWED_IMAGE_EXTS` (Task 4), `assetKey` (existente en `src/storage/keys.ts`), `EditorError` (existente), `ProjectStore.getProject`/`createAsset` (Task 5), `StorageAdapter.put`.
- Produces: `uploadAsset(deps, input): Promise<{ assetId: string; ext: string; url: string }>` con `deps: { store: ProjectStore; storage: StorageAdapter }` e `input: { orgId: string; projectId: string; filename: string; bytes: Buffer }`. Lo consume Task 7 (route POST).

- [ ] **Step 1: Escribir los tests (fallarán)**

Crea `src/tests/assets.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { uploadAsset } from "@/src/editor/assets";
import { EditorError } from "@/src/editor/errors";
import type { StorageAdapter } from "@/src/storage/types";
import type {
  ProjectStore, ProjectRow, SnapshotRow, SnapshotInfo,
  CreateProjectInput, CreateSnapshotInput, AssetRow, CreateAssetInput,
} from "@/src/repositories/types";

class FakeStorage implements StorageAdapter {
  files = new Map<string, Buffer>();
  async put(key: string, body: Buffer | string) { this.files.set(key, Buffer.isBuffer(body) ? body : Buffer.from(body)); }
  async get(key: string) { const b = this.files.get(key); return b ? { body: b, contentType: "x" } : null; }
  async list(prefix: string) { return [...this.files.keys()].filter((k) => k.startsWith(prefix)); }
  async delete(key: string) { this.files.delete(key); }
}
class FakeStore implements ProjectStore {
  assets = new Map<string, AssetRow>();
  hayProyecto = true;
  async createProjectWithSnapshot(i: CreateProjectInput) { return { projectId: i.projectId }; }
  async getProject(): Promise<ProjectRow | null> {
    return this.hayProyecto ? { id: "p1", orgId: "org1", nombre: "x", entryPath: "i.html", currentSnapshotId: "s0", createdAt: "" } : null;
  }
  async listProjects(): Promise<ProjectRow[]> { return []; }
  async setEntryPath(): Promise<void> {}
  async getCurrentSnapshot(): Promise<SnapshotRow | null> { return null; }
  async createSnapshot(_i: CreateSnapshotInput) {}
  async setCurrentSnapshot(): Promise<void> {}
  async listSnapshots(): Promise<SnapshotInfo[]> { return []; }
  async getSnapshotById(): Promise<SnapshotRow | null> { return null; }
  async createAsset(i: CreateAssetInput) {
    this.assets.set(i.assetId, { id: i.assetId, projectId: i.projectId, storageKey: i.storageKey, contentType: i.contentType, bytes: i.bytes, createdAt: "" });
  }
  async getAsset(_o: string, _p: string, id: string): Promise<AssetRow | null> { return this.assets.get(id) ?? null; }
}

describe("uploadAsset", () => {
  it("guarda la imagen, crea el Asset y devuelve url", async () => {
    const storage = new FakeStorage();
    const store = new FakeStore();
    const r = await uploadAsset({ store, storage }, {
      orgId: "org1", projectId: "p1", filename: "logo.PNG", bytes: Buffer.from([1, 2, 3]),
    });
    expect(r.ext).toBe("png");
    expect(r.url).toBe(`/api/projects/p1/assets/${r.assetId}.png`);
    expect(storage.files.get(`projects/p1/assets/${r.assetId}.png`)).toBeTruthy();
    expect(store.assets.get(r.assetId)!.contentType).toBe("image/png");
    expect(store.assets.get(r.assetId)!.bytes).toBe(3);
  });

  it("rechaza extensión no permitida con 400", async () => {
    await expect(uploadAsset({ store: new FakeStore(), storage: new FakeStorage() }, {
      orgId: "org1", projectId: "p1", filename: "x.exe", bytes: Buffer.from([1]),
    })).rejects.toThrow(EditorError);
  });

  it("rechaza archivo vacío y > 10MB con 400", async () => {
    await expect(uploadAsset({ store: new FakeStore(), storage: new FakeStorage() }, {
      orgId: "org1", projectId: "p1", filename: "x.png", bytes: Buffer.alloc(0),
    })).rejects.toThrow(EditorError);
    await expect(uploadAsset({ store: new FakeStore(), storage: new FakeStorage() }, {
      orgId: "org1", projectId: "p1", filename: "x.png", bytes: Buffer.alloc(10 * 1024 * 1024 + 1),
    })).rejects.toThrow(EditorError);
  });

  it("rechaza si el proyecto no existe (404)", async () => {
    const store = new FakeStore(); store.hayProyecto = false;
    await expect(uploadAsset({ store, storage: new FakeStorage() }, {
      orgId: "org1", projectId: "p1", filename: "x.png", bytes: Buffer.from([1]),
    })).rejects.toThrow(EditorError);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npx vitest run src/tests/assets.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

Crea `src/editor/assets.ts`:

```ts
import { assetKey } from "@/src/storage/keys";
import { ALLOWED_IMAGE_EXTS } from "./validate-op";
import { EditorError } from "./errors";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

const MAX_BYTES = 10 * 1024 * 1024;

const EXT_CONTENT_TYPE: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", avif: "image/avif", svg: "image/svg+xml",
};

export async function uploadAsset(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string; filename: string; bytes: Buffer }
): Promise<{ assetId: string; ext: string; url: string }> {
  const ext = (input.filename.split(".").pop() ?? "").toLowerCase();
  if (!(ALLOWED_IMAGE_EXTS as readonly string[]).includes(ext)) {
    throw new EditorError("Tipo de imagen no permitido", 400);
  }
  if (input.bytes.length === 0) throw new EditorError("Archivo vacío", 400);
  if (input.bytes.length > MAX_BYTES) throw new EditorError("Imagen demasiado grande (máx. 10 MB)", 400);

  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);

  const assetId = crypto.randomUUID();
  const storageKey = assetKey(input.projectId, assetId, ext);
  const contentType = EXT_CONTENT_TYPE[ext];
  await deps.storage.put(storageKey, input.bytes, contentType);
  await deps.store.createAsset({
    assetId, projectId: input.projectId, storageKey, contentType, bytes: input.bytes.length,
  });
  return { assetId, ext, url: `/api/projects/${input.projectId}/assets/${assetId}.${ext}` };
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npx vitest run src/tests/assets.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/editor/assets.ts src/tests/assets.test.ts
git commit -m "feat(2b): uploadAsset (validación de imagen + Asset)"
```

---

### Task 7: Ruta `POST /api/projects/[id]/assets` (subir imagen)

**Files:**
- Create: `app/api/projects/[id]/assets/route.ts`

**Interfaces:**
- Consumes: `getDevContext`, `getStorage`, `projectStore`, `uploadAsset` (Task 6), `EditorError`.
- Produces: `POST` que acepta `multipart/form-data` con campo `file` y responde `201 { assetId, ext, url }` (o 400/404/500).

- [ ] **Step 1: Implementar la ruta**

Crea `app/api/projects/[id]/assets/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getDevContext } from "@/src/auth/dev-stub";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { uploadAsset } from "@/src/editor/assets";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getDevContext();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Se esperaba multipart/form-data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Imagen demasiado grande (máx. 10 MB)" }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const r = await uploadAsset(
      { store: projectStore, storage: getStorage() },
      { orgId, projectId: id, filename: file.name, bytes }
    );
    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/api/projects/[id]/assets/route.ts
git commit -m "feat(2b): POST /assets (subir imagen)"
```

---

### Task 8: Ruta `GET /api/projects/[id]/assets/[asset]` (servir imagen)

**Files:**
- Create: `app/api/projects/[id]/assets/[asset]/route.ts`

**Interfaces:**
- Consumes: `getDevContext`, `getStorage`, `projectStore.getAsset` (Task 5), `isUuid` (Task 4).
- Produces: `GET` que sirve la imagen subida (org-scoped) con cabeceras de seguridad (`content-security-policy: sandbox`, `x-content-type-options: nosniff`). `[asset]` = `<assetId>.<ext>`.

- [ ] **Step 1: Implementar la ruta**

Crea `app/api/projects/[id]/assets/[asset]/route.ts`:

```ts
import { getDevContext } from "@/src/auth/dev-stub";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { isUuid } from "@/src/editor/validate-op";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string; asset: string }> }) {
  const { id, asset } = await ctx.params;
  const { orgId } = await getDevContext();

  const dot = asset.lastIndexOf(".");
  const assetId = dot === -1 ? asset : asset.slice(0, dot);
  if (!isUuid(assetId)) return new Response("No encontrado", { status: 404 });

  const row = await projectStore.getAsset(orgId, id, assetId);
  if (!row) return new Response("No encontrado", { status: 404 });

  const file = await getStorage().get(row.storageKey);
  if (!file) return new Response("No encontrado", { status: 404 });

  return new Response(new Uint8Array(file.body), {
    status: 200,
    headers: {
      "content-type": row.contentType,
      // El asset puede ser SVG: si se navega directo, neutraliza scripts.
      "content-security-policy": "sandbox",
      "x-content-type-options": "nosniff",
      "cache-control": "private, max-age=300",
    },
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/api/projects/[id]/assets/[asset]/route.ts
git commit -m "feat(2b): GET /assets/[asset] (servir imagen subida)"
```

---

### Task 9: `saveEdits` — 4 kinds + copia de asset + limpieza compensatoria

**Files:**
- Modify: `src/editor/save-edits.ts`
- Test: `src/tests/save-edits.test.ts`

**Interfaces:**
- Consumes: `applyEdits`/`PageOp`/`EditOp` (Task 3), `isValidOp` (Task 4), `ProjectStore.getAsset` (Task 5), `snapshotPrefix` (existente).
- Produces: `saveEdits` que aplica los 4 kinds, copia los assets usados a `wc-uploads/<assetId>.<ext>` dentro del snapshot, y limpia el prefijo nuevo si `createSnapshot` falla. Misma firma pública.

- [ ] **Step 1: Añadir los tests nuevos (fallarán)**

En `src/tests/save-edits.test.ts`, dentro de `describe("saveEdits", ...)`, añade estos casos (manteniendo los existentes):

```ts
  it("aplica href/color y copia el asset de imagen a wc-uploads/", async () => {
    const storage = new FakeStorage();
    storage.files.set(CUR + "index.html", Buffer.from(`<a href="/o">x</a><img src="/a.png"><p>t</p>`));
    storage.files.set("projects/p1/assets/aa.png", Buffer.from("PNGDATA"));
    const store = new FakeStore();
    store.assets.set("11111111-2222-4333-8444-555555555555", {
      id: "11111111-2222-4333-8444-555555555555", projectId: "p1",
      storageKey: "projects/p1/assets/aa.png", contentType: "image/png", bytes: 7, createdAt: "",
    });
    const A = "11111111-2222-4333-8444-555555555555";

    const { snapshotId } = await saveEdits({ store, storage }, {
      orgId: "org1", projectId: "p1",
      ops: [
        { page: "index.html", nodeId: 0, kind: "href", value: "/n" },
        { page: "index.html", nodeId: 1, kind: "src", value: `/wc-uploads/${A}.png`, assetId: A },
        { page: "index.html", nodeId: 2, kind: "style", property: "color", value: "red" },
      ],
    });

    const np = `projects/p1/snapshots/${snapshotId}/`;
    const html = storage.files.get(np + "index.html")!.toString();
    expect(html).toBe(`<a href="/n">x</a><img src="/wc-uploads/${A}.png"><p style="color: red">t</p>`);
    expect(storage.files.get(np + `wc-uploads/${A}.png`)!.toString()).toBe("PNGDATA");
  });

  it("ignora una op src cuyo assetId no existe (no rompe el guardado)", async () => {
    const storage = new FakeStorage();
    storage.files.set(CUR + "index.html", Buffer.from(`<a href="/o">x</a>`));
    const A = "11111111-2222-4333-8444-555555555555";
    const { snapshotId } = await saveEdits({ store: new FakeStore(), storage }, {
      orgId: "org1", projectId: "p1",
      ops: [
        { page: "index.html", nodeId: 0, kind: "href", value: "/n" },
        { page: "index.html", nodeId: 9, kind: "src", value: `/wc-uploads/${A}.png`, assetId: A },
      ],
    });
    const np = `projects/p1/snapshots/${snapshotId}/`;
    expect(storage.files.get(np + "index.html")!.toString()).toBe(`<a href="/n">x</a>`);
    expect(storage.files.get(np + `wc-uploads/${A}.png`)).toBeUndefined();
  });

  it("rechaza una href insegura → 400 si no queda ninguna válida", async () => {
    const storage = new FakeStorage();
    storage.files.set(CUR + "index.html", Buffer.from(`<a href="/o">x</a>`));
    await expect(saveEdits({ store: new FakeStore(), storage }, {
      orgId: "org1", projectId: "p1",
      ops: [{ page: "index.html", nodeId: 0, kind: "href", value: "javascript:alert(1)" }],
    })).rejects.toThrow(EditorError);
  });

  it("limpia el prefijo nuevo si createSnapshot falla", async () => {
    const storage = new FakeStorage();
    storage.files.set(CUR + "index.html", Buffer.from(`<a href="/o">x</a>`));
    class FallaStore extends FakeStore { async createSnapshot() { throw new Error("boom"); } }
    await expect(saveEdits({ store: new FallaStore(), storage }, {
      orgId: "org1", projectId: "p1",
      ops: [{ page: "index.html", nodeId: 0, kind: "href", value: "/n" }],
    })).rejects.toThrow("boom");
    const huerfanos = [...storage.files.keys()].filter((k) => k.startsWith("projects/p1/snapshots/") && !k.startsWith(CUR));
    expect(huerfanos).toEqual([]);
  });
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `npx vitest run src/tests/save-edits.test.ts`
Expected: FAIL (href/style/src aún no se aplican; sin limpieza).

- [ ] **Step 3: Reescribir `save-edits.ts`**

Reemplaza el contenido de `src/editor/save-edits.ts` por:

```ts
import { snapshotPrefix } from "@/src/storage/keys";
import { applyEdits, type EditOp, type PageOp } from "./apply";
import { isValidOp } from "./validate-op";
import { EditorError } from "./errors";
import type { StorageAdapter } from "@/src/storage/types";
import type { AssetRow, ProjectStore } from "@/src/repositories/types";

function toPageOp(op: EditOp): PageOp {
  switch (op.kind) {
    case "text": return { nodeId: op.nodeId, kind: "text", value: op.value };
    case "href": return { nodeId: op.nodeId, kind: "href", value: op.value };
    case "src": return { nodeId: op.nodeId, kind: "src", value: op.value };
    case "style": return { nodeId: op.nodeId, kind: "style", property: op.property, value: op.value };
  }
}

export async function saveEdits(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string; ops: EditOp[] }
): Promise<{ snapshotId: string }> {
  if (input.ops.length > 1000) throw new EditorError("Demasiadas ediciones (máx. 1000)", 400);
  if (input.ops.some((o) => typeof o.value === "string" && o.value.length > 50000)) {
    throw new EditorError("Valor demasiado largo (máx. 50000 caracteres)", 400);
  }
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const current = await deps.store.getCurrentSnapshot(input.orgId, input.projectId);
  if (!current) throw new EditorError("El proyecto no tiene snapshot actual", 400);

  // Validar y separar por página. Las ops de imagen exigen un asset propio;
  // se acumulan para copiarlas al snapshot (clave = ruta destino en wc-uploads).
  const porPagina = new Map<string, PageOp[]>();
  const assetCopias = new Map<string, AssetRow>(); // path destino (sin "/") -> asset
  for (const op of input.ops) {
    if (typeof op?.nodeId !== "number" || !op.page) continue;
    if (!isValidOp(op)) continue;
    if (op.kind === "src") {
      const row = await deps.store.getAsset(input.orgId, input.projectId, op.assetId);
      if (!row) continue; // asset ajeno/inexistente → ignora esta op
      assetCopias.set(op.value.replace(/^\//, ""), row);
    }
    const arr = porPagina.get(op.page) ?? [];
    arr.push(toPageOp(op));
    porPagina.set(op.page, arr);
  }
  if (porPagina.size === 0) throw new EditorError("Ninguna edición válida", 400);

  const snapshotId = crypto.randomUUID();
  const newPrefix = snapshotPrefix(input.projectId, snapshotId);
  const written: string[] = [];

  // 1) Copiar el árbol, aplicando los edits a las páginas html.
  const keys = await deps.storage.list(current.storagePrefix);
  for (const key of keys) {
    const rel = key.slice(current.storagePrefix.length);
    const file = await deps.storage.get(key);
    if (!file) continue;
    let body = file.body;
    const ops = porPagina.get(rel);
    if (ops && /\.html?$/i.test(rel)) {
      body = Buffer.from(applyEdits(body.toString("utf-8"), ops), "utf-8");
    }
    await deps.storage.put(newPrefix + rel, body);
    written.push(newPrefix + rel);
  }

  // 2) Copiar los assets usados a wc-uploads/ → la web queda auto-contenida.
  for (const [path, row] of assetCopias) {
    const src = await deps.storage.get(row.storageKey);
    if (!src) continue;
    await deps.storage.put(newPrefix + path, src.body, row.contentType);
    written.push(newPrefix + path);
  }

  // 3) Crear el snapshot con limpieza compensatoria del storage si falla.
  try {
    await deps.store.createSnapshot({
      snapshotId, projectId: input.projectId, parentId: current.id,
      tipo: "edit", storagePrefix: newPrefix, operacionesJson: input.ops,
    });
  } catch (e) {
    for (const k of written) { try { await deps.storage.delete(k); } catch { /* best-effort */ } }
    throw e;
  }
  await deps.store.setCurrentSnapshot(input.orgId, input.projectId, snapshotId);
  return { snapshotId };
}
```

- [ ] **Step 4: Ejecutar la suite completa**

Run: `npx vitest run`
Expected: PASS (incluidos los casos previos de save-edits y el resto).

- [ ] **Step 5: Commit**

```bash
git add src/editor/save-edits.ts src/tests/save-edits.test.ts
git commit -m "feat(2b): saveEdits aplica 4 kinds + copia asset + limpieza compensatoria"
```

---

### Task 10: `PreviewPane` — ops de unión + subida de imagen

**Files:**
- Modify: `app/projects/[id]/PreviewPane.tsx`

**Interfaces:**
- Consumes: rutas `POST /assets` (Task 7), `POST /edits` (existente, acepta la unión).
- Produces: panel que acumula ops de los 4 kinds (dedup por `page#nodeId#kind#property`), maneja `wc-image-request` (abre file-picker, sube, responde `wc-image-set`, registra la op `src`). Mensajería validada por `source`.

- [ ] **Step 1: Reescribir el componente**

Reemplaza el contenido de `app/projects/[id]/PreviewPane.tsx` por:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";

type EditOp =
  | { page: string; nodeId: number; kind: "text"; value: string }
  | { page: string; nodeId: number; kind: "href"; value: string }
  | { page: string; nodeId: number; kind: "src"; value: string; assetId: string }
  | { page: string; nodeId: number; kind: "style"; property: "color"; value: string };
type SnapshotInfo = { id: string; tipo: string; parentId: string | null; createdAt: string; esActual: boolean };

function opKey(op: EditOp): string {
  const prop = op.kind === "style" ? op.property : "";
  return `${op.page}#${op.nodeId}#${op.kind}#${prop}`;
}

export function PreviewPane({
  projectId, entryPath, pages,
}: { projectId: string; entryPath: string; pages: string[] }) {
  const [actual, setActual] = useState(entryPath);
  const [guardando, setGuardando] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [ops, setOps] = useState<Map<string, EditOp>>(new Map());
  const [snapshots, setSnapshots] = useState<SnapshotInfo[] | null>(null);
  const [recarga, setRecarga] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingImg = useRef<{ nodeId: number; page: string } | null>(null);

  const relPath = actual === entryPath ? "" : actual;
  const src = `/api/projects/${projectId}/preview/${relPath}${editMode ? "?edit=1" : ""}#${recarga}`;

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      const data = e.data as { type?: string; op?: EditOp; nodeId?: number; page?: string };
      if (data?.type === "wc-edit" && data.op) {
        setOps((prev) => {
          const next = new Map(prev);
          next.set(opKey(data.op!), data.op!);
          return next;
        });
      } else if (data?.type === "wc-image-request" && typeof data.nodeId === "number" && data.page) {
        pendingImg.current = { nodeId: data.nodeId, page: data.page };
        fileInputRef.current?.click();
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const pend = pendingImg.current;
    pendingImg.current = null;
    if (!file || !pend) return;
    setGuardando(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/projects/${projectId}/assets`, { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "Error al subir la imagen");
        return;
      }
      const { assetId, ext, url } = (await res.json()) as { assetId: string; ext: string; url: string };
      iframeRef.current?.contentWindow?.postMessage({ type: "wc-image-set", nodeId: pend.nodeId, previewUrl: url }, "*");
      const op: EditOp = { page: pend.page, nodeId: pend.nodeId, kind: "src", value: `/wc-uploads/${assetId}.${ext}`, assetId };
      setOps((prev) => {
        const next = new Map(prev);
        next.set(opKey(op), op);
        return next;
      });
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEntrada(nuevo: string) {
    setActual(nuevo);
    setGuardando(true);
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ entryPath: nuevo }),
    });
    setGuardando(false);
  }

  function entrarEdicion() { setOps(new Map()); setEditMode(true); }
  function cancelarEdicion() { setOps(new Map()); setEditMode(false); setRecarga((n) => n + 1); }

  async function guardarEdicion() {
    setGuardando(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/edits`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ops: [...ops.values()] }),
      });
      if (res.ok) { setOps(new Map()); setEditMode(false); setRecarga((n) => n + 1); setSnapshots(null); }
      else { const d = await res.json().catch(() => ({})); alert(d.error ?? "Error al guardar"); }
    } finally {
      setGuardando(false);
    }
  }

  async function verHistorial() {
    const d = await fetch(`/api/projects/${projectId}/snapshots`).then((r) => r.json());
    setSnapshots(d.snapshots ?? []);
  }
  async function restaurar(snapshotId: string) {
    await fetch(`/api/projects/${projectId}/snapshots/${snapshotId}/restore`, { method: "POST" });
    setSnapshots(null); setRecarga((n) => n + 1);
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/svg+xml"
        className="hidden"
        onChange={(e) => void onFileChange(e)}
      />
      <div className="mb-3 flex flex-wrap items-center gap-3">
        {!editMode ? (
          <>
            <label className="text-sm text-gray-600">Página de entrada:</label>
            <select value={actual} onChange={(e) => void cambiarEntrada(e.target.value)} className="rounded border px-2 py-1 text-sm">
              {pages.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={entrarEdicion} className="rounded bg-indigo-600 px-3 py-1 text-sm text-white">Editar</button>
            <button onClick={() => void verHistorial()} className="rounded border px-3 py-1 text-sm">Historial</button>
            {guardando && <span className="text-sm text-gray-400">guardando…</span>}
          </>
        ) : (
          <>
            <span className="text-sm font-medium text-indigo-700">Modo edición · {ops.size} cambios</span>
            <button onClick={() => void guardarEdicion()} disabled={ops.size === 0 || guardando} className="rounded bg-indigo-600 px-3 py-1 text-sm text-white disabled:opacity-50">Guardar</button>
            <button onClick={cancelarEdicion} className="rounded border px-3 py-1 text-sm">Cancelar</button>
            <span className="text-xs text-gray-400">Texto: click para editar · enlace/color: usa el panel flotante · imagen: «Cambiar imagen»</span>
          </>
        )}
      </div>

      {snapshots && (
        <div className="mb-3 rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Historial</span>
            <button onClick={() => setSnapshots(null)} className="text-xs text-gray-500">cerrar</button>
          </div>
          <ul className="space-y-1">
            {snapshots.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span>{s.tipo} · {s.createdAt.slice(0, 19).replace("T", " ")} {s.esActual && <em className="text-indigo-600">(actual)</em>}</span>
                {!s.esActual && <button onClick={() => void restaurar(s.id)} className="rounded border px-2 py-0.5 text-xs">Restaurar</button>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <iframe
        key={src}
        ref={iframeRef}
        src={src}
        sandbox="allow-scripts"
        className="h-[80vh] w-full rounded-lg border"
        title="preview"
      />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/projects/[id]/PreviewPane.tsx
git commit -m "feat(2b): PreviewPane acumula ops de unión + subida de imagen"
```

---

### Task 11: `wc-editor.js` — popover + detección img/a + mensajería bidireccional

**Files:**
- Modify: `public/wc-editor.js`

**Interfaces:**
- Consumes: `data-wc-id` (anotación del preview), `data-page` (atributo del `<script>`).
- Produces: en el iframe, popover propio (sin `data-wc-id`) con selector de color (texto/`<a>`), campo href (`<a>`) y botón «Cambiar imagen» (`<img>`); emite `wc-edit` (text/href/style) y `wc-image-request` al padre; recibe `wc-image-set` para fijar la imagen subida en vivo. Texto sigue editándose con `contenteditable`.

- [ ] **Step 1: Reescribir el script**

Reemplaza el contenido de `public/wc-editor.js` por:

```js
(function () {
  "use strict";
  var self = document.currentScript;
  var PAGE = self.getAttribute("data-page") || "";
  var TEXT_TAGS = ["h1","h2","h3","h4","h5","h6","p","span","li","a","button","blockquote","figcaption","label","strong","em","small","td","th"];

  function tieneId(el) { return el && el.nodeType === 1 && el.hasAttribute && el.hasAttribute("data-wc-id"); }
  function esTextoHoja(el) {
    if (!tieneId(el)) return false;
    if (TEXT_TAGS.indexOf(el.tagName.toLowerCase()) === -1) return false;
    if (el.children.length > 0) return false;
    return el.textContent.trim().length > 0;
  }
  function esImagen(el) { return tieneId(el) && el.tagName.toLowerCase() === "img"; }
  function esEnlace(el) { return tieneId(el) && el.tagName.toLowerCase() === "a"; }
  function esEditable(el) { return esTextoHoja(el) || esImagen(el); }

  function emitir(op) { window.parent.postMessage({ type: "wc-edit", op: op }, "*"); }
  function idDe(el) { return Number(el.getAttribute("data-wc-id")); }

  // ---------- popover (DOM propio, nunca se guarda) ----------
  var pop = document.createElement("div");
  pop.setAttribute("data-wc-ui", "1");
  pop.style.cssText = "position:absolute;z-index:2147483647;display:none;gap:6px;align-items:center;flex-wrap:wrap;max-width:340px;background:#111827;color:#fff;border-radius:8px;padding:8px;font:13px system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3)";
  function montarPop() { if (!pop.parentNode && document.body) document.body.appendChild(pop); }
  if (document.body) montarPop(); else document.addEventListener("DOMContentLoaded", montarPop);

  var objetivo = null;
  var ocultarTimer = null;

  function dentroDePop(el) { return el === pop || (el && pop.contains && pop.contains(el)); }

  function posicionar(el) {
    var r = el.getBoundingClientRect();
    pop.style.top = (window.scrollY + r.bottom + 6) + "px";
    pop.style.left = (window.scrollX + r.left) + "px";
  }

  function rgbAHex(rgb) {
    var m = rgb && rgb.match(/\d+/g);
    if (!m || m.length < 3) return "#000000";
    return "#" + m.slice(0, 3).map(function (n) {
      var h = parseInt(n, 10).toString(16);
      return h.length === 1 ? "0" + h : h;
    }).join("");
  }

  function construir(el) {
    pop.innerHTML = "";
    objetivo = el;

    if (esTextoHoja(el)) {
      var lbl = document.createElement("span"); lbl.textContent = "Color"; lbl.style.opacity = ".8";
      var color = document.createElement("input"); color.type = "color";
      color.value = rgbAHex(getComputedStyle(el).color);
      color.style.cssText = "width:28px;height:24px;border:0;background:none;padding:0;cursor:pointer";
      color.addEventListener("input", function () {
        el.style.color = color.value;
        emitir({ page: PAGE, nodeId: idDe(el), kind: "style", property: "color", value: color.value });
      });
      pop.appendChild(lbl); pop.appendChild(color);
    }

    if (esEnlace(el)) {
      var inp = document.createElement("input"); inp.type = "text"; inp.placeholder = "https://…";
      inp.value = el.getAttribute("href") || "";
      inp.style.cssText = "width:170px;padding:3px 6px;border-radius:4px;border:1px solid #374151;background:#1f2937;color:#fff";
      var ok = document.createElement("button"); ok.type = "button"; ok.textContent = "OK";
      ok.style.cssText = "padding:3px 8px;border-radius:4px;border:0;background:#6366f1;color:#fff;cursor:pointer";
      var aplicar = function () {
        var v = inp.value.trim();
        el.setAttribute("href", v);
        emitir({ page: PAGE, nodeId: idDe(el), kind: "href", value: v });
      };
      ok.addEventListener("click", aplicar);
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); aplicar(); } });
      pop.appendChild(inp); pop.appendChild(ok);
    }

    if (esImagen(el)) {
      var btn = document.createElement("button"); btn.type = "button"; btn.textContent = "Cambiar imagen";
      btn.style.cssText = "padding:3px 8px;border-radius:4px;border:0;background:#6366f1;color:#fff;cursor:pointer";
      btn.addEventListener("click", function () {
        window.parent.postMessage({ type: "wc-image-request", nodeId: idDe(el), page: PAGE }, "*");
      });
      pop.appendChild(btn);
    }
  }

  function mostrar(el) {
    if (ocultarTimer) { clearTimeout(ocultarTimer); ocultarTimer = null; }
    if (objetivo !== el || pop.style.display === "none") construir(el);
    posicionar(el);
    pop.style.display = "flex";
  }
  function programarOcultar() {
    if (ocultarTimer) clearTimeout(ocultarTimer);
    ocultarTimer = setTimeout(function () { pop.style.display = "none"; objetivo = null; }, 250);
  }

  // ---------- marcado visual ----------
  function marcar(el) { el.style.outline = "2px dashed #6366f1"; el.style.outlineOffset = "2px"; }
  function desmarcar(el) { if (el === editando) return; el.style.outline = ""; el.style.outlineOffset = ""; }

  // ---------- edición de texto in-situ ----------
  var editando = null, valorPrevio = "";
  function iniciarEdicion(el) {
    if (editando) terminarEdicion(true);
    editando = el; valorPrevio = el.textContent;
    el.setAttribute("contenteditable", "true"); el.focus();
  }
  function terminarEdicion(guardar) {
    if (!editando) return;
    var el = editando; el.removeAttribute("contenteditable");
    var valor = el.textContent; editando = null; desmarcar(el);
    if (guardar && valor !== valorPrevio) {
      emitir({ page: PAGE, nodeId: idDe(el), kind: "text", value: valor });
    } else if (!guardar) { el.textContent = valorPrevio; }
  }

  // ---------- eventos ----------
  document.addEventListener("mouseover", function (e) {
    var el = e.target;
    if (dentroDePop(el)) return;
    if (el && el.nodeType === 1 && esEditable(el)) { marcar(el); mostrar(el); }
  });
  document.addEventListener("mouseout", function (e) {
    var el = e.target, to = e.relatedTarget;
    if (el && el.nodeType === 1 && tieneId(el)) desmarcar(el);
    if (!dentroDePop(to) && !(to && to.nodeType === 1 && esEditable(to))) programarOcultar();
  });
  pop.addEventListener("mouseover", function () { if (ocultarTimer) { clearTimeout(ocultarTimer); ocultarTimer = null; } });
  pop.addEventListener("mouseleave", function () { programarOcultar(); });

  document.addEventListener("click", function (e) {
    var el = e.target;
    if (dentroDePop(el)) return;
    if (el && el.nodeType === 1 && esEnlace(el)) e.preventDefault(); // no navegar en modo edición
    if (el && el.nodeType === 1 && esTextoHoja(el) && el !== editando) { e.preventDefault(); iniciarEdicion(el); }
  });
  document.addEventListener("keydown", function (e) {
    if (!editando) return;
    if (e.key === "Escape") { e.preventDefault(); terminarEdicion(false); }
    else if (e.key === "Enter") { e.preventDefault(); terminarEdicion(true); }
  });
  document.addEventListener("blur", function () { terminarEdicion(true); }, true);

  // ---------- recepción del padre: fijar la imagen subida en vivo ----------
  window.addEventListener("message", function (e) {
    if (e.source !== window.parent) return;
    var d = e.data;
    if (!d || d.type !== "wc-image-set" || typeof d.previewUrl !== "string") return;
    var img = document.querySelector('[data-wc-id="' + Number(d.nodeId) + '"]');
    if (img && img.tagName.toLowerCase() === "img") img.src = d.previewUrl;
  });
})();
```

- [ ] **Step 2: Sanity (lint sintáctico con node)**

Run: `node --check public/wc-editor.js`
Expected: sin salida (sintaxis válida).

- [ ] **Step 3: Commit**

```bash
git add public/wc-editor.js
git commit -m "feat(2b): editor con popover (color/enlace/imagen) + mensajería bidireccional"
```

---

### Task 12: Verificación e2e + visual

**Files:**
- Create: `scratchpad/e2e-2b.mjs` (script de verificación; no se versiona)

**Interfaces:**
- Consumes: el servidor de desarrollo en `http://localhost:3000` y las rutas import/preview/assets/edits/snapshots.
- Produces: salida `=== N/N checks PASS ===` y una captura del modo edición.

> Ruta del scratchpad de esta sesión:
> `C:\Users\Sebas\AppData\Local\Temp\claude\c--Users-Sebas-Desktop-Carpeta-de-Proyectos-Wordclicks\31c53a9f-b67f-44b1-92a8-2170d00b1dd0\scratchpad`

- [ ] **Step 1: Arrancar el servidor de desarrollo (en segundo plano)**

Run (background): `npm run dev`
Espera a que responda `http://localhost:3000` con 200.

- [ ] **Step 2: Escribir el script e2e**

Crea `<scratchpad>/e2e-2b.mjs` con el siguiente contenido (ajusta `BASE` si cambia el puerto):

```js
import { execSync } from "node:child_process";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (c, m) => { (c ? pass++ : fail++); console.log((c ? "PASS  " : "FAIL  ") + m); };

// 1) Construir un zip de prueba con <a>, <img> y <p> (PowerShell Compress-Archive)
const dir = mkdtempSync(join(tmpdir(), "wc2b-"));
writeFileSync(join(dir, "index.html"),
  `<!doctype html><html><head><title>t</title></head><body>` +
  `<a href="/viejo">Enlace</a><img src="/orig.png" alt="x"><p>Parrafo</p>` +
  `</body></html>`);
const zip = join(dir, "site.zip");
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${join(dir, "index.html")}' -DestinationPath '${zip}' -Force"`);

// 2) Importar
const impFd = new FormData();
impFd.append("file", new Blob([readFileSync(zip)], { type: "application/zip" }), "site.zip");
const imp = await fetch(`${BASE}/api/projects`, { method: "POST", body: impFd });
const impJson = await imp.json();
const pid = impJson.projectId;
ok(imp.status === 201 && !!pid, "import 201 + projectId — " + pid);

// 3) Preview en modo edición → data-wc-id + script
const edit = await (await fetch(`${BASE}/api/projects/${pid}/preview/?edit=1`)).text();
ok(/data-wc-id="\d+"/.test(edit), "modo edición inyecta data-wc-id");
ok(edit.includes("/wc-editor.js"), "modo edición inyecta el script");
const idA = (edit.match(/<a[^>]*data-wc-id="(\d+)"/) || [])[1];
const idImg = (edit.match(/<img[^>]*data-wc-id="(\d+)"/) || [])[1];
const idP = (edit.match(/<p[^>]*data-wc-id="(\d+)"/) || [])[1];
ok(idA && idImg && idP, `localiza a=${idA} img=${idImg} p=${idP}`);

// 4) Subir una imagen (PNG 1x1)
const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f5f0000000049454e44ae426082", "hex");
const upFd = new FormData();
upFd.append("file", new Blob([png], { type: "image/png" }), "logo.png");
const up = await fetch(`${BASE}/api/projects/${pid}/assets`, { method: "POST", body: upFd });
const upJson = await up.json();
ok(up.status === 201 && upJson.assetId, "POST /assets 201 — " + upJson.assetId);
const served = await fetch(`${BASE}${upJson.url}`);
ok(served.status === 200 && (served.headers.get("content-type") || "").includes("image/png"), "GET asset 200 image/png");

// 5) Guardar edits: href + src + color + texto
const ops = [
  { page: "index.html", nodeId: Number(idA), kind: "href", value: "https://nuevo.example" },
  { page: "index.html", nodeId: Number(idImg), kind: "src", value: `/wc-uploads/${upJson.assetId}.${upJson.ext}`, assetId: upJson.assetId },
  { page: "index.html", nodeId: Number(idP), kind: "style", property: "color", value: "#ff0000" },
];
const save = await fetch(`${BASE}/api/projects/${pid}/edits`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ops }),
});
const saveJson = await save.json();
ok(save.status === 201 && saveJson.snapshotId, "POST /edits 201 — " + saveJson.snapshotId);

// 6) Preview normal refleja los cambios y NO tiene data-wc-id
const norm = await (await fetch(`${BASE}/api/projects/${pid}/preview/`)).text();
ok(norm.includes('href="https://nuevo.example"'), "href actualizado en preview");
ok(/<img[^>]*wc-uploads\/[0-9a-f-]+\.png/.test(norm), "src apunta a wc-uploads");
ok(/style="color: #ff0000"/.test(norm), "color aplicado");
ok(!/data-wc-id/.test(norm), "preview normal SIN data-wc-id");

// 7) La imagen vive dentro del snapshot
const imgEnSnap = await fetch(`${BASE}/api/projects/${pid}/preview/wc-uploads/${upJson.assetId}.${upJson.ext}`);
ok(imgEnSnap.status === 200, "imagen servida desde wc-uploads del snapshot");

// 8) Historial + revertir
const snaps = (await (await fetch(`${BASE}/api/projects/${pid}/snapshots`)).json()).snapshots;
ok(snaps.length >= 2, "hay >=2 snapshots (import + edit)");
const importSnap = snaps.find((s) => s.tipo === "import");
await fetch(`${BASE}/api/projects/${pid}/snapshots/${importSnap.id}/restore`, { method: "POST" });
const rev = await (await fetch(`${BASE}/api/projects/${pid}/preview/`)).text();
ok(rev.includes('href="/viejo"') && !rev.includes("nuevo.example"), "revertir restaura el href original");

console.log(`\n=== ${pass}/${pass + fail} checks PASS ===`);
console.log("PROJECT_ID=" + pid);
process.exit(fail ? 1 : 0);
```

> Nota: el import es `POST /api/projects` con un campo `file` (zip). Verificado en `app/api/projects/route.ts`.

- [ ] **Step 3: Ejecutar el e2e**

Run: `node "<scratchpad>/e2e-2b.mjs"`
Expected: `=== N/N checks PASS ===` con N = total de checks y 0 fallos.

- [ ] **Step 4: Captura visual del modo edición**

Reemplaza `PID` por el `PROJECT_ID` impreso por el e2e y ejecuta:

```bash
"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --window-size=1280,900 --screenshot="<scratchpad>/2b-edit.png" "http://localhost:3000/projects/PID"
```

Expected: se genera `2b-edit.png`. Revísala (cárgala) para confirmar que la web se ve correcta en modo edición.

- [ ] **Step 5: Parar el servidor de desarrollo**

Detén el proceso de `npm run dev` (en Windows, mata el PID que escucha en el puerto 3000):

```bash
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object -Expand OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }"
```

- [ ] **Step 6: Commit final del incremento**

```bash
git add -A
git commit -m "test(2b): e2e imagen/enlace/color verificado (preview + revertir)"
```

---

## Self-Review

**1. Cobertura del spec:**
- §2 EditOp unión + dedup → Task 3 (unión, dedup en `applyEdits`) + Task 10 (dedup en panel por `page#nodeId#kind#property`). ✔
- §3 walk extendido + applyEdits + escapeAttr + mergeStyleProperty → Tasks 1, 2, 3. ✔
- §4 imágenes auto-contenidas (subida, op, copia a wc-uploads, store) → Tasks 5, 6, 7, 9. ✔
- §5 editor (detección, popover, mensajería, panel) → Tasks 10, 11. ✔
- §6 seguridad (href/src/style/subida) → Task 4 (validate-op) + Task 6 (subida) + Task 8 (CSP al servir). ✔
- §7 atomicidad (limpieza compensatoria) → Task 9. ✔
- §8 modelo de datos (AssetRow, sin migración) → Task 5. ✔
- §9 rutas API → Tasks 7, 8. ✔
- §11 manejo de errores → Tasks 4, 6, 7, 9. ✔
- §12 testing/verificación → Tasks 1–9 (unit/fakes) + Task 12 (e2e/visual). ✔

**2. Placeholders:** ninguno; cada paso lleva el código/comando completo y su salida esperada.

**3. Consistencia de tipos:** `EditOp`/`PageOp`/`escapeAttr`/`applyEdits` (Task 3) se usan idénticos en Tasks 9, 10; `WalkedElement.attrs`/`attrLocations` (Task 1) → `applyEdits` (Task 3); `ALLOWED_IMAGE_EXTS`/`isUuid`/`isValidOp` (Task 4) → Tasks 6, 8, 9; `AssetRow`/`CreateAssetInput`/`createAsset`/`getAsset` (Task 5) → Tasks 6, 8, 9; `uploadAsset` firma (Task 6) → Task 7; mensajes `wc-edit`/`wc-image-request`/`wc-image-set` consistentes entre Task 10 y Task 11.

**Nota de diseño:** el spec §10 ubicaba `EditOp` en `src/repositories/types.ts`; se mantiene en `src/editor/apply.ts` (su hogar actual) para no acoplar el módulo puro del editor a `repositories`. `repositories/types.ts` solo gana `AssetRow`/`CreateAssetInput` y los dos métodos del store. Sin impacto funcional.
