# Incremento 3b — Plataforma en internet: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poner Wordclicks en producción: panel con contraseña en `app.PLATAFORMA.com`, sitios en `*.PLATAFORMA.com` y en dominios propios de clientes (vía API de Dokploy), archivos en Supabase Storage, build Docker desplegable en el VPS existente del usuario.

**Architecture:** Se generaliza `parseHost` para separar el host del panel (`PLATFORM_HOST`) de la base de subdominios (`SITES_BASE_DOMAIN`). Un candado de contraseña única (cookie HMAC host-only verificada en middleware Edge) protege el panel. La costura `DeployTarget` gana `connectDomain`/`disconnectDomain` con una implementación real contra la API REST de Dokploy. `StorageAdapter` gana una implementación Supabase Storage elegida por env. El build pasa a `output: "standalone"` + Dockerfile multi-stage.

**Tech Stack:** Next.js 16 (App Router + middleware Edge), TypeScript strict, Drizzle + postgres-js (Supabase pooler), `@supabase/supabase-js` (Storage), vitest, Docker (node:22-alpine), Dokploy/Traefik (infra existente del usuario).

**Spec:** `docs/superpowers/specs/2026-07-04-incremento-3b-plataforma-en-internet-design.md`

## Global Constraints

- Rama de trabajo: `feat/incremento-3b-plataforma` (crear desde master antes de la Tarea 1).
- Código, comentarios y textos de UI **en español**, siguiendo el estilo existente.
- Mensajes de error **exactos** (copiar literal):
  - `Dominio no válido (ejemplo: miempresa.com)` (400)
  - `Ese dominio ya está conectado a otro proyecto` (409)
  - `No se pudo activar el dominio en el servidor. Vuelve a intentarlo en unos minutos.` (502)
  - `Contraseña incorrecta` (401)
  - `No autorizado` (401, APIs sin cookie)
  - `Candado no configurado (PANEL_PASSWORD/SESSION_SECRET)` (500)
  - `Proyecto no encontrado` (404)
- **Prohibido `NEXT_PUBLIC_*`**: la config llega al cliente como props desde server components. `NEXT_PUBLIC_PLATFORM_HOST` se elimina.
- Defaults dev sin fricción: `STORAGE_DRIVER` ausente ⇒ local; `DEPLOY_TARGET` ausente ⇒ self; `SITES_BASE_DOMAIN` ausente ⇒ `PLATFORM_HOST`.
- El serving público sigue **byte-idéntico** (sin anotar/reescribir/`<base>`); el guard de traversal no se relaja.
- La suite existente (147 tests) y `npm run typecheck` deben seguir verdes tras cada tarea.
- TDD: test que falla → implementación mínima → verde → commit.
- La cookie de sesión **no lleva atributo `Domain`** (host-only) — es la garantía de aislamiento del spec.

---

### Task 1: parseHost v2 — panel separado de la base de sitios + redirect de raíz

**Files:**
- Modify: `src/publish/host.ts`
- Modify: `middleware.ts`
- Modify: `src/publish/resolve-site.ts` (solo la firma/clasificación; el redirect www es Tarea 2)
- Modify: `app/sites/[host]/[[...path]]/route.ts`
- Test: `src/tests/host.test.ts`

**Interfaces:**
- Consumes: `parseHost(hostRaw, platformHost)` actual y su tipo `HostInfo`.
- Produces: `parseHost(hostRaw: string, platformHost: string, sitesBaseDomain?: string): HostInfo` con nuevo variant `{ tipo: "raiz" }`. `resolvePublicSite` acepta `sitesBaseDomain?: string` en su input. Tareas 5 y 9 dependen de `SITES_BASE_DOMAIN`.

- [ ] **Step 1: Tests nuevos en `src/tests/host.test.ts`** (añadir al final del archivo; los describe existentes no se tocan)

```ts
describe("parseHost con panel separado (producción)", () => {
  const PANEL = "app.plataforma.com";
  const BASE = "plataforma.com";
  it("host del panel", () => {
    expect(parseHost("app.plataforma.com", PANEL, BASE)).toEqual({ tipo: "plataforma" });
  });
  it("raíz del dominio madre", () => {
    expect(parseHost("plataforma.com", PANEL, BASE)).toEqual({ tipo: "raiz" });
  });
  it("subdominio de sitio bajo la base", () => {
    expect(parseHost("cafeteria.plataforma.com", PANEL, BASE))
      .toEqual({ tipo: "subdominio", valor: "cafeteria" });
  });
  it("multi-etiqueta bajo la base → desconocido", () => {
    expect(parseHost("a.b.plataforma.com", PANEL, BASE)).toEqual({ tipo: "desconocido" });
  });
  it("dominio propio", () => {
    expect(parseHost("quantivatechnology.com", PANEL, BASE))
      .toEqual({ tipo: "dominio", valor: "quantivatechnology.com" });
  });
  it("sin tercer argumento se comporta como hoy (dev)", () => {
    expect(parseHost("sub.localhost:3000", "localhost:3000"))
      .toEqual({ tipo: "subdominio", valor: "sub" });
    expect(parseHost("localhost:3000", "localhost:3000")).toEqual({ tipo: "plataforma" });
  });
});
```

- [ ] **Step 2: Ejecutar y ver fallar**

Run: `npx vitest run src/tests/host.test.ts`
Expected: FAIL (los casos nuevos; TS se queja del tercer argumento).

- [ ] **Step 3: Implementación en `src/publish/host.ts`** (archivo completo)

```ts
export type HostInfo =
  | { tipo: "plataforma" }
  | { tipo: "raiz" }
  | { tipo: "subdominio"; valor: string }
  | { tipo: "dominio"; valor: string }
  | { tipo: "desconocido" };

// Clasifica el Host de una petición.
// - `platformHost`: autoridad completa del PANEL (con puerto en dev, p. ej.
//   "localhost:3000"; en producción "app.PLATAFORMA.com").
// - `sitesBaseDomain`: base de los subdominios de sitios publicados. En dev no se
//   define y coincide con platformHost; en producción es "PLATAFORMA.com".
export function parseHost(
  hostRaw: string,
  platformHost: string,
  sitesBaseDomain: string = platformHost
): HostInfo {
  const host = (hostRaw ?? "").trim().toLowerCase();
  const plat = platformHost.trim().toLowerCase();
  const base = sitesBaseDomain.trim().toLowerCase();
  if (!host) return { tipo: "desconocido" };
  if (host === plat) return { tipo: "plataforma" };

  const sinPuerto = host.replace(/:\d+$/, "");
  // Loopback directo (127.0.0.1, ::1) = la plataforma en dev.
  if (sinPuerto === "127.0.0.1" || sinPuerto === "::1" || sinPuerto === "[::1]") {
    return { tipo: "plataforma" };
  }

  // La raíz del dominio madre (solo existe como caso distinto en producción).
  if (host === base) return { tipo: "raiz" };

  if (host.endsWith("." + base)) {
    const sub = host.slice(0, host.length - base.length - 1);
    if (!sub || sub.includes(".") || !/^[a-z0-9-]+$/.test(sub)) return { tipo: "desconocido" };
    return { tipo: "subdominio", valor: sub };
  }

  if (!/^[a-z0-9.-]+$/.test(sinPuerto) || sinPuerto.includes("..")) return { tipo: "desconocido" };
  return { tipo: "dominio", valor: sinPuerto };
}
```

- [ ] **Step 4: `middleware.ts`** (archivo completo; el candado llegará en la Tarea 7)

```ts
import { NextResponse, type NextRequest } from "next/server";
import { parseHost } from "@/src/publish/host";

// Hosts que no son la plataforma (subdominios de proyecto o dominios propios) se
// reescriben a la ruta interna /sites/<host>/<path>. La raíz del dominio madre
// redirige al panel. En un host de proyecto TODO se sirve desde el snapshot
// publicado (el panel y las APIs no son alcanzables ahí).
export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  const plat = (process.env.PLATFORM_HOST ?? "localhost:3000").toLowerCase();
  const base = (process.env.SITES_BASE_DOMAIN ?? plat).toLowerCase();
  const info = parseHost(host, plat, base);
  if (info.tipo === "plataforma") return NextResponse.next();
  if (info.tipo === "raiz") {
    return NextResponse.redirect(`https://${plat}${req.nextUrl.pathname}`, 307);
  }
  const url = req.nextUrl.clone();
  url.pathname = `/sites/${encodeURIComponent(host)}${req.nextUrl.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/|favicon\\.ico).*)"],
};
```

- [ ] **Step 5: `resolvePublicSite` acepta la base** — en `src/publish/resolve-site.ts`:
  - Input: `{ host: string; platformHost: string; sitesBaseDomain?: string; pathSegments: string[] }`.
  - Línea de clasificación: `const h = parseHost(input.host, input.platformHost, input.sitesBaseDomain ?? input.platformHost);`
  - Guard: `if (h.tipo === "plataforma" || h.tipo === "raiz" || h.tipo === "desconocido") return pagina404("Esta web no está publicada");`
  - En `app/sites/[host]/[[...path]]/route.ts` añadir al objeto input: `sitesBaseDomain: process.env.SITES_BASE_DOMAIN ?? process.env.PLATFORM_HOST ?? "localhost:3000",`

- [ ] **Step 6: Verificar**

