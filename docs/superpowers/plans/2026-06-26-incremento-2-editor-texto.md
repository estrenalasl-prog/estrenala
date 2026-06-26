# Wordclicks — Incremento 2 (Editor de texto in-situ) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Editar texto in-situ sobre el preview, guardar de forma quirúrgica al HTML original (solo cambian los bytes editados) creando un snapshot reversible.

**Architecture:** La identificación de nodos usa `data-wc-id` que inyecta el servidor (estable frente a la normalización del DOM del navegador). Toda la lógica de servidor son funciones puras inyectables (DI): `walkElementsInOrder`/`annotateForEdit`/`applyTextEdits` (parse5 + source locations) y los orquestadores `saveEdits`/`restoreSnapshot`. El script del editor (JS vanilla en el iframe) solo emite operaciones por `postMessage`; el panel (mismo origen) guarda.

**Tech Stack:** Next 16 (App Router) + TS, Drizzle/Supabase, **parse5** (parser HTML con `sourceCodeLocationInfo`), Vitest.

## Global Constraints

- Node 22+, Next 16 App Router, TS `strict`, Tailwind v4. Copys de UI en español.
- **El HTML guardado/publicado nunca contiene `data-wc-id` ni el script del editor**; al editar, todo lo NO editado queda **byte-idéntico** (aplicación quirúrgica).
- **`data-wc-id` se inyecta solo en la respuesta de modo edición** (`?edit=1`), nunca se almacena.
- El texto nuevo se **escapa en el servidor** (`&`→`&amp;`, `<`→`&lt;`, `>`→`&gt;`) antes de insertarlo.
- `annotateForEdit` y `applyTextEdits` deben usar **el mismo** `walkElementsInOrder` (garantiza que el id que ve el navegador apunta al mismo nodo que edita el servidor).
- Editable = elemento **hoja de texto**: etiqueta en la lista blanca, **sin hijos-elemento**, con texto no vacío. Lista: `h1 h2 h3 h4 h5 h6 p span li a button blockquote figcaption label strong em small td th`.
- Multi-tenant: todo acceso va scoping por organización vía `ProjectStore` + `getDevContext()`.
- Sin framework dentro del iframe. Spec: `docs/superpowers/specs/2026-06-26-incremento-2-editor-texto-design.md`.

---

## Mapa de archivos

```
src/editor/walk.ts           — walkElementsInOrder (parse5)              (T1)
src/editor/annotate.ts       — annotateForEdit                          (T2)
src/editor/apply.ts          — applyTextEdits + escapeHtmlText + EditOp  (T3)
src/editor/errors.ts         — EditorError (status)                     (T4 — incluida con T6)
src/repositories/types.ts    — amplía ProjectStore + SnapshotInfo        (T4)
src/repositories/projects.ts — impl. Drizzle de los métodos nuevos       (T5)
src/editor/save-edits.ts     — saveEdits (DI)                            (T6)
src/editor/restore.ts        — restoreSnapshot (DI)                      (T7)
src/preview/resolve.ts       — flag edit (annotate + script)             (T8)
app/api/projects/[id]/preview/[[...path]]/route.ts — pasa ?edit=1        (T8)
public/wc-editor.js          — script del editor (vanilla)              (T9)
app/api/projects/[id]/edits/route.ts                                     (T10)
app/api/projects/[id]/snapshots/route.ts                                (T11)
app/api/projects/[id]/snapshots/[snapshotId]/restore/route.ts           (T11)
app/projects/[id]/PreviewPane.tsx — modo edición + toolbar + historial   (T12)
```

---

## Task 1: `walkElementsInOrder` (parse5)

**Files:**
- Create: `src/editor/walk.ts`, `src/tests/walk.test.ts`
- Modify: `package.json` (añade `parse5`)

**Interfaces:**
- Produces: `type WalkedElement = { id: number; tagName: string; startTagStart: number; startTagEnd: number; endTagStart: number | null; hasElementChildren: boolean; text: string }` y `walkElementsInOrder(html: string): WalkedElement[]`.

- [ ] **Step 1: Instalar parse5**

Run: `npm install parse5@^7.2.1`
Expected: añade `parse5` a dependencies; sin errores.

- [ ] **Step 2: Escribir el test**

`src/tests/walk.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { walkElementsInOrder } from "@/src/editor/walk";

describe("walkElementsInOrder", () => {
  const html = `<h1>Hola</h1><p>Uno <b>dos</b></p>`;

  it("asigna ids incrementales en orden de documento (omite html/body auto-insertados)", () => {
    const els = walkElementsInOrder(html);
    expect(els.map((e) => [e.id, e.tagName])).toEqual([
      [0, "h1"], [1, "p"], [2, "b"],
    ]);
  });

  it("marca hasElementChildren correctamente", () => {
    const els = walkElementsInOrder(html);
    expect(els.find((e) => e.tagName === "h1")!.hasElementChildren).toBe(false);
    expect(els.find((e) => e.tagName === "p")!.hasElementChildren).toBe(true);
  });

  it("el tramo [startTagEnd, endTagStart) delimita el contenido", () => {
    const els = walkElementsInOrder(html);
    const h1 = els.find((e) => e.tagName === "h1")!;
    expect(html.slice(h1.startTagEnd, h1.endTagStart!)).toBe("Hola");
    const b = els.find((e) => e.tagName === "b")!;
    expect(html.slice(b.startTagEnd, b.endTagStart!)).toBe("dos");
  });

  it("captura el texto directo del nodo", () => {
    const els = walkElementsInOrder(html);
    expect(els.find((e) => e.tagName === "h1")!.text).toBe("Hola");
    expect(els.find((e) => e.tagName === "p")!.text).toBe("Uno ");
  });

  it("elemento void (img) tiene endTagStart null", () => {
    const els = walkElementsInOrder(`<img src="x.png">`);
    expect(els[0].tagName).toBe("img");
    expect(els[0].endTagStart).toBeNull();
  });
});
```

