# Sistema visual — Design tokens · v2 «Alto Voltaje»

> Entregable 1 de la sesión de diseño (2026-07-17). **Dirección elegida: 1b · Alto Voltaje.**
> Marca de trabajo: **Estrénala** (el sistema sigue siendo agnóstico del nombre).
> Personalidad: profesional pero cercana · **seguro, capaz, en directo** · limpieza tipo Vercel/Linear
> con la accesibilidad mental de WordPress.com, sin copiar a nadie.
>
> **Cambio clave frente a la v1:** fuera el índigo `#4f46e5` de fábrica y los neutros slate fríos.
> Entra un **neutro cálido papel/tinta** (ligerísimo tinte verde-oliva) + **un único acento: lima
> eléctrico `#C4F000`**. Casi monocromo. El acento es SOLO para la acción principal y el foco;
> los estados viven en sus propios colores (verde/ámbar/rojo), nunca en el lima.

---

## 0. Reglas de uso (no negociables — heredadas y reforzadas)

1. **Un solo botón primario (lima) por vista.** Publicar manda en la pantalla de proyecto;
   Importar manda en el panel. Todo lo demás es secundario/fantasma.
2. **El lima nunca es un estado.** No significa «éxito» ni «peligro». Es identidad + acción + foco.
3. **El rojo solo para destructivo y errores.** Nunca para «Cancelar» (eso es un botón secundario).
4. **Estados de la web = badges** con punto de color: Publicado (verde) · Cambios sin publicar (ámbar) · Sin publicar (gris).
5. **Foco visible siempre** con el anillo de doble halo (§4). Funciona sobre blanco y sobre el lima.
6. **Sin modo oscuro por ahora**, pero todos los tokens tienen su valor oscuro preparado (§6).
7. **El texto nunca va sobre lima salvo la tinta** `--texto` (`#141509`): el lima es demasiado claro
   para texto blanco. Para lima *como texto/enlace* se usa la variante oscura `--acento-texto`.

---

## 1. Paleta

### Neutros — papel & tinta (cálidos, tinte verde-oliva muy sutil)
| Token | Hex | Uso |
|---|---|---|
| `lienzo` | `#F5F6F1` | fondo de la app |
| `superficie` | `#FFFFFF` | tarjetas, popovers, inputs |
| `superficie-2` | `#ECEDE4` | fondos sutiles, hover de filas, thumbnails |
| `borde` | `#DEDFD6` | bordes por defecto |
| `borde-fuerte` | `#C9CABF` | bordes de hover / separadores marcados |
| `texto` | `#141509` | titulares, texto principal (tinta casi negra) |
| `texto-2` | `#55584C` | texto secundario, etiquetas |
| `texto-3` | `#9A9C8F` | placeholder, metadatos, deshabilitado |

### Acento — lima eléctrico (identidad + acción + foco)
| Token | Hex | Uso |
|---|---|---|
| `acento` | `#C4F000` | relleno del botón primario, subrayados de marca |
| `acento-vivo` | `#B4E000` | hover del primario (lima un punto más profundo) |
| `acento-activo` | `#A3CC00` | pressed/active del primario |
| `acento-texto` | `#5E7300` | lima **como texto o enlace** sobre superficie clara (legible) |
| `acento-suave` | `#F2FBCB` | fondos de énfasis muy suave |
| `acento-borde` | `#DDF08A` | bordes de zonas de énfasis (dropzone activa, etc.) |
| `acento-anillo` | `#8FB300` | color del anillo de foco (contraste garantizado, §4) |

> Sobre el lima (`#C4F000`) el texto SIEMPRE es `--texto` `#141509`. Contraste ≈ 12:1 (AAA).

### Estados (independientes del acento)
| Token | Hex | | Token | Hex |
|---|---|---|---|---|
| `exito` | `#2A9D3F` | | `exito-suave` | `#E7F5E9` |
| `exito-texto` | `#1F7A34` | | | |
| `aviso` | `#D99500` | | `aviso-suave` | `#FFF7E6` |
| `aviso-texto` | `#8A5B00` | | `aviso-borde` | `#F5E3B8` |
| `peligro` | `#DC2626` | | `peligro-suave` | `#FEECEC` |
| `peligro-texto` | `#B42020` | | `peligro-borde` | `#F6C9C9` |