Run: `npx vitest run` → todo verde (25 archivos + los casos nuevos). `npm run typecheck` → sin errores.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(3b): parseHost v2 — PLATFORM_HOST (panel) separado de SITES_BASE_DOMAIN + redirect de raíz"
```

---

### Task 2: Redirect `www.cliente.com` → `cliente.com` en el serving público

**Files:**
- Modify: `src/publish/resolve-site.ts`
- Modify: `app/sites/[host]/[[...path]]/route.ts`
- Test: `src/tests/resolve-site.test.ts` (añadir describe al final)

**Interfaces:**
- Consumes: `resolvePublicSite` y `PublicResponse` de la Tarea 1; `getPublishedSiteByHost({ dominio })` existente.
- Produces: `PublicResponse` gana `location?: string` (solo presente con status 301). La ruta `/sites` emite la cabecera `Location`.

- [ ] **Step 1: Tests** (añadir al final de `src/tests/resolve-site.test.ts`, reutilizando el patrón de fakes del archivo; si sus fakes difieren, crear fakes locales del describe como estos)

```ts
describe("redirect www → dominio pelado", () => {
  const storeConDominio = (dominio: string) => ({
    async getPublishedSiteByHost(q: { subdominio: string } | { dominio: string }) {
      if ("dominio" in q && q.dominio === dominio)
        return { entryPath: "index.html", storagePrefix: "p/" };
      return null;
    },
  }) as unknown as import("@/src/repositories/types").ProjectStore;
  const storage = {
    async get() { return { body: Buffer.from("<html>ok</html>"), contentType: "text/html; charset=utf-8" }; },
    async put() {}, async list() { return []; }, async delete() {},
  } as unknown as import("@/src/storage/types").StorageAdapter;

  it("www de un dominio publicado → 301 al pelado conservando la ruta", async () => {
    const r = await resolvePublicSite(
      { store: storeConDominio("cliente.com"), storage },
      { host: "www.cliente.com", platformHost: "app.plataforma.com", sitesBaseDomain: "plataforma.com", pathSegments: ["contacto.html"] }
    );
    expect(r.status).toBe(301);
    expect(r.location).toBe("https://cliente.com/contacto.html");
  });
  it("www sin ruta → 301 a la raíz", async () => {
    const r = await resolvePublicSite(
      { store: storeConDominio("cliente.com"), storage },
      { host: "www.cliente.com", platformHost: "app.plataforma.com", sitesBaseDomain: "plataforma.com", pathSegments: [] }
    );
    expect(r.status).toBe(301);
    expect(r.location).toBe("https://cliente.com/");
  });
  it("www de un dominio NO publicado → 404 normal", async () => {
    const r = await resolvePublicSite(
      { store: storeConDominio("otro.com"), storage },
      { host: "www.cliente.com", platformHost: "app.plataforma.com", sitesBaseDomain: "plataforma.com", pathSegments: [] }
    );
    expect(r.status).toBe(404);
  });
});
```

- [ ] **Step 2: Ver fallar** — `npx vitest run src/tests/resolve-site.test.ts` → FAIL (`location` no existe / status 404).

- [ ] **Step 3: Implementación** en `src/publish/resolve-site.ts`:
  - `PublicResponse` pasa a: `{ status: number; body: Buffer; contentType: string; cacheControl: string; location?: string }`.
  - **Mover el guard de traversal** para que se evalúe justo después de `parseHost` (antes de cualquier lookup): así ningún segmento malicioso llega ni al redirect ni al storage.
  - Después del guard y antes del lookup normal:

```ts
  // www.cliente.com → 301 al dominio pelado (canónico), si ese pelado está publicado.
  if (h.tipo === "dominio" && h.valor.startsWith("www.")) {
    const pelado = h.valor.slice(4);
    const canonico = await deps.store.getPublishedSiteByHost({ dominio: pelado });
    if (canonico) {
      const ruta = input.pathSegments.length > 0 ? "/" + input.pathSegments.join("/") : "/";
      return {
        status: 301, body: Buffer.alloc(0), contentType: "text/plain; charset=utf-8",
        cacheControl: "no-cache", location: `https://${pelado}${ruta}`,
      };
    }
  }
```

  - En `app/sites/[host]/[[...path]]/route.ts`, construir headers condicionalmente:

```ts
  const headers: Record<string, string> = { "content-type": r.contentType, "cache-control": r.cacheControl };
  if (r.location) headers.location = r.location;
  return new Response(new Uint8Array(r.body), { status: r.status, headers });
```

- [ ] **Step 4: Verde + regresión** — `npx vitest run` y `npm run typecheck`.

- [ ] **Step 5: Commit** — `git add -A; git commit -m "feat(3b): www.cliente.com redirige 301 al dominio pelado"`

---

### Task 3: Dominio propio — normalización/validación, unique en BD, repos y flujo conectar/quitar

**Files:**
- Create: `src/publish/domain.ts`
- Modify: `src/db/schema.ts` (línea `dominio`)
- Modify: `src/repositories/types.ts`, `src/repositories/projects.ts`
- Modify: `src/publish/deploy-target.ts`
- Modify: `src/publish/publish-site.ts`
- Test: `src/tests/domain.test.ts` (nuevo), `src/tests/domain-connect.test.ts` (nuevo)

**Interfaces:**
- Consumes: `PublishError(message, status)`, `ProjectStore`, `DeployTarget` existentes.
- Produces (las usan Tareas 4 y 5):
  - `normalizarDominio(input: string): string`
  - `formatoDominioValido(d: string): boolean`
  - `dominioProhibido(d: string, platformHost: string, sitesBaseDomain: string): boolean`
  - `DeployTarget` += `connectDomain(input: { dominio: string }): Promise<void>` y `disconnectDomain(input: { dominio: string }): Promise<void>` (selfHostedDeploy: no-ops)
  - `ProjectStore` += `dominioLibre(dominio: string): Promise<boolean>` y `setDominio(orgId: string, projectId: string, dominio: string | null): Promise<boolean>` (false = 23505 en carrera)
  - `conectarDominio(deps: { store; deploy }, input: { orgId; projectId; dominio; platformHost; sitesBaseDomain }): Promise<{ dominio: string }>`
  - `quitarDominio(deps: { store; deploy }, input: { orgId; projectId }): Promise<void>`

- [ ] **Step 1: Tests puros — `src/tests/domain.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { normalizarDominio, formatoDominioValido, dominioProhibido } from "@/src/publish/domain";

describe("normalizarDominio", () => {
  it("minúsculas, sin esquema, sin ruta, sin www, sin punto final", () => {
    expect(normalizarDominio("HTTPS://WWW.Mi-Empresa.com/contacto?x=1")).toBe("mi-empresa.com");
    expect(normalizarDominio("  cliente.es. ")).toBe("cliente.es");
    expect(normalizarDominio("http://foo.bar.baz")).toBe("foo.bar.baz");
  });
});

describe("formatoDominioValido", () => {
  it("acepta dominios reales", () => {
    for (const d of ["miempresa.com", "quantivatechnology.com", "a.co", "sub.dominio.es", "xn--espaa-rta.com"]) {
      expect(formatoDominioValido(d), d).toBe(true);
    }
  });
  it("rechaza basura, IPs y labels malos", () => {
    for (const d of ["", "sin-punto", "-mal.com", "mal-.com", "1.2.3.4", "foo..com", "foo.c", "foo.com/x", "foo .com", "*.foo.com"]) {
      expect(formatoDominioValido(d), d).toBe(false);
    }
  });
});

describe("dominioProhibido", () => {
  it("prohíbe la plataforma, la base y todo lo que cuelgue de ellas", () => {
    expect(dominioProhibido("plataforma.com", "app.plataforma.com", "plataforma.com")).toBe(true);
    expect(dominioProhibido("app.plataforma.com", "app.plataforma.com", "plataforma.com")).toBe(true);
    expect(dominioProhibido("x.plataforma.com", "app.plataforma.com", "plataforma.com")).toBe(true);
    expect(dominioProhibido("sub.localhost", "localhost:3000", "localhost:3000")).toBe(true);
  });
  it("permite dominios ajenos", () => {
    expect(dominioProhibido("cliente.com", "app.plataforma.com", "plataforma.com")).toBe(false);
    expect(dominioProhibido("miplataforma.com.es", "app.plataforma.com", "plataforma.com")).toBe(false);
  });
});
```

- [ ] **Step 2: Ver fallar** — `npx vitest run src/tests/domain.test.ts` → FAIL (módulo no existe).

- [ ] **Step 3: `src/publish/domain.ts`** (archivo completo)

```ts
// Reglas del dominio propio de un proyecto. Se guarda siempre "pelado" (sin www.):
// el serving redirige www → pelado (resolve-site).
const RE_DOMINIO = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