- [ ] **Step 3: Ejecutar (debe fallar)**

Run: `npx vitest run src/tests/walk.test.ts`
Expected: FAIL ("Cannot find module '@/src/editor/walk'").

- [ ] **Step 4: Implementar `src/editor/walk.ts`**

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
};

export function walkElementsInOrder(html: string): WalkedElement[] {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const out: WalkedElement[] = [];
  let nextId = 0;

  const visit = (node: unknown) => {
    const n = node as {
      tagName?: string;
      childNodes?: unknown[];
      sourceCodeLocation?: {
        startOffset: number;
        startTag?: { endOffset: number };
        endTag?: { startOffset: number };
      } | null;
    };
    const loc = n.sourceCodeLocation;
    if (typeof n.tagName === "string" && loc && loc.startTag) {
      const kids = (n.childNodes ?? []) as { tagName?: string; nodeName?: string; value?: string }[];
      out.push({
        id: nextId++,
        tagName: n.tagName,
        startTagStart: loc.startOffset,
        startTagEnd: loc.startTag.endOffset,
        endTagStart: loc.endTag ? loc.endTag.startOffset : null,
        hasElementChildren: kids.some((c) => typeof c.tagName === "string"),
        text: kids.filter((c) => c.nodeName === "#text").map((c) => c.value ?? "").join(""),
      });
    }
    if (n.childNodes) for (const c of n.childNodes) visit(c);
  };
  visit(doc);
  return out;
}
```

- [ ] **Step 5: Ejecutar (debe pasar)**

Run: `npx vitest run src/tests/walk.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/editor/walk.ts src/tests/walk.test.ts package.json package-lock.json
git commit -m "feat: walkElementsInOrder (parse5) para identificar nodos editables"
```

---

## Task 2: `annotateForEdit`

**Files:**
- Create: `src/editor/annotate.ts`, `src/tests/annotate.test.ts`

**Interfaces:**
- Consumes: `walkElementsInOrder` (T1).
- Produces: `annotateForEdit(html: string): string` — inyecta ` data-wc-id="N"` tras `<tag`, en orden de offset descendente.

- [ ] **Step 1: Escribir el test**

`src/tests/annotate.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { annotateForEdit } from "@/src/editor/annotate";

