# Incremento 4g — Piloto automático del blog · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** un proyecto con el piloto activado publica solo: radar → mejor tema (>60) → pipeline con el modelo del usuario → portada automática → programado a +5 min. OFF por defecto, gasto acotado y registro humano de cada resultado. Spec: `docs/superpowers/specs/2026-07-16-incremento-4g-piloto-automatico-design.md`.

**Architecture:** columnas `piloto_*` en `blog_settings` (métodos nuevos, SIN tocar `BlogSettings`/su PUT); runner `src/blog/piloto/` que orquesta módulos existentes (`actualizarRadar`, `siguienteEtapa`/`ejecutarEtapa`, `generarPortada`, `programarPost`); tick de instrumentation + `POST /api/cron/piloto`; tarjeta de config en BlogPanel. Sin dependencias nuevas.

## Global Constraints

- Mensajes byte-exactos nuevos (registro): «El piloto no arrancó: falta la clave de OpenRouter (Configuración)», «El piloto no arrancó: falta la clave de SerpAPI (Configuración)», «Hoy no había ningún tema con relevancia > 60: no se gastó nada en redactar». Errores API: «Frecuencia no válida», «Hora no válida», «Portada no válida».
- `PILOTO_RELEVANCIA_MINIMA = 60`; 1 artículo máx. por ejecución; reclamo por día (`piloto_ultimo_dia`).
- El e2e JAMÁS deja `piloto_activo = true` (hay claves reales: el tick correría de verdad) ni toca org_settings.
- Al terminar cada tarea: `npx vitest run` verde + `npx tsc --noEmit` + commit. Rama `feat/incremento-4g-piloto-automatico`, merge ff a master tras el e2e.

### Task 1: BD — columnas piloto + métodos del store

**Files:** Create `drizzle/manual/2026-07-16-4g-piloto.sql`; Modify `src/db/schema.ts`, `src/repositories/blog.ts`, `src/tests/blog-apply.test.ts` (stubs).

**Interfaces (Produces):**
```ts
export type Piloto = { activo: boolean; cadaDias: number; hora: number; portada: string;
  ultimoDia: string | null; ultimoMsg: string | null };
// BlogStore +:
getPiloto(orgId, projectId): Promise<Piloto | null>;
setPiloto(orgId, projectId, p: Pick<Piloto, "activo" | "cadaDias" | "hora" | "portada">): Promise<void>; // upsert SOLO columnas piloto
listPilotosActivos(): Promise<(Piloto & { projectId: string; orgId: string })[]>; // global
reclamarPiloto(projectId: string, dia: string): Promise<boolean>; // false si ya reclamado ese día
registrarPiloto(projectId: string, msg: string): Promise<void>;   // piloto_ultimo_msg
```

- [ ] SQL `ALTER TABLE blog_settings ADD COLUMN IF NOT EXISTS …` (6 columnas del spec) → `db-apply.mjs`.
- [ ] Schema drizzle + métodos (upsert de setPiloto con onConflictDoUpdate solo de columnas piloto; reclamo con `IS DISTINCT FROM`).
- [ ] Commit: `feat(4g): columnas piloto en blog_settings + metodos del store (SQL aplicado)`

### Task 2: runner `pilotoTick` (TDD)

**Files:** Create `src/blog/piloto/index.ts`, `src/tests/piloto.test.ts`.

**Interfaces:** `pilotoTick(deps: { store; blog; storage }, ahora = new Date()): Promise<{ ejecutados: number; publicados: number }>` — `ahora` inyectable para tests de hora/frecuencia.

- [ ] Tests primero (vi.mock de radar/pipeline/portada/programados/claves con importOriginal, fakes del store): inactivo/fuera de hora/frecuencia no corre; reclamo único; sin claves registra byte-exacto sin llamar al radar; sin tema >60 registra sin crear borrador; feliz completo (etapas → usada → portada diseno → programarPost con publicarEn ≈ ahora+5 min → deleteDraft → registro con título y relevancia); etapa en error conserva borrador y no programa; portada `ia` falla → cae a `diseno`; programar falla → registra y conserva.
- [ ] Implementar según el spec (pasos 1-6; todo fallo acaba en `registrarPiloto`).
- [ ] Commit: `feat(4g): pilotoTick - radar, redaccion, portada y programacion sin clics`

### Task 3: disparadores

**Files:** Modify `instrumentation.ts`, `middleware.ts`; Create `app/api/cron/piloto/route.ts`.

- [ ] Tick de 60 s: `pilotoTick` y después `publicarVencidos` (cada uno con su try/catch y su log `[piloto]`/`[programados]`).
- [ ] `cron/piloto` POST (público + `CRON_SECRET`, calcado de `cron/publicar`); añadirlo a RUTAS_PUBLICAS.
- [ ] Commit: `feat(4g): el tick del servidor ejecuta el piloto + endpoint cron`

### Task 4: API + UI

**Files:** Create `app/api/projects/[id]/blog/piloto/route.ts`; Modify `app/projects/[id]/BlogPanel.tsx`.

- [ ] GET (404 proyecto; defaults si no hay fila) · PUT valida `cadaDias ∈ {1,3,7}`, `hora ∈ 0-23`, `portada ∈ {diseno, ia}` (byte-exactos) → `setPiloto`.
- [ ] Tarjeta «Piloto automático»: interruptor, frecuencia, hora, portada, aviso de coste, línea de estado (`ultimoMsg` + `ultimoDia`), botón Guardar.
- [ ] Commit: `feat(4g): piloto automatico configurable desde el panel del blog`

### Task 5: E2e sin gastar + merge

- [ ] `e2e-4g.mjs`: GET defaults → PUT inválidos (3 byte-exactos) → PUT válido con `activo: false` → GET refleja → PUT activo:false final de seguridad → `POST /api/cron/piloto` (todos inactivos) → `{ ejecutados: 0, publicados: 0 }`. Verificación por SQL de que NINGÚN proyecto queda con `piloto_activo = true`.
- [ ] Suite + tsc + regresión e2e 4e/4f + merge ff + memoria. La primera ejecución real la valida el usuario en su proyecto.

## Self-review

- El gasto está triplemente acotado: opt-in por proyecto, 1 artículo/ejecución con reclamo diario, y corte de relevancia >60 antes de redactar.
- Todo camino (éxito, sin tema, sin claves, etapa rota, slug duplicado) termina en `piloto_ultimo_msg`: el usuario siempre sabe qué hizo el piloto y por qué.
- El piloto no inventa mecanismos: radar 4c + pipeline 4b + portada 4f + programados 4e; los fallos caen en los estados ya visibles de cada pieza (borrador en error, fila de programados, registro).