export function normalizarDominio(input: string): string {
  let d = input.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "");
  d = d.replace(/[/?#].*$/, ""); // quita ruta, query o fragmento
  d = d.replace(/\.$/, "");      // punto final DNS
  if (d.startsWith("www.")) d = d.slice(4);
  return d;
}

export function formatoDominioValido(d: string): boolean {
  return RE_DOMINIO.test(d);
}

// Un proyecto no puede reclamar el dominio de la propia plataforma ni nada bajo él
// (secuestraría el panel o los subdominios de otros proyectos).
export function dominioProhibido(d: string, platformHost: string, sitesBaseDomain: string): boolean {
  const plat = platformHost.trim().toLowerCase().replace(/:\d+$/, "");
  const base = sitesBaseDomain.trim().toLowerCase().replace(/:\d+$/, "");
  for (const raiz of [plat, base]) {
    if (!raiz) continue;
    if (d === raiz || d.endsWith("." + raiz)) return true;
  }
  return false;
}
```

- [ ] **Step 4: Verde el test puro** — `npx vitest run src/tests/domain.test.ts`.

- [ ] **Step 5: BD — unique en `dominio`.**
  - En `src/db/schema.ts`: `dominio: text("dominio").unique(),`
  - `drizzle-kit push` pregunta interactivo con tablas no vacías (lección del inc. 3): aplicar DDL manual. Crear `_dbddl.mjs` **en la raíz del proyecto** (no en scratchpad — ahí no resuelve `postgres`):

```js
import postgres from "postgres";
import { readFileSync } from "node:fs";
const url = readFileSync(".env.local", "utf-8").match(/^DATABASE_URL=(.+)$/m)[1].trim();
const sql = postgres(url, { prepare: false, max: 1 });
await sql`ALTER TABLE projects ADD CONSTRAINT "projects_dominio_unique" UNIQUE("dominio")`;
console.log("constraint projects_dominio_unique creada");
await sql.end();
```

  - Run: `node _dbddl.mjs` → `constraint projects_dominio_unique creada`.
  - Verificar: `npm run db:push` → `[✓] Changes applied` sin acciones o «No changes detected» (no debe proponer nada sobre `dominio`).
  - Borrar el script: `del _dbddl.mjs` (PowerShell: `Remove-Item _dbddl.mjs`).

- [ ] **Step 6: Repos.** En `src/repositories/types.ts`, añadir a `ProjectStore`:

```ts
  dominioLibre(dominio: string): Promise<boolean>;
  /** false si el dominio ya está en uso (violación de unicidad en carrera). null desconecta. */
  setDominio(orgId: string, projectId: string, dominio: string | null): Promise<boolean>;
```

En `src/repositories/projects.ts` (espejo exacto de `subdominioLibre`/`setSubdominio`):

```ts
  async dominioLibre(dominio: string): Promise<boolean> {
    const r = await db.select({ id: projects.id }).from(projects)
      .where(eq(projects.dominio, dominio)).limit(1);
    return !r[0];
  }

  async setDominio(orgId: string, projectId: string, dominio: string | null): Promise<boolean> {
    try {
      await db.update(projects).set({ dominio })
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

- [ ] **Step 7: `DeployTarget` crece.** `src/publish/deploy-target.ts` (archivo completo):

```ts
// Costura para el destino de despliegue. La impl. autoservida es no-op: el enrutado
// por Host ya sirve el puntero. La impl. Dokploy (producción) registra dominios
// propios en Traefik vía API para que emita sus certificados.
export interface DeployTarget {
  publish(input: { projectId: string; snapshotId: string; storagePrefix: string; subdominio: string }): Promise<{ ok: true }>;
  unpublish(input: { projectId: string; subdominio: string }): Promise<void>;
  connectDomain(input: { dominio: string }): Promise<void>;
  disconnectDomain(input: { dominio: string }): Promise<void>;
}

export const selfHostedDeploy: DeployTarget = {
  async publish() { return { ok: true }; },
  async unpublish() {},
  async connectDomain() {},
  async disconnectDomain() {},
};
```

- [ ] **Step 8: Tests del flujo — `src/tests/domain-connect.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { conectarDominio, quitarDominio } from "@/src/publish/publish-site";
import { PublishError } from "@/src/publish/errors";
import type { ProjectStore } from "@/src/repositories/types";
import type { DeployTarget } from "@/src/publish/deploy-target";

const HOSTS = { platformHost: "app.plataforma.com", sitesBaseDomain: "plataforma.com" };

function fakeStore(overrides: Partial<Record<string, unknown>> = {}) {
  const estado = { dominio: null as string | null, setLlamadas: [] as (string | null)[] };
  const store = {
    async getProject() {
      return { id: "p1", orgId: "o1", nombre: "X", entryPath: "index.html",
        currentSnapshotId: "s1", subdominio: "x", dominio: estado.dominio,
        publishedSnapshotId: "s1", createdAt: "" };
    },
    async dominioLibre() { return true; },
    async setDominio(_o: string, _p: string, d: string | null) { estado.setLlamadas.push(d); estado.dominio = d; return true; },
    ...overrides,
  } as unknown as ProjectStore;
  return { store, estado };
}

function fakeDeploy() {
  const llamadas: string[] = [];
  const deploy: DeployTarget = {
    async publish() { return { ok: true }; },
    async unpublish() {},
    async connectDomain({ dominio }) { llamadas.push(`connect:${dominio}`); },
    async disconnectDomain({ dominio }) { llamadas.push(`disconnect:${dominio}`); },
  };
  return { deploy, llamadas };
}

describe("conectarDominio", () => {
  it("normaliza, llama al deploy y guarda", async () => {
    const { store, estado } = fakeStore();
    const { deploy, llamadas } = fakeDeploy();
    const r = await conectarDominio({ store, deploy }, { orgId: "o1", projectId: "p1", dominio: "WWW.Cliente.COM/", ...HOSTS });
    expect(r).toEqual({ dominio: "cliente.com" });
    expect(llamadas).toEqual(["connect:cliente.com"]);
    expect(estado.setLlamadas).toEqual(["cliente.com"]);
  });
  it("formato malo → 400 con mensaje exacto y sin tocar deploy ni BD", async () => {
    const { store, estado } = fakeStore();
    const { deploy, llamadas } = fakeDeploy();
    await expect(conectarDominio({ store, deploy }, { orgId: "o1", projectId: "p1", dominio: "sin-punto", ...HOSTS }))
      .rejects.toMatchObject({ message: "Dominio no válido (ejemplo: miempresa.com)", status: 400 });
    expect(llamadas).toEqual([]);
    expect(estado.setLlamadas).toEqual([]);
  });
  it("dominio de la plataforma → 400", async () => {
    const { store } = fakeStore();
    const { deploy } = fakeDeploy();
    await expect(conectarDominio({ store, deploy }, { orgId: "o1", projectId: "p1", dominio: "malo.plataforma.com", ...HOSTS }))
      .rejects.toMatchObject({ status: 400 });
  });
  it("ocupado → 409 con mensaje exacto", async () => {
    const { store } = fakeStore({ dominioLibre: async () => false });
    const { deploy } = fakeDeploy();
    await expect(conectarDominio({ store, deploy }, { orgId: "o1", projectId: "p1", dominio: "cliente.com", ...HOSTS }))
      .rejects.toMatchObject({ message: "Ese dominio ya está conectado a otro proyecto", status: 409 });
  });
  it("deploy falla → 502 y NO se guarda", async () => {
    const { store, estado } = fakeStore();
    const deploy: DeployTarget = {
      async publish() { return { ok: true }; }, async unpublish() {},
      async connectDomain() { throw new Error("dokploy caído"); },
      async disconnectDomain() {},
    };
    await expect(conectarDominio({ store, deploy }, { orgId: "o1", projectId: "p1", dominio: "cliente.com", ...HOSTS }))
      .rejects.toMatchObject({ status: 502 });
    expect(estado.setLlamadas).toEqual([]);
  });
  it("carrera (setDominio false) → 409 y limpieza best-effort del deploy", async () => {
    const { store } = fakeStore({ setDominio: async () => false });
    const { deploy, llamadas } = fakeDeploy();
    await expect(conectarDominio({ store, deploy }, { orgId: "o1", projectId: "p1", dominio: "cliente.com", ...HOSTS }))
      .rejects.toMatchObject({ status: 409 });
    expect(llamadas).toEqual(["connect:cliente.com", "disconnect:cliente.com"]);
  });
  it("cambiar de dominio desconecta el anterior", async () => {
    const { store } = fakeStore({
      getProject: async () => ({ id: "p1", orgId: "o1", nombre: "X", entryPath: "index.html",
        currentSnapshotId: "s1", subdominio: "x", dominio: "viejo.com",
        publishedSnapshotId: "s1", createdAt: "" }),
    });
    const { deploy, llamadas } = fakeDeploy();
    await conectarDominio({ store, deploy }, { orgId: "o1", projectId: "p1", dominio: "nuevo.com", ...HOSTS });
    expect(llamadas).toEqual(["connect:nuevo.com", "disconnect:viejo.com"]);
  });
  it("mismo dominio que ya tiene → early return sin llamadas", async () => {
    const { store } = fakeStore({
      getProject: async () => ({ id: "p1", orgId: "o1", nombre: "X", entryPath: "index.html",
        currentSnapshotId: "s1", subdominio: "x", dominio: "cliente.com",
        publishedSnapshotId: "s1", createdAt: "" }),
    });
    const { deploy, llamadas } = fakeDeploy();
    const r = await conectarDominio({ store, deploy }, { orgId: "o1", projectId: "p1", dominio: "cliente.com", ...HOSTS });
    expect(r).toEqual({ dominio: "cliente.com" });
    expect(llamadas).toEqual([]);
  });
});

describe("quitarDominio", () => {
  it("pone null y desconecta; el fallo del deploy no rompe", async () => {
    const { store, estado } = fakeStore({
      getProject: async () => ({ id: "p1", orgId: "o1", nombre: "X", entryPath: "index.html",
        currentSnapshotId: "s1", subdominio: "x", dominio: "cliente.com",
        publishedSnapshotId: "s1", createdAt: "" }),
    });
    const deploy: DeployTarget = {
      async publish() { return { ok: true }; }, async unpublish() {},
      async connectDomain() {},
      async disconnectDomain() { throw new Error("dokploy caído"); },
    };
    await expect(quitarDominio({ store, deploy }, { orgId: "o1", projectId: "p1" })).resolves.toBeUndefined();
    expect(estado.setLlamadas).toEqual([null]);
  });
  it("sin dominio conectado → no hace nada", async () => {
    const { store, estado } = fakeStore();
    const { deploy, llamadas } = fakeDeploy();
    await quitarDominio({ store, deploy }, { orgId: "o1", projectId: "p1" });
    expect(estado.setLlamadas).toEqual([]);
    expect(llamadas).toEqual([]);
  });
  it("proyecto inexistente → 404", async () => {
    const { store } = fakeStore({ getProject: async () => null });
    const { deploy } = fakeDeploy();
    await expect(quitarDominio({ store, deploy }, { orgId: "o1", projectId: "nope" }))
      .rejects.toMatchObject({ status: 404 });
  });
});
```

- [ ] **Step 9: Ver fallar** — `npx vitest run src/tests/domain-connect.test.ts`.

- [ ] **Step 10: Implementar en `src/publish/publish-site.ts`** (añadir al final; imports arriba: `normalizarDominio, formatoDominioValido, dominioProhibido` desde `./domain`)

```ts
export async function conectarDominio(
  deps: { store: ProjectStore; deploy: DeployTarget },
  input: { orgId: string; projectId: string; dominio: string; platformHost: string; sitesBaseDomain: string }
): Promise<{ dominio: string }> {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new PublishError("Proyecto no encontrado", 404);
  const dom = normalizarDominio(input.dominio);
  if (!formatoDominioValido(dom) || dominioProhibido(dom, input.platformHost, input.sitesBaseDomain)) {
    throw new PublishError("Dominio no válido (ejemplo: miempresa.com)", 400);
  }
  if (project.dominio === dom) return { dominio: dom };
  if (!(await deps.store.dominioLibre(dom))) {
    throw new PublishError("Ese dominio ya está conectado a otro proyecto", 409);
  }
  try {
    await deps.deploy.connectDomain({ dominio: dom });
  } catch {
    throw new PublishError("No se pudo activar el dominio en el servidor. Vuelve a intentarlo en unos minutos.", 502);
  }
  const ok = await deps.store.setDominio(input.orgId, input.projectId, dom);
  if (!ok) {
    // Carrera: otro proyecto lo reclamó entre la comprobación y el guardado.
    try { await deps.deploy.disconnectDomain({ dominio: dom }); } catch { /* best-effort */ }
    throw new PublishError("Ese dominio ya está conectado a otro proyecto", 409);
  }
  if (project.dominio && project.dominio !== dom) {
    // Cambio de dominio: liberar el anterior en el deploy (best-effort).
    try { await deps.deploy.disconnectDomain({ dominio: project.dominio }); } catch { /* best-effort */ }
  }
  return { dominio: dom };
}

export async function quitarDominio(
  deps: { store: ProjectStore; deploy: DeployTarget },
  input: { orgId: string; projectId: string }
): Promise<void> {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new PublishError("Proyecto no encontrado", 404);
  if (!project.dominio) return;
  await deps.store.setDominio(input.orgId, input.projectId, null);
  try {
    await deps.deploy.disconnectDomain({ dominio: project.dominio });
  } catch (e) {
    console.error("No se pudo quitar el dominio en el deploy (limpieza manual):", e);
  }
}
```

- [ ] **Step 11: Verde total** — `npx vitest run` y `npm run typecheck`.

- [ ] **Step 12: Commit** — `git add -A; git commit -m "feat(3b): dominio propio — validación, unique en BD, conectar/quitar con DeployTarget"`

---

### Task 4: `DokployDeploy` + factory de deploy target

**Files:**
- Create: `src/publish/dokploy.ts`
- Create: `src/publish/deploy-factory.ts`
- Modify: `app/api/projects/[id]/publish/route.ts` (usar `getDeploy()` en vez de `selfHostedDeploy`)
- Test: `src/tests/dokploy.test.ts`

**Interfaces:**
- Consumes: `DeployTarget` con `connectDomain`/`disconnectDomain` (Tarea 3).
- Produces: `new DokployDeploy({ url, apiKey, applicationId, appPort?, fetchImpl? })` y `getDeploy(): DeployTarget` (elige por `DEPLOY_TARGET`; la usan Tareas 5 y las rutas API).

- [ ] **Step 1: Tests — `src/tests/dokploy.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { DokployDeploy } from "@/src/publish/dokploy";

type Llamada = { url: string; init?: RequestInit };

function fetchMock(respuestas: Array<{ ok: boolean; status?: number; json?: unknown }>) {
  const llamadas: Llamada[] = [];
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    llamadas.push({ url: String(url), init });
    const r = respuestas.shift() ?? { ok: true };
    return {
      ok: r.ok, status: r.status ?? (r.ok ? 200 : 500),
      json: async () => r.json ?? {},
    } as Response;
  }) as typeof fetch;
  return { f, llamadas };
}

const cfg = { url: "https://dok.example", apiKey: "k123", applicationId: "app-1" };

describe("DokployDeploy.connectDomain", () => {
  it("crea el dominio pelado y el www con letsencrypt", async () => {
    const { f, llamadas } = fetchMock([{ ok: true }, { ok: true }]);
    await new DokployDeploy({ ...cfg, fetchImpl: f }).connectDomain({ dominio: "cliente.com" });
    expect(llamadas).toHaveLength(2);
    expect(llamadas[0].url).toBe("https://dok.example/api/domain.create");
    const b0 = JSON.parse(String(llamadas[0].init?.body));
    expect(b0).toEqual({
      applicationId: "app-1", host: "cliente.com", port: 3000,
      https: true, certificateType: "letsencrypt", domainType: "application",
    });
    const b1 = JSON.parse(String(llamadas[1].init?.body));
    expect(b1.host).toBe("www.cliente.com");
    const headers = llamadas[0].init?.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("k123");
  });
  it("respuesta no-ok → lanza", async () => {
    const { f } = fetchMock([{ ok: false, status: 500 }]);
    await expect(new DokployDeploy({ ...cfg, fetchImpl: f }).connectDomain({ dominio: "cliente.com" }))
      .rejects.toThrow(/domain\.create/);
  });
});

describe("DokployDeploy.disconnectDomain", () => {
  it("busca los domainId y borra pelado + www", async () => {
    const { f, llamadas } = fetchMock([
      { ok: true, json: [
        { domainId: "d1", host: "cliente.com" },
        { domainId: "d2", host: "www.cliente.com" },
        { domainId: "d3", host: "otro.com" },
      ]},
      { ok: true }, { ok: true },
    ]);
    await new DokployDeploy({ ...cfg, fetchImpl: f }).disconnectDomain({ dominio: "cliente.com" });
    expect(llamadas[0].url).toBe("https://dok.example/api/domain.byApplicationId?applicationId=app-1");
    expect(llamadas).toHaveLength(3);
    expect(JSON.parse(String(llamadas[1].init?.body))).toEqual({ domainId: "d1" });
    expect(JSON.parse(String(llamadas[2].init?.body))).toEqual({ domainId: "d2" });
  });
  it("si el lookup falla → lanza", async () => {
    const { f } = fetchMock([{ ok: false, status: 401 }]);
    await expect(new DokployDeploy({ ...cfg, fetchImpl: f }).disconnectDomain({ dominio: "cliente.com" }))
      .rejects.toThrow(/byApplicationId/);
  });
});

describe("getDeploy", () => {
  it("default self-hosted; dokploy exige sus envs", async () => {
    const { getDeploy } = await import("@/src/publish/deploy-factory");
    expect(getDeploy().connectDomain).toBeTypeOf("function"); // no lanza sin envs (self)
  });
});
```

- [ ] **Step 2: Ver fallar** — `npx vitest run src/tests/dokploy.test.ts`.

- [ ] **Step 3: `src/publish/dokploy.ts`** (archivo completo)

```ts
import type { DeployTarget } from "./deploy-target";

type DokployConfig = {
  url: string;           // p. ej. "https://dok.example" (sin barra final)
  apiKey: string;
  applicationId: string; // id de la app Wordclicks dentro de Dokploy
  appPort?: number;      // puerto interno de la app (default 3000)
  fetchImpl?: typeof fetch;
};

type DokployDomain = { domainId: string; host: string };

// Registra dominios propios de clientes en el Traefik del VPS vía la API REST de
// Dokploy: Traefik crea la ruta y emite el certificado Let's Encrypt (HTTP-01).
// Los subdominios *.PLATAFORMA.com NO pasan por aquí: los cubre el certificado
// wildcard configurado una vez en Traefik.
export class DokployDeploy implements DeployTarget {
  private f: typeof fetch;
  constructor(private cfg: DokployConfig) {
    this.f = cfg.fetchImpl ?? fetch;
  }

  private async post(ruta: string, body: unknown): Promise<void> {
    const res = await this.f(`${this.cfg.url}/api/${ruta}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": this.cfg.apiKey },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Dokploy ${ruta} → ${res.status}`);
  }

  async publish() { return { ok: true } as const; }
  async unpublish() {}

  async connectDomain({ dominio }: { dominio: string }): Promise<void> {
    for (const host of [dominio, `www.${dominio}`]) {
      await this.post("domain.create", {
        applicationId: this.cfg.applicationId,
        host,
        port: this.cfg.appPort ?? 3000,
        https: true,
        certificateType: "letsencrypt",
        domainType: "application",
      });
    }
  }

  async disconnectDomain({ dominio }: { dominio: string }): Promise<void> {
    const res = await this.f(
      `${this.cfg.url}/api/domain.byApplicationId?applicationId=${encodeURIComponent(this.cfg.applicationId)}`,
      { headers: { "x-api-key": this.cfg.apiKey } }
    );
    if (!res.ok) throw new Error(`Dokploy domain.byApplicationId → ${res.status}`);
    const dominios = (await res.json()) as DokployDomain[];
    const objetivo = new Set([dominio, `www.${dominio}`]);
    for (const d of dominios.filter((x) => objetivo.has(x.host))) {
      await this.post("domain.delete", { domainId: d.domainId });
    }
  }
}
```

- [ ] **Step 4: `src/publish/deploy-factory.ts`** (archivo completo)

```ts
import { selfHostedDeploy, type DeployTarget } from "./deploy-target";
import { DokployDeploy } from "./dokploy";

let instancia: DeployTarget | null = null;

export function getDeploy(): DeployTarget {
  if (!instancia) {
    if (process.env.DEPLOY_TARGET === "dokploy") {
      const url = process.env.DOKPLOY_URL;
      const apiKey = process.env.DOKPLOY_API_KEY;
      const applicationId = process.env.DOKPLOY_APPLICATION_ID;
      if (!url || !apiKey || !applicationId) {
        throw new Error("DEPLOY_TARGET=dokploy requiere DOKPLOY_URL, DOKPLOY_API_KEY y DOKPLOY_APPLICATION_ID");
      }
      instancia = new DokployDeploy({ url: url.replace(/\/$/, ""), apiKey, applicationId });
    } else {
      instancia = selfHostedDeploy;
    }
  }
  return instancia;
}
```

- [ ] **Step 5: Cambiar la ruta de publicar.** En `app/api/projects/[id]/publish/route.ts`: sustituir el import de `selfHostedDeploy` por `import { getDeploy } from "@/src/publish/deploy-factory";` y cada `deploy: selfHostedDeploy` por `deploy: getDeploy()`.

- [ ] **Step 6: Verde total + typecheck.** — `npx vitest run` y `npm run typecheck`.

- [ ] **Step 7: Commit** — `git add -A; git commit -m "feat(3b): DokployDeploy (API domain.create/delete) + factory por DEPLOY_TARGET"`

---

### Task 5: API PATCH `dominio` + UI «Dominio propio» en PublishBar (sin NEXT_PUBLIC)

**Files:**
- Modify: `app/api/projects/[id]/route.ts`
- Modify: `app/projects/[id]/page.tsx`
- Modify: `app/projects/[id]/PublishBar.tsx`

**Interfaces:**
- Consumes: `conectarDominio`/`quitarDominio` (Tarea 3), `getDeploy` (Tarea 4).
- Produces: `PATCH /api/projects/[id]` con `{dominio: string}` → `200 {dominio}` | 400/409/502; `{dominio: null}` → `200 {dominio: null}`. `PublishBar` con props `dominio`, `sitesBaseDomain`, `dnsTargetIp` (las usa el e2e de la Tarea 9).

- [ ] **Step 1: PATCH en `app/api/projects/[id]/route.ts`.** Ampliar el tipo del body y añadir la rama ANTES de la de `subdominio`:

```ts
  const body = (await req.json()) as { entryPath?: string; subdominio?: string; dominio?: string | null };
  if (typeof body.dominio === "string" || body.dominio === null) {
    const platformHost = process.env.PLATFORM_HOST ?? "localhost:3000";
    const sitesBaseDomain = process.env.SITES_BASE_DOMAIN ?? platformHost;
    try {
      if (body.dominio === null) {
        await quitarDominio({ store: projectStore, deploy: getDeploy() }, { orgId, projectId: id });
        return NextResponse.json({ dominio: null });
      }
      const r = await conectarDominio(
        { store: projectStore, deploy: getDeploy() },
        { orgId, projectId: id, dominio: body.dominio, platformHost, sitesBaseDomain }
      );
      return NextResponse.json(r);
    } catch (e) {
      if (e instanceof PublishError) return NextResponse.json({ error: e.message }, { status: e.status });
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
  }
```

Imports nuevos: `conectarDominio, quitarDominio` desde `@/src/publish/publish-site`; `getDeploy` desde `@/src/publish/deploy-factory`.

- [ ] **Step 2: Props desde el server component.** En `app/projects/[id]/page.tsx`:

```tsx
  const platformHost = process.env.PLATFORM_HOST ?? "localhost:3000";
  const sitesBaseDomain = process.env.SITES_BASE_DOMAIN ?? platformHost;
  const dnsTargetIp = process.env.DNS_TARGET_IP ?? "127.0.0.1";
```

y en el JSX:

```tsx
      <PublishBar
        projectId={id}
        subdominio={project.subdominio}
        dominio={project.dominio}
        publishedSnapshotId={project.publishedSnapshotId}
        currentSnapshotId={project.currentSnapshotId}
        sitesBaseDomain={sitesBaseDomain}
        dnsTargetIp={dnsTargetIp}
      />
```

- [ ] **Step 3: `app/projects/[id]/PublishBar.tsx`** (archivo completo — sustituye al actual; desaparece `NEXT_PUBLIC_PLATFORM_HOST`)

```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function PublishBar({
  projectId, subdominio, dominio, publishedSnapshotId, currentSnapshotId, sitesBaseDomain, dnsTargetIp,
}: {
  projectId: string;
  subdominio: string | null;
  dominio: string | null;
  publishedSnapshotId: string | null;
  currentSnapshotId: string | null;
  sitesBaseDomain: string;
  dnsTargetIp: string;
}) {
  const router = useRouter();
  const [sub, setSub] = useState(subdominio ?? "");
  const [editandoSub, setEditandoSub] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [dom, setDom] = useState("");
  const [editandoDom, setEditandoDom] = useState(false);
  const [confirmandoDom, setConfirmandoDom] = useState(false);
  const [verDns, setVerDns] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proto, setProto] = useState("http:");
  useEffect(() => { setProto(window.location.protocol); }, []);

  const publicado = !!publishedSnapshotId;
  const sinPublicar = publicado && currentSnapshotId !== publishedSnapshotId;
  const url = subdominio ? `${proto}//${subdominio}.${sitesBaseDomain}` : null;

  async function llamar(metodo: "POST" | "DELETE") {
    setOcupado(true); setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/publish`, { method: metodo });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); setConfirmando(false); return; }
      setConfirmando(false);
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  async function patch(body: unknown): Promise<boolean> {
    setOcupado(true); setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); return false; }
      router.refresh();
      return true;
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="mb-3 space-y-2 rounded-lg border bg-gray-50 px-3 py-2">
      <div className="flex flex-wrap items-center gap-3">
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
              <span className="flex items-center gap-1">
                <button onClick={() => void llamar("DELETE")} disabled={ocupado}
                  className="rounded border border-red-300 bg-red-50 px-3 py-1 text-sm text-red-700">
                  ¿Seguro? Sí, despublicar
                </button>
                <button onClick={() => setConfirmando(false)} className="text-xs text-gray-500">cancelar</button>
              </span>
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
              <button onClick={() => void patch({ subdominio: sub }).then((ok) => ok && setEditandoSub(false))}
                disabled={ocupado} className="rounded border px-2 py-0.5 text-xs">Guardar</button>
              <button onClick={() => setEditandoSub(false)} className="text-xs text-gray-500">cancelar</button>
            </span>
          )
        )}
      </div>

      {publicado && (
        <div className="flex flex-wrap items-center gap-3 border-t pt-2">
          <span className="text-sm text-gray-600">Dominio propio:</span>
          {dominio ? (
            <>
              <a href={`https://${dominio}`} target="_blank" rel="noreferrer" className="text-sm text-emerald-700 underline">
                https://{dominio}
              </a>
              <button onClick={() => setVerDns(!verDns)} className="text-xs text-gray-500 underline">
                {verDns ? "ocultar instrucciones DNS" : "instrucciones DNS"}
              </button>
              {!confirmandoDom ? (
                <button onClick={() => setConfirmandoDom(true)} disabled={ocupado} className="rounded border px-2 py-0.5 text-xs">
                  Quitar
                </button>
              ) : (
                <span className="flex items-center gap-1">
                  <button onClick={() => void patch({ dominio: null }).then(() => setConfirmandoDom(false))}
                    disabled={ocupado} className="rounded border border-red-300 bg-red-50 px-2 py-0.5 text-xs text-red-700">
                    ¿Seguro? Sí, quitar
                  </button>
                  <button onClick={() => setConfirmandoDom(false)} className="text-xs text-gray-500">cancelar</button>
                </span>
              )}
            </>
          ) : !editandoDom ? (
            <button onClick={() => setEditandoDom(true)} className="text-xs text-gray-500 underline">
              conectar dominio propio
            </button>
          ) : (
            <span className="flex items-center gap-1">
              <input value={dom} onChange={(e) => setDom(e.target.value)}
                className="rounded border px-2 py-0.5 text-sm" placeholder="miempresa.com" />
              <button onClick={() => void patch({ dominio: dom }).then((ok) => { if (ok) { setEditandoDom(false); setVerDns(true); } })}
                disabled={ocupado} className="rounded border px-2 py-0.5 text-xs">Conectar</button>
              <button onClick={() => setEditandoDom(false)} className="text-xs text-gray-500">cancelar</button>
            </span>
          )}
          {verDns && dominio && (
            <div className="w-full rounded border bg-white px-3 py-2 text-xs text-gray-700">
              <p className="mb-1 font-medium">En el panel DNS de tu dominio crea estos dos registros:</p>
              <pre className="mb-1 rounded bg-gray-100 p-2">{`A    @      →  ${dnsTargetIp}\nA    www    →  ${dnsTargetIp}`}</pre>
              <p>No toques los registros MX (correo). El cambio puede tardar de minutos a unas horas en propagarse; el certificado HTTPS se emite solo al primer acceso.</p>
            </div>
          )}
        </div>
      )}

      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
