# Incremento 3 (Publicar autoservido) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Botón «Publicar»: la web del snapshot actual se sirve en una URL pública por proyecto (`<sub>.localhost:3000` en local), separada del borrador, con HTML 100% limpio.

**Architecture:** Publicar = mover `publishedSnapshotId` al snapshot actual (sin copiar archivos; los snapshots son inmutables). Un `middleware.ts` clasifica el `Host` de cada petición (`parseHost`) y reescribe los hosts que no son la plataforma a una ruta interna `/sites/<host>/…` que sirve el snapshot publicado directamente desde storage — sin anotar, sin reescribir, sin `<base>`. Subdominio auto-generado (slug del nombre) en la primera publicación. Costura `DeployTarget` (impl. autoservida no-op) para futuros hosts externos.

**Tech Stack:** Next.js 16 (App Router + middleware) + TypeScript strict, Drizzle + postgres-js (Supabase), vitest. Sin dependencias nuevas.

## Global Constraints

- TypeScript **strict**; sin `any` salvo casts puntuales justificados.
- Regex de slug: `^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$`. Reservados (exactos): `www, api, app, admin, mail, ftp, smtp, studio, wordclicks, preview, assets, sites, s, blog, dashboard, panel, cdn, static, ns1, ns2`.
- `PLATFORM_HOST` default `"localhost:3000"` (autoridad completa, con puerto). `NEXT_PUBLIC_PLATFORM_HOST` mismo valor para el cliente. Sin cambios en `.env.local` (los defaults bastan en dev).
- La ruta pública sirve **solo** el snapshot publicado: HTML byte-idéntico al almacenado (sin `data-wc-id`, sin script, sin `<base>`); guarda de traversal idéntica al preview.
- Cache: HTML → `no-cache`; resto → `public, max-age=300`.
- Mensajes exactos: «Subdominio no válido (minúsculas, números y guiones)» (400), «Ese subdominio está reservado» (400), «Ese subdominio ya está en uso» (409), «El proyecto no tiene contenido que publicar» (400), «Proyecto no encontrado» (404), página pública 404: «Esta web no está publicada».
- UI y errores en español. Adaptadores inyectados (la lógica pura no importa `db` ni `fs`). Commits frecuentes (mínimo uno por tarea).

---

### Task 1: Migración de esquema + store (campos y 4 métodos nuevos)

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/repositories/types.ts`
- Modify: `src/repositories/projects.ts`
- Modify: `src/tests/save-edits.test.ts`, `src/tests/assets.test.ts`, `src/tests/import-project.test.ts`, `src/tests/restore.test.ts`, `src/tests/set-entry.test.ts` (completar fakes/stubs)

**Interfaces:**
- Produces:
  - `projects` gana `publishedSnapshotId uuid` (nullable) y `subdominio` pasa a `.unique()`.
  - `ProjectRow` gana `subdominio: string | null; dominio: string | null; publishedSnapshotId: string | null`.
  - `ProjectStore` gana:
    - `getPublishedSiteByHost(q: { subdominio: string } | { dominia?: never; dominio: string }): Promise<{ entryPath: string; storagePrefix: string } | null>` — ver firma exacta abajo.
    - `setPublished(orgId: string, projectId: string, snapshotId: string | null): Promise<void>`
    - `subdominioLibre(subdominio: string): Promise<boolean>`
    - `setSubdominio(orgId: string, projectId: string, subdominio: string): Promise<boolean>` — `false` si viola unicidad (carrera).
  - Los consumen Tasks 4, 5, 6, 7.

- [ ] **Step 1: Esquema**

En `src/db/schema.ts`, dentro de `pgTable("projects", …)`, cambia:

```ts
  subdominio: text("subdominio"),
```

por:

```ts
  subdominio: text("subdominio").unique(),
```

y añade tras `currentSnapshotId`:

```ts
  publishedSnapshotId: uuid("published_snapshot_id"),
```

- [ ] **Step 2: Tipos del store**

En `src/repositories/types.ts`, en `ProjectRow`, añade tras `currentSnapshotId`:

```ts
  subdominio: string | null;
  dominio: string | null;
  publishedSnapshotId: string | null;
```

Y al final de `interface ProjectStore` (antes de `}`):

```ts
  getPublishedSiteByHost(
    q: { subdominio: string } | { dominio: string }
  ): Promise<{ entryPath: string; storagePrefix: string } | null>;
  setPublished(orgId: string, projectId: string, snapshotId: string | null): Promise<void>;
  subdominioLibre(subdominio: string): Promise<boolean>;
  /** false si el subdominio ya está en uso (violación de unicidad en carrera). */
  setSubdominio(orgId: string, projectId: string, subdominio: string): Promise<boolean>;
```

- [ ] **Step 3: Impl. Drizzle**

En `src/repositories/projects.ts`:

`toProjectRow` añade los campos nuevos:

```ts
    subdominio: r.subdominio,
    dominio: r.dominio,
    publishedSnapshotId: r.publishedSnapshotId,
```

Y dentro de `class DrizzleProjectStore` (tras `getAsset`), añade:

```ts
  async getPublishedSiteByHost(
    q: { subdominio: string } | { dominio: string }
  ): Promise<{ entryPath: string; storagePrefix: string } | null> {
    const cond = "subdominio" in q
      ? eq(projects.subdominio, q.subdominio)
      : eq(projects.dominio, q.dominio);
    const r = await db
      .select({ entryPath: projects.entryPath, storagePrefix: snapshots.storagePrefix })
      .from(projects)
      .innerJoin(snapshots, eq(projects.publishedSnapshotId, snapshots.id))
      .where(cond)
      .limit(1);
    return r[0] ?? null;
  }

  async setPublished(orgId: string, projectId: string, snapshotId: string | null): Promise<void> {
    await db.update(projects).set({ publishedSnapshotId: snapshotId })
      .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)));
  }

  async subdominioLibre(subdominio: string): Promise<boolean> {
    const r = await db.select({ id: projects.id }).from(projects)
      .where(eq(projects.subdominio, subdominio)).limit(1);
    return !r[0];
  }

  async setSubdominio(orgId: string, projectId: string, subdominio: string): Promise<boolean> {
    try {
      await db.update(projects).set({ subdominio })
        .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)));
      return true;
    } catch (e) {
      const code = (e as { code?: string; cause?: { code?: string } })?.code
        ?? (e as { cause?: { code?: string } })?.cause?.code;
      if (code === "23505") return false; // unique_violation
      throw e;
    }
  }
```

- [ ] **Step 4: Completar fakes/stubs de los tests**

Ejecuta `npx tsc --noEmit`: el compilador lista cada fake/stub y cada literal `ProjectRow` incompleto. Complétalos TODOS así:

En cada clase que implementa `ProjectStore` (FakeStore de `save-edits.test.ts` y `assets.test.ts`; stubs de `import-project.test.ts`, `restore.test.ts`, `set-entry.test.ts`), añade:

```ts
  async getPublishedSiteByHost(): Promise<{ entryPath: string; storagePrefix: string } | null> { return null; }
  async setPublished(): Promise<void> {}
  async subdominioLibre(): Promise<boolean> { return true; }
  async setSubdominio(): Promise<boolean> { return true; }
