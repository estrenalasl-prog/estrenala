# Wordclicks — Incremento 3: Publicar (autoservido, enrutado por dominio)

- **Fecha:** 2026-07-03
- **Estado:** Aprobado (diseño). Pendiente de revisión del spec antes del plan.
- **Construye sobre:** Incrementos 1–2b en `master`. Reutiliza snapshots (árboles completos e inmutables), storage por prefijo, y el HTML publicado limpio/auto-contenido del 2b (`wc-uploads/` con rutas root-absolutas).
- **Decisiones del usuario:** Wordclicks sirve las webs (modelo WordPress); el objetivo final es el **dominio propio** del cliente (p. ej. `quantivatechnology.com`); alcance partido: **3 = maquinaria** (probada en local) → **3b = plataforma en internet** (servidor real, storage en la nube, HTTPS, DNS).

---

## 1. Objetivo

Botón **Publicar**: la web del snapshot actual queda servida en una URL pública propia del proyecto, separada del borrador (se sigue editando sin tocar lo publicado). Publicar es **instantáneo** (mover un puntero, sin copiar archivos). Todo verificable en local.

---

## 2. Modelo — borrador vs publicado

- `projects` gana **`publishedSnapshotId uuid` (nullable)**. Además, **índice único sobre `subdominio`** (Postgres permite múltiples NULL; la BD está recién limpiada, sin backfill). Migración con el mecanismo existente (`drizzle-kit push`).
- **Publicar** = `publishedSnapshotId := currentSnapshotId`. **Republicar** = lo mismo. **Despublicar** = `NULL`.
- Editar/guardar/restaurar mueve `currentSnapshotId` y **no** toca lo publicado. "Cambios sin publicar" = `currentSnapshotId !== publishedSnapshotId`.
- **Subdominio**: se genera en la **primera publicación** a partir del nombre (`Cafetería Aurora` → `cafeteria-aurora`); si está ocupado se prueba `-2`, `-3`… Editable después desde el panel. El campo `dominio` (ya existente) lo enruta este incremento pero su UI/DNS llega en 3b.

### 2.1 Reglas de slug (subdominio)
- Regex: `^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$` (etiqueta DNS: minúsculas, dígitos, guiones internos, máx. 63).
- `slugify(nombre)`: minúsculas, sin acentos (NFD), espacios/símbolos → `-`, colapsar guiones, recortar extremos, truncar a 63. Si queda vacío → `sitio`.
- **Reservados** (lista en código): `www, api, app, admin, mail, ftp, smtp, studio, wordclicks, preview, assets, sites, s, blog, dashboard, panel, cdn, static, ns1, ns2`.

---

## 3. Enrutado público por dominio (Host)

### 3.1 `middleware.ts` (raíz)
- Lee `Host` (minúsculas). `PLATFORM_HOST` por env (default `localhost:3000`, autoridad completa con puerto en dev). `NEXT_PUBLIC_PLATFORM_HOST` (cliente, para componer la URL en el panel) lleva el **mismo valor**; ambas viven en `.env.local`/defaults.
- `host === PLATFORM_HOST` → `NextResponse.next()` (el panel y las APIs funcionan como hoy).
- Cualquier otro host → **rewrite interno** a `/sites/<host>/<path…>`. En un host de proyecto TODO se sirve desde el snapshot (el panel no es alcanzable ahí).

### 3.2 `parseHost(host, platformHost)` (`src/publish/host.ts`, puro)
- Normaliza a minúsculas.
- `host === platformHost` → `{ tipo: "plataforma" }`.
- `host` termina en `"." + platformHost` → `{ tipo: "subdominio", valor: <etiqueta> }` (solo UNA etiqueta: `a.b.localhost:3000` no es válido → `{tipo:"desconocido"}`).
- Si no → `{ tipo: "dominio", valor: host sin `:puerto` }` (dominio propio, comparación exacta).

