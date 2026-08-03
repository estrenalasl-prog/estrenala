# Sistema visual — entregables de la sesión de diseño (v2 · «Alto Voltaje»)

Fecha: 2026-07-17 · Responde al `docs/design-brief.md`.
**Dirección elegida: 1b · Alto Voltaje.** **Marca de trabajo: Estrénala** (el sistema sigue
siendo agnóstico del nombre: cambiar el wordmark no toca ningún token).

> Qué cambió frente a la v1: fuera el índigo `#4f46e5` de fábrica y los neutrales slate fríos.
> Ahora **neutro papel/tinta cálido** + **un único acento lima eléctrico `#C4F000`** (identidad +
> acción + foco). Tipografía **Space Grotesk** (antes system-ui). Personalidad: seguro, capaz,
> «en directo». Badges de estado con **punto de color** (variante emoji documentada en `02`).

## Cómo verlo

Cada `.html` es autocontenido (sin assets externos, sin CDN): **doble clic y se abre en el
navegador**. En móvil también se ven bien (viewport + flex/grid). `01-tokens.md` es la fuente
de verdad; el resto son mockups que reflejan esos tokens.

| Archivo | Qué es |
|---|---|
| `01-tokens.md` | Paleta, tipografía, radios, sombras + bloque `@theme` (Tailwind v4) + recetas de clases por componente + modo oscuro preparado |
| `02-componentes.html` | Hoja de componentes con TODOS los estados (normal, hover, foco, disabled, ocupado, error) + piezas del blog + los 2 patrones con previsión |
| `03-login.html` | Login: normal, error y variante multiusuario futura |
| `04-panel.html` | Panel «Tus webs»: importación destacada con dropzone, tarjetas con estado, vacío de primera visita |
| `05-proyecto.html` | Pantalla de proyecto: barra de publicar, dirección/dominio plegados, vista previa protagonista + historial |
| `06-popover-editor.html` | Popover del editor in-situ en CSS plano `wc-`: variantes texto/enlace/imagen/botón/color y estados hover/seleccionado/guardando/guardado |
| `07-404-publica.html` | «Aquí todavía no hay web»: marca discreta + publicidad sutil de la plataforma |
| `08-wordmarks.html` | Direcciones de marca: **Estrénala** (desarrollada) · WebNace · YaVive |
| `09-blog.html` | Panel del blog completo: lista con estados, radar de temas, carril del piloto automático |
| `10-configuracion.html` | Configuración por dentro: general, herramientas del sitio, equipo, plan, cuenta, zona de peligro |

## Decisiones clave (el porqué en `01-tokens.md`)

- **Acento único: lima `#C4F000`.** Es identidad + acción + foco. NUNCA es un estado (no
  significa «éxito» ni «peligro») y nunca va como texto fino sobre blanco (para eso está
  `--acento-texto #5E7300`). Sobre el lima, el texto siempre es la tinta `#141509`.
- **Neutro papel/tinta cálido** (tinte oliva sutil), casi monocromo. Da el aire Apple/Linear
  que se pidió sin degradados ni ruido de color (se eliminaron las miniaturas multicolor de la v1).
- **Un primario por vista**: Publicar manda en el proyecto; Importar manda en el panel.
- **Rojo solo destructivo y errores**, nunca para «Cancelar» (eso es secundario/fantasma).
- **Estados de la web = badges con punto**: Publicado (verde) · Cambios sin publicar (ámbar) ·
  Sin publicar (gris).
- **Foco de doble halo** (`--anillo-foco`): visible sobre blanco Y sobre el lima.
- La barra de publicación no es un cajón de sastre: URL + estado + botón; dominio/subdominio/
  despublicar viven en el desplegable «Dirección y dominio», con **despublicar en dos pasos**.
- El historial es panel lateral derecho (en móvil cae debajo), agrupado por publicación.
- **Space Grotesk** como familia única, autoalojada con `next/font` (nunca `@import` de Google
  en el HTML). El popover `wc-` usa stack de sistema a propósito: no puede asumir que la fuente
  esté cargada en la web del tercero.

## Integración (mapa mockup → código)

1. **Tokens**: pegar el bloque `@theme` de `01-tokens.md §5` en `app/globals.css`; añadir
   **Space Grotesk** con `next/font/google` (o `next/font/local`, autoalojada) en
   `app/layout.tsx`. Las recetas de clases (`§7`) van en `@layer components`.
2. `03-login.html` → `app/login/page.tsx` (variante multiusuario: `app/login/espacio/page.tsx`)
3. `04-panel.html` → `app/page.tsx` (+ extraer `TarjetaProyecto`, `ZonaImportar`, `EstadoVacio`)
4. `05-proyecto.html` → `app/projects/[id]/page.tsx` (`BarraPublicar`, `DireccionDominio`,
   `VistaPrevia`, `Historial`)
5. `06-popover-editor.html` → CSS del editor inyectado (`wc-editor`; ES5 + CSS plano, sin React).
   Copiar el bloque `.wc-*` tal cual: ya trae reset defensivo y `z-index` máximo.
6. `07-404-publica.html` → la página que sirve el middleware para subdominios sin web publicada.
7. **Panel del blog (BlogPanel)** → `app/projects/[id]/blog/page.tsx`. Maqueta completa en
   `09-blog.html`: usa las MISMAS piezas de `02-componentes.html` (listas con badges y acciones,
   tarjetas de config con interruptor, avisos de coste). «Redactar con IA» es el único primario;
   el piloto automático manda en el carril lateral.
8. **Configuración** → `app/projects/[id]/settings/page.tsx`. Maqueta en `10-configuracion.html`:
   navegación de secciones + filas [nombre + descripción + control]. Contiene la **caja de
   herramientas del sitio** y la **zona de peligro** con confirmación en dos pasos.

Sugerencia de fases: **A** = tokens + login + panel · **B** = pantalla de proyecto ·
**C** = popover del editor · **D** = 404 + repaso del BlogPanel con las recetas.

## Patrones «con previsión» (diseñados y ya visibles en `02-componentes.html`)

- **Sistema de ayudas para no técnicos** — tres niveles, nada más:
  1. *Microcopy* bajo cada control (`ayuda-campo`, 12px `texto-3`), cercano y sin jerga.
  2. *Tooltip «¿qué es esto?»* — icono `?` discreto (`.quees`) junto a títulos de sección; abre
     un bocadillo tinta con 2-3 frases (ver «Dominio propio» en `05-proyecto.html`).
  3. *Mini-tour de primera vez* — 3 pasos máximo (Importar → Editar → Publicar), tarjeta tinta
     con paso lima, puntos de progreso y «Saltar». Nunca modales que interrumpan; descartable.
- **Caja de herramientas del sitio** — en la pantalla de proyecto, un desplegable hermano de
  «Dirección y dominio». Cada herramienta es una **fila configurable**
  [nombre + descripción de una línea + estado (badge) + acción]: Google Search Console,
  Analytics, favicon, imagen al compartir (og:image). Es el MISMO componente de lista del blog,
  así que escala solo: añadir una herramienta = añadir una fila. Maqueta en `02-componentes.html`.

## Lo que NO se hizo (a propósito, según el brief)

Modo oscuro (los tokens lo dejan listo en `01 §6`, sin activar) · librerías de componentes
(nada de shadcn/MUI) · JavaScript nuevo · rediseño de las webs de los clientes · landing de
marketing (usará estos mismos tokens). El logotipo definitivo de Estrénala lo diseña el cliente
con la paleta fijada (notas en `01-tokens.md §8`).