```

Y en cada literal `ProjectRow` devuelto por esos fakes (p. ej. `getProject()`), añade:

```ts
  subdominio: null, dominio: null, publishedSnapshotId: null,
```

- [ ] **Step 5: Verificar y aplicar la migración**

Run: `npx tsc --noEmit && npx vitest run`
Expected: limpio y 114/114 (los tests existentes no cambian de comportamiento).

Run (Git Bash): `DATABASE_URL="$(grep '^DATABASE_URL=' .env.local | cut -d'=' -f2-)" npm run db:push`
Expected: añade la columna `published_snapshot_id` y el índice único de `subdominio`. La tabla está vacía (BD recién limpiada); si drizzle-kit pide confirmación, re-ejecuta con `npm run db:push -- --force`.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts src/repositories/types.ts src/repositories/projects.ts src/tests/save-edits.test.ts src/tests/assets.test.ts src/tests/import-project.test.ts src/tests/restore.test.ts src/tests/set-entry.test.ts
git commit -m "feat(3): esquema publishedSnapshotId + subdominio único + store de publicación"
```

---

### Task 2: `slug.ts` (slugify + validación + reservados)

**Files:**
- Create: `src/publish/slug.ts`
- Test: `src/tests/slug.test.ts`

**Interfaces:**
- Produces: `RESERVADOS: readonly string[]`, `slugify(nombre: string): string`, `formatoSlugValido(s: string): boolean`, `esReservado(s: string): boolean`, `esSlugValido(s: string): boolean` (= formato válido y no reservado). Lo consumen Tasks 4 y 7.

- [ ] **Step 1: Tests (fallarán)**

Crea `src/tests/slug.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { slugify, formatoSlugValido, esReservado, esSlugValido } from "@/src/publish/slug";

describe("slugify", () => {
  it("minúsculas, sin acentos, espacios → guiones", () => {
    expect(slugify("Cafetería Aurora")).toBe("cafeteria-aurora");
  });
  it("símbolos → guion, colapsa y recorta guiones", () => {
    expect(slugify("  ¡Mi   Web! (2026) ")).toBe("mi-web-2026");
  });
  it("trunca a 63 sin dejar guion final", () => {
    const s = slugify("a".repeat(80));
    expect(s.length).toBeLessThanOrEqual(63);
    expect(s.endsWith("-")).toBe(false);
  });
  it("vacío o solo símbolos → 'sitio'", () => {
    expect(slugify("!!!")).toBe("sitio");
    expect(slugify("")).toBe("sitio");
  });
});

describe("formatoSlugValido", () => {
  it("acepta etiquetas DNS válidas", () => {
    for (const s of ["a", "a1", "mi-web", "x".repeat(63)]) expect(formatoSlugValido(s)).toBe(true);
  });
  it("rechaza mayúsculas, guiones extremos, vacío, >63, caracteres raros", () => {
    for (const s of ["", "A", "-a", "a-", "mi web", "a.b", "x".repeat(64)]) expect(formatoSlugValido(s)).toBe(false);
  });
});

describe("esReservado / esSlugValido", () => {
  it("www y sites están reservados", () => {
    expect(esReservado("www")).toBe(true);
    expect(esReservado("sites")).toBe(true);
    expect(esReservado("cafeteria")).toBe(false);
  });
  it("esSlugValido = formato ok y no reservado", () => {
    expect(esSlugValido("cafeteria-aurora")).toBe(true);
    expect(esSlugValido("www")).toBe(false);
    expect(esSlugValido("Mi Web")).toBe(false);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/tests/slug.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

Crea `src/publish/slug.ts`:

```ts
export const RESERVADOS: readonly string[] = [
  "www", "api", "app", "admin", "mail", "ftp", "smtp", "studio", "wordclicks",
  "preview", "assets", "sites", "s", "blog", "dashboard", "panel", "cdn",
  "static", "ns1", "ns2",
];

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export function formatoSlugValido(s: string): boolean {
  return typeof s === "string" && SLUG_RE.test(s);
}

export function esReservado(s: string): boolean {
  return RESERVADOS.includes(s);
}

export function esSlugValido(s: string): boolean {
  return formatoSlugValido(s) && !esReservado(s);
}

// Nombre de proyecto → etiqueta DNS: minúsculas, sin acentos (NFD), símbolos → "-",
// guiones colapsados y recortados, máx. 63. Vacío → "sitio".
export function slugify(nombre: string): string {
  let s = nombre
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (s.length > 63) s = s.slice(0, 63).replace(/-+$/g, "");
  return s || "sitio";
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/tests/slug.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/publish/slug.ts src/tests/slug.test.ts
git commit -m "feat(3): slug de subdominio (slugify + validación + reservados)"
```

---

### Task 3: `host.ts` (parseHost)

**Files:**
- Create: `src/publish/host.ts`
- Test: `src/tests/host.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type HostInfo =
    | { tipo: "plataforma" }
    | { tipo: "subdominio"; valor: string }
    | { tipo: "dominio"; valor: string }
    | { tipo: "desconocido" };
  export function parseHost(hostRaw: string, platformHost: string): HostInfo;
  ```
  Lo consumen Task 5 (`resolvePublicSite`) y Task 6 (`middleware.ts` — única fuente de clasificación de hosts).

- [ ] **Step 1: Tests (fallarán)**

Crea `src/tests/host.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseHost } from "@/src/publish/host";

const PLAT = "localhost:3000";

