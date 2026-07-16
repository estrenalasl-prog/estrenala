# Incremento 4f — Imagen de portada automática · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** portada sin subirla a mano: diseño SVG gratuito con los colores del sitio, o imagen con IA (céntimos, opcional). Spec: `docs/superpowers/specs/2026-07-16-incremento-4f-portada-automatica-design.md`.

**Architecture:** módulo `src/blog/portada/` (colores + svg + orquestador) que desemboca en `uploadAsset` (reutilizado); `pedirImagen` nuevo en `src/ia/claude.ts` (modalities image, modelo fijo `MODELO_IMAGEN`); una ruta API `blog/portada`; dos botones en la fila de portada del editor. Sin dependencias nuevas ni cambios de esquema.

## Global Constraints

- Mensajes byte-exactos nuevos: «Escribe primero el título del artículo», «Modo desconocido», «No se pudo generar la portada, vuelve a intentarlo», «OpenRouter no devolvió ninguna imagen». Reusados: «Proyecto no encontrado», «Falta la clave de OpenRouter: añádela en Configuración», mensaje 402 de saldo (idéntico al del radar/plantillas).
- `diseno` NUNCA llama fuera; `ia` NUNCA usa el modelo de texto del usuario (modelo de imagen fijo) y NUNCA se dispara sola (siempre clic).
- Al terminar cada tarea: `npx vitest run` verde + `npx tsc --noEmit` + commit. Rama `feat/incremento-4f-portada-automatica`, merge ff a master tras el e2e.
- E2e sin gastar y SIN tocar org_settings (guarda del 2026-07-15).

### Task 1: colores + SVG (TDD puro, sin IO)

**Files:** Create `src/blog/portada/colores.ts`, `src/blog/portada/svg.ts`, `src/tests/portada-svg.test.ts`.

- [ ] `extraerColores(textos)`: hex 3/6 + `rgb(r,g,b)` → `#rrggbb`; filtra grises (max−min<30), casi-blancos (todos>235) y casi-negros (todos<25); orden por frecuencia, sin duplicados.
- [ ] `paletaPara(semilla)`: ~8 parejas curadas, hash determinista.
- [ ] `generarSvgPortada({ titulo, sitio, colores })`: 1200×630, degradado diagonal, formas por hash, líneas ≤~24 chars (máx. 4 + «…»), tamaño por nº de líneas, texto blanco/oscuro por luminancia media, todo escapado XML.
- [ ] Commit: `feat(4f): colores del sitio + portada SVG determinista`

### Task 2: `pedirImagen` (TDD con fetch mockeado)

**Files:** Modify `src/ia/claude.ts`, `src/tests/ia-claude.test.ts`; `.env.example` (`# OPENROUTER_MODEL_IMAGEN=`).

- [ ] `MODELO_IMAGEN` + `pedirImagen(prompt)` → `{ bytes, contentType }` desde la data URL de `choices[0].message.images[0].image_url.url`; sin imagen → OpenRouterError 502 byte-exacto; HTTP no-ok → OpenRouterError(status).
- [ ] Commit: `feat(4f): pedirImagen - modelo de imagen fijo via OpenRouter`

### Task 3: `generarPortada` (TDD con fakes)

**Files:** Create `src/blog/portada/index.ts`, `src/tests/portada.test.ts`.

**Interfaces:** `generarPortada(deps: { store; blog; storage }, { orgId, projectId, titulo, modo: "diseno" | "ia" }): Promise<{ assetId: string; url: string }>`.

- [ ] Validaciones byte-exactas ANTES de crear nada; `diseno` lee ≤5 css + entrada del snapshot y crea asset `.svg` (vía `uploadAsset`); sin colores útiles → `paletaPara(nombre del proyecto)`; `ia` exige clave antes, usa nicho si existe, mapea 402/otros, crea asset con la ext del contentType.
- [ ] Commit: `feat(4f): generarPortada - diseno gratis con colores del sitio o imagen IA`

### Task 4: ruta API + UI

**Files:** Create `app/api/projects/[id]/blog/portada/route.ts`; Modify `app/projects/[id]/BlogPanel.tsx`.

- [ ] POST `blog/portada` `{ titulo, modo }` → 201 `{ assetId, url }` (conError).
- [ ] Editor: botones «Generar diseño» y «Generar con IA» junto a «Subir imagen», deshabilitados sin título; al éxito seleccionan la portada (assetId + miniatura).
- [ ] Commit: `feat(4f): portada automatica desde el editor (diseno gratis o IA)`

### Task 5: E2e sin gastar + merge

- [ ] `e2e-4f.mjs`: proyecto con css de colores fuertes → sin título 400 exacto · modo raro 400 exacto · `diseno` 201 y el asset servido es SVG con el título escapado y un color del css · post real guardado con esa portada (circuito completo) · `ia` se SKIPea si hay clave real (no se gasta).
- [ ] Dev server + e2e PASS + suite + tsc + merge ff + memoria.

## Self-review

- El asset generado entra por `uploadAsset`: mismas garantías (límites, tipos, storage key) que una subida manual — cero caminos nuevos de persistencia.
- `diseno` es determinista para un mismo sitio+título: testeable byte a byte y sin sorpresas.
- La vía `ia` queda aislada en dos puntos mockeables (`claveOpenRouter`, `pedirImagen`); ningún test ni e2e gasta crédito.
