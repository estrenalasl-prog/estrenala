# Wordclicks — Incremento 1 (Importar ZIP → Preview) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Subir un ZIP de una web estática y verla renderizada fiel en el panel, como un proyecto dentro de una organización.

**Architecture:** App Next.js (App Router) nueva llamada `wordclicks`. La lógica de import y de preview vive en funciones puras inyectables (DI) que dependen de dos seams: `StorageAdapter` (impl. local de disco ahora) y `ProjectStore` (impl. Drizzle/Supabase). El preview sirve los archivos del proyecto por una ruta de Next y **reescribe el HTML on-the-fly sin mutar el archivo almacenado**. Todo lo arriesgado (descompresión, detección de entrada, reescritura) se construye con TDD; la UI se verifica visualmente.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript, Tailwind v4, Drizzle ORM + `postgres` (postgres-js) sobre Supabase Postgres, `fflate` para unzip, Vitest para tests.

## Global Constraints

- Node.js 22+ (se usa `crypto.randomUUID()` global y `fetch` nativo).
- Next.js 16, App Router. TypeScript en modo `strict`.
- Tailwind v4 vía `@tailwindcss/postcss`.
- **Sin framework dentro del `<iframe>`** (regla del brief; el script del editor llegará en increment 2).
- **El HTML almacenado debe quedar byte-idéntico al subido.** Toda reescritura es solo en la respuesta del preview.
- Copys de la UI **en español**.
- **Sin IA en este incremento** (el blog es el increment 4). Render determinista.
- Persistencia: Supabase Postgres vía `DATABASE_URL` en `.env.local` (prerrequisito que aporta el founder).
- Esquema de claves de storage (verbatim): `projects/<projectId>/snapshots/<snapshotId>/<ruta>` y `projects/<projectId>/assets/<assetId>.<ext>`.
- Spec de referencia: `docs/superpowers/specs/2026-06-25-studio-incremento-1-import-preview-design.md`.

---

## Mapa de archivos (qué crea cada uno)

```
package.json, tsconfig.json, next.config.ts, postcss.config.mjs,
  app/globals.css, drizzle.config.ts, vitest.config.ts, .env.example   (Task 1)
app/layout.tsx, app/page.tsx                                            (Task 1 placeholder; reemplazados en 16/17)
src/db/schema.ts            — tablas Drizzle (pg)                       (Task 2)
src/db/client.ts            — cliente postgres-js + drizzle            (Task 2)
src/storage/keys.ts         — helpers de claves (puro)                 (Task 3)
src/storage/content-type.ts — ext → content-type (puro)               (Task 4)
src/storage/types.ts        — interface StorageAdapter                 (Task 5)
src/storage/local-fs.ts     — impl. de disco + listHtmlPages           (Task 5)
src/import/unzip.ts         — unzip + zip-slip + normalizar raíz       (Task 6)
src/import/validate.ts      — filtrado de extensiones seguras          (Task 7)
src/import/entry.ts         — detección de entrada por defecto         (Task 8)
src/import/process-zip.ts   — processZip (orquesta 6/7/8)              (Task 8)
src/preview/rewrite.ts      — rewriteHtml (base + root-absolutas)      (Task 9)
src/repositories/types.ts   — interface ProjectStore + tipos fila      (Task 10)
src/repositories/projects.ts— impl. Drizzle de ProjectStore           (Task 11)
src/auth/dev-stub.ts        — getDevContext (org+user fijos)           (Task 12)
src/import/import-project.ts— orquestador importProject (DI)           (Task 13)
app/api/projects/route.ts   — POST import (wrapper fino)               (Task 13)
src/preview/resolve.ts      — resolvePreview (DI)                      (Task 14)
app/api/projects/[id]/preview/[[...path]]/route.ts — GET preview       (Task 14)
src/projects/entry.ts       — setEntryPath + listPages (DI)            (Task 15)
app/api/projects/[id]/route.ts — PATCH entry_path, GET pages           (Task 15)
app/page.tsx + app/_components/ImportDropzone.tsx — dashboard          (Task 16)
app/projects/[id]/page.tsx + app/projects/[id]/PreviewPane.tsx         (Task 17)
src/tests/**                — tests Vitest                             (varias)
```

---

## Task 1: Scaffold de la app `wordclicks` + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `vitest.config.ts`, `.env.example`, `src/tests/smoke.test.ts`

**Interfaces:**
- Produces: scripts `dev`, `build`, `test`, `typecheck`; alias `@/*` → raíz.

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "wordclicks",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "drizzle-orm": "^0.45.2",
    "fflate": "^0.8.2",
    "next": "^16.2.9",
    "postgres": "^3.4.5",
    "react": "^19.2.7",
    "react-dom": "^19.2.7",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.3.0",
    "@types/node": "^25.9.3",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "drizzle-kit": "^0.31.1",
    "tailwindcss": "^4.3.0",
    "typescript": "^6.0.3",
    "vitest": "^4.1.8"
  }
}
```

- [ ] **Step 2: Crear `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "Creador de Blog"]
}
```

- [ ] **Step 3: Crear configs de Next/Tailwind/Vitest**

`next.config.ts`:
```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {};
export default nextConfig;
```

`postcss.config.mjs`:
```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

`app/globals.css`:
```css
@import "tailwindcss";
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: { environment: "node", include: ["src/tests/**/*.test.ts"] },
});
```

- [ ] **Step 4: Crear layout/página placeholder y `.env.example`**

`app/layout.tsx`:
```tsx
import "./globals.css";
export const metadata = { title: "Wordclicks" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
```

`app/page.tsx`:
```tsx
export default function Home() {
  return <main className="p-8 text-2xl font-semibold">Wordclicks</main>;
}
```

`.env.example`:
```
# Connection string del proyecto Supabase (Project Settings → Database → Connection string → URI)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
# Carpeta local del StorageAdapter (impl. de disco). Por defecto data/storage
STORAGE_DIR=data/storage
```

- [ ] **Step 5: Escribir el smoke test**

`src/tests/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";
describe("smoke", () => {
  it("el runner funciona", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Instalar y verificar**

Run: `npm install`
Run: `npm test`
Expected: PASS (1 test, "el runner funciona").
Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold de la app wordclicks (Next 16 + Tailwind + Vitest)"
```

---

## Task 2: Esquema de BD (Drizzle/Postgres) + cliente

**Files:**
- Create: `src/db/schema.ts`, `src/db/client.ts`, `drizzle.config.ts`, `src/tests/schema.test.ts`

**Interfaces:**
- Produces: tablas `organizations, users, memberships, projects, snapshots, assets`; `db` (instancia Drizzle).
- Nota de integridad: `projects.current_snapshot_id` es un `uuid` **sin FK** (evita el ciclo projects↔snapshots); la integridad se gestiona en app.

- [ ] **Step 1: Escribir el test del esquema**

`src/tests/schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import * as schema from "@/src/db/schema";
import { getTableConfig } from "drizzle-orm/pg-core";

describe("schema", () => {
  it("define las 6 tablas con sus nombres", () => {
    expect(getTableConfig(schema.organizations).name).toBe("organizations");
    expect(getTableConfig(schema.users).name).toBe("users");
    expect(getTableConfig(schema.memberships).name).toBe("memberships");
    expect(getTableConfig(schema.projects).name).toBe("projects");
    expect(getTableConfig(schema.snapshots).name).toBe("snapshots");
    expect(getTableConfig(schema.assets).name).toBe("assets");
  });

  it("projects tiene columna entry_path y current_snapshot_id", () => {
    const cols = getTableConfig(schema.projects).columns.map((c) => c.name);
    expect(cols).toContain("entry_path");
    expect(cols).toContain("current_snapshot_id");
  });
});
```

- [ ] **Step 2: Ejecutar el test (debe fallar)**

Run: `npx vitest run src/tests/schema.test.ts`
Expected: FAIL ("Cannot find module '@/src/db/schema'").

- [ ] **Step 3: Escribir `src/db/schema.ts`**

