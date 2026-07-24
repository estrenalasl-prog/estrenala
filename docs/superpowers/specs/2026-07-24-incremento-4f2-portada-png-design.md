# Incremento 4f2 — Portada «diseño» en PNG (design)

Fecha: 2026-07-24 · Cierra la limitación anotada en el spec del 4f (§«fuera de
alcance»): WhatsApp/X **no muestran SVG en `og:image`**, así que la portada
gratuita (modo «diseño») quedaba invisible al compartir el artículo. Antes de
salir al público, las portadas gratis deben ser PNG.

## Qué cambia (y qué no)

- **Cambia**: `generarPortada` modo `diseno` sigue componiendo el MISMO SVG
  determinista de 4f (colores del sitio + título), pero ahora lo **rasteriza a
  PNG 1200×630 en el momento de generarlo** y sube `portada-diseno.png`
  (`image/png`) como asset. El SVG pasa a ser un intermedio que no se guarda.
- **No cambia**: el modo `ia` (ya devuelve PNG/JPG/WebP), `uploadAsset`, los
  assets SVG antiguos (se siguen sirviendo igual), los mensajes de error
  existentes, y `generarSvgPortada` conserva su contrato y sus tests.

## Decisiones técnicas

1. **Rasterizador: `@resvg/resvg-wasm`** (WASM puro, sin binarios nativos).
   Por qué: en este PC los módulos nativos ya dieron crashes silenciosos con
   Node 24 (ver REANUDACION), y el WASM rinde igual para 1 imagen por artículo
   y produce **bytes idénticos en Windows (dev) y Linux (prod)**.
2. **Fuentes embebidas en el repo** (`src/blog/portada/fuentes/`):
   `SpaceGrotesk-Bold.ttf` + `SpaceGrotesk-Medium.ttf` + su licencia `OFL.txt`
   (SIL Open Font License — libre). El rasterizador usa `loadSystemFonts:false`
   → nunca depende de las fuentes de la máquina (un Docker pelado no tiene
   ninguna) y de regalo la portada pasa a usar la letra de la marca.
   `svg.ts` pone `'Space Grotesk'` primero en el font-family (inofensivo: el
   SVG ya no se sirve).
3. **Init perezoso del WASM una sola vez por proceso** en
   `src/blog/portada/png.ts` (`rasterizarPortadaPng(svg): Promise<Buffer>`).
   El `.wasm` y las fuentes se leen del disco con rutas resueltas en runtime.
4. **`output: "standalone"` exige declarar esos archivos** en
   `next.config.ts → outputFileTracingIncludes` (fuentes + `index_bg.wasm`);
   si no, la imagen Docker no los llevaría. Verificable solo al desplegar:
   queda anotado aquí y en el README de despliegue si existe.
5. **Fallo de rasterización** (no debería pasar: es cómputo local determinista)
   → `EditorError("No se pudo generar la portada, vuelve a intentarlo", 500)`
   y no se sube nada. Mismo texto que ya usa el modo ia (allí 502).

## Tests

- `portada-png.test.ts` (rasterizador REAL, sin mocks): firma PNG válida,
  IHDR = 1200×630, determinista (mismo SVG → mismos bytes), títulos distintos
  → bytes distintos, y no casca con acentos/ñ/comillas.
- `portada.test.ts`: el rasterizador se mockea; se conservan las aserciones de
  colores/título **sobre el SVG intermedio que recibe el mock**, y se añade:
  sube `.png` con `image/png`, y si el rasterizador revienta → 500 byte-exacto
  sin subir nada.

## Fuera de alcance

Regenerar portadas SVG ya existentes (residuos de dev) · tocar el modo ia ·
og:image de la web del cliente (herramienta del 3c, ya funciona con lo que suba).
