# Incremento 4b2 — Selector de modelo de IA · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elegir desde la UI, por proyecto, el modelo de OpenRouter con el que el pipeline 4b redacta (lista curada + slug libre, incl. `:free`). Spec: `docs/superpowers/specs/2026-07-10-incremento-4b2-selector-modelo-design.md`.

**Architecture:** columna `blog_settings.modelo` (default `''` = default de plataforma) → `Contexto.modelo` del pipeline → parámetro opcional `modelo` en `pedirTexto/pedirJson/pedirConBusquedaWeb` (sobreescribe `model` en el body). UI en el bloque «Escribir con IA» del BlogPanel. Sin dependencias nuevas.

## Global Constraints

- Mensaje byte-exacto nuevo: «El nombre del modelo es demasiado largo (máx. 100 caracteres)».
- `modelo === ''` significa «default de la plataforma» en TODAS las capas (nunca se persiste el default expandido).
- Al terminar cada tarea: `npx vitest run` verde + `npx tsc --noEmit` + commit. Rama `feat/incremento-4b2-selector-modelo`, merge ff a master tras el e2e.

### Task 1: Cliente IA — parámetro `modelo` opcional

**Files:** Modify `src/ia/claude.ts`, `src/tests/ia-claude.test.ts`.

- [ ] Tests primero: `pedirTexto("p", 8000, "x/y")` → `body.model === "x/y"`; sin modelo → `body.model === MODELO`; ídem `pedirConBusquedaWeb("p", 4000, 3, "x/y")` y `pedirJson("p", schema, 4000, "x/y")`.
- [ ] Implementar: firmas `pedirTexto(prompt, maxTokens = 8000, modelo?: string)`, `pedirJson(prompt, schema, maxTokens = 4000, modelo?: string)`, `pedirConBusquedaWeb(prompt, maxTokens = 8000, maxBusquedas = 6, modelo?: string)`; en las tres: `...(modelo ? { model: modelo } : {})` en el body (`completar` pone `model: MODELO` primero, el spread gana).
- [ ] Commit: `feat(4b2): las llamadas IA aceptan modelo opcional`

### Task 2: BD + BlogStore + ruta settings

**Files:** Create `drizzle/manual/2026-07-10-4b2-modelo.sql`; Modify `src/db/schema.ts`, `src/repositories/blog.ts`, `app/api/projects/[id]/blog/settings/route.ts`, fakes de tests que devuelvan `BlogSettings`.

- [ ] SQL: `ALTER TABLE blog_settings ADD COLUMN IF NOT EXISTS modelo text NOT NULL DEFAULT '';` → aplicar con `node scripts/db-apply.mjs …` y verificar.
- [ ] Schema drizzle: `modelo: text("modelo").notNull().default("")`. Tipo `BlogSettings = { nicho; idioma; modelo }`; `getBlogSettings` devuelve `modelo`; `setBlogSettings` lo escribe (upsert igual que nicho).
- [ ] Ruta settings: GET default `{ nicho: "", idioma: "es", modelo: "" }`; PUT valida `modelo.length > 100` → 400 byte-exacto, conserva idioma previo, escribe `{ nicho, idioma, modelo }`.
- [ ] Commit: `feat(4b2): blog_settings.modelo por proyecto (SQL aplicado) + API`

### Task 3: Pipeline — `ctx.modelo` a las 6 etapas

**Files:** Modify `src/blog/pipeline/tipos.ts` (Contexto + modelo), `index.ts` (leer settings.modelo), las 6 etapas (pasar `ctx.modelo || undefined`), `src/tests/blog-pipeline.test.ts`.

- [ ] Tests: fake settings con `modelo: "m/x"` → `pedirJson` (analisis) recibe `"m/x"` como 4º arg; `pedirTexto` (plan/redaccion/links) como 3º; `pedirConBusquedaWeb` (investigacion) como 4º; sin modelo (`''`) → `undefined`.
- [ ] Implementar y correr suite.
- [ ] Commit: `feat(4b2): el pipeline redacta con el modelo elegido por proyecto`

### Task 4: UI — selector en BlogPanel + visible en workspace

**Files:** Modify `app/projects/[id]/BlogPanel.tsx`, `app/projects/[id]/ArticleAiWorkspace.tsx`.

- [ ] BlogPanel: const módulo `MODELOS = [{ valor, nombre }...]` (curados del spec); estados `modeloSel`/`modeloCustom`; al cargar settings: si el modelo guardado no es curado → sel `"otro"` + custom; el Guardar del nicho pasa a guardar `{ nicho, modelo }` (efectivo = sel === "otro" ? custom.trim() : sel). Select + input «Otro…» (placeholder «identificador de openrouter.ai/models, p. ej. deepseek/deepseek-chat:free») + nota «si un modelo da error, prueba otro».
- [ ] Workspace: prop nueva `modelo: string` (nombre legible calculado en BlogPanel); línea «Modelo: X» visible junto a los botones de ejecutar.
- [ ] Commit: `feat(4b2): selector de modelo en el panel del blog`

### Task 5: E2e + merge

- [ ] Ampliar `<scratchpad>/e2e-4b.mjs` (o script aparte): PUT settings `{ nicho, modelo: "anthropic/claude-haiku-4.5" }` → GET lo devuelve; PUT modelo de 101 chars → 400 byte-exacto; PUT modelo `""` → GET `""`.
- [ ] Dev server + e2e completo (los 21 checks del 4b siguen PASS) + suite + tsc.
- [ ] Merge ff a master.

## Self-review

- El default `''` evita fijar en BD el modelo de la plataforma (si mañana cambia el env, los proyectos «por defecto» lo heredan).
- Errores de modelo inexistente quedan cubiertos por el flujo de error por etapa del 4b (visible + reintentable); no se añade validación contra OpenRouter (fuera de alcance).
- El e2e no gasta IA; la prueba con modelo real (incl. `:free`) la hace el usuario, que es justo lo que pidió.