```

- [ ] **Step 4: Verificación manual rápida** — `npm run dev`, abrir un proyecto publicado: aparece «Dominio propio: conectar dominio propio»; conectar `cliente-prueba.com` (con `DEPLOY_TARGET` sin definir = self) → muestra el enlace + instrucciones DNS con `127.0.0.1`; Quitar con confirmación funciona. `npm run typecheck` verde. Parar el server.

- [ ] **Step 5: Commit** — `git add -A; git commit -m "feat(3b): PATCH dominio + UI Dominio propio con instrucciones DNS (props, sin NEXT_PUBLIC)"`

---

### Task 6: `SupabaseStorage` + selección por `STORAGE_DRIVER`

**Files:**
- Create: `src/storage/supabase.ts`
- Modify: `src/storage/factory.ts`
- Modify: `package.json` (dependencia `@supabase/supabase-js`)
- Test: `src/tests/supabase-storage.test.ts`

**Interfaces:**
- Consumes: `StorageAdapter` (put/get/list/delete), `contentTypeFor(key)`.
- Produces: `class SupabaseStorage implements StorageAdapter` con constructor `(client: SupabaseLikeClient, bucket: string)`; `crearSupabaseStorageDesdeEnv(): StorageAdapter`; `getStorage()` elige por `STORAGE_DRIVER` (`local` default | `supabase`).

- [ ] **Step 1: Instalar dependencia** — `npm install @supabase/supabase-js` (queda en `dependencies`).

- [ ] **Step 2: Tests — `src/tests/supabase-storage.test.ts`** (fake client en memoria con semántica de carpetas y paginación de Supabase)

```ts
import { describe, it, expect } from "vitest";
import { SupabaseStorage, type SupabaseLikeClient } from "@/src/storage/supabase";

