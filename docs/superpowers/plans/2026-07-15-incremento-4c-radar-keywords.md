# Incremento 4c — Radar automático de keywords · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Botón «Buscar temas de hoy» que descubre keywords en tendencia (SerpAPI), las puntúa con IA frente al nicho y permite lanzar el pipeline 4b con un clic. Spec: `docs/superpowers/specs/2026-07-15-incremento-4c-radar-keywords-design.md`.

**Architecture:** port de `Creador de Blog/src/services/{serpapi,keywords}.ts` a `src/blog/radar/` (Postgres asíncrono, org-scoping vía `BlogStore`, modelo por proyecto 4b2). Tablas `blog_keywords` + `trends_cache`; `blog_settings.keywords_semilla`. Sin dependencias nuevas.

## Global Constraints

- Mensajes byte-exactos nuevos: «Falta SERPAPI_KEY en .env.local», «Keyword no encontrada», «Estado desconocido», «Las keywords semilla son demasiado largas (máx. 500 caracteres)», «SerpAPI no devolvió ninguna keyword.» / «SerpAPI no devolvió ninguna keyword (última causa: <msg>)». Reusados: «Proyecto no encontrado», «Configura primero de qué va tu blog (campo Nicho)».
- Port verbatim desde `Creador de Blog/` (leer los archivos; no reescribir de memoria). Geo `ES` constante; `RELEVANCIA_MINIMA=20`; `MAX_SEMILLAS=3`.
- El radar NUNCA gasta si: falta la clave, falta el nicho, o hay caché del día (salvo `forzar`).
- Al terminar cada tarea: `npx vitest run` verde + `npx tsc --noEmit` + commit. Rama `feat/incremento-4c-radar-keywords`, merge ff a master tras el e2e.

### Task 1: `RelevanciaSchema` + `src/blog/radar/serpapi.ts` (port)

**Files:** Modify `src/ia/claude.ts`, `src/tests/ia-claude.test.ts`; Create `src/blog/radar/serpapi.ts`, `src/tests/radar-serpapi.test.ts`.

- [ ] `RelevanciaSchema = z.object({ puntuaciones: z.array(z.object({ keyword: z.string(), relevancia: z.number() })) })` (port) + test de parse.
- [ ] `serpapi.ts` port verbatim del original. Tests: port de `Creador de Blog/src/tests/serpapi.test.ts` (parsers + llamada con engine/geo y propagación de errores de la API).
- [ ] Commit: `feat(4c): RelevanciaSchema + cliente SerpAPI portado (tendencias y relacionadas)`

### Task 2: BD — `blog_keywords`, `trends_cache`, `keywords_semilla`

**Files:** Create `drizzle/manual/2026-07-15-4c-keywords.sql`; Modify `src/db/schema.ts`, `src/repositories/blog.ts` (+ fakes afectados).

**Interfaces (Produces):**
```ts
export type KeywordRow = { id: string; projectId: string; keyword: string; fuente: string;
  crecimientoPct: number | null; volumenAprox: number | null; relevancia: number;
  estado: string; discoveredAt: string };
export type KeywordNueva = Pick<KeywordRow, "keyword" | "fuente" | "crecimientoPct" | "volumenAprox" | "relevancia">;
// BlogStore +:
listKeywords(orgId, projectId): Promise<KeywordRow[]>;             // relevancia desc, discoveredAt desc
insertKeywords(orgId, projectId, items: KeywordNueva[]): Promise<void>; // onConflictDoNothing por (project, keyword)
setKeywordEstado(orgId, projectId, keywordId, estado): Promise<boolean>; // false si no existe
hayTrendsCache(orgId, projectId, fecha): Promise<boolean>;
marcarTrendsCache(orgId, projectId, fecha, payload): Promise<void>; // onConflictDoNothing
// BlogSettings += keywordsSemilla: string
```

- [ ] SQL (`CREATE TABLE IF NOT EXISTS` ×2 con las UNIQUE del spec + `ALTER TABLE blog_settings ADD COLUMN IF NOT EXISTS keywords_semilla text NOT NULL DEFAULT ''`) → aplicar con `db-apply.mjs` y verificar counts.
- [ ] Schema drizzle + métodos del store (guard `proyectoDeOrg`; timestamps → ISO). `setBlogSettings/getBlogSettings` incluyen `keywordsSemilla`.
- [ ] Actualizar fakes de tests que implementen `BlogStore`/`BlogSettings`.
- [ ] Commit: `feat(4c): tablas blog_keywords y trends_cache + keywords_semilla (SQL aplicado)`