describe("parseHost", () => {
  it("host de la plataforma (con normalización de mayúsculas)", () => {
    expect(parseHost("localhost:3000", PLAT)).toEqual({ tipo: "plataforma" });
    expect(parseHost("LOCALHOST:3000", PLAT)).toEqual({ tipo: "plataforma" });
  });
  it("loopback cuenta como plataforma (ergonomía dev)", () => {
    expect(parseHost("127.0.0.1:3000", PLAT)).toEqual({ tipo: "plataforma" });
    expect(parseHost("[::1]:3000", PLAT)).toEqual({ tipo: "plataforma" });
  });
  it("subdominio de la plataforma (una sola etiqueta)", () => {
    expect(parseHost("cafeteria-aurora.localhost:3000", PLAT))
      .toEqual({ tipo: "subdominio", valor: "cafeteria-aurora" });
  });
  it("multi-etiqueta bajo la plataforma → desconocido", () => {
    expect(parseHost("a.b.localhost:3000", PLAT)).toEqual({ tipo: "desconocido" });
  });
  it("dominio propio (quita el puerto)", () => {
    expect(parseHost("quantivatechnology.com", PLAT)).toEqual({ tipo: "dominio", valor: "quantivatechnology.com" });
    expect(parseHost("QuantivaTechnology.com:3000", PLAT)).toEqual({ tipo: "dominio", valor: "quantivatechnology.com" });
  });
  it("vacío o basura → desconocido", () => {
    expect(parseHost("", PLAT)).toEqual({ tipo: "desconocido" });
    expect(parseHost("no válido!!", PLAT)).toEqual({ tipo: "desconocido" });
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/tests/host.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

Crea `src/publish/host.ts`:

```ts
export type HostInfo =
  | { tipo: "plataforma" }
  | { tipo: "subdominio"; valor: string }
  | { tipo: "dominio"; valor: string }
  | { tipo: "desconocido" };

// Clasifica el Host de una petición. `platformHost` es la autoridad completa de la
// plataforma (con puerto en dev, p. ej. "localhost:3000").
export function parseHost(hostRaw: string, platformHost: string): HostInfo {
  const host = (hostRaw ?? "").trim().toLowerCase();
  const plat = platformHost.trim().toLowerCase();
  if (!host) return { tipo: "desconocido" };
  if (host === plat) return { tipo: "plataforma" };

  const sinPuerto = host.replace(/:\d+$/, "");
  // Loopback directo (127.0.0.1, ::1) = la plataforma en dev.
  if (sinPuerto === "127.0.0.1" || sinPuerto === "::1" || sinPuerto === "[::1]") {
    return { tipo: "plataforma" };
  }

  if (host.endsWith("." + plat)) {
    const sub = host.slice(0, host.length - plat.length - 1);
    if (!sub || sub.includes(".")) return { tipo: "desconocido" };
    return { tipo: "subdominio", valor: sub };
  }

  if (!/^[a-z0-9.-]+$/.test(sinPuerto) || sinPuerto.includes("..")) return { tipo: "desconocido" };
  return { tipo: "dominio", valor: sinPuerto };
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/tests/host.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/publish/host.ts src/tests/host.test.ts
git commit -m "feat(3): parseHost (plataforma / subdominio / dominio propio)"
```

---

### Task 4: `publish-site.ts` + `errors.ts` + `deploy-target.ts`

**Files:**
- Create: `src/publish/errors.ts`
- Create: `src/publish/deploy-target.ts`
- Create: `src/publish/publish-site.ts`
- Test: `src/tests/publish-site.test.ts`

**Interfaces:**
- Consumes: `slugify`, `esSlugValido`, `formatoSlugValido`, `esReservado` (Task 2); `ProjectStore` con los métodos de Task 1.
- Produces:
  - `class PublishError extends Error { constructor(message: string, public status: number) }`
  - `interface DeployTarget { publish(input: { projectId: string; snapshotId: string; storagePrefix: string; subdominio: string }): Promise<{ ok: true }>; unpublish(input: { projectId: string; subdominio: string }): Promise<void>; }` + `selfHostedDeploy: DeployTarget` (no-op).
  - `publishSite(deps: { store: ProjectStore; deploy: DeployTarget }, input: { orgId: string; projectId: string }): Promise<{ subdominio: string; publishedSnapshotId: string }>`
  - `unpublishSite(deps: { store: ProjectStore; deploy: DeployTarget }, input: { orgId: string; projectId: string }): Promise<void>`
  - `cambiarSubdominio(deps: { store: ProjectStore }, input: { orgId: string; projectId: string; subdominio: string }): Promise<{ subdominio: string }>`
  - Los consume Task 7 (rutas API).

- [ ] **Step 1: Tests (fallarán)**

Crea `src/tests/publish-site.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { publishSite, unpublishSite, cambiarSubdominio } from "@/src/publish/publish-site";
import { PublishError } from "@/src/publish/errors";
import type { DeployTarget } from "@/src/publish/deploy-target";
import type {
  ProjectStore, ProjectRow, SnapshotRow, SnapshotInfo,
  CreateProjectInput, CreateSnapshotInput, AssetRow, CreateAssetInput,
} from "@/src/repositories/types";

class FakeStore implements ProjectStore {
  nombre = "Cafetería Aurora";
  subdominio: string | null = null;
  publishedSnapshotId: string | null = null;
  currentSnapshot: SnapshotRow | null = { id: "s1", projectId: "p1", storagePrefix: "projects/p1/snapshots/s1/", tipo: "edit" };
  ocupados = new Set<string>();
  hayProyecto = true;
  setSubdominioDevuelve = true;

  async createProjectWithSnapshot(i: CreateProjectInput) { return { projectId: i.projectId }; }
  async getProject(): Promise<ProjectRow | null> {
    if (!this.hayProyecto) return null;
    return {
      id: "p1", orgId: "org1", nombre: this.nombre, entryPath: "index.html",
      currentSnapshotId: this.currentSnapshot?.id ?? null,
      subdominio: this.subdominio, dominio: null, publishedSnapshotId: this.publishedSnapshotId,
      createdAt: "",
    };
  }
  async listProjects(): Promise<ProjectRow[]> { return []; }
  async setEntryPath(): Promise<void> {}
  async getCurrentSnapshot(): Promise<SnapshotRow | null> { return this.currentSnapshot; }
  async createSnapshot(_i: CreateSnapshotInput) {}
  async setCurrentSnapshot(): Promise<void> {}
  async listSnapshots(): Promise<SnapshotInfo[]> { return []; }
  async getSnapshotById(): Promise<SnapshotRow | null> { return null; }
  async createAsset(_i: CreateAssetInput) {}
  async getAsset(): Promise<AssetRow | null> { return null; }
  async getPublishedSiteByHost(): Promise<{ entryPath: string; storagePrefix: string } | null> { return null; }
  async setPublished(_o: string, _p: string, id: string | null) { this.publishedSnapshotId = id; }
  async subdominioLibre(s: string): Promise<boolean> { return !this.ocupados.has(s); }
  async setSubdominio(_o: string, _p: string, s: string): Promise<boolean> {
    if (!this.setSubdominioDevuelve) return false;
    this.subdominio = s; return true;
  }
}

class FakeDeploy implements DeployTarget {
  publicados: string[] = [];
  despublicados: string[] = [];
  async publish(i: { subdominio: string }) { this.publicados.push(i.subdominio); return { ok: true as const }; }
  async unpublish(i: { subdominio: string }) { this.despublicados.push(i.subdominio); }
}

describe("publishSite", () => {
  it("primera publicación: genera slug del nombre, fija puntero y llama al deploy", async () => {
    const store = new FakeStore(); const deploy = new FakeDeploy();
    const r = await publishSite({ store, deploy }, { orgId: "org1", projectId: "p1" });
    expect(r.subdominio).toBe("cafeteria-aurora");
    expect(r.publishedSnapshotId).toBe("s1");
    expect(store.subdominio).toBe("cafeteria-aurora");
    expect(store.publishedSnapshotId).toBe("s1");
    expect(deploy.publicados).toEqual(["cafeteria-aurora"]);
  });

  it("colisión de slug → sufijo -2", async () => {
    const store = new FakeStore(); store.ocupados.add("cafeteria-aurora");
    const r = await publishSite({ store, deploy: new FakeDeploy() }, { orgId: "org1", projectId: "p1" });
    expect(r.subdominio).toBe("cafeteria-aurora-2");
  });

  it("nombre reservado → salta al sufijo", async () => {
    const store = new FakeStore(); store.nombre = "www";
    const r = await publishSite({ store, deploy: new FakeDeploy() }, { orgId: "org1", projectId: "p1" });
    expect(r.subdominio).toBe("www-2");
  });

  it("republicar conserva el subdominio existente", async () => {
    const store = new FakeStore(); store.subdominio = "mi-sub";
    const r = await publishSite({ store, deploy: new FakeDeploy() }, { orgId: "org1", projectId: "p1" });
    expect(r.subdominio).toBe("mi-sub");
  });

  it("sin snapshot actual → 400", async () => {
    const store = new FakeStore(); store.currentSnapshot = null;
    await expect(publishSite({ store, deploy: new FakeDeploy() }, { orgId: "org1", projectId: "p1" }))
      .rejects.toThrow(PublishError);
  });

  it("carrera en setSubdominio → 409", async () => {
    const store = new FakeStore(); store.setSubdominioDevuelve = false;
    await expect(publishSite({ store, deploy: new FakeDeploy() }, { orgId: "org1", projectId: "p1" }))
      .rejects.toMatchObject({ status: 409 });
  });
});

describe("unpublishSite", () => {
  it("pone el puntero a null y notifica al deploy", async () => {
    const store = new FakeStore(); store.subdominio = "mi-sub"; store.publishedSnapshotId = "s1";
    const deploy = new FakeDeploy();
    await unpublishSite({ store, deploy }, { orgId: "org1", projectId: "p1" });
    expect(store.publishedSnapshotId).toBeNull();
    expect(deploy.despublicados).toEqual(["mi-sub"]);
  });
});

describe("cambiarSubdominio", () => {
  it("cambia un subdominio válido y libre", async () => {
    const store = new FakeStore();
    const r = await cambiarSubdominio({ store }, { orgId: "org1", projectId: "p1", subdominio: "Nuevo-Sub" });
    expect(r.subdominio).toBe("nuevo-sub"); // normaliza a minúsculas
    expect(store.subdominio).toBe("nuevo-sub");
  });
  it("formato inválido → 400", async () => {
    await expect(cambiarSubdominio({ store: new FakeStore() }, { orgId: "org1", projectId: "p1", subdominio: "-malo-" }))
      .rejects.toMatchObject({ status: 400 });
  });
  it("reservado → 400 con mensaje de reservado", async () => {
    await expect(cambiarSubdominio({ store: new FakeStore() }, { orgId: "org1", projectId: "p1", subdominio: "www" }))
      .rejects.toMatchObject({ status: 400, message: "Ese subdominio está reservado" });
  });
  it("ocupado → 409", async () => {
    const store = new FakeStore(); store.ocupados.add("tomado");
    await expect(cambiarSubdominio({ store }, { orgId: "org1", projectId: "p1", subdominio: "tomado" }))
      .rejects.toMatchObject({ status: 409 });
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/tests/publish-site.test.ts`
Expected: FAIL (módulos no existen).

- [ ] **Step 3: Implementar los tres módulos**

Crea `src/publish/errors.ts`:

```ts
export class PublishError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "PublishError";
  }
}
```

Crea `src/publish/deploy-target.ts`:

```ts
// Costura para hosts externos (Cloudflare Pages, Vercel…): otra impl. copiaría los
// archivos fuera. La autoservida es no-op: el enrutado por Host ya sirve el puntero.
export interface DeployTarget {
  publish(input: { projectId: string; snapshotId: string; storagePrefix: string; subdominio: string }): Promise<{ ok: true }>;
  unpublish(input: { projectId: string; subdominio: string }): Promise<void>;
}

export const selfHostedDeploy: DeployTarget = {
  async publish() { return { ok: true }; },
  async unpublish() {},
};
```

Crea `src/publish/publish-site.ts`:

```ts
import { slugify, esSlugValido, formatoSlugValido, esReservado } from "./slug";
import { PublishError } from "./errors";
import type { DeployTarget } from "./deploy-target";
import type { ProjectStore } from "@/src/repositories/types";

async function generarSubdominio(store: ProjectStore, nombre: string): Promise<string> {
  const base = slugify(nombre);
  for (let i = 1; i <= 20; i++) {
    const sufijo = i === 1 ? "" : `-${i}`;
    const cand = base.slice(0, 63 - sufijo.length).replace(/-+$/g, "") + sufijo;
    if (esSlugValido(cand) && (await store.subdominioLibre(cand))) return cand;
  }
  throw new PublishError("No hay subdominios libres para ese nombre", 409);
}

export async function publishSite(
  deps: { store: ProjectStore; deploy: DeployTarget },
  input: { orgId: string; projectId: string }
): Promise<{ subdominio: string; publishedSnapshotId: string }> {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new PublishError("Proyecto no encontrado", 404);
  const current = await deps.store.getCurrentSnapshot(input.orgId, input.projectId);
  if (!current) throw new PublishError("El proyecto no tiene contenido que publicar", 400);

  let sub = project.subdominio;
  if (!sub) {
    sub = await generarSubdominio(deps.store, project.nombre);
    const ok = await deps.store.setSubdominio(input.orgId, input.projectId, sub);
    if (!ok) throw new PublishError("Ese subdominio ya está en uso", 409);
  }

  await deps.store.setPublished(input.orgId, input.projectId, current.id);
  await deps.deploy.publish({
    projectId: input.projectId, snapshotId: current.id,
    storagePrefix: current.storagePrefix, subdominio: sub,
  });
  return { subdominio: sub, publishedSnapshotId: current.id };
}

export async function unpublishSite(
  deps: { store: ProjectStore; deploy: DeployTarget },
  input: { orgId: string; projectId: string }
): Promise<void> {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new PublishError("Proyecto no encontrado", 404);
  await deps.store.setPublished(input.orgId, input.projectId, null);
  if (project.subdominio) {
    await deps.deploy.unpublish({ projectId: input.projectId, subdominio: project.subdominio });
  }
}

export async function cambiarSubdominio(
  deps: { store: ProjectStore },
  input: { orgId: string; projectId: string; subdominio: string }
): Promise<{ subdominio: string }> {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new PublishError("Proyecto no encontrado", 404);
  const sub = input.subdominio.trim().toLowerCase();
  if (!formatoSlugValido(sub)) {
    throw new PublishError("Subdominio no válido (minúsculas, números y guiones)", 400);
  }
  if (esReservado(sub)) throw new PublishError("Ese subdominio está reservado", 400);
  if (project.subdominio === sub) return { subdominio: sub };
  if (!(await deps.store.subdominioLibre(sub))) throw new PublishError("Ese subdominio ya está en uso", 409);
  const ok = await deps.store.setSubdominio(input.orgId, input.projectId, sub);
  if (!ok) throw new PublishError("Ese subdominio ya está en uso", 409);
  return { subdominio: sub };
}
```

- [ ] **Step 4: Verificar que pasa + suite completa**

Run: `npx vitest run src/tests/publish-site.test.ts && npx vitest run && npx tsc --noEmit`
Expected: PASS todo.

- [ ] **Step 5: Commit**

```bash
git add src/publish/errors.ts src/publish/deploy-target.ts src/publish/publish-site.ts src/tests/publish-site.test.ts
git commit -m "feat(3): publishSite/unpublishSite/cambiarSubdominio + costura DeployTarget"
```

---

### Task 5: `resolve-site.ts` (servir el sitio publicado)

**Files:**
- Create: `src/publish/resolve-site.ts`
- Test: `src/tests/resolve-site.test.ts`

**Interfaces:**
- Consumes: `parseHost` (Task 3), `ProjectStore.getPublishedSiteByHost` (Task 1), `StorageAdapter`.
- Produces: `resolvePublicSite(deps: { store: ProjectStore; storage: StorageAdapter }, input: { host: string; platformHost: string; pathSegments: string[] }): Promise<{ status: number; body: Buffer; contentType: string; cacheControl: string }>`. Lo consume Task 6 (ruta `/sites`).

- [ ] **Step 1: Tests (fallarán)**

Crea `src/tests/resolve-site.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resolvePublicSite } from "@/src/publish/resolve-site";
import type { StorageAdapter } from "@/src/storage/types";
import type {
  ProjectStore, ProjectRow, SnapshotRow, SnapshotInfo,
  CreateProjectInput, CreateSnapshotInput, AssetRow, CreateAssetInput,
} from "@/src/repositories/types";

const PLAT = "localhost:3000";
const PREFIX = "projects/p1/snapshots/s1/";
const HTML = `<!doctype html><html><head><title>t</title></head><body><h1>Hola</h1></body></html>`;

class FakeStorage implements StorageAdapter {
  files = new Map<string, Buffer>();
  async put(key: string, body: Buffer | string) { this.files.set(key, Buffer.isBuffer(body) ? body : Buffer.from(body)); }
  async get(key: string) {
    const b = this.files.get(key);
    return b ? { body: b, contentType: key.endsWith(".css") ? "text/css; charset=utf-8" : "text/html; charset=utf-8" } : null;
  }
  async list(prefix: string) { return [...this.files.keys()].filter((k) => k.startsWith(prefix)); }
  async delete(key: string) { this.files.delete(key); }
}

class FakeStore implements ProjectStore {
  sitios = new Map<string, { entryPath: string; storagePrefix: string }>(); // clave: "sub:x" | "dom:x"
  async createProjectWithSnapshot(i: CreateProjectInput) { return { projectId: i.projectId }; }
  async getProject(): Promise<ProjectRow | null> { return null; }
  async listProjects(): Promise<ProjectRow[]> { return []; }
  async setEntryPath(): Promise<void> {}
  async getCurrentSnapshot(): Promise<SnapshotRow | null> { return null; }
  async createSnapshot(_i: CreateSnapshotInput) {}
  async setCurrentSnapshot(): Promise<void> {}
  async listSnapshots(): Promise<SnapshotInfo[]> { return []; }
  async getSnapshotById(): Promise<SnapshotRow | null> { return null; }
  async createAsset(_i: CreateAssetInput) {}
  async getAsset(): Promise<AssetRow | null> { return null; }
  async getPublishedSiteByHost(q: { subdominio: string } | { dominio: string }) {
    const clave = "subdominio" in q ? `sub:${q.subdominio}` : `dom:${q.dominio}`;
    return this.sitios.get(clave) ?? null;
  }
  async setPublished(): Promise<void> {}
  async subdominioLibre(): Promise<boolean> { return true; }
  async setSubdominio(): Promise<boolean> { return true; }
}

function preparado() {
  const storage = new FakeStorage();
  storage.files.set(PREFIX + "index.html", Buffer.from(HTML));
  storage.files.set(PREFIX + "css/app.css", Buffer.from("body{}"));
  const store = new FakeStore();
  store.sitios.set("sub:cafe", { entryPath: "index.html", storagePrefix: PREFIX });
  store.sitios.set("dom:quantivatechnology.com", { entryPath: "index.html", storagePrefix: PREFIX });
  return { storage, store };
}

describe("resolvePublicSite", () => {
  it("sirve el entryPath en '/' byte-idéntico (sin <base>, sin data-wc-id) y no-cache", async () => {
    const { storage, store } = preparado();
    const r = await resolvePublicSite({ store, storage }, { host: "cafe.localhost:3000", platformHost: PLAT, pathSegments: [] });
    expect(r.status).toBe(200);
    expect(r.body.toString()).toBe(HTML);
    expect(r.body.toString()).not.toContain("<base");
    expect(r.cacheControl).toBe("no-cache");
  });

  it("sirve un asset con cache pública", async () => {
    const { storage, store } = preparado();
    const r = await resolvePublicSite({ store, storage }, { host: "cafe.localhost:3000", platformHost: PLAT, pathSegments: ["css", "app.css"] });
    expect(r.status).toBe(200);
    expect(r.contentType).toContain("text/css");
    expect(r.cacheControl).toBe("public, max-age=300");
  });

  it("resuelve por dominio propio", async () => {
    const { storage, store } = preparado();
    const r = await resolvePublicSite({ store, storage }, { host: "quantivatechnology.com", platformHost: PLAT, pathSegments: [] });
    expect(r.status).toBe(200);
  });

  it("host sin proyecto publicado → 404 'Esta web no está publicada'", async () => {
    const { storage, store } = preparado();
    const r = await resolvePublicSite({ store, storage }, { host: "nadie.localhost:3000", platformHost: PLAT, pathSegments: [] });
    expect(r.status).toBe(404);
    expect(r.body.toString()).toContain("Esta web no está publicada");
  });

  it("host de plataforma o desconocido → 404", async () => {
    const { storage, store } = preparado();
    const a = await resolvePublicSite({ store, storage }, { host: "localhost:3000", platformHost: PLAT, pathSegments: [] });
    const b = await resolvePublicSite({ store, storage }, { host: "a.b.localhost:3000", platformHost: PLAT, pathSegments: [] });
    expect(a.status).toBe(404);
    expect(b.status).toBe(404);
  });

  it("traversal → 400", async () => {
    const { storage, store } = preparado();
    const r = await resolvePublicSite({ store, storage }, { host: "cafe.localhost:3000", platformHost: PLAT, pathSegments: [".."] });
    expect(r.status).toBe(400);
  });

  it("archivo inexistente dentro del sitio → 404", async () => {
    const { storage, store } = preparado();
    const r = await resolvePublicSite({ store, storage }, { host: "cafe.localhost:3000", platformHost: PLAT, pathSegments: ["no.html"] });
    expect(r.status).toBe(404);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/tests/resolve-site.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

Crea `src/publish/resolve-site.ts`:

```ts
import { parseHost } from "./host";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

export type PublicResponse = { status: number; body: Buffer; contentType: string; cacheControl: string };

function pagina404(mensaje: string): PublicResponse {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${mensaje}</title></head>` +
    `<body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;color:#374151">` +
    `<p>${mensaje}</p></body></html>`;
  return { status: 404, body: Buffer.from(html, "utf-8"), contentType: "text/html; charset=utf-8", cacheControl: "no-cache" };
}

export async function resolvePublicSite(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { host: string; platformHost: string; pathSegments: string[] }
): Promise<PublicResponse> {
  const h = parseHost(input.host, input.platformHost);
  if (h.tipo === "plataforma" || h.tipo === "desconocido") return pagina404("Esta web no está publicada");

  const site = h.tipo === "subdominio"
    ? await deps.store.getPublishedSiteByHost({ subdominio: h.valor })
    : await deps.store.getPublishedSiteByHost({ dominio: h.valor });
  if (!site) return pagina404("Esta web no está publicada");

  if (input.pathSegments.some((s) => s === ".." || s.includes("/") || s.includes("\\"))) {
    return { status: 400, body: Buffer.from("Ruta no válida"), contentType: "text/plain; charset=utf-8", cacheControl: "no-cache" };
  }
  const rel = input.pathSegments.length > 0 ? input.pathSegments.join("/") : site.entryPath;
  const file = await deps.storage.get(site.storagePrefix + rel);
  if (!file) return pagina404("No encontrado");

  // HTML publicado: se sirve TAL CUAL (sin anotar, sin reescribir, sin <base>) — las
  // rutas root-absolutas resuelven al mismo host → mismo proyecto.
  const esHtml = /\.html?$/i.test(rel);
  return {
    status: 200, body: file.body, contentType: file.contentType,
    cacheControl: esHtml ? "no-cache" : "public, max-age=300",
  };
}
```

- [ ] **Step 4: Verificar que pasa + suite completa**

Run: `npx vitest run src/tests/resolve-site.test.ts && npx vitest run && npx tsc --noEmit`
Expected: PASS todo.

- [ ] **Step 5: Commit**

```bash
git add src/publish/resolve-site.ts src/tests/resolve-site.test.ts
git commit -m "feat(3): resolvePublicSite (sirve el snapshot publicado, HTML limpio)"
```

---

### Task 6: `middleware.ts` + ruta `/sites/[host]/[[...path]]`

**Files:**
- Create: `middleware.ts` (raíz del repo, junto a `app/`)
- Create: `app/sites/[host]/[[...path]]/route.ts`

**Interfaces:**
- Consumes: `parseHost` (Task 3), `resolvePublicSite` (Task 5), `projectStore`, `getStorage`.
- Produces: enrutado por Host end-to-end. Gate: `tsc` limpio (el e2e de Task 9 lo ejercita).

- [ ] **Step 1: Middleware**

Crea `middleware.ts` en la raíz:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { parseHost } from "@/src/publish/host";

// Hosts que no son la plataforma (subdominios de proyecto o dominios propios) se
// reescriben a la ruta interna /sites/<host>/<path>. En un host de proyecto TODO se
// sirve desde el snapshot publicado (el panel y las APIs no son alcanzables ahí).
export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  const plat = (process.env.PLATFORM_HOST ?? "localhost:3000").toLowerCase();
  if (parseHost(host, plat).tipo === "plataforma") return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = `/sites/${encodeURIComponent(host)}${req.nextUrl.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/|favicon\\.ico).*)"],
};
```

- [ ] **Step 2: Ruta pública**

Crea `app/sites/[host]/[[...path]]/route.ts`:

```ts
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { resolvePublicSite } from "@/src/publish/resolve-site";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ host: string; path?: string[] }> }) {
  const { host, path } = await ctx.params;
  const r = await resolvePublicSite(
    { store: projectStore, storage: getStorage() },
    {
      host: decodeURIComponent(host),
      platformHost: process.env.PLATFORM_HOST ?? "localhost:3000",
      pathSegments: path ?? [],
    }
  );
  return new Response(new Uint8Array(r.body), {
    status: r.status,
    headers: { "content-type": r.contentType, "cache-control": r.cacheControl },
  });
}
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit && npx vitest run`
Expected: limpio y toda la suite verde.

- [ ] **Step 4: Commit**

```bash
git add middleware.ts "app/sites/[host]/[[...path]]/route.ts"
git commit -m "feat(3): middleware por Host + ruta pública /sites"
```

---

### Task 7: Rutas API — publicar/despublicar + PATCH subdominio

**Files:**
- Create: `app/api/projects/[id]/publish/route.ts`
- Modify: `app/api/projects/[id]/route.ts` (PATCH acepta `subdominio`)

**Interfaces:**
- Consumes: `publishSite`/`unpublishSite`/`cambiarSubdominio` + `PublishError` + `selfHostedDeploy` (Task 4), `getDevContext`, `projectStore`.
- Produces: `POST /api/projects/[id]/publish` → `200 { subdominio, publishedSnapshotId }`; `DELETE` → `200 { ok: true }`; `PATCH /api/projects/[id]` con `{ subdominio }` → `200 { subdominio }` (400/409 según validación). Los consume Task 8 (UI).

- [ ] **Step 1: Ruta publish**

Crea `app/api/projects/[id]/publish/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getDevContext } from "@/src/auth/dev-stub";
import { projectStore } from "@/src/repositories/projects";
import { publishSite, unpublishSite } from "@/src/publish/publish-site";
import { selfHostedDeploy } from "@/src/publish/deploy-target";
import { PublishError } from "@/src/publish/errors";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getDevContext();
  try {
    const r = await publishSite({ store: projectStore, deploy: selfHostedDeploy }, { orgId, projectId: id });
    return NextResponse.json(r);
  } catch (e) {
    if (e instanceof PublishError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getDevContext();
  try {
    await unpublishSite({ store: projectStore, deploy: selfHostedDeploy }, { orgId, projectId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PublishError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 2: PATCH acepta subdominio**

En `app/api/projects/[id]/route.ts`, añade a los imports:

```ts
import { cambiarSubdominio } from "@/src/publish/publish-site";
import { PublishError } from "@/src/publish/errors";
```

y reemplaza el cuerpo del `PATCH` desde `const body = ...` hasta el final del handler por:

```ts
  const body = (await req.json()) as { entryPath?: string; subdominio?: string };
  if (typeof body.subdominio === "string") {
    try {
      const r = await cambiarSubdominio({ store: projectStore }, { orgId, projectId: id, subdominio: body.subdominio });
      return NextResponse.json(r);
    } catch (e) {
      if (e instanceof PublishError) return NextResponse.json({ error: e.message }, { status: e.status });
      return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
    }
  }
  if (!body.entryPath) return NextResponse.json({ error: "Falta entryPath" }, { status: 400 });
  try {
    await setEntryPath({ store: projectStore, storage: getStorage() }, { orgId, projectId: id, entryPath: body.entryPath });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 400 });
  }
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit && npx vitest run`
Expected: limpio y toda la suite verde.

- [ ] **Step 4: Commit**

```bash
git add "app/api/projects/[id]/publish/route.ts" "app/api/projects/[id]/route.ts"
git commit -m "feat(3): API publicar/despublicar + PATCH subdominio"
```

---

### Task 8: `PublishBar` + página + refresh tras guardar

**Files:**
- Create: `app/projects/[id]/PublishBar.tsx`
- Modify: `app/projects/[id]/page.tsx`
- Modify: `app/projects/[id]/PreviewPane.tsx` (solo: `router.refresh()` tras guardar/restaurar)

**Interfaces:**
- Consumes: rutas API de Task 7. Props: `{ projectId: string; subdominio: string | null; publishedSnapshotId: string | null; currentSnapshotId: string | null }`.
- Produces: UI de publicación encima del preview.

- [ ] **Step 1: Componente PublishBar**

Crea `app/projects/[id]/PublishBar.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const HOST = process.env.NEXT_PUBLIC_PLATFORM_HOST ?? "localhost:3000";

export function PublishBar({
  projectId, subdominio, publishedSnapshotId, currentSnapshotId,
}: {
  projectId: string;
  subdominio: string | null;
  publishedSnapshotId: string | null;
  currentSnapshotId: string | null;
}) {
  const router = useRouter();
  const [sub, setSub] = useState(subdominio ?? "");
  const [editandoSub, setEditandoSub] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proto, setProto] = useState("http:");
  useEffect(() => { setProto(window.location.protocol); }, []);

  const publicado = !!publishedSnapshotId;
  const sinPublicar = publicado && currentSnapshotId !== publishedSnapshotId;
  const url = subdominio ? `${proto}//${subdominio}.${HOST}` : null;

  async function llamar(metodo: "POST" | "DELETE") {
    setOcupado(true); setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/publish`, { method: metodo });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); return; }
      setConfirmando(false);
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  async function guardarSub() {
    setOcupado(true); setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ subdominio: sub }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string; subdominio?: string };
      if (!res.ok) { setError(d.error ?? "Error"); return; }
      setEditandoSub(false);
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border bg-gray-50 px-3 py-2">
      {!publicado ? (
        <>
          <span className="text-sm text-gray-600">Sin publicar</span>
          <button onClick={() => void llamar("POST")} disabled={ocupado}
            className="rounded bg-emerald-600 px-3 py-1 text-sm text-white disabled:opacity-50">
            Publicar
          </button>
        </>
      ) : (
        <>
          <span className="text-sm font-medium text-emerald-700">Publicado:</span>
          {url && <a href={url} target="_blank" rel="noreferrer" className="text-sm text-emerald-700 underline">{url}</a>}
          {sinPublicar && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Tienes cambios sin publicar</span>}
          <button onClick={() => void llamar("POST")} disabled={ocupado}
            className="rounded bg-emerald-600 px-3 py-1 text-sm text-white disabled:opacity-50">
            Republicar
          </button>
          {!confirmando ? (
            <button onClick={() => setConfirmando(true)} disabled={ocupado} className="rounded border px-3 py-1 text-sm">
              Despublicar
            </button>
          ) : (
            <button onClick={() => void llamar("DELETE")} disabled={ocupado}
              className="rounded border border-red-300 bg-red-50 px-3 py-1 text-sm text-red-700">
              ¿Seguro? Sí, despublicar
            </button>
          )}
        </>
      )}

      {subdominio !== null && (
        !editandoSub ? (
          <button onClick={() => { setSub(subdominio); setEditandoSub(true); }} className="text-xs text-gray-500 underline">
            cambiar subdominio
          </button>
        ) : (
          <span className="flex items-center gap-1">
            <input value={sub} onChange={(e) => setSub(e.target.value)}
              className="rounded border px-2 py-0.5 text-sm" placeholder="mi-subdominio" />
            <button onClick={() => void guardarSub()} disabled={ocupado} className="rounded border px-2 py-0.5 text-xs">Guardar</button>
            <button onClick={() => setEditandoSub(false)} className="text-xs text-gray-500">cancelar</button>
          </span>
        )
      )}

      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
```

- [ ] **Step 2: Página**

En `app/projects/[id]/page.tsx`, añade el import:

```ts
import { PublishBar } from "./PublishBar";
```

y justo antes de `<PreviewPane …/>` añade:

```tsx
      <PublishBar
        projectId={id}
        subdominio={project.subdominio}
        publishedSnapshotId={project.publishedSnapshotId}
        currentSnapshotId={project.currentSnapshotId}
      />
```

- [ ] **Step 3: Refresh tras guardar/restaurar (PreviewPane)**

En `app/projects/[id]/PreviewPane.tsx`:
- Añade el import: `import { useRouter } from "next/navigation";`
- Dentro del componente, tras los `useState`: `const router = useRouter();`
- En `guardarEdicion`, dentro del `if (res.ok) { … }`, añade al final: `router.refresh();`
- En `restaurar`, tras `setRecarga((n) => n + 1);`, añade: `router.refresh();`

(Esto re-renderiza los server components → `PublishBar` recibe el `currentSnapshotId` fresco y el aviso «cambios sin publicar» es fiable.)

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit && npx vitest run`
Expected: limpio y verde.

- [ ] **Step 5: Commit**

```bash
git add "app/projects/[id]/PublishBar.tsx" "app/projects/[id]/page.tsx" "app/projects/[id]/PreviewPane.tsx"
git commit -m "feat(3): PublishBar (publicar/republicar/despublicar + subdominio) + refresh"
```

---

### Task 9: Verificación e2e + captura visual

**Files:**
- Create: `<scratchpad>/e2e-3.mjs` (no se versiona)

> Scratchpad de la sesión:
> `C:\Users\Sebas\AppData\Local\Temp\claude\c--Users-Sebas-Desktop-Carpeta-de-Proyectos-Wordclicks\31c53a9f-b67f-44b1-92a8-2170d00b1dd0\scratchpad`

**Interfaces:**
- Consumes: servidor dev en `http://localhost:3000` + todas las rutas. Node `fetch` **no permite forzar `Host`** → las peticiones públicas usan `curl -H "Host: …"` vía `execSync`.

- [ ] **Step 1: Arrancar el servidor (background)**

Run (background): `npm run dev`; espera 200 en `http://localhost:3000/`.

- [ ] **Step 2: Script e2e**

Crea `<scratchpad>/e2e-3.mjs`:

```js
import { execSync } from "node:child_process";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (c, m) => { (c ? pass++ : fail++); console.log((c ? "PASS  " : "FAIL  ") + m); };

// curl con Host forzado (fetch de Node no lo permite)
function curl(host, path = "/") {
  const out = execSync(`curl -s -o - -w "\\n__ST__%{http_code}" -H "Host: ${host}" "http://127.0.0.1:3000${path}"`).toString();
  const i = out.lastIndexOf("\n__ST__");
  return { body: out.slice(0, i), status: Number(out.slice(i + 7)) };
}

// 1) zip de prueba
const dir = mkdtempSync(join(tmpdir(), "wc3-"));
writeFileSync(join(dir, "index.html"),
  `<!doctype html><html><head><title>t</title></head><body><h1>Hola Publicada</h1><img src="/orig.png"></body></html>`);
const zip = join(dir, "site.zip");
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${join(dir, "index.html")}' -DestinationPath '${zip}' -Force"`);

// 2) importar (nombre con acentos → slug)
const fd = new FormData();
fd.append("file", new Blob([readFileSync(zip)], { type: "application/zip" }), "site.zip");
fd.append("nombre", "Cafetería Pública");
const imp = await fetch(`${BASE}/api/projects`, { method: "POST", body: fd });
const pid = (await imp.json()).projectId;
ok(imp.status === 201 && !!pid, "import 201 — " + pid);

// 3) publicar → slug generado
const pub = await fetch(`${BASE}/api/projects/${pid}/publish`, { method: "POST" });
const pubJson = await pub.json();
ok(pub.status === 200 && pubJson.subdominio === "cafeteria-publica", "publish 200, slug=" + pubJson.subdominio);
const HOSTPUB = `${pubJson.subdominio}.localhost:3000`;

// 4) el sitio se sirve limpio
let r = curl(HOSTPUB);
ok(r.status === 200 && r.body.includes("Hola Publicada"), "sitio publicado sirve el HTML");
ok(!r.body.includes("data-wc-id") && !r.body.includes("<base"), "HTML público limpio (sin data-wc-id ni <base>)");

// 5) editar + guardar NO cambia lo publicado
const editHtml = await (await fetch(`${BASE}/api/projects/${pid}/preview/?edit=1`)).text();
const idH1 = (editHtml.match(/<h1[^>]*data-wc-id="(\d+)"/) || [])[1];
const save = await fetch(`${BASE}/api/projects/${pid}/edits`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ ops: [{ page: "index.html", nodeId: Number(idH1), kind: "text", value: "Version Nueva" }] }),
});
ok(save.status === 201, "edición guardada (borrador)");
r = curl(HOSTPUB);
ok(r.body.includes("Hola Publicada") && !r.body.includes("Version Nueva"), "lo publicado NO cambió tras guardar");

// 6) republicar SÍ cambia
await fetch(`${BASE}/api/projects/${pid}/publish`, { method: "POST" });
r = curl(HOSTPUB);
ok(r.body.includes("Version Nueva"), "republicar actualiza lo publicado");

// 7) host desconocido → 404
r = curl("nadie.localhost:3000");
ok(r.status === 404 && r.body.includes("Esta web no está publicada"), "host desconocido → 404");

// 8) PATCH subdominio: inválido 400, reservado 400, ocupado 409, válido 200
const patch = (sub) => fetch(`${BASE}/api/projects/${pid}`, {
  method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ subdominio: sub }),
});
ok((await patch("-malo-")).status === 400, "subdominio inválido → 400");
ok((await patch("www")).status === 400, "subdominio reservado → 400");
// segundo proyecto para colisión
const fd2 = new FormData();
fd2.append("file", new Blob([readFileSync(zip)], { type: "application/zip" }), "site.zip");
fd2.append("nombre", "Otro Proyecto");
const pid2 = (await (await fetch(`${BASE}/api/projects`, { method: "POST", body: fd2 })).json()).projectId;
await fetch(`${BASE}/api/projects/${pid2}/publish`, { method: "POST" });
ok((await patch("otro-proyecto")).status === 409, "subdominio ocupado → 409");
const okPatch = await patch("cafeteria-renombrada");
ok(okPatch.status === 200, "subdominio válido → 200");
r = curl("cafeteria-renombrada.localhost:3000");
ok(r.status === 200, "el sitio responde en el nuevo subdominio");