describe("annotateForEdit", () => {
  it("inyecta data-wc-id tras el nombre de etiqueta", () => {
    expect(annotateForEdit(`<h1>Hola</h1>`)).toBe(`<h1 data-wc-id="0">Hola</h1>`);
  });

  it("conserva atributos previos", () => {
    expect(annotateForEdit(`<a href="/x">L</a>`)).toBe(`<a data-wc-id="0" href="/x">L</a>`);
  });

  it("numera en orden de documento y no toca el contenido", () => {
    const out = annotateForEdit(`<h1>A</h1><p>B <b>C</b></p>`);
    expect(out).toBe(`<h1 data-wc-id="0">A</h1><p data-wc-id="1">B <b data-wc-id="2">C</b></p>`);
  });
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `npx vitest run src/tests/annotate.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/editor/annotate.ts`**

```ts
import { walkElementsInOrder } from "./walk";

export function annotateForEdit(html: string): string {
  const inserts = walkElementsInOrder(html)
    .map((e) => ({ at: e.startTagStart + 1 + e.tagName.length, text: ` data-wc-id="${e.id}"` }))
    .sort((a, b) => b.at - a.at); // descendente: no desplaza offsets posteriores

  let out = html;
  for (const ins of inserts) {
    out = out.slice(0, ins.at) + ins.text + out.slice(ins.at);
  }
  return out;
}
```

- [ ] **Step 4: Ejecutar (debe pasar)**

Run: `npx vitest run src/tests/annotate.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/editor/annotate.ts src/tests/annotate.test.ts
git commit -m "feat: annotateForEdit (inyecta data-wc-id quirúrgicamente)"
```

---

## Task 3: `applyTextEdits` + `escapeHtmlText`

**Files:**
- Create: `src/editor/apply.ts`, `src/tests/apply.test.ts`

**Interfaces:**
- Consumes: `walkElementsInOrder` (T1).
- Produces:
  - `type EditOp = { page: string; nodeId: number; kind: "text"; value: string }`
  - `escapeHtmlText(s: string): string`
  - `applyTextEdits(html: string, ops: { nodeId: number; value: string }[]): string` — reemplaza el contenido del nodo por el valor **escapado**; ignora ids inexistentes, no-hoja (con hijos-elemento) y void (sin endTag); aplica en orden descendente.

- [ ] **Step 1: Escribir el test**

`src/tests/apply.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { applyTextEdits, escapeHtmlText } from "@/src/editor/apply";

describe("escapeHtmlText", () => {
  it("escapa &, < y >", () => {
    expect(escapeHtmlText(`a < b & c > d`)).toBe(`a &lt; b &amp; c &gt; d`);
  });
});

describe("applyTextEdits", () => {
  const html = `<h1>Hola</h1><p>Uno <b>dos</b></p>`; // ids: h1=0, p=1, b=2

  it("reemplaza el texto del nodo objetivo y deja el resto byte-idéntico", () => {
    expect(applyTextEdits(html, [{ nodeId: 0, value: "Adiós" }]))
      .toBe(`<h1>Adiós</h1><p>Uno <b>dos</b></p>`);
  });

  it("edita un nodo anidado (b)", () => {
    expect(applyTextEdits(html, [{ nodeId: 2, value: "DOS" }]))
      .toBe(`<h1>Hola</h1><p>Uno <b>DOS</b></p>`);
  });

  it("escapa el valor nuevo", () => {
    expect(applyTextEdits(`<h1>x</h1>`, [{ nodeId: 0, value: `<script>&` }]))
      .toBe(`<h1>&lt;script&gt;&amp;</h1>`);
  });

  it("ignora un nodo con hijos-elemento (no hoja de texto)", () => {
    expect(applyTextEdits(html, [{ nodeId: 1, value: "x" }])).toBe(html);
  });

  it("ignora un id inexistente", () => {
    expect(applyTextEdits(html, [{ nodeId: 99, value: "x" }])).toBe(html);
  });

  it("aplica múltiples ops a la vez", () => {
    expect(applyTextEdits(html, [{ nodeId: 0, value: "A" }, { nodeId: 2, value: "C" }]))
      .toBe(`<h1>A</h1><p>Uno <b>C</b></p>`);
  });
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `npx vitest run src/tests/apply.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/editor/apply.ts`**

```ts
import { walkElementsInOrder } from "./walk";

export type EditOp = { page: string; nodeId: number; kind: "text"; value: string };

export function escapeHtmlText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function applyTextEdits(
  html: string,
  ops: { nodeId: number; value: string }[]
): string {
  const byId = new Map(walkElementsInOrder(html).map((e) => [e.id, e]));
  const edits: { start: number; end: number; text: string }[] = [];
  for (const op of ops) {
    const el = byId.get(op.nodeId);
    if (!el) continue;                    // id inexistente
    if (el.hasElementChildren) continue;  // no es hoja de texto
    if (el.endTagStart == null) continue; // void / sin endTag
    edits.push({ start: el.startTagEnd, end: el.endTagStart, text: escapeHtmlText(op.value) });
  }
  edits.sort((a, b) => b.start - a.start); // descendente
  let out = html;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}
```

- [ ] **Step 4: Ejecutar (debe pasar)**

Run: `npx vitest run src/tests/apply.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/editor/apply.ts src/tests/apply.test.ts
git commit -m "feat: applyTextEdits (reemplazo quirúrgico + escapado)"
```

---

## Task 4: Amplía `ProjectStore` + `SnapshotInfo` + `EditorError`

**Files:**
- Modify: `src/repositories/types.ts`
- Create: `src/editor/errors.ts`

**Interfaces:**
- Produces (en `types.ts`):
  - `type SnapshotInfo = { id: string; tipo: string; parentId: string | null; createdAt: string; esActual: boolean }`
  - `type CreateSnapshotInput = { snapshotId: string; projectId: string; parentId: string; tipo: string; storagePrefix: string; operacionesJson: unknown }`
  - Añade al `interface ProjectStore`:
    - `createSnapshot(input: CreateSnapshotInput): Promise<void>`
    - `setCurrentSnapshot(orgId: string, projectId: string, snapshotId: string): Promise<void>`
    - `listSnapshots(orgId: string, projectId: string): Promise<SnapshotInfo[]>`
    - `getSnapshotById(orgId: string, projectId: string, snapshotId: string): Promise<SnapshotRow | null>`
- Produces (en `errors.ts`): `class EditorError extends Error { constructor(message: string, public status: number) }`.

- [ ] **Step 1: Crear `src/editor/errors.ts`**

```ts
export class EditorError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "EditorError";
  }
}
```

- [ ] **Step 2: Ampliar `src/repositories/types.ts`** (añadir tras lo existente, dentro/junto al fichero)

Añade los tipos y los métodos al `interface ProjectStore`:
```ts
export type SnapshotInfo = {
  id: string;
  tipo: string;
  parentId: string | null;
  createdAt: string;
  esActual: boolean;
};

export type CreateSnapshotInput = {
  snapshotId: string;
  projectId: string;
  parentId: string;
  tipo: string;
  storagePrefix: string;
  operacionesJson: unknown;
};
```
Y dentro de `export interface ProjectStore { … }`, añade:
```ts
  createSnapshot(input: CreateSnapshotInput): Promise<void>;
  setCurrentSnapshot(orgId: string, projectId: string, snapshotId: string): Promise<void>;
  listSnapshots(orgId: string, projectId: string): Promise<SnapshotInfo[]>;
  getSnapshotById(orgId: string, projectId: string, snapshotId: string): Promise<SnapshotRow | null>;
