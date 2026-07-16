# Incremento 4f — Imagen de portada automática (diseño)

Fecha: 2026-07-16 · Estado: elegido por el usuario («Imagen de portada automática», recomendado sobre 4g piloto automático)

## Contexto y objetivo

Publicar un artículo exige imagen de portada («Falta la imagen de portada») y hoy es **el único paso
manual** del circuito radar → redacción → publicación programada. El 4f lo automatiza con dos vías:

1. **Diseño de la plataforma (gratis, por defecto)**: la plataforma compone una portada SVG
   1200×630 con el título del artículo sobre un degradado hecho con **los colores del propio
   sitio** (extraídos de su CSS/HTML). Coste cero, instantáneo, determinista.
2. **Imagen con IA (céntimos, opcional)**: un modelo de imagen vía OpenRouter
   (`google/gemini-2.5-flash-image`, fijo, NO el modelo de texto del usuario; override
   `OPENROUTER_MODEL_IMAGEN`) genera una foto/ilustración a partir del título y el nicho.
   ~3-4 céntimos por imagen, a cuenta de la clave configurada (BYOK del 4d).

En ambos casos el resultado es un **asset normal del proyecto** (mismo circuito que «Subir
imagen»), así que el resto del sistema (guardar, programar, plantillas) no cambia nada.

## Módulo (`src/blog/portada/`)

- `colores.ts`:
  - `extraerColores(textos: string[]): string[]` — regex de colores hex (`#rgb`/`#rrggbb`) y
    `rgb()` sobre CSS+HTML del sitio; normaliza a `#rrggbb`; descarta grises (max−min < 30),
    casi-blancos y casi-negros; devuelve los distintos ordenados por frecuencia.
  - `paletaPara(semilla: string): [string, string]` — pareja de una lista curada, elegida por hash
    determinista (fallback cuando el sitio no aporta ≥2 colores útiles).
- `svg.ts`: `generarSvgPortada({ titulo, sitio, colores: [c1, c2] })` — SVG 1200×630: degradado
  diagonal c1→c2, formas decorativas translúcidas posicionadas por hash del título, título
  troceado en líneas (~24 caracteres, máx. 4, elipsis si excede) con tamaño adaptativo, nombre del
  sitio pequeño abajo. Color del texto por luminancia media (blanco sobre oscuro, casi-negro sobre
  claro). Todo escapado XML.
- `index.ts`: `generarPortada(deps { store, blog, storage }, { orgId, projectId, titulo, modo })`:
  - 404 «Proyecto no encontrado» · sin título → 400 «Escribe primero el título del artículo» ·
    modo raro → 400 «Modo desconocido».
  - `diseno`: lee el snapshot actual (hasta 5 `.css` + la página de entrada), extrae colores
    (fallback `paletaPara`), compone el SVG y lo guarda con `uploadAsset` (reutilizado tal cual)
    → `{ assetId, url }`.
  - `ia`: exige clave OpenRouter ANTES de nada (500 «Falta la clave de OpenRouter: añádela en
    Configuración»); prompt con título + nicho (si hay) pidiendo imagen editorial SIN texto;
    `pedirImagen()` → asset con la extensión del content-type devuelto (png por defecto).
    Errores: 402 → «Tu cuenta de OpenRouter no tiene saldo. Añade crédito en
    openrouter.ai/settings/credits e inténtalo de nuevo.» · resto → 502 «No se pudo generar la
    portada, vuelve a intentarlo».

## Cliente IA (`src/ia/claude.ts`)

`MODELO_IMAGEN` (env `OPENROUTER_MODEL_IMAGEN`, default `google/gemini-2.5-flash-image`) y
`pedirImagen(prompt): Promise<{ bytes: Buffer; contentType: string }>` — chat/completions con
`modalities: ["image", "text"]`; la imagen llega como data URL en
`choices[0].message.images[0].image_url.url`; sin imagen en la respuesta → OpenRouterError 502
«OpenRouter no devolvió ninguna imagen».

## API (tras el candado, patrón conError)

| Ruta | Métodos |
|---|---|
| `blog/portada` | POST `{ titulo, modo: "diseno" \| "ia" }` → 201 `{ assetId, url }` |

## UI (editor de artículo del BlogPanel)

Fila de portada: junto a «Subir imagen», dos botones nuevos —
**«Generar diseño»** (title: gratis, con los colores de tu web) y **«Generar con IA»** (title:
usa el modelo de imagen; céntimos por imagen). Deshabilitados sin título escrito. Al generar,
la miniatura y el asset quedan seleccionados como portada (igual que al subir). Se puede
regenerar las veces que se quiera (cada clic crea un asset nuevo).

## Coste y seguridad

- `diseno`: cero llamadas externas. `ia`: 1 llamada al modelo de imagen (céntimos), nunca
  automática — siempre un clic del usuario. La clave nunca sale del servidor.
- Nota conocida: las portadas SVG se ven perfectas en la web, pero algunos crawlers sociales
  (WhatsApp/X) no muestran SVG en `og:image`; para eso está la vía IA (PNG) o subir imagen.
  Si molesta en la práctica, un 4x posterior puede rasterizar.

## Testing

- Unit: colores (frecuencia, filtra grises/extremos, fallback determinista), svg (escape XML,
  medidas, líneas/tamaños, color de texto por luminancia, usa ambos colores), generarPortada con
  fakes (mensajes byte-exactos; `diseno` crea asset svg leyendo el css del snapshot; `ia` con
  `pedirImagen` mockeado crea asset png; 402/502/sin-clave), `pedirImagen` con fetch mockeado
  (parse de data URL, sin imagen → 502, HTTP 402 → OpenRouterError).
- E2e sin gastar y sin tocar org_settings: proyecto con css de colores fuertes → portada `diseno`
  → 201, el asset servido contiene el título escapado y un color del sitio; sin título → 400
  byte-exacto; modo raro → 400; el assetId sirve para guardar un post de verdad (circuito 4a).
  La vía `ia` la valida el usuario (céntimos, su decisión).

## Fuera de alcance

Rasterizar el SVG a PNG (nota og:image) · elegir entre varias propuestas de diseño · editar la
paleta a mano · portada automática al programar sin clic (eso es del 4g piloto automático) ·
regenerar portadas de posts ya publicados en lote.