// 9) despublicar → 404
const del = await fetch(`${BASE}/api/projects/${pid}/publish`, { method: "DELETE" });
ok(del.status === 200, "despublicar 200");
r = curl("cafeteria-renombrada.localhost:3000");
ok(r.status === 404, "tras despublicar → 404");

// 10) el panel sigue vivo en el host de la plataforma
const panel = await fetch(`${BASE}/api/projects/${pid}/preview/`);
ok(panel.ok, "preview del panel sigue funcionando en localhost");

console.log(`\n=== ${pass}/${pass + fail} checks PASS ===`);
console.log("PROJECT_ID=" + pid + "  SUB2=otro-proyecto");
process.exit(fail ? 1 : 0);
```

- [ ] **Step 3: Ejecutar**

Run: `node "<scratchpad>/e2e-3.mjs"`
Expected: `=== N/N checks PASS ===` con 0 fallos.

- [ ] **Step 4: Captura visual**

El sitio del segundo proyecto quedó publicado (`otro-proyecto`). Ejecuta (Edge resuelve `*.localhost` solo):

```bash
"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --window-size=1280,900 --screenshot="<scratchpad>/3-publicado.png" "http://otro-proyecto.localhost:3000/"
```

Y otra del panel (PublishBar):

```bash
"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --window-size=1280,1000 --virtual-time-budget=6000 --screenshot="<scratchpad>/3-panel.png" "http://localhost:3000/projects/<PROJECT_ID_2>"
```

Revisa ambas imágenes (cárgalas): el sitio se ve como la web original; el panel muestra la barra de publicación con URL.

- [ ] **Step 5: Parar el servidor**

```bash
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object -Expand OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }"
```

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "test(3): e2e publicar/republicar/despublicar + subdominios verificado"
```