```

- [ ] **Step 3: Verificar typecheck (fallará hasta T5)**

Run: `npm run typecheck`
Expected: ERROR — `DrizzleProjectStore` ya no satisface `ProjectStore` (faltan los 4 métodos). Esto es esperado; lo arregla la Task 5. (No commitear todavía; T4 y T5 se commitean juntas en T5 para no dejar el árbol roto.)

> Nota para el ejecutor: T4 deja el typecheck en rojo a propósito (interfaz ampliada, impl pendiente). NO hay commit en T4; el commit llega al final de T5 cuando la impl satisface la interfaz.

---

## Task 5: Impl. Drizzle de los métodos nuevos del store

**Files:**
- Modify: `src/repositories/projects.ts`

**Interfaces:**
- Consumes: schema (`snapshots`, `projects`), tipos de T4.
- Produces: `DrizzleProjectStore` implementa `createSnapshot`, `setCurrentSnapshot`, `listSnapshots`, `getSnapshotById`.

> Capa de BD fina, sin test unitario (se verifica en la Task 13 e2e).

- [ ] **Step 1: Añadir imports y métodos en `src/repositories/projects.ts`**

Asegura que el import de drizzle incluye lo necesario (ya importa `and, desc, eq`). Añade dentro de `class DrizzleProjectStore`:
```ts
  async createSnapshot(input: CreateSnapshotInput): Promise<void> {
    await db.insert(snapshots).values({
      id: input.snapshotId,
      projectId: input.projectId,
      parentId: input.parentId,
      tipo: input.tipo,
      storagePrefix: input.storagePrefix,
      operacionesJson: input.operacionesJson,
    });
  }

  async setCurrentSnapshot(orgId: string, projectId: string, snapshotId: string): Promise<void> {
    await db.update(projects).set({ currentSnapshotId: snapshotId })
      .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)));
  }

  async listSnapshots(orgId: string, projectId: string): Promise<SnapshotInfo[]> {
    const proj = await db.select().from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId))).limit(1);
    if (!proj[0]) return [];
    const rows = await db.select().from(snapshots)
      .where(eq(snapshots.projectId, projectId)).orderBy(desc(snapshots.createdAt));
    return rows.map((r) => ({
      id: r.id,
      tipo: r.tipo,
      parentId: r.parentId,
      createdAt: r.createdAt.toISOString(),
      esActual: r.id === proj[0].currentSnapshotId,
    }));
  }

  async getSnapshotById(orgId: string, projectId: string, snapshotId: string): Promise<SnapshotRow | null> {
    const proj = await db.select().from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId))).limit(1);
    if (!proj[0]) return null;
    const s = await db.select().from(snapshots)
      .where(and(eq(snapshots.id, snapshotId), eq(snapshots.projectId, projectId))).limit(1);
    if (!s[0]) return null;
    return { id: s[0].id, projectId: s[0].projectId, storagePrefix: s[0].storagePrefix, tipo: s[0].tipo };
  }
```

- [ ] **Step 2: Actualizar los imports de tipos en `projects.ts`**

Asegura que la línea de import desde `./types` incluye los nuevos: `CreateProjectInput, CreateSnapshotInput, ProjectRow, ProjectStore, SnapshotInfo, SnapshotRow`.

- [ ] **Step 3: Verificar typecheck (ahora en verde) + suite**

Run: `npm run typecheck`
Expected: sin errores (la impl ya satisface la interfaz ampliada).
Run: `npm test`
Expected: la suite existente sigue verde.

- [ ] **Step 4: Commit (incluye T4 y T5)**

```bash
git add src/editor/errors.ts src/repositories/types.ts src/repositories/projects.ts
git commit -m "feat: ProjectStore amplía snapshots (crear/listar/actual/restaurar) + EditorError"
```

---

## Task 6: `saveEdits` (orquestador DI)

**Files:**
- Create: `src/editor/save-edits.ts`, `src/tests/save-edits.test.ts`

**Interfaces:**
- Consumes: `applyTextEdits`/`EditOp` (T3), `snapshotPrefix` (storage/keys), `EditorError` (T4), `ProjectStore` (T4), `StorageAdapter`.
- Produces: `saveEdits(deps: { store: ProjectStore; storage: StorageAdapter }, input: { orgId: string; projectId: string; ops: EditOp[] }): Promise<{ snapshotId: string }>`.

- [ ] **Step 1: Escribir el test (con fakes)**

`src/tests/save-edits.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { saveEdits } from "@/src/editor/save-edits";
import { EditorError } from "@/src/editor/errors";
import type { StorageAdapter } from "@/src/storage/types";
import type {
  ProjectStore, ProjectRow, SnapshotRow, SnapshotInfo, CreateProjectInput, CreateSnapshotInput,
} from "@/src/repositories/types";

const CUR = "projects/p1/snapshots/s0/";

class FakeStorage implements StorageAdapter {
  files = new Map<string, Buffer>();
  async put(key: string, body: Buffer | string) { this.files.set(key, Buffer.isBuffer(body) ? body : Buffer.from(body)); }
  async get(key: string) { const b = this.files.get(key); return b ? { body: b, contentType: "x" } : null; }
  async list(prefix: string) { return [...this.files.keys()].filter((k) => k.startsWith(prefix)); }
  async delete(key: string) { this.files.delete(key); }
}

class FakeStore implements ProjectStore {
  creado: CreateSnapshotInput | null = null;
  actualFijado: string | null = null;
  async createProjectWithSnapshot(i: CreateProjectInput) { return { projectId: i.projectId }; }
  async getProject(): Promise<ProjectRow | null> {
    return { id: "p1", orgId: "org1", nombre: "x", entryPath: "index.html", currentSnapshotId: "s0", createdAt: "" };
  }
  async listProjects(): Promise<ProjectRow[]> { return []; }
  async setEntryPath(): Promise<void> {}
  async getCurrentSnapshot(): Promise<SnapshotRow | null> {
    return { id: "s0", projectId: "p1", storagePrefix: CUR, tipo: "import" };
  }
  async createSnapshot(i: CreateSnapshotInput) { this.creado = i; }
  async setCurrentSnapshot(_o: string, _p: string, id: string) { this.actualFijado = id; }
  async listSnapshots(): Promise<SnapshotInfo[]> { return []; }
  async getSnapshotById(): Promise<SnapshotRow | null> { return null; }
}

