# Sistema visual — entregables de la sesión de diseño (5a)

Fecha: 2026-07-17 · Responde al `docs/design-brief.md`. Agnóstico del nombre
(el símbolo ▲ y «[Marca]» son placeholders; ver `08-wordmarks.html`).

## Cómo verlo

Cada `.html` es autocontenido (sin assets externos): **doble clic y se abre en el
navegador**. En móvil también se ven bien (viewport + flex/grid).

| Archivo | Qué es |
|---|---|
| `01-tokens.md` | Paleta, tipografía, radios, sombras + bloque `@theme` para Tailwind v4 y recetas de componentes |
| `02-componentes.html` | Hoja de componentes con todos los estados (entregable 3) |
| `03-login.html` | Login: normal, error y variante multiusuario futura (4.1) |
| `04-panel.html` | Panel «Tus webs»: importación destacada, cards con estado, vacío (4.2) |
| `05-proyecto.html` | Pantalla de proyecto: barra de publicar, dominio plegado, preview + historial (4.3) |
| `06-popover-editor.html` | Popover del editor in-situ en CSS plano `wc-` con 6 variantes/estados (4.4) |
| `07-404-publica.html` | «Esta web aún no está publicada» con marca discreta (4.5) |
| `08-wordmarks.html` | Direcciones de marca: Estrénala · WebNace · YaVive (entregable 5) |

## Decisiones clave (el porqué en `01-tokens.md`)

- **Índigo #4f46e5 como primario** (ya presente en el código: integración suave),
  neutrales slate, y semánticos verde/ámbar/rosa SOLO para estado y peligro.
- **Un primario por vista**: Publicar manda en el proyecto; Importar manda en el panel.
- La barra de publicación deja de ser un cajón de sastre: URL + estado + botón; todo
  lo de dominio/subdominio/despublicar vive en un desplegable «Dirección y dominio».
- El historial pasa a panel lateral (columna derecha; en móvil cae debajo).
- Popover del editor: blanco neutro + acento índigo, prefijo `wc-`, diseñado para
  flotar sobre CUALQUIER web de cliente.

## Integración (mapa mockup → código)

1. **Tokens**: pegar el bloque `@theme` de `01-tokens.md` en `app/globals.css` y
   añadir Inter con `next/font` en `app/layout.tsx` (autoalojada, sin CDN).
2. `03-login.html` → `app/login/page.tsx`
3. `04-panel.html` → `app/page.tsx` (+ extraer `TarjetaProyecto`, `ZonaImportar`)
4. `05-proyecto.html` → `app/projects/[id]/page.tsx` (`PublishBar`, `PreviewPane`)
5. `06-popover-editor.html` → CSS del editor inyectado (`wc-editor`; es ES5+CSS plano)
6. `07-404-publica.html` → la página que sirve el middleware para subdominios sin web
7. El panel del blog (BlogPanel) usa los MISMOS componentes (tarjetas, badges, botones):
   se rehace con las recetas de `01-tokens.md` §5 cuando se integre.

Sugerencia de fases: 5b = tokens+login+panel · 5c = pantalla de proyecto ·
5d = popover del editor · 5e = 404 + repaso del BlogPanel.

## Patrones «con previsión» (§4.6 del brief — diseñados, no construidos)

- **Sistema de ayudas**: tres niveles y nada más —
  (1) *microcopy* bajo cada control (13px `texto-2`, ya presente en los mockups);
  (2) *tooltip «¿qué es esto?»* — icono ⓘ discreto junto a títulos de sección que
  abre un popover de 260px (mismo estilo `wc-pop`) con 2-3 frases y un enlace;
  (3) *mini-tour de primera vez* — 3 pasos máximo señalando Importar → Editar →
  Publicar, con el patrón del popover + overlay suave (`rgba(15,23,42,.4)`). Nunca
  modales que interrumpan; siempre descartables y con «No volver a mostrar».
- **Caja de herramientas del sitio**: en la pantalla de proyecto, un segundo
  desplegable hermano de «Dirección y dominio» llamado **«Herramientas»**: lista de
  filas [icono + nombre + descripción de una línea + botón «Configurar»] — Google
  Search Console, Analytics, favicon, imagen para redes. Cada herramienta abre su
  formulario inline (mismo patrón que el bloque DNS). El contenedor ya escala: añadir
  una herramienta = añadir una fila.

## Lo que NO se hizo (a propósito, según el brief)

Modo oscuro (los tokens lo dejan listo) · librerías de componentes · rediseño de las
webs de los clientes · landing de marketing (usará estos mismos tokens).