---

## Self-Review

**1. Cobertura del spec:**
- §2 modelo (publishedSnapshotId, unique subdominio, migración, slug primera publicación) → Tasks 1, 2, 4. ✔
- §2.1 reglas de slug → Task 2 (regex/reservados exactos). ✔
- §3.1 middleware + PLATFORM_HOST → Task 6 (usa parseHost como única fuente). ✔
- §3.2 parseHost (+ loopback dev) → Task 3. ✔
- §3.3 servir sitio (limpio, entryPath, traversal, cache, 404) → Tasks 5, 6. ✔
- §4 PublishBar (URL, editable, aviso, republicar, despublicar 2-pasos) → Task 8. ✔
- §5 API + errores exactos → Tasks 4, 7. ✔
- §6 DeployTarget/SelfHosted → Task 4. ✔
- §7 seguridad (solo publicado, host estricto, slug servidor, org-scoped) → Tasks 3, 4, 5, 7. ✔
- §8 errores → Tasks 4, 5, 7 (mensajes verbatim en Global Constraints). ✔
- §10 testing → Tasks 2–5 (unit/fakes) + Task 9 (e2e/visual, con curl por la limitación de Host en fetch). ✔

**2. Placeholders:** ninguno; todos los pasos llevan código/comandos completos.

**3. Consistencia de tipos:** `HostInfo`/`parseHost` (T3) → T5/T6; métodos del store (T1) → T4/T5; `PublishError`/`DeployTarget`/`selfHostedDeploy`/firmas de publish-site (T4) → T7; props de `PublishBar` (T8) = campos de `ProjectRow` (T1); mensajes de error idénticos entre Global Constraints, T4 y e2e (T9).

**Notas de ejecución:** la Task 1 toca la BD real (`db:push`) — tabla vacía, sin riesgo. El e2e de Task 9 asume BD limpiada previamente para que `cafeteria-publica` esté libre (si no, el assert del slug exacto fallaría; limpiar BD antes si hace falta, como se hizo en esta sesión con `_dbclean`).