describe("saveEdits", () => {
  it("copia el árbol, aplica la edición a la página y crea un snapshot edit", async () => {
    const storage = new FakeStorage();
    storage.files.set(CUR + "index.html", Buffer.from(`<h1>Hola</h1>`));
    storage.files.set(CUR + "css/app.css", Buffer.from(`body{}`));
    const store = new FakeStore();

    const { snapshotId } = await saveEdits({ store, storage }, {
      orgId: "org1", projectId: "p1",
      ops: [{ page: "index.html", nodeId: 0, kind: "text", value: "Adiós" }],
    });

    const newPrefix = `projects/p1/snapshots/${snapshotId}/`;
    expect(storage.files.get(newPrefix + "index.html")!.toString()).toBe(`<h1>Adiós</h1>`);
    expect(storage.files.get(newPrefix + "css/app.css")!.toString()).toBe(`body{}`); // copiado tal cual
    expect(store.creado!.parentId).toBe("s0");
    expect(store.creado!.tipo).toBe("edit");
    expect(store.actualFijado).toBe(snapshotId);
  });

  it("lanza 400 si no hay ninguna op válida", async () => {
    const storage = new FakeStorage();
    storage.files.set(CUR + "index.html", Buffer.from(`<h1>x</h1>`));
    await expect(
      saveEdits({ store: new FakeStore(), storage }, { orgId: "org1", projectId: "p1", ops: [] })
    ).rejects.toThrow(EditorError);
  });
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `npx vitest run src/tests/save-edits.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/editor/save-edits.ts`**

```ts
import { snapshotPrefix } from "@/src/storage/keys";
import { applyTextEdits, type EditOp } from "./apply";
import { EditorError } from "./errors";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

export async function saveEdits(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string; ops: EditOp[] }
): Promise<{ snapshotId: string }> {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const current = await deps.store.getCurrentSnapshot(input.orgId, input.projectId);
  if (!current) throw new EditorError("El proyecto no tiene snapshot actual", 400);

  const porPagina = new Map<string, { nodeId: number; value: string }[]>();
  for (const op of input.ops) {
    if (op.kind !== "text" || typeof op.value !== "string" || typeof op.nodeId !== "number" || !op.page) continue;
    const arr = porPagina.get(op.page) ?? [];
    arr.push({ nodeId: op.nodeId, value: op.value });
    porPagina.set(op.page, arr);
  }
  if (porPagina.size === 0) throw new EditorError("Ninguna edición válida", 400);

  const snapshotId = crypto.randomUUID();
  const newPrefix = snapshotPrefix(input.projectId, snapshotId);
  const keys = await deps.storage.list(current.storagePrefix);
  for (const key of keys) {
    const rel = key.slice(current.storagePrefix.length);
    const file = await deps.storage.get(key);
    if (!file) continue;
    let body = file.body;
    const ops = porPagina.get(rel);
    if (ops && /\.html?$/i.test(rel)) {
      body = Buffer.from(applyTextEdits(body.toString("utf-8"), ops), "utf-8");
    }
    await deps.storage.put(newPrefix + rel, body);
  }

  await deps.store.createSnapshot({
    snapshotId, projectId: input.projectId, parentId: current.id,
    tipo: "edit", storagePrefix: newPrefix, operacionesJson: input.ops,
  });
  await deps.store.setCurrentSnapshot(input.orgId, input.projectId, snapshotId);
  return { snapshotId };
}
```

- [ ] **Step 4: Ejecutar (debe pasar)**

Run: `npx vitest run src/tests/save-edits.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/editor/save-edits.ts src/tests/save-edits.test.ts
git commit -m "feat: saveEdits (copia árbol + aplica edición + snapshot edit)"
```

---

## Task 7: `restoreSnapshot` (orquestador DI)

**Files:**
- Create: `src/editor/restore.ts`, `src/tests/restore.test.ts`

**Interfaces:**
- Consumes: `EditorError` (T4), `ProjectStore` (T4).
- Produces: `restoreSnapshot(deps: { store: ProjectStore }, input: { orgId: string; projectId: string; snapshotId: string }): Promise<void>`.

- [ ] **Step 1: Escribir el test**

`src/tests/restore.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { restoreSnapshot } from "@/src/editor/restore";
import { EditorError } from "@/src/editor/errors";
import type {
  ProjectStore, ProjectRow, SnapshotRow, SnapshotInfo, CreateProjectInput, CreateSnapshotInput,
} from "@/src/repositories/types";

class StubStore implements ProjectStore {
  fijado: string | null = null;
  constructor(private existe: boolean) {}
  async createProjectWithSnapshot(i: CreateProjectInput) { return { projectId: i.projectId }; }
  async getProject(): Promise<ProjectRow | null> { return null; }
  async listProjects(): Promise<ProjectRow[]> { return []; }
  async setEntryPath(): Promise<void> {}
  async getCurrentSnapshot(): Promise<SnapshotRow | null> { return null; }
  async createSnapshot(_i: CreateSnapshotInput) {}
  async setCurrentSnapshot(_o: string, _p: string, id: string) { this.fijado = id; }
  async listSnapshots(): Promise<SnapshotInfo[]> { return []; }
  async getSnapshotById(): Promise<SnapshotRow | null> {
    return this.existe ? { id: "s1", projectId: "p1", storagePrefix: "x", tipo: "edit" } : null;
  }
}

describe("restoreSnapshot", () => {
  it("fija el snapshot como actual si pertenece al proyecto", async () => {
    const store = new StubStore(true);
    await restoreSnapshot({ store }, { orgId: "o", projectId: "p1", snapshotId: "s1" });
    expect(store.fijado).toBe("s1");
  });

  it("lanza 404 si el snapshot no es del proyecto", async () => {
    await expect(
      restoreSnapshot({ store: new StubStore(false) }, { orgId: "o", projectId: "p1", snapshotId: "ajeno" })
    ).rejects.toThrow(EditorError);
  });
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `npx vitest run src/tests/restore.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/editor/restore.ts`**

```ts
import { EditorError } from "./errors";
import type { ProjectStore } from "@/src/repositories/types";

export async function restoreSnapshot(
  deps: { store: ProjectStore },
  input: { orgId: string; projectId: string; snapshotId: string }
): Promise<void> {
  const snap = await deps.store.getSnapshotById(input.orgId, input.projectId, input.snapshotId);
  if (!snap) throw new EditorError("Snapshot no encontrado", 404);
  await deps.store.setCurrentSnapshot(input.orgId, input.projectId, input.snapshotId);
}
```

- [ ] **Step 4: Ejecutar (debe pasar)**

Run: `npx vitest run src/tests/restore.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/editor/restore.ts src/tests/restore.test.ts
git commit -m "feat: restoreSnapshot (revertir cambiando el puntero)"
```

---

## Task 8: Modo edición en el preview (`resolvePreview` + ruta)

**Files:**
- Modify: `src/preview/resolve.ts`, `src/tests/resolve.test.ts`, `app/api/projects/[id]/preview/[[...path]]/route.ts`

**Interfaces:**
- Consumes: `annotateForEdit` (T2), `rewriteHtml` (existente).
- Produces: `resolvePreview` acepta `edit?: boolean` en `input`; cuando `edit` y el archivo es `.html`: `annotateForEdit` → `rewriteHtml` → inyecta `<script src="/wc-editor.js" data-project data-page>` antes de `</body>`.

- [ ] **Step 1: Añadir un test a `src/tests/resolve.test.ts`** (junto a los existentes)

```ts
  it("en modo edición inyecta data-wc-id y el script del editor", async () => {
    const storage = new MapStorage({
      [prefix + "index.html"]: { body: `<body><h1>Hola</h1></body>`, ct: "text/html; charset=utf-8" },
    });
    const r = await resolvePreview({ storage }, {
      projectId: "p1", storagePrefix: prefix, entryPath: "index.html", pathSegments: [], edit: true,
    });
    const html = r.body.toString();
    expect(html).toContain(`data-wc-id="`);
    expect(html).toContain(`<script src="/wc-editor.js" data-project="p1" data-page="index.html"></script>`);
  });

  it("sin modo edición NO inyecta data-wc-id ni el script", async () => {
    const storage = new MapStorage({
      [prefix + "index.html"]: { body: `<body><h1>Hola</h1></body>`, ct: "text/html; charset=utf-8" },
    });
    const r = await resolvePreview({ storage }, {
      projectId: "p1", storagePrefix: prefix, entryPath: "index.html", pathSegments: [],
    });
    const html = r.body.toString();
    expect(html).not.toContain(`data-wc-id`);
    expect(html).not.toContain(`wc-editor.js`);
  });
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `npx vitest run src/tests/resolve.test.ts`
Expected: FAIL (los 2 nuevos; `edit` no existe aún).

- [ ] **Step 3: Reescribir `src/preview/resolve.ts`**

```ts
import { rewriteHtml } from "./rewrite";
import { annotateForEdit } from "@/src/editor/annotate";
import type { StorageAdapter } from "@/src/storage/types";

function injectEditorScript(html: string, projectId: string, page: string): string {
  const tag = `<script src="/wc-editor.js" data-project="${projectId}" data-page="${page}"></script>`;
  const i = html.lastIndexOf("</body>");
  return i === -1 ? html + tag : html.slice(0, i) + tag + html.slice(i);
}

export async function resolvePreview(
  deps: { storage: StorageAdapter },
  input: { projectId: string; storagePrefix: string; entryPath: string; pathSegments: string[]; edit?: boolean }
): Promise<{ status: number; body: Buffer; contentType: string }> {
  if (input.pathSegments.some((s) => s === ".." || s.includes("/") || s.includes("\\"))) {
    return { status: 400, body: Buffer.from("Ruta no válida"), contentType: "text/plain; charset=utf-8" };
  }
  const rel = input.pathSegments.length > 0 ? input.pathSegments.join("/") : input.entryPath;
  const file = await deps.storage.get(input.storagePrefix + rel);
  if (!file) {
    return { status: 404, body: Buffer.from("No encontrado"), contentType: "text/plain; charset=utf-8" };
  }
  if (/\.html?$/i.test(rel)) {
    const baseHref = `/api/projects/${input.projectId}/preview/`;
    let html = file.body.toString("utf-8");
    if (input.edit) html = annotateForEdit(html);
    html = rewriteHtml(html, baseHref);
    if (input.edit) html = injectEditorScript(html, input.projectId, rel);
    return { status: 200, body: Buffer.from(html, "utf-8"), contentType: "text/html; charset=utf-8" };
  }
  return { status: 200, body: file.body, contentType: file.contentType };
}
```

- [ ] **Step 4: Ejecutar (debe pasar)**

Run: `npx vitest run src/tests/resolve.test.ts`
Expected: PASS (todos, incluidos los 2 nuevos).

- [ ] **Step 5: Pasar `?edit=1` desde la ruta**

En `app/api/projects/[id]/preview/[[...path]]/route.ts`, lee el query y pásalo a `resolvePreview`. Cambia la llamada a `resolvePreview` para incluir `edit`:
```ts
  const edit = new URL(_req.url).searchParams.get("edit") === "1";
  const r = await resolvePreview(
    { storage: getStorage() },
    { projectId: id, storagePrefix: snap.storagePrefix, entryPath: project.entryPath, pathSegments: path ?? [], edit }
  );
```
(El primer parámetro del handler `GET` pasa de `_req` a `req` si hace falta usarlo; renómbralo a `req` y usa `req.url`.)

- [ ] **Step 6: Typecheck + commit**

Run: `npm run typecheck`
Expected: sin errores.

```bash
git add src/preview/resolve.ts src/tests/resolve.test.ts "app/api/projects/[id]/preview"
git commit -m "feat: modo edición del preview (annotate + script via ?edit=1)"
```

---

## Task 9: Script del editor (`public/wc-editor.js`)

**Files:**
- Create: `public/wc-editor.js`

**Interfaces:**
- Emite al panel: `postMessage({ type: "wc-edit", op: { page, nodeId, kind: "text", value } }, "*")`.

> Verificación visual/e2e en la Task 13 (es JS vanilla en el iframe; no lleva test unitario).

- [ ] **Step 1: Crear `public/wc-editor.js`**

```js
(function () {
  "use strict";
  var self = document.currentScript;
  var PAGE = self.getAttribute("data-page") || "";
  var TAGS = ["h1","h2","h3","h4","h5","h6","p","span","li","a","button","blockquote","figcaption","label","strong","em","small","td","th"];

  function esEditable(el) {
    if (!el.hasAttribute("data-wc-id")) return false;
    if (TAGS.indexOf(el.tagName.toLowerCase()) === -1) return false;
    if (el.children.length > 0) return false; // tiene hijos-elemento → no es hoja de texto
    return el.textContent.trim().length > 0;
  }

  var editando = null;
  var valorPrevio = "";

  function marcar(el) {
    el.style.outline = "2px dashed #6366f1";
    el.style.outlineOffset = "2px";
    el.style.cursor = "text";
  }
  function desmarcar(el) {
    if (el === editando) return;
    el.style.outline = "";
    el.style.outlineOffset = "";
    el.style.cursor = "";
  }

  function iniciarEdicion(el) {
    if (editando) terminarEdicion(true);
    editando = el;
    valorPrevio = el.textContent;
    el.setAttribute("contenteditable", "true");
    el.focus();
  }

  function terminarEdicion(guardar) {
    if (!editando) return;
    var el = editando;
    el.removeAttribute("contenteditable");
    var valor = el.textContent;
    editando = null;
    desmarcar(el);
    if (guardar && valor !== valorPrevio) {
      window.parent.postMessage({
        type: "wc-edit",
        op: { page: PAGE, nodeId: Number(el.getAttribute("data-wc-id")), kind: "text", value: valor }
      }, "*");
    } else if (!guardar) {
      el.textContent = valorPrevio;
    }
  }

  document.addEventListener("mouseover", function (e) {
    var el = e.target;
    if (el && el.nodeType === 1 && esEditable(el)) marcar(el);
  });
  document.addEventListener("mouseout", function (e) {
    var el = e.target;
    if (el && el.nodeType === 1 && el.hasAttribute && el.hasAttribute("data-wc-id")) desmarcar(el);
  });
  document.addEventListener("click", function (e) {
    var el = e.target;
    if (el && el.nodeType === 1 && esEditable(el) && el !== editando) {
      e.preventDefault();
      iniciarEdicion(el);
    }
  });
  document.addEventListener("keydown", function (e) {
    if (!editando) return;
    if (e.key === "Escape") { e.preventDefault(); terminarEdicion(false); }
    else if (e.key === "Enter") { e.preventDefault(); terminarEdicion(true); }
  });
  document.addEventListener("blur", function () { terminarEdicion(true); }, true);
})();
```

- [ ] **Step 2: Verificar que se sirve** (con el server de dev arrancado en algún momento)

`public/` lo sirve Next en la raíz. La verificación real es la Task 13. Aquí basta confirmar que el archivo existe en `public/`.

- [ ] **Step 3: Commit**

```bash
git add public/wc-editor.js
git commit -m "feat: script del editor (vanilla, click-to-edit + postMessage)"
```

---

## Task 10: Ruta `POST /api/projects/[id]/edits`

**Files:**
- Create: `app/api/projects/[id]/edits/route.ts`

**Interfaces:**
- Consumes: `saveEdits` (T6), `EditorError` (T4), `getDevContext`, `getStorage`, `projectStore`.

- [ ] **Step 1: Implementar la ruta**

```ts
import { NextResponse } from "next/server";
import { getDevContext } from "@/src/auth/dev-stub";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { saveEdits } from "@/src/editor/save-edits";
import { EditorError } from "@/src/editor/errors";
import type { EditOp } from "@/src/editor/apply";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getDevContext();
  let body: { ops?: EditOp[] };
  try {
    body = (await req.json()) as { ops?: EditOp[] };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!Array.isArray(body.ops)) {
    return NextResponse.json({ error: "Faltan ops" }, { status: 400 });
  }
  try {
    const { snapshotId } = await saveEdits(
      { store: projectStore, storage: getStorage() },
      { orgId, projectId: id, ops: body.ops }
    );
    return NextResponse.json({ snapshotId }, { status: 201 });
  } catch (e) {
    if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npm run typecheck`
Expected: sin errores.

```bash
git add "app/api/projects/[id]/edits"
git commit -m "feat: ruta POST /api/projects/[id]/edits"
```

---

## Task 11: Rutas de snapshots (listar + restaurar)

**Files:**
- Create: `app/api/projects/[id]/snapshots/route.ts`, `app/api/projects/[id]/snapshots/[snapshotId]/restore/route.ts`

**Interfaces:**
- Consumes: `projectStore.listSnapshots` (T5), `restoreSnapshot` (T7), `EditorError`, `getDevContext`.

- [ ] **Step 1: `GET …/snapshots`**

`app/api/projects/[id]/snapshots/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getDevContext } from "@/src/auth/dev-stub";
import { projectStore } from "@/src/repositories/projects";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getDevContext();
  const project = await projectStore.getProject(orgId, id);
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const snapshots = await projectStore.listSnapshots(orgId, id);
  return NextResponse.json({ snapshots });
}
```

- [ ] **Step 2: `POST …/snapshots/[snapshotId]/restore`**

`app/api/projects/[id]/snapshots/[snapshotId]/restore/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getDevContext } from "@/src/auth/dev-stub";
import { projectStore } from "@/src/repositories/projects";
import { restoreSnapshot } from "@/src/editor/restore";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string; snapshotId: string }> }) {
  const { id, snapshotId } = await ctx.params;
  const { orgId } = await getDevContext();
  try {
    await restoreSnapshot({ store: projectStore }, { orgId, projectId: id, snapshotId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Typecheck + commit**

Run: `npm run typecheck`
Expected: sin errores.

```bash
git add "app/api/projects/[id]/snapshots"
git commit -m "feat: rutas GET snapshots + POST restore"
```

---

## Task 12: Modo edición en `PreviewPane`

**Files:**
- Modify: `app/projects/[id]/PreviewPane.tsx`

**Interfaces:**
- Consumes: `POST /api/projects/[id]/edits` (T10), `GET …/snapshots` + `POST …/restore` (T11), preview `?edit=1` (T8).

> Verificación visual en la Task 13.

- [ ] **Step 1: Reescribir `app/projects/[id]/PreviewPane.tsx`**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";

type EditOp = { page: string; nodeId: number; kind: "text"; value: string };
type SnapshotInfo = { id: string; tipo: string; parentId: string | null; createdAt: string; esActual: boolean };

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

  const relPath = actual === entryPath ? "" : actual;
  const src = `/api/projects/${projectId}/preview/${relPath}${editMode ? "?edit=1" : ""}#${recarga}`;

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      const data = e.data as { type?: string; op?: EditOp };
      if (data?.type !== "wc-edit" || !data.op) return;
      setOps((prev) => {
        const next = new Map(prev);
        next.set(`${data.op!.page}#${data.op!.nodeId}`, data.op!);
        return next;
      });
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

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
    const res = await fetch(`/api/projects/${projectId}/edits`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ops: [...ops.values()] }),
    });
    setGuardando(false);
    if (res.ok) { setOps(new Map()); setEditMode(false); setRecarga((n) => n + 1); setSnapshots(null); }
    else { const d = await res.json().catch(() => ({})); alert(d.error ?? "Error al guardar"); }
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
            <span className="text-xs text-gray-400">Pasa el ratón sobre un texto y haz click para editarlo</span>
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