---

## 2. Tipografía

- **Familia única: Space Grotesk** (grotesca con carácter, gratuita, SIL OFL).
  Autoalojar con `next/font/local` o `next/font/google` — **nunca** `@import` de Google en el HTML entregado.
  Pesos usados: **400 / 500 / 600 / 700**. Fallback: `system-ui, -apple-system, "Segoe UI", sans-serif`.
- Números: activar `font-variant-numeric: tabular-nums` en tablas, historial y contadores.
- `text-wrap: pretty` en párrafos; `text-wrap: balance` en titulares.

### Escala tipográfica
| Token | px / line-height | peso · tracking | Uso |
|---|---|---|---|
| `display` | 40 / 1.0 | 700 · −0.03em | héroes, estado vacío |
| `h1` | 28 / 1.1 | 700 · −0.02em | título de pantalla |
| `h2` | 20 / 1.2 | 600 · −0.01em | secciones |
| `h3` | 16 / 1.3 | 600 · −0.01em | tarjetas |
| `cuerpo` | 15 / 1.55 | 400 | texto por defecto |
| `cuerpo-sm` | 13.5 / 1.5 | 400 | texto en UI densa |
| `etiqueta` | 12 / 1.4 | 500 | labels, badges |
| `mini` | 11 / 1.4 | 600 · 0.06em uppercase | eyebrows, metadatos |

---

## 3. Radios, sombras, espaciado, movimiento

| Token | Valor | | Token | Valor |
|---|---|---|---|---|
| `radio-c` | `9px` (controles) | | `sombra-1` | `0 1px 2px rgba(20,21,9,.06)` |
| `radio-t` | `14px` (tarjetas) | | `sombra-2` | `0 4px 14px -3px rgba(20,21,9,.12)` |
| `radio-pop` | `16px` (popovers) | | `sombra-3` | `0 18px 48px -12px rgba(20,21,9,.20)` |
| `radio-full` | `999px` (pastillas) | | | |

- **Espaciado**: escala de 4 → `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`.
- **Movimiento**: `120ms` (micro: hover/press) · `180ms` (popovers, toasts) · `ease` estándar,
  `cubic-bezier(.2,.8,.2,1)` para entradas. Respetar `prefers-reduced-motion`.

---

## 4. Foco (anillo de doble halo — visible sobre cualquier fondo)

```css
--anillo-foco: 0 0 0 2px var(--lienzo), 0 0 0 4px var(--acento-anillo);
```

El primer halo (color lienzo) separa el control del anillo; el segundo (`#8FB300`) es el foco.
Sobre el botón lima se ve porque `#8FB300` es más oscuro que `#C4F000`. Aplicar en `:focus-visible`.

---

## 5. Bloque `@theme` (Tailwind CSS v4)

Pegar en `app/globals.css`. Genera utilidades (`bg-acento`, `text-tinta`, `rounded-t`, `shadow-2`…).

