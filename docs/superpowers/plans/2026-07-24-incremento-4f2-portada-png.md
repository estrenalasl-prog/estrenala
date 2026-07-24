# Plan — Incremento 4f2: portada «diseño» en PNG

Spec: `docs/superpowers/specs/2026-07-24-incremento-4f2-portada-png-design.md`
Rama: `feat/incremento-4f2-portada-png` · TDD, commit por tarea.

## Tarea 1 — Infraestructura
- `npm i @resvg/resvg-wasm`
- Traer `SpaceGrotesk-Bold.ttf`, `SpaceGrotesk-Medium.ttf` y `OFL.txt` a
  `src/blog/portada/fuentes/` (repo floriankarsten/space-grotesk, licencia OFL).
- `next.config.ts`: `outputFileTracingIncludes` con las fuentes y el
  `index_bg.wasm` del paquete (por el `output: "standalone"`).

## Tarea 2 — `png.ts` con tests reales (TDD)
- `src/tests/portada-png.test.ts` primero (firma PNG, 1200×630, determinismo,
  títulos distintos → bytes distintos, acentos/ñ sin cascar).
- `src/blog/portada/png.ts`: `rasterizarPortadaPng(svg)` con init perezoso del
  WASM + fuentes en memoria (`loadSystemFonts: false`, familia por defecto
  Space Grotesk).

## Tarea 3 — Enchufar al flujo (TDD sobre `portada.test.ts`)
- `svg.ts`: `'Space Grotesk'` primero en los font-family.
- `index.ts` modo diseno: rasterizar → `uploadAsset("portada-diseno.png")`;
  try/catch → `EditorError("No se pudo generar la portada, vuelve a intentarlo", 500)`.
- Adaptar `portada.test.ts` (mock del rasterizador; aserciones de colores sobre
  el SVG que recibe; caso de fallo 500 sin subir nada).

## Tarea 4 — Verificación y cierre
- `npx tsc --noEmit` + `npx vitest run` (los 422+ verdes).
- Validación con dev server: generar portada modo diseño vía API (cero coste,
  sin tocar org_settings) y comprobar content-type `image/png` y que se ve.
- Actualizar REANUDACION (tabla de incrementos) y mergear ff a master tras OK
  del usuario en navegador.