- [ ] **Step 2: Typecheck + commit**

Run: `npm run typecheck`
Expected: sin errores.

```bash
git add "app/projects/[id]/PreviewPane.tsx"
git commit -m "feat: modo edición en PreviewPane (toolbar, postMessage, historial)"
```

---

## Task 13: Verificación end-to-end (servidor + visual)

**Files:** ninguno. Prerrequisito: `.env.local` con `DATABASE_URL` (transaction pooler 6543), esquema ya en Supabase (Incremento 1).

- [ ] **Step 1: Suite + typecheck**

Run: `npm test`
Expected: todos verdes (incluye walk/annotate/apply/save-edits/restore/resolve).
Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 2: Arrancar la app**

Run (PowerShell, en background): `npm run dev`
Espera a que responda `http://localhost:3000`.

- [ ] **Step 3: e2e de servidor (guardar = lo que hace el botón Guardar)**

Con un script Node (en el scratchpad), contra la app viva:
1. Importa un ZIP de prueba (POST `/api/projects`) → `id`.
2. `GET /api/projects/<id>/preview/?edit=1` → confirma que el HTML contiene `data-wc-id="` y `<script src="/wc-editor.js"`.
3. `GET /api/projects/<id>` para conocer `entryPath` y, del HTML de edición, localiza el `data-wc-id` de un `<h1>`/`<p>`.
4. `POST /api/projects/<id>/edits` con `{ ops: [{ page: "<entry>", nodeId: <id>, kind: "text", value: "TEXTO EDITADO" }] }` → 201 `{ snapshotId }`.
5. `GET /api/projects/<id>/preview/` (normal) → el HTML servido contiene "TEXTO EDITADO" y **NO** contiene `data-wc-id`.
6. Inspecciona en disco `data/storage/projects/<id>/snapshots/<snapshotId>/<entry>`: contiene "TEXTO EDITADO", **sin `data-wc-id`**, y el resto del archivo es **idéntico** al original salvo ese texto.
7. `GET /api/projects/<id>/snapshots` → hay 2 (import + edit), el edit es `esActual`.
8. `POST /api/projects/<id>/snapshots/<importSnapshotId>/restore` → `GET preview` vuelve a mostrar el texto original.