```css
@import "tailwindcss";

@theme {
  /* ---- Neutros ---- */
  --color-lienzo:        #F5F6F1;
  --color-superficie:    #FFFFFF;
  --color-superficie-2:  #ECEDE4;
  --color-borde:         #DEDFD6;
  --color-borde-fuerte:  #C9CABF;
  --color-texto:         #141509;
  --color-texto-2:       #55584C;
  --color-texto-3:       #9A9C8F;

  /* ---- Acento: lima eléctrico ---- */
  --color-acento:        #C4F000;
  --color-acento-vivo:   #B4E000;
  --color-acento-activo: #A3CC00;
  --color-acento-texto:  #5E7300;
  --color-acento-suave:  #F2FBCB;
  --color-acento-borde:  #DDF08A;
  --color-acento-anillo: #8FB300;

  /* ---- Estados ---- */
  --color-exito:         #2A9D3F;
  --color-exito-suave:   #E7F5E9;
  --color-exito-texto:   #1F7A34;
  --color-aviso:         #D99500;
  --color-aviso-suave:   #FFF7E6;
  --color-aviso-texto:   #8A5B00;
  --color-aviso-borde:   #F5E3B8;
  --color-peligro:       #DC2626;
  --color-peligro-suave: #FEECEC;
  --color-peligro-texto: #B42020;
  --color-peligro-borde: #F6C9C9;

  /* ---- Tipografía ---- */
  --font-sans: "Space Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif;

  /* ---- Radios ---- */
  --radius-c:    9px;
  --radius-t:    14px;
  --radius-pop:  16px;
  --radius-full: 999px;

  /* ---- Sombras ---- */
  --shadow-1: 0 1px 2px rgba(20,21,9,.06);
  --shadow-2: 0 4px 14px -3px rgba(20,21,9,.12);
  --shadow-3: 0 18px 48px -12px rgba(20,21,9,.20);
}

/* Anillo de foco reutilizable */
@theme {
  --ring-foco: 0 0 0 2px var(--color-lienzo), 0 0 0 4px var(--color-acento-anillo);
}

:root { color-scheme: light; }
body { background: var(--color-lienzo); color: var(--color-texto); font-family: var(--font-sans); }
:focus-visible { outline: none; box-shadow: var(--ring-foco); }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
```

---

## 6. Modo oscuro (preparado, NO activado)

No se usa aún. Cuando toque, activar con `.dark` en `<html>` y este override. El **lima no cambia**.

```css
.dark {
  --color-lienzo:        #131410;
  --color-superficie:    #1B1C17;
  --color-superficie-2:  #232419;
  --color-borde:         #2E2F26;
  --color-borde-fuerte:  #3D3E32;
  --color-texto:         #F3F4EC;
  --color-texto-2:       #ADAEA0;
  --color-texto-3:       #74766A;
  /* Acento y estados: mismos hex; el lima sigue con texto #141509 encima. */
  --color-acento-texto:  #C4F000;   /* como texto, en oscuro el lima ya contrasta */
  --shadow-1: 0 1px 2px rgba(0,0,0,.4);
  --shadow-2: 0 4px 14px -3px rgba(0,0,0,.5);
  --shadow-3: 0 18px 48px -12px rgba(0,0,0,.6);
}
```

---

## 7. Recetas de clases por componente (Tailwind v4)

Definidas en `@layer components` con `@apply`. Son la fuente de verdad de `02-componentes.html`.