// Fake del cliente de Supabase Storage: archivos planos clave→bytes, con list()
// por carpeta (una sola profundidad, paginado, carpetas con id=null) como el real.
function fakeClient() {
  const archivos = new Map<string, Uint8Array>();
  const client: SupabaseLikeClient = {
    storage: {
      from(_bucket: string) {
        return {
          async upload(key, body, _opts) {
            archivos.set(key, new Uint8Array(body));
            return { error: null };
          },
          async download(key) {
            const b = archivos.get(key);
            if (!b) return { data: null, error: { message: "Object not found" } };
            return { data: new Blob([b]), error: null };
          },
          async list(carpeta, { limit, offset }) {
            const pfx = carpeta ? carpeta + "/" : "";
            const hijos = new Map<string, { name: string; id: string | null }>();
            for (const k of archivos.keys()) {
              if (!k.startsWith(pfx)) continue;
              const resto = k.slice(pfx.length);
              const i = resto.indexOf("/");
              if (i === -1) hijos.set(resto, { name: resto, id: "file-" + k });
              else if (!hijos.has(resto.slice(0, i))) hijos.set(resto.slice(0, i), { name: resto.slice(0, i), id: null });
            }
            const orden = [...hijos.values()].sort((a, b) => a.name.localeCompare(b.name));
            return { data: orden.slice(offset, offset + limit), error: null };
          },
          async remove(keys) {
            for (const k of keys) archivos.delete(k);
            return { error: null };
          },
        };
      },
    },
  };
  return { client, archivos };
}

