# Incremento 4c — Radar automático de keywords (diseño)

Fecha: 2026-07-15 · Estado: continuación natural acordada («sigamos adelante» tras validar 4b/4b2)

## Contexto y objetivo

El 4b dejó el pipeline de redacción con keyword manual. El 4c porta el **radar de tendencias** del
`Creador de Blog/`: descubre temas en alza (Google Trends vía SerpAPI), los puntúa con IA frente al
nicho del blog y ofrece una lista de la que el usuario lanza artículos con un clic. Port casi
verbatim de `src/services/{serpapi,keywords}.ts` adaptado al patrón Wordclicks (Postgres asíncrono,
org-scoping, modelo por proyecto del 4b2).

## Cómo funciona (port del original)

1. **Candidatos** (SerpAPI, geo `ES` fijo en 4c): tendencias del día (`google_trends_trending_now`,
   1 crédito) + consultas en alza relacionadas con hasta **3 keywords semilla** del proyecto
   (`RELATED_QUERIES`, 1 crédito c/u) → máx. 4 créditos por actualización. Una consulta que falla
   NO tumba el radar (se acumulan errores y se sigue); si TODAS fallan → error claro.
2. **Relevancia**: una llamada `pedirJson(RelevanciaSchema, 8000, modelo del proyecto)` puntúa cada
   candidato 0-100 frente al nicho; se guardan solo las ≥ **20**.
3. **Caché diaria** por proyecto (`trends_cache`, UNIQUE proyecto+fecha): la segunda llamada del día
   devuelve `{ actualizado: false }` sin gastar; `forzar=true` la salta (sin duplicar keywords:
   UNIQUE proyecto+keyword con `onConflictDoNothing`).
4. **Estados**: `nueva` (aparece en la lista) → `usada` (se creó un borrador con ella) o
   `descartada` (oculta). La keyword manual del 4b sigue existiendo tal cual.

## Modelo de datos (SQL manual, patrón 4a/4b)

```
blog_keywords:
  id uuid pk, project_id → projects(id) notnull,
  keyword text notnull, fuente text notnull ('trends'|'related'),
  crecimiento_pct integer, volumen_aprox integer,
  relevancia integer notnull default 0,
  estado text notnull default 'nueva',      -- nueva | usada | descartada
  discovered_at timestamptz notnull default now(),
  UNIQUE (project_id, keyword)

trends_cache:
  id uuid pk, project_id → projects(id) notnull,
  fecha text notnull (YYYY-MM-DD), payload text notnull,
  UNIQUE (project_id, fecha)

blog_settings: + keywords_semilla text NOT NULL DEFAULT ''   -- separadas por comas
```

`BlogStore` (org-scoped): `listKeywords` (relevancia desc, discovered_at desc), `insertKeywords`
(onConflictDoNothing), `setKeywordEstado` (false si no existe), `hayTrendsCache(fecha)`,
`marcarTrendsCache(fecha, payload)`. `BlogSettings` gana `keywordsSemilla`.

## Módulo (`src/blog/radar/`)

- `serpapi.ts`: port VERBATIM (tipos `CandidatoKeyword`, `parseTrendingNow`, `parseRelatedQueries`,
  `buscarTendencias`, `buscarRelacionadas`; clave en `SERPAPI_KEY`).
- `index.ts`: `actualizarRadar(deps { store, blog, orgId, projectId }, forzar = false)`:
  - 404 «Proyecto no encontrado» · 400 «Configura primero de qué va tu blog (campo Nicho)» si el
    nicho está vacío · 500 «Falta SERPAPI_KEY en .env.local» (patrón OPENROUTER del 4a) —
    todos EditorError ANTES de gastar.
  - Si todas las consultas SerpAPI fallan → EditorError 502 «SerpAPI no devolvió ninguna keyword…».
  - Prompt de relevancia: port verbatim con `sitio.nombre/dominio/nicho` → `ctx` del proyecto.
- `RelevanciaSchema` se añade a `src/ia/claude.ts` (quedó fuera en 4a a propósito).

## API (tras el candado, patrón conError)

| Ruta | Métodos |
|---|---|
| `blog/keywords` | GET → 200 lista sin descartadas `[{ id, keyword, fuente, crecimientoPct, volumenAprox, relevancia, estado, discoveredAt }]` |
| `blog/keywords/radar` | POST `{ forzar? }` → 200 `{ actualizado: boolean, candidatos?: number }` |
| `blog/keywords/[kwId]` | PUT `{ estado }` → 200 `{ ok: true }` · 400 «Estado desconocido» · 404 «Keyword no encontrada» |
| `blog/settings` | + `keywordsSemilla` en GET/PUT (límite 500 → 400 «Las keywords semilla son demasiado largas (máx. 500 caracteres)») |

## UI (bloque «Escribir con IA» del BlogPanel)

- Config: input **«Keywords semilla»** (separadas por comas; ayudan al radar a buscar temas de tu nicho).
- Sub-bloque **«Temas en tendencia»**: botón «🔍 Buscar temas de hoy» (aviso: hasta 4 créditos de
  SerpAPI + 1 llamada de IA; 1 vez al día) → si `actualizado: false` → «El radar ya se actualizó
  hoy» + botón «Forzar». Lista (solo `nueva`, orden relevancia desc): keyword, badge de relevancia,
  crecimiento % y fuente; acciones **«Escribir artículo»** (crea el borrador del 4b con esa keyword,
  la marca `usada` y abre el workspace) y **«descartar»**.
- Sin SERPAPI_KEY el botón muestra el error claro de la API (la clave es gratuita: serpapi.com,
  100 búsquedas/mes ≈ 25 actualizaciones).

## Coste y seguridad

- SerpAPI: máx. 4 créditos/actualización, caché diaria. IA: 1 llamada (con el modelo del proyecto).
- `SERPAPI_KEY` solo en servidor (`.env.local`; se añade a `.env.example`). Rutas bajo el candado.

## Testing

- Unit: parsers SerpAPI (port), radar con serpapi/pedirJson mockeados y fakes org-scoped (guarda ≥20,
  caché diaria, forzar sin duplicar, fallo parcial no aborta, fallo total lanza), prompt de
  relevancia con el modelo del proyecto.
- E2e sin gastar: semillas PUT/GET; radar sin SERPAPI_KEY → 500 byte-exacto; keywords sembradas en BD
  → GET ordenado sin descartadas; PUT estados (+400/404); flujo keyword→borrador (POST drafts + PUT usada).
- El radar real (con clave SerpAPI del usuario) lo valida el usuario en navegador.

## Fuera de alcance

Geo configurable (fijo ES) · programación automática del radar (cron) · volúmenes de búsqueda de
pago (Ahrefs/Semrush) · auto-redacción sin intervención del usuario.
