# Sistema visual — Design tokens

> Entregable 1 del design-brief (2026-07-17). Agnóstico del nombre de marca.
> Personalidad: profesional pero cercana — la limpieza de Vercel/Linear con la
> accesibilidad mental de WordPress.com, en español y sin jerga.

## 1. Paleta

### Neutrales (base slate: gris con un punto frío, más limpio que el gris puro)

| Token | Hex | Uso |
|---|---|---|
| `lienzo` | `#f8fafc` | Fondo de página del panel |
| `superficie` | `#ffffff` | Tarjetas, barras, popovers |
| `superficie-2` | `#f1f5f9` | Fondos de bloques internos (DNS, historial) |
| `borde` | `#e2e8f0` | Bordes por defecto |
| `borde-fuerte` | `#cbd5e1` | Bordes de inputs al hover |
| `texto` | `#0f172a` | Titulares y texto principal |
| `texto-2` | `#475569` | Texto secundario, descripciones |
| `texto-3` | `#94a3b8` | Metadatos, placeholders |

### Semánticos

| Token | Hex | Uso |
|---|---|---|
| `primario` | `#4f46e5` | LA acción (Publicar, Importar, Guardar) |
| `primario-osc` | `#4338ca` | Hover/active del primario |
| `primario-suave` | `#eef2ff` | Fondos suaves, selección, focos de ayuda |
| `primario-borde` | `#c7d2fe` | Bordes de elementos primarios suaves |
| `exito` | `#059669` | Publicado, guardado, claves válidas |
| `exito-suave` / `exito-texto` | `#ecfdf5` / `#047857` | Badge y toast de éxito |
| `aviso` | `#d97706` | Cambios sin publicar, atención no bloqueante |
| `aviso-suave` / `aviso-texto` | `#fffbeb` / `#b45309` | Badge y banner de aviso |
| `peligro` | `#e11d48` | Despublicar, borrar, errores |
| `peligro-osc` | `#be123c` | Hover del peligro |
| `peligro-suave` / `peligro-borde` | `#fff1f2` / `#fecdd3` | Fondos y bordes de error |

Reglas:
- **Un solo primario por vista.** Publicar es el primario en la pantalla de proyecto;
  Importar lo es en el panel. Todo lo demás: botón secundario o enlace.
- El rojo SOLO para acciones destructivas y errores (nunca para "cancelar").
- Los estados de la web viven en badges: 🟢 Publicado (`exito`) · 🟡 Cambios sin
  publicar (`aviso`) · ⚪ Sin publicar (neutral).

## 2. Tipografía