describe("SupabaseStorage", () => {
  it("put/get roundtrip con contentType por extensión", async () => {
    const { client } = fakeClient();
    const s = new SupabaseStorage(client, "sites");
    await s.put("p/1/index.html", Buffer.from("<h1>hola</h1>"));
    const r = await s.get("p/1/index.html");
    expect(r?.body.toString()).toBe("<h1>hola</h1>");
    expect(r?.contentType).toBe("text/html; charset=utf-8");
  });
  it("get inexistente → null", async () => {
    const { client } = fakeClient();
    expect(await new SupabaseStorage(client, "sites").get("no/existe.txt")).toBeNull();
  });
  it("put acepta string", async () => {
    const { client } = fakeClient();
    const s = new SupabaseStorage(client, "sites");
    await s.put("a/x.css", "body{}");
    expect((await s.get("a/x.css"))?.contentType).toBe("text/css; charset=utf-8");
  });
  it("list recursivo bajo un prefijo, con subcarpetas y paginación", async () => {
    const { client } = fakeClient();
    const s = new SupabaseStorage(client, "sites");
    for (let i = 0; i < 120; i++) await s.put(`p/1/f${String(i).padStart(3, "0")}.txt`, "x");
    await s.put("p/1/wc-uploads/logo.png", "png");
    await s.put("p/1/css/main.css", "css");
    await s.put("p/2/otro.txt", "no debe salir");
    const claves = await s.list("p/1/");
    expect(claves).toHaveLength(122);
    expect(claves).toContain("p/1/wc-uploads/logo.png");
    expect(claves).toContain("p/1/css/main.css");
    expect(claves.every((k) => k.startsWith("p/1/"))).toBe(true);
  });
  it("delete borra", async () => {
    const { client } = fakeClient();
    const s = new SupabaseStorage(client, "sites");
    await s.put("p/1/x.txt", "x");
    await s.delete("p/1/x.txt");
    expect(await s.get("p/1/x.txt")).toBeNull();
  });
});
```

- [ ] **Step 3: Ver fallar** — `npx vitest run src/tests/supabase-storage.test.ts`.

- [ ] **Step 4: `src/storage/supabase.ts`** (archivo completo)

```ts
import { createClient } from "@supabase/supabase-js";
import { contentTypeFor } from "./content-type";
import type { StorageAdapter } from "./types";

type ListEntry = { name: string; id: string | null };

// Subconjunto del cliente de supabase-js que usamos (inyectable en tests).
export type SupabaseLikeClient = {
  storage: {
    from(bucket: string): {
      upload(key: string, body: Uint8Array, opts: { contentType: string; upsert: boolean }): Promise<{ error: { message: string } | null }>;
      download(key: string): Promise<{ data: Blob | null; error: { message: string } | null }>;
      list(folder: string, opts: { limit: number; offset: number }): Promise<{ data: ListEntry[] | null; error: { message: string } | null }>;
      remove(keys: string[]): Promise<{ error: { message: string } | null }>;
    };
  };
};

const PAGINA = 100;

// StorageAdapter sobre un bucket privado de Supabase Storage. Los prefijos que usa
// la app son "carpetas" completas terminadas en "/" (storagePrefix de snapshots);
// list() recorre recursivamente esa carpeta (el list de Supabase es por nivel).
export class SupabaseStorage implements StorageAdapter {
  constructor(private client: SupabaseLikeClient, private bucket: string) {}

  private from() {
    return this.client.storage.from(this.bucket);
  }

  async put(key: string, body: Buffer | string, contentType?: string): Promise<void> {
    const bytes = typeof body === "string" ? Buffer.from(body, "utf-8") : body;
    const { error } = await this.from().upload(key, new Uint8Array(bytes), {
      contentType: contentType ?? contentTypeFor(key),
      upsert: true,
    });
    if (error) throw new Error(`Supabase upload(${key}): ${error.message}`);
  }

  async get(key: string): Promise<{ body: Buffer; contentType: string } | null> {
    const { data, error } = await this.from().download(key);
    if (error || !data) return null;
    return { body: Buffer.from(await data.arrayBuffer()), contentType: contentTypeFor(key) };
  }

  async list(prefix: string): Promise<string[]> {
    const out: string[] = [];
    const pendientes = [prefix.replace(/\/+$/, "")];
    while (pendientes.length > 0) {
      const carpeta = pendientes.pop()!;
      for (let offset = 0; ; offset += PAGINA) {
        const { data, error } = await this.from().list(carpeta, { limit: PAGINA, offset });
        if (error) throw new Error(`Supabase list(${carpeta}): ${error.message}`);
        for (const e of data ?? []) {
          const ruta = carpeta ? `${carpeta}/${e.name}` : e.name;
          if (e.id === null) pendientes.push(ruta); // carpeta virtual
          else if (ruta.startsWith(prefix)) out.push(ruta);
        }
        if (!data || data.length < PAGINA) break;
      }
    }
    return out;
  }

  async delete(key: string): Promise<void> {
    const { error } = await this.from().remove([key]);
    if (error) throw new Error(`Supabase remove(${key}): ${error.message}`);
  }
}

export function crearSupabaseStorageDesdeEnv(): StorageAdapter {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "sites";
  if (!url || !key) {
    throw new Error("STORAGE_DRIVER=supabase requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY");
  }
  const client = createClient(url, key, { auth: { persistSession: false } });
  return new SupabaseStorage(client as unknown as SupabaseLikeClient, bucket);
}
```

- [ ] **Step 5: `src/storage/factory.ts`** (archivo completo)

```ts
import { LocalFsStorage } from "./local-fs";
import { crearSupabaseStorageDesdeEnv } from "./supabase";
import type { StorageAdapter } from "./types";

let instancia: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!instancia) {
    instancia = process.env.STORAGE_DRIVER === "supabase"
      ? crearSupabaseStorageDesdeEnv()
      : new LocalFsStorage(process.env.STORAGE_DIR ?? "data/storage");
  }
  return instancia;
}
```

- [ ] **Step 6: Verde total + typecheck** — `npx vitest run` y `npm run typecheck`.

- [ ] **Step 7: Commit** — `git add -A; git commit -m "feat(3b): SupabaseStorage (bucket privado) + STORAGE_DRIVER en la factory"`

---

### Task 7: Candado del panel — cookie firmada, login/logout, health y middleware

**Files:**
- Create: `src/auth/session-cookie.ts`
- Create: `app/login/page.tsx`
- Create: `app/api/login/route.ts`, `app/api/logout/route.ts`, `app/api/health/route.ts`
- Create: `app/LogoutButton.tsx`
- Modify: `middleware.ts`, `app/page.tsx` (botón Salir), `.env.local` (añadir 2 líneas)
- Test: `src/tests/session-cookie.test.ts`

**Interfaces:**
- Consumes: `parseHost` v2 (Tarea 1).
- Produces: `SESSION_COOKIE = "wc_session"`, `SESSION_DURACION_MS`, `firmarSesion(secret, expiraEpochMs): Promise<string>`, `verificarSesion(secret, valor, ahoraMs): Promise<boolean>` — Web Crypto puro (válido en Edge y Node). Endpoints `/api/login`, `/api/logout`, `/api/health`. El e2e (Tarea 9) depende de todos.

- [ ] **Step 1: Tests — `src/tests/session-cookie.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { firmarSesion, verificarSesion } from "@/src/auth/session-cookie";

const SECRET = "secreto-de-test-0123456789abcdef";

