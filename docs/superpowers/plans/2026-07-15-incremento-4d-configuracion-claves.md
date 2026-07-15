# Incremento 4d — Configuración: claves API desde la UI · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página `/settings` con la sección «APIs y conexiones»: el usuario pega sus claves de OpenRouter y SerpAPI desde el navegador (org-scoped, con respaldo en `.env.local`). Spec: `docs/superpowers/specs/2026-07-15-incremento-4d-configuracion-claves-design.md`.

**Architecture:** tabla `org_settings` + `orgSettingsStore` → resolutor `src/config/claves.ts` (UI primero, env de respaldo, tolerante a «sin BD» para tests) → `claude.ts`/`serpapi.ts` resuelven la clave por llamada → rutas `/api/settings*` → página `/settings`. Sin dependencias nuevas.

## Global Constraints

- Mensajes byte-exactos nuevos: «Falta la clave de OpenRouter: añádela en Configuración», «Falta la clave de SerpAPI: añádela en Configuración», «La clave es demasiado larga (máx. 200 caracteres)», «Servicio desconocido». RETIRADOS: «Falta OPENROUTER_API_KEY en .env.local», «Falta SERPAPI_KEY en .env.local» (actualizar sus tests y el e2e-4c).
- GET de settings NUNCA devuelve claves completas (solo origen + últimos 4).
- Al terminar cada tarea: `npx vitest run` verde + `npx tsc --noEmit` + commit. Rama `feat/incremento-4d-configuracion`, merge ff a master tras el e2e.

### Task 1: BD `org_settings` + `orgSettingsStore`

**Files:** Create `drizzle/manual/2026-07-15-4d-org-settings.sql`, `src/repositories/org-settings.ts`; Modify `src/db/schema.ts`.

```ts
export type ClavesOrg = { openrouterKey: string; serpapiKey: string };
export interface OrgSettingsStore {
  getClaves(orgId: string): Promise<ClavesOrg | null>;
  setClaves(orgId: string, patch: Partial<ClavesOrg>): Promise<void>; // upsert parcial
}
export const orgSettingsStore: OrgSettingsStore;
```

- [ ] SQL: `org_settings (id uuid pk, org_id uuid notnull unique → organizations(id), openrouter_key text notnull default '', serpapi_key text notnull default '', created_at/updated_at timestamptz)` → aplicar con `db-apply.mjs`.
- [ ] Schema drizzle + store (patrón blog.ts: `setClaves` lee la fila previa, mezcla el patch y upserta con `updatedAt: new Date()`).
- [ ] Commit: `feat(4d): tabla org_settings + store de claves por organización (SQL aplicado)`

### Task 2: Resolutor de claves + rewire de consumidores + mensajes nuevos

**Files:** Create `src/config/claves.ts`; Modify `src/ia/claude.ts`, `src/blog/radar/serpapi.ts`, `src/blog/radar/index.ts`, `src/blog/site-template.ts`; Tests: `src/tests/claves.test.ts` (nuevo), actualizar `blog-site-template.test.ts` y `radar.test.ts`.

```ts
// src/config/claves.ts — UI primero, .env de respaldo. El import de la BD se hace
// dinámico y en try/catch: en tests unitarios (sin DATABASE_URL) cae al entorno.
export async function claveOpenRouter(): Promise<string>;
export async function claveSerpApi(): Promise<string>;
```

- [ ] `claude.ts`: `clave()`/`cabeceras()` → async con `claveOpenRouter()`; si vacía → `Error("Falta la clave de OpenRouter: añádela en Configuración")`; `completar` y `probarConexionModelo` esperan `cabeceras()`.
- [ ] `serpapi.ts`: `llamadaSerpApi` usa `await claveSerpApi()`; nueva `probarConexionSerpApi(): Promise<string>` (GET `https://serpapi.com/account.json?api_key=…` → «Clave válida (quedan N búsquedas este mes)»; error de la API → throw).
- [ ] `radar/index.ts`: pre-check `if (!(await claveSerpApi()))` → EditorError 500 con el mensaje nuevo.
- [ ] `site-template.ts`: pre-check `if (!(await claveOpenRouter()))` → EditorError 500 con el mensaje nuevo.
- [ ] Tests: `claves.test.ts` (fallback a env con `vi.stubEnv`; prioridad UI no unit-testable sin BD → e2e); asserts de mensajes actualizados; test de `probarConexionSerpApi` con fetch mockeado en `radar-serpapi.test.ts`.
- [ ] Commit: `feat(4d): las claves API se resuelven UI-primero con respaldo en .env.local`

### Task 3: Rutas `/api/settings` y `/api/settings/probar`

**Files:** Create `app/api/settings/route.ts`, `app/api/settings/probar/route.ts`.

- [ ] GET: por servicio → `origen` (`"ui"` si la fila BD tiene clave; si no `"env"` si el entorno la tiene; si no `null`) y `sufijo` (últimos 4 de la clave activa, `""` si no hay). PUT: campos opcionales string (ausente = no tocar; `""` = limpiar); trim; > 200 → 400 byte-exacto; upsert parcial → `{ ok: true }`.
- [ ] `probar`: POST `{ cual }` → openrouter → `probarConexionModelo()`, serpapi → `probarConexionSerpApi()`; éxito → `{ ok: true, detalle }`; fallo del proveedor → 200 `{ ok: false, error: <msg> }`; `cual` inválido → 400 «Servicio desconocido».
- [ ] Commit: `feat(4d): API de configuración — claves enmascaradas, guardado parcial y probar conexión`

### Task 4: UI — página `/settings` + enlace en el panel

**Files:** Create `app/settings/page.tsx`; Modify `app/page.tsx` (enlace «⚙ Configuración»).

- [ ] Página client con dos tarjetas (OpenRouter, SerpAPI): estado según GET, input password, Guardar (PUT parcial), Probar conexión (muestra detalle/error), Quitar (PUT `""`, visible si origen `ui`); descripciones y enlaces del spec; «Error de conexión» en fallos de red (patrón del proyecto).
- [ ] Enlace en la cabecera de `app/page.tsx` junto a Salir.
- [ ] Commit: `feat(4d): página de Configuración con APIs y conexiones`

### Task 5: E2e + merge

- [ ] `<scratchpad>/e2e-4d.mjs`: GET inicial (openrouter `env` — hay clave en el server —, serpapi `null`); PUT serpapiKey falsa → origen `ui` + sufijo correcto; radar (proyecto con nicho) → ya NO «falta la clave» sino 502 de SerpAPI real (401, sin gastar créditos); PUT `""` → origen `null` y radar → 500 «Falta la clave de SerpAPI: añádela en Configuración»; PUT clave de 201 chars → 400; PUT openrouterKey falsa → origen `ui` → PUT `""` → origen `env` (sin llamadas IA entre medias); probar `{ cual: "x" }` → 400. **El e2e SIEMPRE limpia las claves al final** (estado restaurado).
- [ ] Actualizar el check del e2e-4c («Falta SERPAPI_KEY en .env.local» → mensaje nuevo) y re-ejecutar 4b/4c/4d → todo PASS + suite + tsc + merge ff a master.

## Self-review

- El respaldo en env garantiza cero fricción para el despliegue actual (la clave OpenRouter del usuario sigue funcionando sin tocar nada).
- El resolutor con import dinámico + try/catch evita que los ~30 tests que stubean env necesiten BD o mocks nuevos.
- La API enmascarada evita exfiltrar claves vía el navegador; el guardado parcial permite tocar una clave sin conocer la otra.