Todos los pasos deben pasar.

- [ ] **Step 4: Verificación visual (modo edición)**

Abre `http://localhost:3000/projects/<id>`, pulsa **Editar**, pasa el ratón sobre un titular (debe resaltarse), haz click, cámbialo, **Guardar**. El preview se recarga con el cambio. **Captura de pantalla** del modo edición (texto resaltado) y del resultado guardado.

- [ ] **Step 5: Commit de cierre**

```bash
git add -A
git commit -m "chore: verificación e2e del Incremento 2 (editor de texto)"
```

---

## Notas de ejecución

- **Orden:** T1→T2→T3 (lógica pura), T4+T5 (store; T4 deja typecheck rojo a propósito, T5 lo cierra y commitea ambas), T6→T7 (orquestadores), T8 (preview edit), T9 (script), T10→T11 (rutas), T12 (UI), T13 (e2e).
- Las tareas de lógica pura (T1–T3, T6–T8) llevan tests con fakes y no tocan BD ni red.
- T5, T10–T12 se ejercitan en la verificación e2e (T13), que necesita Supabase + app viva.
- **Atención cruzada (revisores):** el invariante clave es que `annotateForEdit` y `applyTextEdits` usan el mismo `walkElementsInOrder` → el `data-wc-id` que ve el navegador apunta al mismo nodo que edita el servidor. Cualquier divergencia en el recorrido rompe la correspondencia.
```