describe("cookie de sesión", () => {
  it("firma y verifica", async () => {
    const v = await firmarSesion(SECRET, Date.now() + 60_000);
    expect(v.startsWith("v1.")).toBe(true);
    expect(await verificarSesion(SECRET, v, Date.now())).toBe(true);
  });
  it("caducada → false", async () => {
    const v = await firmarSesion(SECRET, Date.now() - 1);
    expect(await verificarSesion(SECRET, v, Date.now())).toBe(false);
  });
  it("manipulada → false", async () => {
    const v = await firmarSesion(SECRET, Date.now() + 60_000);
    const [, exp, hmac] = v.split(".");
    expect(await verificarSesion(SECRET, `v1.${Number(exp) + 9999999}.${hmac}`, Date.now())).toBe(false);
    expect(await verificarSesion(SECRET, `v1.${exp}.${"0".repeat(hmac.length)}`, Date.now())).toBe(false);
  });
  it("otro secret → false; basura → false", async () => {
    const v = await firmarSesion(SECRET, Date.now() + 60_000);
    expect(await verificarSesion("otro-secreto", v, Date.now())).toBe(false);
    expect(await verificarSesion(SECRET, "", Date.now())).toBe(false);
    expect(await verificarSesion(SECRET, "v1.abc", Date.now())).toBe(false);
    expect(await verificarSesion(SECRET, "v2.123.abc", Date.now())).toBe(false);
  });
});
```

- [ ] **Step 2: Ver fallar** — `npx vitest run src/tests/session-cookie.test.ts`.

- [ ] **Step 3: `src/auth/session-cookie.ts`** (archivo completo)

```ts
// Cookie de sesión del panel: "v1.<expiraEpochMs>.<hmacHex>", HMAC-SHA256 con
// SESSION_SECRET. Solo Web Crypto: se verifica en el middleware (runtime Edge).
// La cookie se emite SIN atributo Domain (host-only): no puede filtrarse a los
// subdominios de sitios ni a dominios de clientes.
export const SESSION_COOKIE = "wc_session";
export const SESSION_DURACION_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

async function hmacHex(secret: string, mensaje: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(mensaje));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function firmarSesion(secret: string, expiraEpochMs: number): Promise<string> {
  const cuerpo = `v1.${expiraEpochMs}`;
  return `${cuerpo}.${await hmacHex(secret, cuerpo)}`;
}

export async function verificarSesion(secret: string, valor: string, ahoraMs: number): Promise<boolean> {
  const partes = valor.split(".");
  if (partes.length !== 3 || partes[0] !== "v1") return false;
  const expira = Number(partes[1]);
  if (!Number.isFinite(expira) || expira <= ahoraMs) return false;
  const esperado = await hmacHex(secret, `v1.${partes[1]}`);
  if (esperado.length !== partes[2].length) return false;
  let dif = 0; // comparación en tiempo constante
  for (let i = 0; i < esperado.length; i++) dif |= esperado.charCodeAt(i) ^ partes[2].charCodeAt(i);
  return dif === 0;
}
```

- [ ] **Step 4: Verde el test** — `npx vitest run src/tests/session-cookie.test.ts`.

- [ ] **Step 5: Endpoints.** `app/api/login/route.ts`:

```ts
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { firmarSesion, SESSION_COOKIE, SESSION_DURACION_MS } from "@/src/auth/session-cookie";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const password = process.env.PANEL_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!password || !secret) {
    return NextResponse.json({ error: "Candado no configurado (PANEL_PASSWORD/SESSION_SECRET)" }, { status: 500 });
  }
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const intento = Buffer.from(typeof body.password === "string" ? body.password : "");
  const real = Buffer.from(password);
  const igual = intento.length === real.length && timingSafeEqual(intento, real);
  if (!igual) return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await firmarSesion(secret, Date.now() + SESSION_DURACION_MS), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: Math.floor(SESSION_DURACION_MS / 1000),
    // Sin `domain`: host-only (aislamiento de los sitios publicados).
  });
  return res;
}
```

`app/api/logout/route.ts`:

```ts
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/src/auth/session-cookie";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
```

`app/api/health/route.ts`:

```ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: `app/login/page.tsx`** (archivo completo)

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true); setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); return; }
      router.push("/");
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center p-8">
      <form onSubmit={entrar} className="w-full max-w-xs space-y-3 rounded-lg border p-6">
        <h1 className="text-lg font-bold">Wordclicks</h1>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña" autoFocus
          className="w-full rounded border px-3 py-2 text-sm" />
        <button type="submit" disabled={ocupado}
          className="w-full rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50">
          Entrar
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </main>
  );
}
```

- [ ] **Step 7: `app/LogoutButton.tsx`** (archivo completo) y colocarlo en `app/page.tsx` junto al título principal del panel (leer el archivo y añadirlo en la cabecera existente, p. ej. al lado del `<h1>`):

```tsx
"use client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  async function salir() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button onClick={() => void salir()} className="text-xs text-gray-500 underline">
      Salir
    </button>
  );
}
```

- [ ] **Step 8: `middleware.ts`** (archivo completo — candado sobre lo de la Tarea 1)

```ts
import { NextResponse, type NextRequest } from "next/server";
import { parseHost } from "@/src/publish/host";
import { verificarSesion, SESSION_COOKIE } from "@/src/auth/session-cookie";

// Rutas del panel accesibles sin sesión.
const RUTAS_PUBLICAS = ["/login", "/api/login", "/api/health"];

// 1) Hosts que no son la plataforma → se sirven como sitio publicado (/sites/<host>).
// 2) La raíz del dominio madre → redirect al panel.
// 3) El panel exige la cookie de sesión firmada (candado de contraseña única).
export async function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  const plat = (process.env.PLATFORM_HOST ?? "localhost:3000").toLowerCase();
  const base = (process.env.SITES_BASE_DOMAIN ?? plat).toLowerCase();
  const info = parseHost(host, plat, base);

  if (info.tipo === "raiz") {
    return NextResponse.redirect(`https://${plat}${req.nextUrl.pathname}`, 307);
  }
  if (info.tipo !== "plataforma") {
    const url = req.nextUrl.clone();
    url.pathname = `/sites/${encodeURIComponent(host)}${req.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }

  const { pathname } = req.nextUrl;
  if (RUTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return NextResponse.next();
  }
  const secret = process.env.SESSION_SECRET;
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const valido = !!secret && !!cookie && (await verificarSesion(secret, cookie, Date.now()));
  if (valido) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ["/((?!_next/|favicon\\.ico).*)"],
};
```

- [ ] **Step 9: Env de dev.** Añadir a `.env.local` (SIN tocar las líneas existentes; comprobar antes que no existan ya):

```
PANEL_PASSWORD=dev1234
SESSION_SECRET=dev-secret-0123456789abcdef0123456789abcdef
```

- [ ] **Step 10: Verificación manual** — `npm run dev`: ir a `http://localhost:3000/` → redirige a `/login`; contraseña mala → «Contraseña incorrecta»; `dev1234` → entra al panel; `http://localhost:3000/api/health` → `{"ok":true}` sin login; con otra pestaña `curl -s -o NUL -w "%{http_code}" http://127.0.0.1:3000/api/projects/x` → `401`; botón Salir vuelve a /login. Un sitio publicado (`sub.localhost:3000`) sigue abriendo SIN login. Parar el server.

- [ ] **Step 11: Verde total + typecheck** — `npx vitest run` y `npm run typecheck`.

- [ ] **Step 12: Commit** — `git add -A; git commit -m "feat(3b): candado del panel — cookie HMAC host-only, /login, logout y /api/health"`

---

### Task 8: Build de producción — `output: standalone` + Dockerfile

**Files:**
- Modify: `next.config.ts`
- Create: `Dockerfile`, `.dockerignore`

**Interfaces:**
- Consumes: `/api/health` (Tarea 7).
- Produces: imagen construible por Dokploy (`Dockerfile` en la raíz, app en puerto 3000). Ningún código depende de esta tarea.

- [ ] **Step 1: `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida autocontenida para la imagen Docker (Dokploy).
  output: "standalone",
  // Fijamos la raíz del workspace para que Turbopack no la infiera mal por
  // lockfiles sueltos fuera del proyecto (p. ej. en la carpeta del usuario).
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
```

- [ ] **Step 2: `Dockerfile`** (raíz del repo)

```dockerfile
# --- deps ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build ---
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- run ---
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

Si no existe `package-lock.json` en la raíz, generarlo primero: `npm install --package-lock-only` (y commitearlo).

- [ ] **Step 3: `.dockerignore`**

```
node_modules
.next
data
.env*
.git
docs
.superpowers
_db*.mjs
*.md
```

- [ ] **Step 4: Verificar el build standalone localmente** (sin Docker):

```powershell
npm run build
$env:PORT="3100"; $env:PANEL_PASSWORD="x"; $env:SESSION_SECRET="y0123456789012345678901234567890"; $env:DATABASE_URL=(Get-Content .env.local | Select-String '^DATABASE_URL=').ToString().Substring(13)
Start-Process node -ArgumentList ".next/standalone/server.js" -PassThru
```

Esperar 2s y: `curl -s http://127.0.0.1:3100/api/health` → `{"ok":true}`. Matar el proceso node lanzado. (El objetivo es solo comprobar que el standalone arranca y responde.)

- [ ] **Step 5: Commit** — `git add -A; git commit -m "feat(3b): build standalone + Dockerfile multi-stage para Dokploy"`

---

### Task 9: e2e integral con topología de producción (panel en `app.`, candado, dominios)

**Files:**
- Create: `<scratchpad>/e2e-3b.mjs` (script temporal, NO se commitea)

**Interfaces:**
- Consumes: todo lo anterior. El server de dev se lanza con la topología de producción: `PLATFORM_HOST=app.localhost:3000`, `SITES_BASE_DOMAIN=localhost:3000`.

- [ ] **Step 1: Lanzar el server** (dejarlo corriendo en background durante el e2e):

```powershell
$env:PLATFORM_HOST="app.localhost:3000"; $env:SITES_BASE_DOMAIN="localhost:3000"; $env:PANEL_PASSWORD="e2e1234"; $env:SESSION_SECRET="e2e-secret-0123456789abcdef01234567"; $env:DNS_TARGET_IP="127.0.0.1"; npm run dev
```

- [ ] **Step 2: Script `e2e-3b.mjs`** (en el scratchpad; TODAS las peticiones van por curl contra 127.0.0.1:3000 forzando el Host — Node fetch no permite fijar Host)

```js
import { execSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PANEL = "app.localhost:3000";
let pass = 0, fail = 0;
const ok = (c, m) => { (c ? pass++ : fail++); console.log((c ? "PASS  " : "FAIL  ") + m); };

let COOKIE = "";

// curl genérico: host forzado, método, body JSON o form, cookie opcional.
function curl({ host = PANEL, path = "/", method = "GET", json, form, conCookie = true, dumpHeaders = false }) {
  let cmd = `curl -s -o - -w "\\n__ST__%{http_code}" -X ${method} -H "Host: ${host}"`;
  if (conCookie && COOKIE) cmd += ` -H "Cookie: ${COOKIE}"`;
  if (json !== undefined) {
    const f = join(tmpdir(), `body-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(f, JSON.stringify(json));
    cmd += ` -H "content-type: application/json" --data-binary "@${f}"`;
  }
  if (form) for (const [k, v] of Object.entries(form)) cmd += ` -F "${k}=${v}"`;
  if (dumpHeaders) cmd += " -D -";
  cmd += ` "http://127.0.0.1:3000${path}"`;
  const out = execSync(cmd).toString();
  const i = out.lastIndexOf("\n__ST__");
  return { body: out.slice(0, i), status: Number(out.slice(i + 7)) };
}