```ts
import { pgTable, uuid, text, timestamp, jsonb, integer, unique } from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  plan: text("plan").notNull().default("free"),
  usoJson: jsonb("uso_json").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  nombre: text("nombre").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  rol: text("rol").notNull().default("owner"),
}, (t) => [unique().on(t.orgId, t.userId)]);

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  nombre: text("nombre").notNull(),
  subdominio: text("subdominio"),
  dominio: text("dominio"),
  entryPath: text("entry_path").notNull(),
  currentSnapshotId: uuid("current_snapshot_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const snapshots = pgTable("snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  parentId: uuid("parent_id"),
  tipo: text("tipo").notNull(),
  storagePrefix: text("storage_prefix").notNull(),
  operacionesJson: jsonb("operaciones_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  storageKey: text("storage_key").notNull(),
  contentType: text("content_type").notNull(),
  bytes: integer("bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 4: Escribir `src/db/client.ts`**

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL en .env.local");

// prepare:false recomendado con el pooler de Supabase.
const sql = postgres(url, { prepare: false });
export const db = drizzle(sql, { schema });
export type DB = typeof db;
```

- [ ] **Step 5: Escribir `drizzle.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Step 6: Ejecutar el test (debe pasar)**

Run: `npx vitest run src/tests/schema.test.ts`
Expected: PASS (2 tests). (No toca la BD: solo inspecciona la definición.)

- [ ] **Step 7: Sincronizar el esquema con Supabase**

Prerrequisito: `.env.local` con `DATABASE_URL` real. `drizzle-kit` (CLI) **no** lee `.env.local`
automáticamente (solo Next lo hace en runtime), así que hay que pasar la variable en el shell.

Run (PowerShell): `$env:DATABASE_URL="<connection-string-de-supabase>"; npx drizzle-kit push`
Run (bash): `DATABASE_URL="<connection-string-de-supabase>" npx drizzle-kit push`
Expected: drizzle-kit reporta la creación de 6 tablas; responder "yes" si pregunta.

- [ ] **Step 8: Commit**

```bash
git add src/db drizzle.config.ts src/tests/schema.test.ts
git commit -m "feat: esquema Drizzle (orgs/users/memberships/projects/snapshots/assets) + cliente Supabase"
```

---

## Task 3: Helpers de claves de storage (puro)

**Files:**
- Create: `src/storage/keys.ts`, `src/tests/keys.test.ts`

**Interfaces:**
- Produces: `snapshotPrefix(projectId, snapshotId): string`, `assetKey(projectId, assetId, ext): string`.

- [ ] **Step 1: Escribir el test**

`src/tests/keys.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { snapshotPrefix, assetKey } from "@/src/storage/keys";

describe("keys", () => {
  it("snapshotPrefix termina en barra", () => {
    expect(snapshotPrefix("p1", "s1")).toBe("projects/p1/snapshots/s1/");
  });
  it("assetKey usa la extensión", () => {
    expect(assetKey("p1", "a1", "webp")).toBe("projects/p1/assets/a1.webp");
  });
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `npx vitest run src/tests/keys.test.ts`
Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Implementar `src/storage/keys.ts`**

```ts
export function snapshotPrefix(projectId: string, snapshotId: string): string {
  return `projects/${projectId}/snapshots/${snapshotId}/`;
}

export function assetKey(projectId: string, assetId: string, ext: string): string {
  return `projects/${projectId}/assets/${assetId}.${ext}`;
}
```

- [ ] **Step 4: Ejecutar (debe pasar)**

Run: `npx vitest run src/tests/keys.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/storage/keys.ts src/tests/keys.test.ts
git commit -m "feat: helpers de claves de storage"
```

---

## Task 4: Mapa content-type por extensión (puro)

**Files:**
- Create: `src/storage/content-type.ts`, `src/tests/content-type.test.ts`

**Interfaces:**
- Produces: `contentTypeFor(pathOrName: string): string`.

- [ ] **Step 1: Escribir el test**

`src/tests/content-type.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { contentTypeFor } from "@/src/storage/content-type";

describe("contentTypeFor", () => {
  it("html", () => expect(contentTypeFor("index.html")).toBe("text/html; charset=utf-8"));
  it("css", () => expect(contentTypeFor("a/b/style.css")).toBe("text/css; charset=utf-8"));
  it("js", () => expect(contentTypeFor("app.js")).toBe("text/javascript; charset=utf-8"));
  it("png", () => expect(contentTypeFor("img/x.PNG")).toBe("image/png"));
  it("woff2", () => expect(contentTypeFor("f.woff2")).toBe("font/woff2"));
  it("desconocido", () => expect(contentTypeFor("x.bin")).toBe("application/octet-stream"));
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `npx vitest run src/tests/content-type.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/storage/content-type.ts`**

```ts
const TIPOS: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  txt: "text/plain; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  map: "application/json; charset=utf-8",
};

export function contentTypeFor(pathOrName: string): string {
  const ext = pathOrName.split(".").pop()?.toLowerCase() ?? "";
  return TIPOS[ext] ?? "application/octet-stream";
}
```

- [ ] **Step 4: Ejecutar (debe pasar)**

Run: `npx vitest run src/tests/content-type.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/storage/content-type.ts src/tests/content-type.test.ts
git commit -m "feat: mapa content-type por extensión"
```

---

## Task 5: `StorageAdapter` (interface + impl. de disco + listHtmlPages)

**Files:**
- Create: `src/storage/types.ts`, `src/storage/local-fs.ts`, `src/tests/local-fs.test.ts`

**Interfaces:**
- Consumes: `contentTypeFor` (Task 4).
- Produces:
  - `interface StorageAdapter { put(key, body, contentType?): Promise<void>; get(key): Promise<{ body: Buffer; contentType: string } | null>; list(prefix): Promise<string[]>; delete(key): Promise<void>; }`
  - `class LocalFsStorage implements StorageAdapter` (constructor `(rootDir: string)`).
  - `listHtmlPages(storage: StorageAdapter, prefix: string): Promise<string[]>` (rutas relativas al prefix, solo `.html`/`.htm`).

- [ ] **Step 1: Escribir el test**

`src/tests/local-fs.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { LocalFsStorage, listHtmlPages } from "@/src/storage/local-fs";

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wc-store-"));
}