### 3.3 Servir el sitio (`app/sites/[host]/[[...path]]/route.ts` + `src/publish/resolve-site.ts`)
- `resolvePublicSite(deps, { host, pathSegments })`:
  - `parseHost` → subdominio o dominio → `store.getPublishedSiteByHost(...)` → `{ entryPath, storagePrefix }` del **snapshot publicado** (JOIN proyecto→snapshot en una consulta; **sin org**: es público por diseño, solo expone lo publicado).
  - Sin proyecto o sin publicar → **404** ("Esta web no está publicada").
  - Guarda de traversal idéntica al preview (`..`, `/`, `\` en segmentos → 400).
  - `/` → `entryPath`. Sirve bytes con `contentTypeFor` — **sin anotar, sin reescribir, sin `<base>`**: el HTML almacenado ya es limpio y las rutas root-absolutas (`/css/…`, `/wc-uploads/…`) resuelven al mismo host → mismo proyecto.
  - Cache: HTML → `no-cache` (republicar se ve al momento); resto → `public, max-age=300`.

---

## 4. Panel (`app/projects/[id]/PublishBar.tsx`, nuevo componente)

Barra encima del preview (separada de `PreviewPane`, que no cambia):
- **Sin publicar:** botón **Publicar**.
- **Publicado:** URL pública clicable (`http(s)://<sub>.<NEXT_PUBLIC_PLATFORM_HOST>`, protocolo tomado de `location`), subdominio **editable** (input + Guardar), aviso **«Tienes cambios sin publicar»** cuando aplique, **Republicar** y **Despublicar** (sin `confirm()` nativo: el botón Despublicar pasa a un segundo estado «¿Seguro? Sí» que confirma al segundo click).
- `page.tsx` pasa `subdominio`, `publishedSnapshotId`, `currentSnapshotId`.

---

## 5. API (org-scoped, como todo el panel)

- `POST /api/projects/[id]/publish` → publica (genera subdominio si falta) → `200 { subdominio, publishedSnapshotId }`. Sin snapshot actual → 400.
- `DELETE /api/projects/[id]/publish` → despublica → `200`.
- `PATCH /api/projects/[id]` (existente) acepta además `{ subdominio }`: valida slug (400), reservados (400), unicidad (**409** si ocupado, mensaje amigable).

### 5.1 Lógica (`src/publish/publish-site.ts`, DI, testeable con fakes)
- `publishSite(deps, { orgId, projectId })`: proyecto (404) → snapshot actual (400) → si `subdominio` NULL: `slugify(nombre)` + sondeo de unicidad (`subdominioLibre`) con sufijos `-2..-20` (agotado → 409) → `setPublished`.
- `unpublishSite(deps, { orgId, projectId })`: proyecto (404) → `setPublished(null)`.
- `cambiarSubdominio(deps, { orgId, projectId, subdominio })`: regex + reservados (400) → unicidad (409) → update. La violación de índice único (carrera) también se traduce a 409.

### 5.2 Store (`ProjectStore`)
- `ProjectRow` gana `subdominio`, `dominio`, `publishedSnapshotId` (hoy no expuestos).
- Métodos nuevos:
  - `getPublishedSiteByHost(q: { subdominio: string } | { dominio: string }): Promise<{ entryPath: string; storagePrefix: string } | null>` (público, JOIN con snapshot publicado)
  - `setPublished(orgId, projectId, snapshotId: string | null): Promise<void>`
  - `subdominioLibre(subdominio: string): Promise<boolean>`
  - `setSubdominio(orgId, projectId, subdominio): Promise<void>` (propaga la violación de unique de forma detectable)

---

## 6. Costura de adaptador (`src/publish/deploy-target.ts`)

```ts
export interface DeployTarget {
  publish(input: { projectId: string; snapshotId: string; storagePrefix: string; subdominio: string }): Promise<{ ok: true }>;
  unpublish(input: { projectId: string; subdominio: string }): Promise<void>;
}
```
- Impl. de este incremento: `SelfHostedDeploy` (no-op: el enrutado por Host ya sirve el puntero; existe para que Cloudflare Pages/Vercel sean otra impl. que copia archivos, sin tocar `publishSite`). `publishSite` la invoca tras fijar el puntero.

---

## 7. Seguridad

- La ruta pública **solo** sirve archivos del snapshot **publicado** (nunca borradores, nunca el panel, nunca APIs). El HTML almacenado ya está limpio (sin `data-wc-id`/script — invariante del 2b).
- `parseHost` estricto: una sola etiqueta de subdominio; dominio custom por igualdad exacta (sin puerto, minúsculas). Host desconocido → 404.
- Slug validado por regex + reservados en servidor; unicidad por índice único (la app además sondea).
- Publish/unpublish/PATCH org-scoped vía `getDevContext()` como el resto del panel.
- Acceso directo a `/sites/<host>/…` en el host de la plataforma sirve lo mismo que serviría ese host público (inofensivo: es contenido público); no se bloquea.

---

## 8. Manejo de errores

- Publicar sin snapshot actual → 400. Proyecto ajeno/inexistente → 404.
- Subdominio inválido → 400 «Subdominio no válido (minúsculas, números y guiones)». Reservado → 400. Ocupado → 409 «Ese subdominio ya está en uso».
- Visita a host sin proyecto o sin publicar → 404 con página mínima en español.
- Archivo inexistente dentro de un sitio publicado → 404.

---

## 9. Estructura de archivos (prevista)

```
src/db/schema.ts                          — + publishedSnapshotId, unique(subdominio)   (modifica)
src/publish/slug.ts                       — slugify + esSlugValido + RESERVADOS         (nuevo) [TDD]
src/publish/host.ts                       — parseHost                                   (nuevo) [TDD]
src/publish/publish-site.ts               — publishSite/unpublishSite/cambiarSubdominio (nuevo) [TDD fakes]
src/publish/resolve-site.ts               — resolvePublicSite                           (nuevo) [TDD fakes]
src/publish/deploy-target.ts              — DeployTarget + SelfHostedDeploy             (nuevo)
src/repositories/types.ts                 — ProjectRow ampliado + 4 métodos             (modifica)
src/repositories/projects.ts              — impl. Drizzle                               (modifica)
middleware.ts                             — enrutado por Host                           (nuevo)
app/sites/[host]/[[...path]]/route.ts     — servir sitio publicado                      (nuevo)
app/api/projects/[id]/publish/route.ts    — POST publicar / DELETE despublicar          (nuevo)
app/api/projects/[id]/route.ts            — PATCH acepta subdominio                     (modifica)
app/projects/[id]/page.tsx                — pasa datos de publicación                   (modifica)
app/projects/[id]/PublishBar.tsx          — UI publicar                                 (nuevo)
```

---

## 10. Testing y verificación

- **Unit (puro):** `slugify` (acentos, símbolos, colapso de guiones, truncado, vacío→`sitio`), `esSlugValido` (regex + reservados), `parseHost` (plataforma, subdominio con puerto, multi-etiqueta→desconocido, dominio custom con/sin puerto, mayúsculas).
- **Integración (fakes):** `publishSite` (genera slug, colisión→`-2`, fija puntero, 400 sin snapshot), `unpublishSite`, `cambiarSubdominio` (400/409), `resolvePublicSite` (sirve HTML byte-idéntico al almacenado — sin `<base>`, sin `data-wc-id` —, entryPath en `/`, asset de `wc-uploads/`, 404 sin publicar, traversal→400).
- **e2e (definición de hecho):** importar → editar+guardar → **Publicar** → `curl -H "Host: <slug>.localhost:3000" http://127.0.0.1:3000/` devuelve la web limpia (y `/wc-uploads/...` la imagen) → editar+guardar de nuevo → lo publicado **no** cambia → **Republicar** → sí cambia → **Despublicar** → 404. (Node `fetch` no permite forzar `Host`; el e2e usa `curl`.) Verificación visual: navegador/Edge headless contra `http://<slug>.localhost:3000` (los navegadores resuelven `*.localhost` solos) + captura.

---

## 11. Fuera de alcance (→ Incremento 3b y siguientes)

Plataforma en servidor real (elegir host), storage en la nube (adaptador Supabase Storage/R2), HTTPS/TLS, UI + instrucciones DNS para conectar `quantivatechnology.com`, `www.` canónico, cabeceras de seguridad avanzadas del sitio público (CSP por sitio), estadísticas de visitas.