// 1) Candado
let r = curl({ path: "/", conCookie: false, dumpHeaders: true });
ok(r.status === 307 && /location: .*\/login/i.test(r.body), "panel sin cookie → 307 a /login");
r = curl({ path: "/api/projects/x", conCookie: false });
ok(r.status === 401, "API sin cookie → 401");
r = curl({ path: "/api/health", conCookie: false });
ok(r.status === 200 && r.body.includes('"ok":true'), "/api/health público");
r = curl({ path: "/api/login", method: "POST", json: { password: "mala" }, conCookie: false });
ok(r.status === 401 && r.body.includes("Contraseña incorrecta"), "login con contraseña mala → 401");

// login bueno: capturar set-cookie
{
  const out = execSync(`curl -s -D - -o NUL -X POST -H "Host: ${PANEL}" -H "content-type: application/json" --data "{\\"password\\":\\"e2e1234\\"}" "http://127.0.0.1:3000/api/login"`).toString();
  const m = out.match(/set-cookie:\s*(wc_session=[^;]+)/i);
  COOKIE = m ? m[1] : "";
  ok(!!COOKIE, "login correcto → set-cookie wc_session");
}
r = curl({ path: "/" });
ok(r.status === 200, "panel con cookie → 200");

// 2) Importar y publicar
const dir = mkdtempSync(join(tmpdir(), "wc3b-"));
writeFileSync(join(dir, "index.html"),
  `<!doctype html><html><head><title>t</title></head><body><h1>Web TresB</h1></body></html>`);
const zip = join(dir, "site.zip");
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${join(dir, "index.html")}' -DestinationPath '${zip}' -Force"`);
r = curl({ path: "/api/projects", method: "POST", form: { "file": `@${zip};type=application/zip`, "nombre": "Web E2E TresB" } });
const pid = JSON.parse(r.body).projectId;
ok(r.status === 201 && !!pid, "import 201 — " + pid);
r = curl({ path: `/api/projects/${pid}/publish`, method: "POST" });
ok(r.status === 200 && JSON.parse(r.body).subdominio === "web-e2e-tresb", "publish 200, slug=web-e2e-tresb");

// 3) El sitio se sirve SIN cookie bajo la base
r = curl({ host: "web-e2e-tresb.localhost:3000", conCookie: false });
ok(r.status === 200 && r.body.includes("Web TresB") && !r.body.includes("data-wc-id"), "sitio en subdominio, limpio, sin login");

// 4) Raíz del dominio madre → redirect al panel
r = curl({ host: "localhost:3000", conCookie: false, dumpHeaders: true });
ok(r.status === 307 && /location: https:\/\/app\.localhost:3000\//i.test(r.body), "raíz → 307 al panel");

// 5) Dominio propio
r = curl({ path: `/api/projects/${pid}`, method: "PATCH", json: { dominio: "-mal-" } });
ok(r.status === 400 && r.body.includes("Dominio no válido"), "dominio inválido → 400");
r = curl({ path: `/api/projects/${pid}`, method: "PATCH", json: { dominio: "sub.localhost" } });
ok(r.status === 400, "dominio bajo la plataforma → 400");
r = curl({ path: `/api/projects/${pid}`, method: "PATCH", json: { dominio: "HTTPS://WWW.Cliente-E2E.com/" } });
ok(r.status === 200 && JSON.parse(r.body).dominio === "cliente-e2e.com", "conectar dominio (normalizado) → 200");
r = curl({ host: "cliente-e2e.com", conCookie: false });
ok(r.status === 200 && r.body.includes("Web TresB"), "el sitio responde en el dominio propio");
r = curl({ host: "www.cliente-e2e.com", conCookie: false, dumpHeaders: true });
ok(r.status === 301 && /location: https:\/\/cliente-e2e\.com\//i.test(r.body), "www → 301 al pelado");

// 6) Colisión de dominio
r = curl({ path: "/api/projects", method: "POST", form: { "file": `@${zip};type=application/zip`, "nombre": "Otro TresB" } });
const pid2 = JSON.parse(r.body).projectId;
curl({ path: `/api/projects/${pid2}/publish`, method: "POST" });
r = curl({ path: `/api/projects/${pid2}`, method: "PATCH", json: { dominio: "cliente-e2e.com" } });
ok(r.status === 409 && r.body.includes("ya está conectado"), "dominio ocupado → 409");

// 7) Quitar dominio
r = curl({ path: `/api/projects/${pid}`, method: "PATCH", json: { dominio: null } });
ok(r.status === 200, "quitar dominio → 200");
r = curl({ host: "cliente-e2e.com", conCookie: false });
ok(r.status === 404, "tras quitar → 404 en el dominio");

// 8) Regresión: traversal y despublicar
r = curl({ host: "web-e2e-tresb.localhost:3000", path: "/../secreto", conCookie: false });
ok(r.status !== 200, "traversal → bloqueado (status " + r.status + ")");
r = curl({ path: `/api/projects/${pid}/publish`, method: "DELETE" });
ok(r.status === 200, "despublicar 200");
r = curl({ host: "web-e2e-tresb.localhost:3000", conCookie: false });
ok(r.status === 404, "tras despublicar → 404");

console.log(`\n=== ${pass}/${pass + fail} checks PASS ===`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 3: Ejecutar** — `node <scratchpad>/e2e-3b.mjs` → `=== 20/20 checks PASS ===` (el número exacto según checks). Si algo falla: systematic-debugging, no parches a ciegas.

- [ ] **Step 4: Suite + typecheck de cierre** — `npx vitest run` (todo verde) y `npm run typecheck`. Parar el dev server.

- [ ] **Step 5: Commit (por si hubo fixes)** — `git add -A; git commit -m "test(3b): e2e integral con topología de producción"` (solo si hay cambios).

---

## Fase de estreno (manual guiada — NO es tarea de subagente)

Se ejecuta con el usuario tras el merge, siguiendo el runbook del spec. Reparto:

| # | Paso | Quién |
|---|------|-------|
| 1 | Decidir nombre y **comprar el dominio** (mismo día) | **Usuario** |
| 2 | Cuenta Cloudflare free + apuntar nameservers del dominio + crear `A @`, `A *`, `A app` → `72.61.176.214` (nube gris) + token API DNS | **Usuario con instrucciones exactas del asistente** |
| 3 | Rotar `service_role` y password BD en Supabase; pegar las nuevas SOLO en `.env.local` y en Dokploy | **Usuario** (el asistente da los clics exactos; las claves nunca pasan por el chat) |
| 4 | Crear bucket privado `sites` en Supabase | **Asistente** (script local con la service key de `.env.local`) |
| 5 | Limpiar proyectos de prueba de la BD | **Asistente** (script local, como en incrementos anteriores) |
| 6 | Crear repo GitHub privado + push | **Usuario crea el repo (o instala `gh` y autoriza); asistente hace el push** |
| 7 | Añadir clave SSH del asistente al VPS (hPanel → Clave SSH) | **Usuario pega la clave pública que genera el asistente** |
| 8 | Configurar Traefik (certResolver wildcard + router HostRegexp) por SSH | **Asistente** |
| 9 | Crear la app en Dokploy (GitHub, Dockerfile, envs, límites 1GB/1CPU, healthcheck, dominio `app.PLATAFORMA.com`) + generar API key | **Usuario con guía clic-a-clic** (la API key va directa a los envs de Dokploy) |
| 10 | Primer deploy + `npm run db:push` local + re-importar Quantiva + publicar | **Asistente verifica; usuario importa desde el navegador** |
| 11 | Conectar `nueva.quantivatechnology.com` (registro A en Hostinger) y validar | **Usuario valida; asistente comprueba con curl** |
| 12 | **Cutover**: `A @` y `A www` de quantivatechnology.com → VPS (MX intactos) | **Usuario, con OK explícito, guiado** |

## Post-plan (fuera de las tareas)

- Brief de diseño visual (`docs/design-brief.md`) — lo escribe el asistente al cerrar el spec (compromiso aparte).
- Follow-ups que siguen abiertos: liberar subdominio al despublicar (decisión), helper compartido de traversal, favicon del matcher, verificación DNS automática, login multiusuario, renombrar repo/bucket/UI a la marca definitiva.
