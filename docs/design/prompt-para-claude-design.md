# Prompt para la sesión de diseño en claude.ai

**Antes de enviar el prompt, adjunta al chat estos archivos** (arrástralos desde el
explorador; están todos en el proyecto):

1. `docs/design-brief.md` — el encargo original
2. `docs/design/01-tokens.md` — tokens v1
3. `docs/design/02-componentes.html` — hoja de componentes v1
4. `docs/design/03-login.html`
5. `docs/design/04-panel.html`
6. `docs/design/05-proyecto.html`
7. `docs/design/06-popover-editor.html`
8. `docs/design/07-404-publica.html`
9. `docs/design/08-wordmarks.html`
10. `docs/design/README.md` — mapa de integración v1

Si el chat no admite tantos adjuntos, los imprescindibles son el 1, el 2 y las
4 pantallas (3, 4, 5 y 6).

---

## El prompt (copia desde aquí hasta el final)

Eres un diseñador de producto senior. Vamos a hacer una sesión de diseño completa
para mi plataforma. Trabaja en español.

**Qué es el producto:** "el WordPress para webs hechas con IA". Mi usuario
(emprendedores y agencias pequeñas en España, gente NO técnica) tiene una web en
HTML que le generó una IA (Claude, ChatGPT, v0…). Mi plataforma le da lo que la IA
no le da: (1) subirla online en un clic con subdominio o dominio propio y HTTPS,
(2) editarla sin código haciendo clic sobre la web real (popover in-situ), con
historial y revertir, y (3) un blog automático con IA: radar de temas en tendencia,
redacción por etapas, portada automática, publicación programada y un "piloto
automático" que publica solo. Personalidad de marca: profesional pero cercana,
sin jerga; la limpieza de Vercel/Linear con la accesibilidad mental de
WordPress.com, sin copiar su estética.

**Qué te adjunto:** el design-brief original (léelo entero: tiene el inventario de
pantallas y las restricciones) y la VERSIÓN 1 del sistema visual que ya tenemos:
tokens, hoja de componentes y mockups de las 4 pantallas clave, la 404 y 3
direcciones de wordmark. **Úsala como base, no como límite**: conserva lo que
funcione (la estructura de tokens, el mapa de integración, los patrones de
confirmación en dos pasos) y eleva todo lo que se quedó "correcto pero seguro".

**Qué quiero de esta sesión (en este orden):**

1. **Crítica honesta de la v1**: qué está bien, qué es genérico, qué falta. La v1
   usa índigo #4f46e5 estándar de Tailwind y neutrales slate — funciona, pero no
   tiene una personalidad reconocible.
2. **2 o 3 direcciones visuales distintas** (muéstramelas como artifacts para
   compararlas): paleta, tipografía, sensación. Al menos una debe ser más valiente
   que la v1. Yo elijo una.
3. Con la dirección elegida, **produce los entregables definitivos** uno a uno,
   empezando por tokens y componentes, y espera mi OK entre cada uno.

**Restricciones DURAS (no negociables, vienen del código real):**

- Stack: Next.js 16 + React 19 + Tailwind CSS v4. Los tokens deben entregarse como
  bloque `@theme` de Tailwind v4 (variables CSS) + recetas de clases por componente.
- Cada pantalla se entrega como **un archivo HTML autocontenido** (CSS embebido,
  sin assets externos, sin CDN, sin Google Fonts en el propio archivo; si eliges
  una fuente, dime cuál y se autoalojará con next/font — solo fuentes gratuitas).
- El popover del editor se inyecta en webs de terceros con JavaScript ES5 sin
  React: su entregable es CSS/HTML plano con clases prefijadas `wc-`, y debe verse
  bien flotando sobre CUALQUIER web ajena (ni chocar ni desaparecer).
- Textos de la UI en español, cercanos, sin jerga técnica. Debe verse bien en móvil.
- Sin librerías de componentes (nada de shadcn/MUI) ni JavaScript nuevo.
- Sin modo oscuro por ahora, pero los tokens deben dejarlo preparado.
- El nombre está EN REVISIÓN: sistema agnóstico del nombre + una dirección de
  wordmark/logotipo para cada candidato: **Estrénala** (estrenala.com),
  **WebNace** (webnace.com) y **YaVive** (yavive.app). Puedes proponer evolución
  de las direcciones v1 adjuntas o direcciones nuevas.
- Reglas de la v1 que quiero conservar: UN solo botón primario por vista (Publicar
  manda en la pantalla de proyecto, Importar en el panel); el rojo solo para
  acciones destructivas y errores, nunca para "cancelar"; los estados de la web
  como badges (Publicado verde / Cambios sin publicar ámbar / Sin publicar gris);
  foco visible siempre.

**Entregables finales, con ESTOS nombres de archivo** (mi asistente de código los
integrará directamente; el README v1 adjunto trae el mapa de qué archivo va a qué
parte del código — consérvalo actualizado):

- `01-tokens.md` — tokens + bloque `@theme` + recetas de clases
- `02-componentes.html` — hoja de componentes con TODOS los estados (normal,
  hover, focus, disabled, ocupado/cargando, error)
- `03-login.html` (normal + error + variante multiusuario futura)
- `04-panel.html` (importación destacada con zona de arrastre, tarjetas de
  proyecto con estado, estado vacío de primera visita)
- `05-proyecto.html` (publicar como LA acción; dominio/subdominio/despublicar
  ordenados; vista previa protagonista; historial)
- `06-popover-editor.html` (variantes: texto, enlace, imagen, botón, color;
  estados: hover, seleccionado, guardando, guardado)
- `07-404-publica.html` (la ve un visitante en un subdominio sin web: marca
  discreta + es también publicidad de la plataforma)
- `08-wordmarks.html` (los 3 candidatos)
- `README.md` — decisiones, mapa de integración y los dos patrones "con
  previsión": el sistema de ayudas para no técnicos (microcopy / tooltip
  "¿qué es esto?" / mini-tour de 3 pasos) y la "caja de herramientas del sitio"
  (Search Console, Analytics, favicon, og:image como filas configurables).

También existe un panel de blog (lista de artículos, borradores IA, temas en
tendencia, programados, piloto automático) que hoy es funcional y feo; no
necesita mockup propio, pero diséñalo mentalmente: la hoja de componentes debe
cubrir sus piezas (listas con badges y acciones, tarjetas de configuración con
interruptor, avisos de coste).

Antes de empezar, hazme las preguntas que necesites. Luego ve al punto 1.