describe("LocalFsStorage", () => {
  let root: string;
  let s: LocalFsStorage;
  beforeEach(() => {
    root = tmpDir();
    s = new LocalFsStorage(root);
  });

  it("put/get round-trip con content-type inferido", async () => {
    await s.put("projects/p/snapshots/s/index.html", Buffer.from("<h1>Hola</h1>"));
    const got = await s.get("projects/p/snapshots/s/index.html");
    expect(got?.body.toString()).toBe("<h1>Hola</h1>");
    expect(got?.contentType).toBe("text/html; charset=utf-8");
  });

  it("get de clave inexistente devuelve null", async () => {
    expect(await s.get("no/existe.css")).toBeNull();
  });

  it("list devuelve claves bajo el prefijo", async () => {
    await s.put("projects/p/snapshots/s/index.html", "a");
    await s.put("projects/p/snapshots/s/css/app.css", "b");
    await s.put("projects/p/snapshots/OTRO/x.html", "c");
    const claves = await s.list("projects/p/snapshots/s/");
    expect(claves.sort()).toEqual([
      "projects/p/snapshots/s/css/app.css",
      "projects/p/snapshots/s/index.html",
    ]);
  });

  it("listHtmlPages filtra html y devuelve rutas relativas", async () => {
    const prefix = "projects/p/snapshots/s/";
    await s.put(prefix + "index.html", "a");
    await s.put(prefix + "about/team.html", "b");
    await s.put(prefix + "css/app.css", "c");
    const pages = await listHtmlPages(s, prefix);
    expect(pages.sort()).toEqual(["about/team.html", "index.html"]);
  });

  it("delete borra la clave", async () => {
    await s.put("a/b.txt", "x");
    await s.delete("a/b.txt");
    expect(await s.get("a/b.txt")).toBeNull();
  });
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `npx vitest run src/tests/local-fs.test.ts`
Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Implementar `src/storage/types.ts`**

```ts
export interface StorageAdapter {
  put(key: string, body: Buffer | string, contentType?: string): Promise<void>;
  get(key: string): Promise<{ body: Buffer; contentType: string } | null>;
  list(prefix: string): Promise<string[]>;
  delete(key: string): Promise<void>;
}
```

- [ ] **Step 4: Implementar `src/storage/local-fs.ts`**

```ts
import fs from "node:fs/promises";
import path from "node:path";
import { contentTypeFor } from "./content-type";
import type { StorageAdapter } from "./types";

export class LocalFsStorage implements StorageAdapter {
  constructor(private rootDir: string) {}

  private full(key: string): string {
    return path.join(this.rootDir, key);
  }

  async put(key: string, body: Buffer | string): Promise<void> {
    const full = this.full(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
  }

  async get(key: string): Promise<{ body: Buffer; contentType: string } | null> {
    try {
      const body = await fs.readFile(this.full(key));
      return { body, contentType: contentTypeFor(key) };
    } catch {
      return null;
    }
  }

  async list(prefix: string): Promise<string[]> {
    const out: string[] = [];
    const walk = async (dir: string) => {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const abs = path.join(dir, e.name);
        if (e.isDirectory()) await walk(abs);
        else {
          const key = path.relative(this.rootDir, abs).split(path.sep).join("/");
          if (key.startsWith(prefix)) out.push(key);
        }
      }
    };
    await walk(this.rootDir);
    return out;
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.full(key), { force: true });
  }
}

export async function listHtmlPages(
  storage: StorageAdapter,
  prefix: string
): Promise<string[]> {
  const claves = await storage.list(prefix);
  return claves
    .map((k) => k.slice(prefix.length))
    .filter((rel) => /\.html?$/i.test(rel));
}
```

- [ ] **Step 5: Ejecutar (debe pasar)**

Run: `npx vitest run src/tests/local-fs.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/storage/types.ts src/storage/local-fs.ts src/tests/local-fs.test.ts
git commit -m "feat: StorageAdapter + impl. de disco + listHtmlPages"
```

---

## Task 6: Unzip + protección zip-slip + normalización de carpeta raíz

**Files:**
- Create: `src/import/unzip.ts`, `src/tests/unzip.test.ts`

**Interfaces:**
- Produces:
  - `type ZipFile = { path: string; bytes: Buffer }`
  - `class ImportError extends Error {}`
  - `unzipSafe(zip: Buffer): ZipFile[]` — descomprime, **lanza `ImportError`** ante rutas con `..` o absolutas (zip-slip), aplica límites (≤2000 archivos, ≤50 MB descomprimidos), y **normaliza** una carpeta raíz envolvente (si todas las entradas comparten un primer segmento común, lo quita). Devuelve rutas posix relativas.

- [ ] **Step 1: Escribir el test**

`src/tests/unzip.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { unzipSafe, ImportError } from "@/src/import/unzip";

function makeZip(files: Record<string, string>): Buffer {
  const data: Record<string, Uint8Array> = {};
  for (const [k, v] of Object.entries(files)) data[k] = strToU8(v);
  return Buffer.from(zipSync(data));
}

describe("unzipSafe", () => {
  it("descomprime rutas y contenidos", () => {
    const zip = makeZip({ "index.html": "<h1>x</h1>", "css/app.css": "body{}" });
    const files = unzipSafe(zip);
    const map = Object.fromEntries(files.map((f) => [f.path, f.bytes.toString()]));
    expect(map["index.html"]).toBe("<h1>x</h1>");
    expect(map["css/app.css"]).toBe("body{}");
  });

  it("quita la carpeta raíz envolvente común", () => {
    const zip = makeZip({ "mi-web/index.html": "a", "mi-web/css/app.css": "b" });
    const paths = unzipSafe(zip).map((f) => f.path).sort();
    expect(paths).toEqual(["css/app.css", "index.html"]);
  });

  it("no quita prefijo si no es común a todo", () => {
    const zip = makeZip({ "a/index.html": "x", "b/style.css": "y" });
    const paths = unzipSafe(zip).map((f) => f.path).sort();
    expect(paths).toEqual(["a/index.html", "b/style.css"]);
  });

  it("rechaza zip-slip (..)", () => {
    const zip = makeZip({ "../evil.html": "x" });
    expect(() => unzipSafe(zip)).toThrow(ImportError);
  });
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `npx vitest run src/tests/unzip.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/import/unzip.ts`**

```ts
import { unzipSync } from "fflate";

export type ZipFile = { path: string; bytes: Buffer };

export class ImportError extends Error {}

const MAX_ARCHIVOS = 2000;
const MAX_BYTES = 50 * 1024 * 1024;

function esRutaInsegura(p: string): boolean {
  if (p.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(p)) return true;
  return p.split(/[\\/]/).includes("..");
}

function normalizarRaiz(files: ZipFile[]): ZipFile[] {
  if (files.length === 0) return files;
  const primerSeg = (p: string) => p.split("/")[0];
  const comun = primerSeg(files[0].path);
  const todosComparten =
    comun !== "" &&
    files.every((f) => f.path.startsWith(comun + "/"));
  if (!todosComparten) return files;
  return files.map((f) => ({ ...f, path: f.path.slice(comun.length + 1) }));
}

export function unzipSafe(zip: Buffer): ZipFile[] {
  const entries = unzipSync(new Uint8Array(zip));
  const files: ZipFile[] = [];
  let total = 0;
  for (const [nombre, data] of Object.entries(entries)) {
    if (nombre.endsWith("/")) continue; // carpeta
    const posix = nombre.split("\\").join("/");
    if (esRutaInsegura(posix)) {
      throw new ImportError(`Ruta no permitida en el ZIP: "${nombre}"`);
    }
    total += data.length;
    if (files.length + 1 > MAX_ARCHIVOS) {
      throw new ImportError(`El ZIP supera el máximo de ${MAX_ARCHIVOS} archivos`);
    }
    if (total > MAX_BYTES) {
      throw new ImportError("El ZIP descomprimido supera 50 MB");
    }
    files.push({ path: posix, bytes: Buffer.from(data) });
  }
  if (files.length === 0) throw new ImportError("El ZIP está vacío");
  return normalizarRaiz(files);
}
```

- [ ] **Step 4: Ejecutar (debe pasar)**

Run: `npx vitest run src/tests/unzip.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/import/unzip.ts src/tests/unzip.test.ts
git commit -m "feat: unzip seguro (zip-slip, límites, normalización de raíz)"
```

---

## Task 7: Validación de extensiones seguras

**Files:**
- Create: `src/import/validate.ts`, `src/tests/validate.test.ts`

**Interfaces:**
- Consumes: `ZipFile` (Task 6).
- Produces: `filtrarSeguros(files: ZipFile[]): { seguros: ZipFile[]; ignorados: string[] }`.

- [ ] **Step 1: Escribir el test**

`src/tests/validate.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { filtrarSeguros } from "@/src/import/validate";

describe("filtrarSeguros", () => {
  it("conserva extensiones web y reporta las ignoradas", () => {
    const files = [
      { path: "index.html", bytes: Buffer.from("a") },
      { path: "css/app.css", bytes: Buffer.from("b") },
      { path: "img/x.png", bytes: Buffer.from("c") },
      { path: "raro.exe", bytes: Buffer.from("d") },
      { path: "notas.docx", bytes: Buffer.from("e") },
    ];
    const { seguros, ignorados } = filtrarSeguros(files);
    expect(seguros.map((f) => f.path).sort()).toEqual([
      "css/app.css", "img/x.png", "index.html",
    ]);
    expect(ignorados.sort()).toEqual(["notas.docx", "raro.exe"]);
  });
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `npx vitest run src/tests/validate.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/import/validate.ts`**

```ts
import type { ZipFile } from "./unzip";

const SEGURAS = new Set([
  "html", "htm", "css", "js", "mjs", "json", "svg",
  "png", "jpg", "jpeg", "gif", "webp", "avif", "ico",
  "woff", "woff2", "ttf", "otf", "eot",
  "txt", "xml", "map", "webmanifest", "csv",
]);

function ext(p: string): string {
  return p.split(".").pop()?.toLowerCase() ?? "";
}

export function filtrarSeguros(files: ZipFile[]): {
  seguros: ZipFile[];
  ignorados: string[];
} {
  const seguros: ZipFile[] = [];
  const ignorados: string[] = [];
  for (const f of files) {
    if (SEGURAS.has(ext(f.path))) seguros.push(f);
    else ignorados.push(f.path);
  }
  return { seguros, ignorados };
}
```

- [ ] **Step 4: Ejecutar (debe pasar)**

Run: `npx vitest run src/tests/validate.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/import/validate.ts src/tests/validate.test.ts
git commit -m "feat: filtrado de extensiones seguras del import"
```

---

## Task 8: Detección de entrada por defecto + `processZip`

**Files:**
- Create: `src/import/entry.ts`, `src/import/process-zip.ts`, `src/tests/entry.test.ts`, `src/tests/process-zip.test.ts`

**Interfaces:**
- Consumes: `unzipSafe`, `ImportError`, `ZipFile` (T6); `filtrarSeguros` (T7).
- Produces:
  - `detectarEntrada(paths: string[]): string` — (a) `index.html` menos profundo; si no, (b) `.html` menos profundo; si no hay ninguno **lanza `ImportError`**.
  - `processZip(zip: Buffer): { files: ZipFile[]; entryPath: string; ignorados: string[] }`.

- [ ] **Step 1: Escribir el test de `detectarEntrada`**

`src/tests/entry.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { detectarEntrada } from "@/src/import/entry";
import { ImportError } from "@/src/import/unzip";

describe("detectarEntrada", () => {
  it("prefiere index.html menos profundo", () => {
    expect(detectarEntrada(["a/index.html", "index.html", "x.html"])).toBe("index.html");
  });
  it("si no hay index.html, el .html menos profundo", () => {
    expect(detectarEntrada(["sub/a.html", "home.html"])).toBe("home.html");
  });
  it("sin ningún html lanza ImportError", () => {
    expect(() => detectarEntrada(["css/app.css", "img/x.png"])).toThrow(ImportError);
  });
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `npx vitest run src/tests/entry.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/import/entry.ts`**

```ts
import { ImportError } from "./unzip";

const profundidad = (p: string) => p.split("/").length;

export function detectarEntrada(paths: string[]): string {
  const htmls = paths.filter((p) => /\.html?$/i.test(p));
  if (htmls.length === 0) {
    throw new ImportError("El ZIP no contiene ninguna página HTML");
  }
  const ordenar = (lista: string[]) =>
    [...lista].sort((a, b) => profundidad(a) - profundidad(b) || a.localeCompare(b));

  const indexes = ordenar(htmls.filter((p) => /(^|\/)index\.html?$/i.test(p)));
  if (indexes.length > 0) return indexes[0];
  return ordenar(htmls)[0];
}
```

- [ ] **Step 4: Ejecutar (debe pasar)**

Run: `npx vitest run src/tests/entry.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Escribir el test de `processZip`**

`src/tests/process-zip.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { processZip } from "@/src/import/process-zip";
import { ImportError } from "@/src/import/unzip";

function makeZip(files: Record<string, string>): Buffer {
  const data: Record<string, Uint8Array> = {};
  for (const [k, v] of Object.entries(files)) data[k] = strToU8(v);
  return Buffer.from(zipSync(data));
}

describe("processZip", () => {
  it("devuelve archivos seguros, entrada e ignorados", () => {
    const zip = makeZip({
      "mi-web/index.html": "<h1>Hola</h1>",
      "mi-web/css/app.css": "body{}",
      "mi-web/notas.exe": "x",
    });
    const r = processZip(zip);
    expect(r.entryPath).toBe("index.html");
    expect(r.files.map((f) => f.path).sort()).toEqual(["css/app.css", "index.html"]);
    expect(r.ignorados).toEqual(["notas.exe"]);
  });

  it("lanza si no hay html", () => {
    const zip = makeZip({ "css/app.css": "body{}" });
    expect(() => processZip(zip)).toThrow(ImportError);
  });
});
```

- [ ] **Step 6: Ejecutar (debe fallar)**

Run: `npx vitest run src/tests/process-zip.test.ts`
Expected: FAIL.

- [ ] **Step 7: Implementar `src/import/process-zip.ts`**

```ts
import { unzipSafe, type ZipFile } from "./unzip";
import { filtrarSeguros } from "./validate";
import { detectarEntrada } from "./entry";

export function processZip(zip: Buffer): {
  files: ZipFile[];
  entryPath: string;
  ignorados: string[];
} {
  const todos = unzipSafe(zip);
  const { seguros, ignorados } = filtrarSeguros(todos);
  const entryPath = detectarEntrada(seguros.map((f) => f.path));
  return { files: seguros, entryPath, ignorados };
}
```

- [ ] **Step 8: Ejecutar (debe pasar)**

Run: `npx vitest run src/tests/process-zip.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add src/import/entry.ts src/import/process-zip.ts src/tests/entry.test.ts src/tests/process-zip.test.ts
git commit -m "feat: detección de entrada y processZip (orquesta unzip+validate+entry)"
```

---

## Task 9: Reescritura de HTML del preview (base + root-absolutas)

**Files:**
- Create: `src/preview/rewrite.ts`, `src/tests/rewrite.test.ts`

**Interfaces:**
- Produces: `rewriteHtml(html: string, baseHref: string): string` — reescribe `src`/`href` y `url(...)` root-absolutos (que empiezan por un solo `/`) prefijándolos con `baseHref`, e inyecta `<base href="${baseHref}">` al inicio del `<head>` (o del documento si no hay head). No toca `//`, `http(s)://`, `#`, `mailto:`, `tel:`, ni rutas relativas.

- [ ] **Step 1: Escribir el test**

`src/tests/rewrite.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { rewriteHtml } from "@/src/preview/rewrite";

const BASE = "/api/projects/p1/preview/";

describe("rewriteHtml", () => {
  it("inyecta <base> dentro del head", () => {
    const out = rewriteHtml("<html><head><title>x</title></head><body></body></html>", BASE);
    expect(out).toContain(`<head><base href="${BASE}">`);
  });

  it("reescribe href/src root-absolutos", () => {
    const html = `<link href="/css/app.css"><img src="/img/x.png"><a href="/about.html">`;
    const out = rewriteHtml(html, BASE);
    expect(out).toContain(`href="${BASE}css/app.css"`);
    expect(out).toContain(`src="${BASE}img/x.png"`);
    expect(out).toContain(`href="${BASE}about.html"`);
  });

  it("no toca rutas relativas, externas, protocolo-relativas ni anclas", () => {
    const html = `<img src="img/y.png"><a href="https://x.com"><a href="//cdn/a.js"><a href="#top"><a href="mailto:a@b.c">`;
    const out = rewriteHtml(html, BASE);
    expect(out).toContain(`src="img/y.png"`);
    expect(out).toContain(`href="https://x.com"`);
    expect(out).toContain(`href="//cdn/a.js"`);
    expect(out).toContain(`href="#top"`);
    expect(out).toContain(`href="mailto:a@b.c"`);
  });

  it("reescribe url(/...) en estilos", () => {
    const html = `<div style="background:url(/img/bg.jpg)"></div>`;
    const out = rewriteHtml(html, BASE);
    expect(out).toContain(`url(${BASE}img/bg.jpg)`);
  });

  it("documento sin head: inyecta base al inicio", () => {
    const out = rewriteHtml("<body><p>x</p></body>", BASE);
    expect(out.startsWith(`<base href="${BASE}">`)).toBe(true);
  });
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `npx vitest run src/tests/rewrite.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/preview/rewrite.ts`**

```ts
// Reescritura ligera, solo para el preview. NO muta el archivo almacenado.
// Limitación conocida (increment 1): no procesa `srcset` ni CSS en archivos .css
// externos (esos cargan por su propia ruta de preview y usan rutas relativas o se
// sirven tal cual). Cubre el caso mayoritario: src/href/url() root-absolutos.
export function rewriteHtml(html: string, baseHref: string): string {
  // 1) Reescribir src/href root-absolutos: un solo "/" no seguido de otro "/".
  let out = html.replace(
    /(\s(?:src|href)\s*=\s*["'])\/(?!\/)/gi,
    (_m, prefijo: string) => prefijo + baseHref
  );

  // 2) Reescribir url(/...) en estilos inline y <style>.
  out = out.replace(
    /url\(\s*(['"]?)\/(?!\/)/gi,
    (_m, comilla: string) => `url(${comilla}${baseHref}`
  );

  // 3) Inyectar <base> (después de reescribir, para no tocar su propia href).
  const baseTag = `<base href="${baseHref}">`;
  const headMatch = out.match(/<head[^>]*>/i);
  if (headMatch) {
    const idx = out.indexOf(headMatch[0]) + headMatch[0].length;
    return out.slice(0, idx) + baseTag + out.slice(idx);
  }
  return baseTag + out;
}
```

- [ ] **Step 4: Ejecutar (debe pasar)**

Run: `npx vitest run src/tests/rewrite.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/preview/rewrite.ts src/tests/rewrite.test.ts
git commit -m "feat: reescritura de HTML del preview (base + root-absolutas)"
```

---

## Task 10: `ProjectStore` (interface + tipos de fila)

**Files:**
- Create: `src/repositories/types.ts`

**Interfaces:**
- Produces:
  - `type ProjectRow = { id; orgId; nombre; entryPath; currentSnapshotId: string | null; createdAt: string }`
  - `type SnapshotRow = { id; projectId; storagePrefix; tipo }`
  - `interface ProjectStore { createProjectWithSnapshot(input): Promise<{ projectId: string }>; getProject(orgId, projectId): Promise<ProjectRow | null>; listProjects(orgId): Promise<ProjectRow[]>; setEntryPath(orgId, projectId, entryPath): Promise<void>; getCurrentSnapshot(projectId): Promise<SnapshotRow | null>; }`

- [ ] **Step 1: Crear `src/repositories/types.ts`**

```ts
export type ProjectRow = {
  id: string;
  orgId: string;
  nombre: string;
  entryPath: string;
  currentSnapshotId: string | null;
  createdAt: string;
};

export type SnapshotRow = {
  id: string;
  projectId: string;
  storagePrefix: string;
  tipo: string;
};

export type CreateProjectInput = {
  projectId: string;
  snapshotId: string;
  orgId: string;
  nombre: string;
  entryPath: string;
  storagePrefix: string;
};

export interface ProjectStore {
  createProjectWithSnapshot(input: CreateProjectInput): Promise<{ projectId: string }>;
  getProject(orgId: string, projectId: string): Promise<ProjectRow | null>;
  listProjects(orgId: string): Promise<ProjectRow[]>;
  setEntryPath(orgId: string, projectId: string, entryPath: string): Promise<void>;
  getCurrentSnapshot(projectId: string): Promise<SnapshotRow | null>;
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/repositories/types.ts
git commit -m "feat: interface ProjectStore + tipos de fila"
```

---

## Task 11: Impl. Drizzle de `ProjectStore`

**Files:**
- Create: `src/repositories/projects.ts`

**Interfaces:**
- Consumes: `db` (T2), schema (T2), `ProjectStore`/tipos (T10).
- Produces: `class DrizzleProjectStore implements ProjectStore` y `export const projectStore = new DrizzleProjectStore()`.

> Verificación: este módulo se ejercita en la verificación end-to-end (Task 18) contra Supabase. No lleva test unitario (capa de BD fina).

- [ ] **Step 1: Implementar `src/repositories/projects.ts`**

```ts
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { projects, snapshots } from "@/src/db/schema";
import type {
  CreateProjectInput, ProjectRow, ProjectStore, SnapshotRow,
} from "./types";

function toProjectRow(r: typeof projects.$inferSelect): ProjectRow {
  return {
    id: r.id,
    orgId: r.orgId,
    nombre: r.nombre,
    entryPath: r.entryPath,
    currentSnapshotId: r.currentSnapshotId,
    createdAt: r.createdAt.toISOString(),
  };
}

export class DrizzleProjectStore implements ProjectStore {
  async createProjectWithSnapshot(input: CreateProjectInput): Promise<{ projectId: string }> {
    await db.transaction(async (tx) => {
      await tx.insert(projects).values({
        id: input.projectId,
        orgId: input.orgId,
        nombre: input.nombre,
        entryPath: input.entryPath,
        currentSnapshotId: input.snapshotId,
      });
      await tx.insert(snapshots).values({
        id: input.snapshotId,
        projectId: input.projectId,
        tipo: "import",
        storagePrefix: input.storagePrefix,
      });
    });
    return { projectId: input.projectId };
  }

  async getProject(orgId: string, projectId: string): Promise<ProjectRow | null> {
    const r = await db.select().from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId))).limit(1);
    return r[0] ? toProjectRow(r[0]) : null;
  }

  async listProjects(orgId: string): Promise<ProjectRow[]> {
    const rows = await db.select().from(projects)
      .where(eq(projects.orgId, orgId)).orderBy(desc(projects.createdAt));
    return rows.map(toProjectRow);
  }

  async setEntryPath(orgId: string, projectId: string, entryPath: string): Promise<void> {
    await db.update(projects).set({ entryPath })
      .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)));
  }

  async getCurrentSnapshot(projectId: string): Promise<SnapshotRow | null> {
    const p = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    const snapId = p[0]?.currentSnapshotId;
    if (!snapId) return null;
    const s = await db.select().from(snapshots).where(eq(snapshots.id, snapId)).limit(1);
    if (!s[0]) return null;
    return { id: s[0].id, projectId: s[0].projectId, storagePrefix: s[0].storagePrefix, tipo: s[0].tipo };
  }
}

export const projectStore = new DrizzleProjectStore();
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/repositories/projects.ts
git commit -m "feat: impl. Drizzle de ProjectStore"
```

---

## Task 12: AuthAdapter dev-stub + factoría de storage

**Files:**
- Create: `src/auth/dev-stub.ts`, `src/storage/factory.ts`

**Interfaces:**
- Consumes: `db` (T2), schema (T2), `LocalFsStorage` (T5).
- Produces:
  - `getDevContext(): Promise<{ orgId: string; userId: string }>` — garantiza (idempotente) una org+user+membership fijos y devuelve sus ids.
  - `getStorage(): StorageAdapter` — `LocalFsStorage` con raíz `process.env.STORAGE_DIR ?? "data/storage"`.

> Verificación end-to-end (Task 18). Sin test unitario (capa de BD).

- [ ] **Step 1: Implementar `src/storage/factory.ts`**

```ts
import { LocalFsStorage } from "./local-fs";
import type { StorageAdapter } from "./types";

let instancia: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!instancia) {
    instancia = new LocalFsStorage(process.env.STORAGE_DIR ?? "data/storage");
  }
  return instancia;
}
```

- [ ] **Step 2: Implementar `src/auth/dev-stub.ts`**

```ts
import { eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { organizations, users, memberships } from "@/src/db/schema";

// IDs fijos de desarrollo (UUID v4 constantes).
const DEV_ORG_ID = "00000000-0000-4000-8000-000000000001";
const DEV_USER_ID = "00000000-0000-4000-8000-000000000002";
const DEV_EMAIL = "dev@wordclicks.local";

export async function getDevContext(): Promise<{ orgId: string; userId: string }> {
  await db.insert(organizations)
    .values({ id: DEV_ORG_ID, nombre: "Organización de desarrollo" })
    .onConflictDoNothing();
  await db.insert(users)
    .values({ id: DEV_USER_ID, email: DEV_EMAIL, nombre: "Dev" })
    .onConflictDoNothing();

  const m = await db.select().from(memberships)
    .where(eq(memberships.userId, DEV_USER_ID)).limit(1);
  if (!m[0]) {
    await db.insert(memberships)
      .values({ orgId: DEV_ORG_ID, userId: DEV_USER_ID, rol: "owner" })
      .onConflictDoNothing();
  }
  return { orgId: DEV_ORG_ID, userId: DEV_USER_ID };
}
```

- [ ] **Step 3: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/auth/dev-stub.ts src/storage/factory.ts
git commit -m "feat: auth dev-stub (org+user fijos) + factoría de storage"
```

---

## Task 13: Orquestador `importProject` + ruta `POST /api/projects`

**Files:**
- Create: `src/import/import-project.ts`, `app/api/projects/route.ts`, `src/tests/import-project.test.ts`

**Interfaces:**
- Consumes: `processZip` (T8), `snapshotPrefix` (T3), `contentTypeFor` (T4), `StorageAdapter` (T5), `ProjectStore` (T10).
- Produces: `importProject(deps: { store: ProjectStore; storage: StorageAdapter; orgId: string }, input: { zip: Buffer; nombre?: string }): Promise<{ projectId: string }>`.

- [ ] **Step 1: Escribir el test (con fakes en memoria)**

`src/tests/import-project.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { importProject } from "@/src/import/import-project";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore, CreateProjectInput, ProjectRow, SnapshotRow } from "@/src/repositories/types";

function makeZip(files: Record<string, string>): Buffer {
  const data: Record<string, Uint8Array> = {};
  for (const [k, v] of Object.entries(files)) data[k] = strToU8(v);
  return Buffer.from(zipSync(data));
}

class FakeStorage implements StorageAdapter {
  puestos = new Map<string, Buffer>();
  async put(key: string, body: Buffer | string) {
    this.puestos.set(key, Buffer.isBuffer(body) ? body : Buffer.from(body));
  }
  async get(key: string) {
    const b = this.puestos.get(key);
    return b ? { body: b, contentType: "x" } : null;
  }
  async list(prefix: string) {
    return [...this.puestos.keys()].filter((k) => k.startsWith(prefix));
  }
  async delete(key: string) { this.puestos.delete(key); }
}

class FakeStore implements ProjectStore {
  creado: CreateProjectInput | null = null;
  async createProjectWithSnapshot(input: CreateProjectInput) {
    this.creado = input;
    return { projectId: input.projectId };
  }
  async getProject(): Promise<ProjectRow | null> { return null; }
  async listProjects(): Promise<ProjectRow[]> { return []; }
  async setEntryPath(): Promise<void> {}
  async getCurrentSnapshot(): Promise<SnapshotRow | null> { return null; }
}

describe("importProject", () => {
  it("escribe los archivos al storage bajo el prefijo del snapshot y crea el proyecto", async () => {
    const storage = new FakeStorage();
    const store = new FakeStore();
    const zip = makeZip({ "index.html": "<h1>Hola</h1>", "css/app.css": "body{}" });

    const { projectId } = await importProject({ store, storage, orgId: "org1" }, { zip, nombre: "Mi web" });

    expect(projectId).toBe(store.creado!.projectId);
    expect(store.creado!.entryPath).toBe("index.html");
    expect(store.creado!.nombre).toBe("Mi web");
    const prefix = store.creado!.storagePrefix;
    expect(storage.puestos.get(prefix + "index.html")!.toString()).toBe("<h1>Hola</h1>");
    expect(storage.puestos.get(prefix + "css/app.css")!.toString()).toBe("body{}");
  });

  it("usa un nombre por defecto si no se da", async () => {
    const storage = new FakeStorage();
    const store = new FakeStore();
    const zip = makeZip({ "index.html": "x" });
    await importProject({ store, storage, orgId: "org1" }, { zip });
    expect(store.creado!.nombre.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `npx vitest run src/tests/import-project.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/import/import-project.ts`**

```ts
import { processZip } from "./process-zip";
import { snapshotPrefix } from "@/src/storage/keys";
import { contentTypeFor } from "@/src/storage/content-type";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

export async function importProject(
  deps: { store: ProjectStore; storage: StorageAdapter; orgId: string },
  input: { zip: Buffer; nombre?: string }
): Promise<{ projectId: string }> {
  const { files, entryPath } = processZip(input.zip);

  const projectId = crypto.randomUUID();
  const snapshotId = crypto.randomUUID();
  const prefix = snapshotPrefix(projectId, snapshotId);

  for (const f of files) {
    await deps.storage.put(prefix + f.path, f.bytes, contentTypeFor(f.path));
  }

  const nombre = input.nombre?.trim() || `Proyecto ${new Date().toISOString().slice(0, 10)}`;
  await deps.store.createProjectWithSnapshot({
    projectId, snapshotId, orgId: deps.orgId, nombre, entryPath, storagePrefix: prefix,
  });
  return { projectId };
}
```

- [ ] **Step 4: Ejecutar (debe pasar)**

Run: `npx vitest run src/tests/import-project.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Implementar la ruta `app/api/projects/route.ts`**

```ts
import { NextResponse } from "next/server";
import { importProject } from "@/src/import/import-project";
import { ImportError } from "@/src/import/unzip";
import { getDevContext } from "@/src/auth/dev-stub";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const nombre = (form.get("nombre") as string | null) ?? undefined;
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Falta el archivo ZIP" }, { status: 400 });
    }
    const zip = Buffer.from(await file.arrayBuffer());
    const { orgId } = await getDevContext();
    const { projectId } = await importProject(
      { store: projectStore, storage: getStorage(), orgId },
      { zip, nombre }
    );
    return NextResponse.json({ projectId }, { status: 201 });
  } catch (e) {
    if (e instanceof ImportError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 6: Verificar typecheck y commit**

Run: `npm run typecheck`
Expected: sin errores.

```bash
git add src/import/import-project.ts app/api/projects/route.ts src/tests/import-project.test.ts
git commit -m "feat: importProject (DI) + ruta POST /api/projects"
```

---

## Task 14: `resolvePreview` + ruta `GET /api/projects/[id]/preview/[[...path]]`

**Files:**
- Create: `src/preview/resolve.ts`, `app/api/projects/[id]/preview/[[...path]]/route.ts`, `src/tests/resolve.test.ts`

**Interfaces:**
- Consumes: `rewriteHtml` (T9), `StorageAdapter` (T5), `SnapshotRow` (T10).
- Produces: `resolvePreview(deps: { storage: StorageAdapter }, input: { projectId: string; storagePrefix: string; entryPath: string; pathSegments: string[] }): Promise<{ status: number; body: Buffer; contentType: string }>`.

- [ ] **Step 1: Escribir el test**

`src/tests/resolve.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { resolvePreview } from "@/src/preview/resolve";
import type { StorageAdapter } from "@/src/storage/types";

class MapStorage implements StorageAdapter {
  constructor(private files: Record<string, { body: string; ct: string }>) {}
  async put() {}
  async get(key: string) {
    const f = this.files[key];
    return f ? { body: Buffer.from(f.body), contentType: f.ct } : null;
  }
  async list(prefix: string) { return Object.keys(this.files).filter((k) => k.startsWith(prefix)); }
  async delete() {}
}

const prefix = "projects/p1/snapshots/s1/";

describe("resolvePreview", () => {
  it("sirve el entry cuando el path está vacío y reescribe el HTML", async () => {
    const storage = new MapStorage({
      [prefix + "index.html"]: { body: `<head></head><img src="/img/x.png">`, ct: "text/html; charset=utf-8" },
    });
    const r = await resolvePreview({ storage }, {
      projectId: "p1", storagePrefix: prefix, entryPath: "index.html", pathSegments: [],
    });
    expect(r.status).toBe(200);
    expect(r.body.toString()).toContain(`<base href="/api/projects/p1/preview/">`);
    expect(r.body.toString()).toContain(`src="/api/projects/p1/preview/img/x.png"`);
  });

  it("sirve un asset tal cual", async () => {
    const storage = new MapStorage({
      [prefix + "css/app.css"]: { body: "body{color:red}", ct: "text/css; charset=utf-8" },
    });
    const r = await resolvePreview({ storage }, {
      projectId: "p1", storagePrefix: prefix, entryPath: "index.html", pathSegments: ["css", "app.css"],
    });
    expect(r.status).toBe(200);
    expect(r.contentType).toBe("text/css; charset=utf-8");
    expect(r.body.toString()).toBe("body{color:red}");
  });

  it("404 si el archivo no existe", async () => {
    const storage = new MapStorage({});
    const r = await resolvePreview({ storage }, {
      projectId: "p1", storagePrefix: prefix, entryPath: "index.html", pathSegments: ["no.css"],
    });
    expect(r.status).toBe(404);
  });
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `npx vitest run src/tests/resolve.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/preview/resolve.ts`**

```ts
import { rewriteHtml } from "./rewrite";
import type { StorageAdapter } from "@/src/storage/types";

export async function resolvePreview(
  deps: { storage: StorageAdapter },
  input: { projectId: string; storagePrefix: string; entryPath: string; pathSegments: string[] }
): Promise<{ status: number; body: Buffer; contentType: string }> {
  const rel = input.pathSegments.length > 0 ? input.pathSegments.join("/") : input.entryPath;
  const file = await deps.storage.get(input.storagePrefix + rel);
  if (!file) {
    return { status: 404, body: Buffer.from("No encontrado"), contentType: "text/plain; charset=utf-8" };
  }
  if (/\.html?$/i.test(rel)) {
    const baseHref = `/api/projects/${input.projectId}/preview/`;
    const html = rewriteHtml(file.body.toString("utf-8"), baseHref);
    return { status: 200, body: Buffer.from(html, "utf-8"), contentType: "text/html; charset=utf-8" };
  }
  return { status: 200, body: file.body, contentType: file.contentType };
}
```

- [ ] **Step 4: Ejecutar (debe pasar)**

Run: `npx vitest run src/tests/resolve.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Implementar la ruta `app/api/projects/[id]/preview/[[...path]]/route.ts`**

```ts
import { resolvePreview } from "@/src/preview/resolve";
import { getDevContext } from "@/src/auth/dev-stub";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; path?: string[] }> }
) {
  const { id, path } = await ctx.params;
  const { orgId } = await getDevContext();
  const project = await projectStore.getProject(orgId, id);
  if (!project) return new Response("Proyecto no encontrado", { status: 404 });
  const snap = await projectStore.getCurrentSnapshot(id);
  if (!snap) return new Response("Sin snapshot", { status: 404 });

  const r = await resolvePreview(
    { storage: getStorage() },
    { projectId: id, storagePrefix: snap.storagePrefix, entryPath: project.entryPath, pathSegments: path ?? [] }
  );
  return new Response(r.body, { status: r.status, headers: { "content-type": r.contentType } });
}
```

- [ ] **Step 6: Verificar typecheck y commit**

Run: `npm run typecheck`
Expected: sin errores.

```bash
git add src/preview/resolve.ts "app/api/projects/[id]/preview" src/tests/resolve.test.ts
git commit -m "feat: resolvePreview (DI) + ruta GET de preview"
```

---

## Task 15: `PATCH /api/projects/[id]` (entry_path) + `GET` (lista de páginas)

**Files:**
- Create: `app/api/projects/[id]/route.ts`, `src/tests/set-entry.test.ts`, `src/projects/entry.ts`

**Interfaces:**
- Consumes: `ProjectStore` (T10), `listHtmlPages` (T5), `StorageAdapter` (T5).
- Produces:
  - `setEntryPath(deps: { store: ProjectStore; storage: StorageAdapter }, input: { orgId; projectId; entryPath }): Promise<void>` — valida que `entryPath` existe entre las páginas HTML del snapshot actual; si no, lanza `Error`.
  - `listPages(deps, input: { orgId; projectId }): Promise<string[]>`.

- [ ] **Step 1: Escribir el test**

`src/tests/set-entry.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { setEntryPath, listPages } from "@/src/projects/entry";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore, ProjectRow, SnapshotRow, CreateProjectInput } from "@/src/repositories/types";

const prefix = "projects/p1/snapshots/s1/";

class MapStorage implements StorageAdapter {
  constructor(private keys: string[]) {}
  async put() {}
  async get() { return null; }
  async list(p: string) { return this.keys.filter((k) => k.startsWith(p)); }
  async delete() {}
}

class StubStore implements ProjectStore {
  entryGuardado: string | null = null;
  async createProjectWithSnapshot(i: CreateProjectInput) { return { projectId: i.projectId }; }
  async getProject(): Promise<ProjectRow | null> {
    return { id: "p1", orgId: "org1", nombre: "x", entryPath: "index.html", currentSnapshotId: "s1", createdAt: "" };
  }
  async listProjects(): Promise<ProjectRow[]> { return []; }
  async setEntryPath(_o: string, _p: string, e: string) { this.entryGuardado = e; }
  async getCurrentSnapshot(): Promise<SnapshotRow | null> {
    return { id: "s1", projectId: "p1", storagePrefix: prefix, tipo: "import" };
  }
}

describe("setEntryPath / listPages", () => {
  it("listPages devuelve las páginas html del snapshot", async () => {
    const storage = new MapStorage([prefix + "index.html", prefix + "about.html", prefix + "css/app.css"]);
    const pages = await listPages({ store: new StubStore(), storage }, { orgId: "org1", projectId: "p1" });
    expect(pages.sort()).toEqual(["about.html", "index.html"]);
  });

  it("setEntryPath acepta una página existente", async () => {
    const storage = new MapStorage([prefix + "index.html", prefix + "about.html"]);
    const store = new StubStore();
    await setEntryPath({ store, storage }, { orgId: "org1", projectId: "p1", entryPath: "about.html" });
    expect(store.entryGuardado).toBe("about.html");
  });

  it("setEntryPath rechaza una página inexistente", async () => {
    const storage = new MapStorage([prefix + "index.html"]);
    const store = new StubStore();
    await expect(
      setEntryPath({ store, storage }, { orgId: "org1", projectId: "p1", entryPath: "no.html" })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `npx vitest run src/tests/set-entry.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/projects/entry.ts`**

```ts
import { listHtmlPages } from "@/src/storage/local-fs";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

async function paginas(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string }
): Promise<string[]> {
  const snap = await deps.store.getCurrentSnapshot(input.projectId);
  if (!snap) return [];
  return listHtmlPages(deps.storage, snap.storagePrefix);
}

export async function listPages(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string }
): Promise<string[]> {
  return paginas(deps, input);
}

export async function setEntryPath(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string; entryPath: string }
): Promise<void> {
  const pages = await paginas(deps, input);
  if (!pages.includes(input.entryPath)) {
    throw new Error(`La página "${input.entryPath}" no existe en el proyecto`);
  }
  await deps.store.setEntryPath(input.orgId, input.projectId, input.entryPath);
}
```

- [ ] **Step 4: Ejecutar (debe pasar)**

Run: `npx vitest run src/tests/set-entry.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Implementar la ruta `app/api/projects/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getDevContext } from "@/src/auth/dev-stub";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { listPages, setEntryPath } from "@/src/projects/entry";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getDevContext();
  const project = await projectStore.getProject(orgId, id);
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const pages = await listPages({ store: projectStore, storage: getStorage() }, { orgId, projectId: id });
  return NextResponse.json({ entryPath: project.entryPath, pages });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getDevContext();
  const body = (await req.json()) as { entryPath?: string };
  if (!body.entryPath) return NextResponse.json({ error: "Falta entryPath" }, { status: 400 });
  try {
    await setEntryPath({ store: projectStore, storage: getStorage() }, { orgId, projectId: id, entryPath: body.entryPath });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 400 });
  }
}
```

- [ ] **Step 6: Verificar typecheck y commit**

Run: `npm run typecheck`
Expected: sin errores.

```bash
git add "app/api/projects/[id]/route.ts" src/projects/entry.ts src/tests/set-entry.test.ts
git commit -m "feat: GET páginas + PATCH entry_path con validación"
```

---

## Task 16: Dashboard (lista de proyectos + dropzone de import)

**Files:**
- Create: `app/page.tsx` (reemplaza el placeholder), `app/_components/ImportDropzone.tsx`

**Interfaces:**
- Consumes: `getDevContext` (T12), `projectStore` (T11), `POST /api/projects` (T13).

> Verificación visual en Task 18.

- [ ] **Step 1: Implementar `app/_components/ImportDropzone.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ImportDropzone() {
  const router = useRouter();
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(file: File) {
    setError(null);
    setSubiendo(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("nombre", file.name.replace(/\.zip$/i, ""));
      const res = await fetch("/api/projects", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al importar");
      router.push(`/projects/${data.projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al importar");
      setSubiendo(false);
    }
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) void subir(file);
      }}
      className="rounded-xl border-2 border-dashed border-gray-300 p-10 text-center"
    >
      <p className="mb-3 text-gray-600">
        {subiendo ? "Subiendo…" : "Arrastra aquí el .zip de tu web"}
      </p>
      <label className="cursor-pointer rounded-lg bg-black px-4 py-2 text-white">
        Elegir archivo
        <input
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          disabled={subiendo}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void subir(file);
          }}
        />
      </label>
      {error && <p className="mt-3 text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Implementar `app/page.tsx`**

```tsx
import Link from "next/link";
import { getDevContext } from "@/src/auth/dev-stub";
import { projectStore } from "@/src/repositories/projects";
import { ImportDropzone } from "./_components/ImportDropzone";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const { orgId } = await getDevContext();
  const proyectos = await projectStore.listProjects(orgId);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Wordclicks</h1>
      <section className="mb-10">
        <ImportDropzone />
      </section>
      <h2 className="mb-4 text-xl font-semibold">Tus proyectos</h2>
      {proyectos.length === 0 ? (
        <p className="text-gray-500">Aún no hay proyectos. Sube un ZIP para empezar.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4">
          {proyectos.map((p) => (
            <li key={p.id} className="rounded-lg border p-4">
              <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
                {p.nombre}
              </Link>
              <p className="text-sm text-gray-400">{p.createdAt.slice(0, 10)}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Verificar typecheck y commit**

Run: `npm run typecheck`
Expected: sin errores.

```bash
git add app/page.tsx app/_components/ImportDropzone.tsx
git commit -m "feat: dashboard con lista de proyectos y dropzone de import"
```

---

## Task 17: Página de proyecto (preview + selector de página)

**Files:**
- Create: `app/projects/[id]/page.tsx`, `app/projects/[id]/PreviewPane.tsx`

**Interfaces:**
- Consumes: `getDevContext` (T12), `projectStore` (T11), `listPages` (T15), `GET /api/projects/[id]/preview/...` (T14), `PATCH /api/projects/[id]` (T15).

> Verificación visual en Task 18.

- [ ] **Step 1: Implementar `app/projects/[id]/PreviewPane.tsx`**

```tsx
"use client";
import { useState } from "react";

export function PreviewPane({
  projectId, entryPath, pages,
}: { projectId: string; entryPath: string; pages: string[] }) {
  const [actual, setActual] = useState(entryPath);
  const [guardando, setGuardando] = useState(false);
  const src = `/api/projects/${projectId}/preview/${actual === entryPath ? "" : actual}`;

  async function cambiarEntrada(nuevo: string) {
    setActual(nuevo);
    setGuardando(true);
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entryPath: nuevo }),
    });
    setGuardando(false);
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <label className="text-sm text-gray-600">Página de entrada:</label>
        <select
          value={actual}
          onChange={(e) => void cambiarEntrada(e.target.value)}
          className="rounded border px-2 py-1 text-sm"
        >
          {pages.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        {guardando && <span className="text-sm text-gray-400">guardando…</span>}
      </div>
      <iframe
        key={src}
        src={src}
        sandbox="allow-scripts"
        className="h-[80vh] w-full rounded-lg border"
        title="preview"
      />
    </div>
  );
}
```

- [ ] **Step 2: Implementar `app/projects/[id]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDevContext } from "@/src/auth/dev-stub";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { listPages } from "@/src/projects/entry";
import { PreviewPane } from "./PreviewPane";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await getDevContext();
  const project = await projectStore.getProject(orgId, id);
  if (!project) notFound();
  const pages = await listPages({ store: projectStore, storage: getStorage() }, { orgId, projectId: id });

  return (
    <main className="mx-auto max-w-5xl p-8">
      <Link href="/" className="text-sm text-gray-500 hover:underline">← Volver</Link>
      <h1 className="mb-4 mt-2 text-2xl font-bold">{project.nombre}</h1>
      <PreviewPane projectId={id} entryPath={project.entryPath} pages={pages} />
    </main>
  );
}
```

- [ ] **Step 3: Verificar typecheck y commit**

Run: `npm run typecheck`
Expected: sin errores.

```bash
git add "app/projects/[id]"
git commit -m "feat: página de proyecto con preview e iframe + selector de página"
```

---

## Task 18: Verificación end-to-end (visual)

**Files:** ninguno (solo verificación). Prerrequisito: `.env.local` con `DATABASE_URL`, y el esquema empujado (Task 2 Step 7).

- [ ] **Step 1: Preparar un ZIP de prueba**

Usa la web que ya tiene el founder (la de varias páginas) o crea un ZIP mínimo con `index.html` + `css/app.css` + una imagen + un `about.html` que enlace a `index.html`. Guárdalo como `scratchpad/test-site.zip`.

- [ ] **Step 2: Arrancar la app**

Run: `npm run dev`
Expected: Next arranca en `http://localhost:3000` sin errores.

- [ ] **Step 3: Importar y verificar el dashboard**

Abrir `http://localhost:3000`, arrastrar `test-site.zip`. Esperado: redirige a `/projects/<id>`.

- [ ] **Step 4: Verificar el preview (captura)**

En la página del proyecto, el iframe muestra la web **idéntica al original**: CSS aplicado, imágenes cargando.
**Hacer una captura de pantalla** y compararla con la web original abierta directamente.

- [ ] **Step 5: Verificar el selector de página**

Cambiar el selector a `about.html`. Esperado: el iframe recarga mostrando esa página; al recargar la página del proyecto, la entrada persiste. Hacer click en un link interno dentro del iframe → navega a otra página dentro del preview.

- [ ] **Step 6: Verificar que el HTML almacenado está limpio**

Inspeccionar el archivo guardado (p. ej. `data/storage/projects/<id>/snapshots/<sid>/index.html`) y confirmar que es **byte-idéntico** al `index.html` original del ZIP (sin `<base>` ni rutas reescritas — esas solo aparecen en la respuesta del preview).

- [ ] **Step 7: Verificar caso de error**

Subir un ZIP sin ningún `.html`. Esperado: mensaje de error claro ("El ZIP no contiene ninguna página HTML"), sin crear proyecto.

- [ ] **Step 8: Suite completa**

Run: `npm test`
Expected: todos los tests verdes.
Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 9: Commit final del incremento**

```bash
git add -A
git commit -m "chore: verificación end-to-end del increment 1 (import → preview)"
```

---

## Notas de ejecución

- **Orden recomendado:** 1 → 2 (necesita `DATABASE_URL`) → 3-9 (lógica pura, sin BD, se pueden hacer del tirón) → 10-15 (wiring) → 16-17 (UI) → 18 (verificación).
- Las tareas 3–9 no tocan BD ni red: son las de mayor valor de test y se pueden revisar/ejecutar sin Supabase.
- Si `drizzle-kit push` (Task 2) aún no se ha corrido, las tareas 11–18 fallarán en runtime pero los tests unitarios (3–10, 13–15) pasan igual porque usan fakes.
- Limitación conocida del preview (increment 1): no reescribe `srcset` ni URLs dentro de archivos `.css` externos; cubre `src`/`href`/`url()` root-absolutos en el documento HTML. Si una web de prueba lo necesita, se amplía `rewriteHtml` (es puro y testeado).
```