- **Familia**: `Inter` (autoalojada con `next/font`, gratis) con fallback
  `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. En los mockups se usa
  el fallback del sistema (autocontenidos, sin assets externos).
- **Escala** (px): 12 (metadatos) · 13 (secundario/etiquetas) · 14 (base UI y botones) ·
  16 (cuerpo destacado) · 18 (título de tarjeta) · 22 (título de sección) ·
  28 (título de página) · 34 (login/404).
- **Pesos**: 400 texto · 500 etiquetas y botones secundarios · 600 botones primarios y
  títulos de tarjeta · 700 títulos de página. `letter-spacing: -0.01em` a partir de 22px.

## 3. Geometría y elevación

| Token | Valor | Uso |
|---|---|---|
| `radio-control` | `8px` | Botones, inputs, badges grandes |
| `radio-tarjeta` | `12px` | Tarjetas, popovers, banners |
| `radio-pastilla` | `999px` | Badges de estado, URL pública |
| `sombra-1` | `0 1px 2px rgba(15,23,42,.06)` | Tarjetas en reposo |
| `sombra-2` | `0 4px 12px -2px rgba(15,23,42,.10)` | Tarjetas al hover, barras pegajosas |
| `sombra-3` | `0 12px 24px -6px rgba(15,23,42,.16)` | Popovers y menús |

Espaciado en rejilla de 4px. Interior de tarjeta: 20–24px. Separación entre
tarjetas: 16px. Altura de controles: 36px (compactos 30px). Foco visible SIEMPRE:
`outline: 2px solid primario; outline-offset: 2px` (en campos, anillo
`box-shadow: 0 0 0 3px rgba(79,70,229,.25)`).

## 4. Tailwind v4 — bloque para `app/globals.css`

```css
@theme {
  --color-lienzo: #f8fafc;
  --color-superficie: #ffffff;
  --color-superficie-2: #f1f5f9;
  --color-borde: #e2e8f0;
  --color-borde-fuerte: #cbd5e1;
  --color-texto: #0f172a;
  --color-texto-2: #475569;
  --color-texto-3: #94a3b8;
  --color-primario: #4f46e5;
  --color-primario-osc: #4338ca;
  --color-primario-suave: #eef2ff;
  --color-primario-borde: #c7d2fe;
  --color-exito: #059669;
  --color-exito-suave: #ecfdf5;
  --color-exito-texto: #047857;
  --color-aviso: #d97706;
  --color-aviso-suave: #fffbeb;
  --color-aviso-texto: #b45309;
  --color-peligro: #e11d48;
  --color-peligro-osc: #be123c;
  --color-peligro-suave: #fff1f2;
  --color-peligro-borde: #fecdd3;
  --radius-control: 8px;
  --radius-tarjeta: 12px;
  --shadow-1: 0 1px 2px rgba(15,23,42,.06);
  --shadow-2: 0 4px 12px -2px rgba(15,23,42,.10);
  --shadow-3: 0 12px 24px -6px rgba(15,23,42,.16);
}
```

Con esto, las utilidades quedan disponibles como `bg-primario`, `text-texto-2`,
`border-borde`, `rounded-(--radius-tarjeta)`, `shadow-(--shadow-2)`, etc.

## 5. Recetas Tailwind de los componentes base

- **Botón primario**: `inline-flex h-9 items-center gap-2 rounded-(--radius-control) bg-primario px-4 text-sm font-semibold text-white shadow-(--shadow-1) hover:bg-primario-osc focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario disabled:opacity-50 disabled:pointer-events-none`
- **Botón secundario**: igual pero `border border-borde bg-superficie text-texto font-medium hover:border-borde-fuerte hover:bg-superficie-2`
- **Botón peligro**: variante llena `bg-peligro hover:bg-peligro-osc text-white`; variante sutil `border border-peligro-borde bg-peligro-suave text-peligro hover:bg-peligro-suave/70`
- **Estado ocupado**: el botón conserva su ancho, muestra spinner (borde girando) + verbo en gerundio («Publicando…»), `disabled`.
- **Input**: `h-9 w-full rounded-(--radius-control) border border-borde bg-superficie px-3 text-sm text-texto placeholder:text-texto-3 hover:border-borde-fuerte focus:border-primario focus:shadow-[0_0_0_3px_rgba(79,70,229,.25)] focus:outline-none` · con error: `border-peligro` + texto de ayuda `text-xs text-peligro`
- **Badge estado**: `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium` + variante de color; el punto de estado es un `●` de 6px.
- **Tarjeta**: `rounded-(--radius-tarjeta) border border-borde bg-superficie p-5 shadow-(--shadow-1)` (hover en tarjetas clicables: `hover:shadow-(--shadow-2) hover:border-borde-fuerte transition`)
- **Toast/banner**: tarjeta suave del semántico con icono, título corto y detalle; cierre ✕ opcional.
- **Bloque DNS/código**: `rounded-(--radius-control) bg-superficie-2 font-mono text-[13px] p-3` + botón «Copiar» por línea.

## 6. Modo oscuro

No se construye ahora, pero TODOS los colores pasan por tokens: activar oscuro será
redefinir el bloque `@theme` bajo `prefers-color-scheme` sin tocar componentes.