```css
@layer components {

  /* ---------- Botones ---------- */
  .btn { @apply inline-flex items-center justify-center gap-2 h-9 px-4 rounded-c font-medium
          text-[14px] cursor-pointer transition-[background,box-shadow,border-color] duration-[120ms]
          border border-transparent select-none; }
  .btn:focus-visible { box-shadow: var(--ring-foco); }
  .btn:disabled { @apply opacity-50 cursor-not-allowed; }

  .btn-primario { @apply bg-acento text-texto font-semibold shadow-1; }
  .btn-primario:hover:not(:disabled)  { @apply bg-acento-vivo; }
  .btn-primario:active:not(:disabled) { @apply bg-acento-activo; }

  .btn-sec { @apply bg-superficie border-borde text-texto; }
  .btn-sec:hover:not(:disabled)  { @apply border-borde-fuerte bg-superficie-2; }

  .btn-fantasma { @apply bg-transparent text-texto-2; }
  .btn-fantasma:hover:not(:disabled) { @apply bg-superficie-2 text-texto; }

  .btn-peligro-sutil { @apply bg-peligro-suave border-peligro-borde text-peligro-texto; }
  .btn-peligro-sutil:hover:not(:disabled) { @apply bg-[#FCDCDC]; }

  .btn-peligro-solido { @apply bg-peligro text-white font-semibold; }
  .btn-peligro-solido:hover:not(:disabled) { @apply bg-[#C11F1F]; }

  .btn-sm { @apply h-8 px-3 text-[13px]; }
  .btn-lg { @apply h-11 px-6 text-[15px]; }

  /* Ocupado / cargando: usar <span class="cargador"> dentro del botón, botón disabled */
  .cargador { @apply inline-block w-[14px] h-[14px] rounded-full border-2 border-current
              border-t-transparent animate-spin; }

  /* ---------- Badges de estado (punto de color) ---------- */
  .badge { @apply inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium; }
  .badge .punto { @apply w-1.5 h-1.5 rounded-full; }
  .badge-exito   { @apply bg-exito-suave text-exito-texto; }
  .badge-exito   .punto { @apply bg-exito; }
  .badge-aviso   { @apply bg-aviso-suave text-aviso-texto; }
  .badge-aviso   .punto { @apply bg-aviso; }
  .badge-neutro  { @apply bg-superficie-2 text-texto-2; }
  .badge-neutro  .punto { @apply bg-texto-3; }
  /* Variante emoji opcional: sustituir <span class="punto"> por el emoji 🟢/🟡/⚪ */

  /* ---------- Campos ---------- */
  .campo { @apply h-9 w-full rounded-c border border-borde bg-superficie px-3 text-[14px]
           text-texto placeholder:text-texto-3; }
  .campo:focus-visible { @apply border-acento-anillo; box-shadow: var(--ring-foco); }
  .campo:disabled { @apply bg-superficie-2 text-texto-3 cursor-not-allowed; }
  .campo-error { @apply border-peligro; }
  .campo-error:focus-visible { box-shadow: 0 0 0 2px var(--color-lienzo), 0 0 0 4px var(--color-peligro); }
  .etiqueta-campo { @apply block text-[12px] font-medium text-texto-2 mb-1.5; }
  .ayuda-campo  { @apply text-[12px] text-texto-3 mt-1.5; }
  .error-campo  { @apply text-[12px] text-peligro-texto mt-1.5; }

  /* ---------- Tarjetas ---------- */
  .tarjeta { @apply bg-superficie border border-borde rounded-t shadow-1; }
  .tarjeta-hover:hover { @apply shadow-2 border-borde-fuerte; }

  /* ---------- Pastilla de URL ---------- */
  .pastilla-url { @apply inline-flex items-center gap-1.5 rounded-full bg-superficie-2
                  border border-borde text-texto pl-3.5 pr-1.5 py-1.5 text-[12px]; }

  /* ---------- Interruptor (toggle) ---------- */
  .interruptor { @apply relative w-9 h-5 rounded-full bg-borde-fuerte transition-colors duration-[120ms]; }
  .interruptor[aria-checked="true"] { @apply bg-acento; }
  .interruptor::after { content:""; @apply absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white
                        shadow-1 transition-transform duration-[120ms]; }
  .interruptor[aria-checked="true"]::after { transform: translateX(16px); }
  .interruptor:focus-visible { box-shadow: var(--ring-foco); }

  /* ---------- Aviso de coste (blog IA) ---------- */
  .aviso-coste { @apply inline-flex items-center gap-1.5 rounded-c bg-aviso-suave border
                 border-aviso-borde text-aviso-texto px-2.5 py-1.5 text-[12px]; }
}
```

---

## 8. Notas para el logo (para cuando lo diseñes, marca «Estrénala»)

- Colores disponibles: tinta `#141509` (wordmark) + lima `#C4F000` (acento/símbolo). Casi monocromo.
- El lima funciona como «rotulador fosforito» sobre tinta: subrayado, resalte de una sílaba, o el punto de un símbolo.
- Sobre fondo lima, el logotipo va en tinta. Nunca lima sobre blanco como texto fino (usar `--acento-texto`).
- Space Grotesk 700 con tracking `−0.03em` es la base tipográfica del wordmark.

---

*Siguiente entregable tras tu OK: `02-componentes.html` (todos los estados: normal, hover, focus, disabled, ocupado, error).*