### Task 3: Radar (`src/blog/radar/index.ts`)

**Files:** Create `src/blog/radar/index.ts`, `src/tests/radar.test.ts`.

**Interfaces:** `actualizarRadar(deps: { store: ProjectStore; blog: BlogStore; orgId: string; projectId: string }, forzar = false): Promise<{ actualizado: false } | { actualizado: true; candidatos: number }>`.

- [ ] Tests primero (adaptación de `keywords.test.ts` del original con fakes en memoria + `vi.mock` de serpapi y claude): guarda ≥20 y descarta <20; caché diaria (2ª llamada no consume); `forzar` reconsulta sin duplicar (el fake de `insertKeywords` deduplica por keyword); fallo parcial no aborta; fallo total → EditorError 502 con mensaje; sin nicho → 400 byte-exacto; sin SERPAPI_KEY → 500 byte-exacto; el prompt lleva nombre/nicho y `pedirJson` recibe el modelo del proyecto (4º arg).
- [ ] Implementar (port de `actualizarRadar`): validaciones EditorError primero (proyecto → nicho → clave), caché, `intentar()` acumulando errores, dedupe por lowercase, prompt verbatim (adaptado `sitio.nombre (sitio.dominio)` → `nombre (basePublica ?? "")`), `pedirJson(prompt, RelevanciaSchema, 8000, modelo || undefined)`, filtro ≥20, `insertKeywords` + `marcarTrendsCache`.
- [ ] Commit: `feat(4c): radar de keywords — candidatos SerpAPI puntuados con IA frente al nicho`

### Task 4: Rutas API + settings ampliado

**Files:** Create `app/api/projects/[id]/blog/keywords/route.ts`, `…/keywords/radar/route.ts`, `…/keywords/[kwId]/route.ts`; Modify `…/blog/settings/route.ts`.

- [ ] `keywords` GET: proyecto 404; `listKeywords` filtrando `estado !== "descartada"`.
- [ ] `keywords/radar` POST `{ forzar? }` → `actualizarRadar` → 200 resultado (EditorError vía conError).
- [ ] `keywords/[kwId]` PUT `{ estado }`: no en `["nueva","usada","descartada"]` → 400 «Estado desconocido»; `setKeywordEstado` false → 404 «Keyword no encontrada»; → 200 `{ ok: true }`.
- [ ] settings: GET devuelve `keywordsSemilla`; PUT la acepta (>500 → 400 byte-exacto).
- [ ] `.env.example`: añadir `SERPAPI_KEY=` comentado.
- [ ] Commit: `feat(4c): API del radar — lista, actualizar y estado de keywords`

### Task 5: UI — radar en el bloque «Escribir con IA»

**Files:** Modify `app/projects/[id]/BlogPanel.tsx`.

- [ ] Config: input «Keywords semilla (separadas por comas)» — se guarda con el mismo «Guardar configuración».
- [ ] Sub-bloque «Temas en tendencia»: botón «🔍 Buscar temas de hoy» → POST radar; si `actualizado:false` → texto «El radar ya se actualizó hoy» + botón «Forzar»; lista de `nueva` con relevancia (badge), crecimiento (`+N%`), fuente; «Escribir artículo» → POST drafts con la keyword → PUT estado `usada` → abrir workspace (vista ia); «descartar» → PUT `descartada` y desaparece.
- [ ] Errores visibles (patrón `llamar`). `npx tsc` + suite + arranque manual.
- [ ] Commit: `feat(4c): radar de temas en tendencia en el panel del blog`

### Task 6: E2e sin gastar + merge

- [ ] Ampliar `e2e-4b.mjs` o script nuevo `e2e-4c.mjs`: semillas PUT/GET; radar sin SERPAPI_KEY → 500 «Falta SERPAPI_KEY en .env.local»; sembrar 3 keywords por SQL (2 nuevas, 1 descartada) → GET sin la descartada y ordenado por relevancia; PUT estado inválido → 400; kwId inexistente → 404; PUT descartada → desaparece del GET; POST draft con keyword del radar + PUT usada → GET refleja `usada`.
- [ ] Dev server + e2e (todo PASS) + suite + tsc + merge ff a master.

## Self-review

- El radar jamás gasta sin las precondiciones (clave/nicho/caché): validaciones antes de cualquier fetch.
- `UNIQUE(project_id, keyword)` + `onConflictDoNothing` replican la semántica del original (re-runs sin duplicados, keywords ya usadas no reaparecen como nuevas).
- La validación con SerpAPI real queda para el usuario (necesita su clave gratuita); el e2e cubre el circuito HTTP completo sin claves.
