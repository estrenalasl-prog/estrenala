# Prompt para la sesión de LANDING en claude.ai

> Actualizado 2026-07-25: incorpora lo que la plataforma ganó desde la primera
> versión de este prompt — el **asistente de IA**, la **edición desde tu propia
> herramienta (re-subir ZIP)**, **cuentas reales + entrar con Google** y
> **equipos/roles**. Idea fuerza nueva: **«Estrénala no te encierra»** (dos caminos
> para editar). Decisiones ya tomadas por el dueño: hero por el **dolor inmediato**
> («ponla online»), **sin precios** en esta versión, y el **asistente como opción
> destacada, no como titular**.

**Antes de enviar el prompt, adjunta al chat estos archivos** (arrástralos desde el
explorador; están todos en el proyecto):

1. `docs/design/README.md` — el sistema v2 «Alto Voltaje» y sus decisiones
2. `docs/design/01-tokens.md` — la fuente de verdad de tokens (paleta, tipografía, recetas)
3. `docs/design/02-componentes.html` — hoja de componentes
4. `docs/design/07-404-publica.html` — el tono de la marca hablando al público
5. `docs/design/05-proyecto.html` — la pantalla real del proyecto (para que el mock del hero se parezca)
6. `public/brand/logo-tinta.png` — logo real para fondos claros (transparente)
7. `public/brand/logo-blanco.png` — logo real para fondos oscuros (transparente)

Opcional si el chat admite más: `docs/design/04-panel.html`.

---

## El prompt (copia desde aquí hasta el final)

Eres un diseñador senior de producto y de webs de marketing. Trabaja en español.
Este es el MISMO proyecto de la sesión anterior: el sistema visual v2 «Alto
Voltaje» (te adjunto tokens, componentes y README) ya está integrado en la
plataforma real. Ahora toca la pieza que dejamos fuera a propósito: **la landing
pública de marketing**.

**La marca ya está decidida:** se llama **Estrénala** y vive en **estrenala.com**.
Te adjunto el logo real en dos variantes con fondo transparente: `logo-tinta.png`
(fondos claros) y `logo-blanco.png` (fondos oscuros). Tagline que ya usamos en la
404 pública: «Tu web hecha con IA, por fin en directo».

### Qué es el producto (véndelo, pero SIN inventar nada)

«El WordPress para webs hechas con IA». Mi usuario (emprendedores y agencias
pequeñas en España, gente NO técnica) tiene una web en HTML que le generó una IA
(Claude, ChatGPT, v0…) y se queda atascado justo después: **la IA no se la pone
online**. Estrénala resuelve todo lo que viene tras ese momento:

1. **Ponerla online en un clic**: arrastra el ZIP y su web queda publicada con
   subdominio propio o su dominio, con HTTPS.
2. **Editarla como quiera — sin encierro** (ESTE es el ángulo diferencial nuevo,
   «Estrénala no te encierra»). Tres formas, y elige la suya:
   - **A mano, aquí mismo**: hace clic sobre su web real y cambia textos (con
     negrita/cursiva/enlaces), imágenes, botones y colores, con **historial y
     revertir**. Gratis.
   - **Con el asistente de IA**: le dice en lenguaje natural qué cambiar y el
     asistente lo hace por él. Usa **su propia clave de IA** (opt-in; él decide
     cuándo gasta). Es una opción potente, no una obligación.
   - **En su propia herramienta**: si prefiere seguir en Claude Code, ChatGPT o v0,
     edita allí y **vuelve a subir el ZIP para actualizar** su web online en un clic.
     La versión anterior queda en el historial.
3. **Un blog que se escribe solo**: radar de temas en tendencia, redacción por
   etapas con IA, portada automática, publicación programada y un «piloto
   automático» que publica sin que tenga que acordarse. (También con su clave, opt-in.)
4. **Cuentas reales y equipo**: entra con correo o con Google; puede invitar a más
   gente a su espacio con roles (propietario / editor) para trabajar en equipo.

**Todo lo anterior EXISTE y funciona.** No prometas nada que no esté en esa lista
(nada de e-commerce, plantillas prediseñadas, hosting de apps, generar la web por
ellos, etc.). Sé honesto con la IA: es **con la clave del propio usuario y opt-in**;
no es «IA ilimitada gratis».

### El ángulo y el tono (decisiones ya tomadas — respétalas)

- **El hero lidera con el DOLOR INMEDIATO, no con una lista de funciones.** Primero
  que el visitante se sienta identificado: hizo una web preciosa con IA… y se quedó
  muerta en una carpeta. Luego la promesa: Estrénala la pone en el mundo. La
  estructura debe **enganchar el sentimiento antes de enseñar el producto**.
- **El asistente de IA es una sección DESTACADA, pero NO el titular.** Muchos
  usuarios ya pagan una suscripción de IA y preferirán editar en su herramienta; por
  eso lo vendemos como «una de las formas de editar», con honestidad sobre el coste,
  y siempre junto al camino de «o sigue en tu herramienta y súbelo». Eso genera
  confianza, no rechazo.
- **Sin precios en esta versión.** Nada de tabla de planes. El CTA lleva al registro.

### Qué quiero de esta sesión (en este orden)

1. Proponme la **estructura de la landing** (lista de secciones con una línea de
   intención cada una) y **2 opciones de hero** distintas como artifacts para
   compararlas: una más sobria y una más valiente. Yo elijo.
2. Con mi OK, **produce la landing completa** en un único archivo.

### Estructura orientativa (mejórala si tienes algo mejor y dime por qué)

- **Hero**: la promesa en una frase (por el ángulo «ponla online»: algo como «Tu web
  hecha con IA, por fin en directo» / «La IA te la hizo; nosotros la ponemos en el
  mundo»), subtítulo con el «para quién», **UN** botón primario al registro, y un
  mock visual del producto **hecho con CSS puro** (sin imágenes externas) que
  recuerde a la pantalla de proyecto adjunta.
- **El problema** (corto y empático): «La IA te hizo la web… ¿y ahora qué?».
- **Cómo funciona en 3 pasos**: Sube el ZIP → Publica (dominio + HTTPS) → Edítala.
- **Edítala como quieras** (la sección que encarna «no te encierro»): las tres vías
  —a mano aquí, con el asistente de IA (con tu clave, opt-in), o en tu herramienta y
  re-subes el ZIP—. Deja claro que puede combinarlas y que **siempre hay historial y
  revertir**. El asistente vive aquí, destacado pero como una opción más.
- **El blog automático** (merece su propia sección, es muy diferencial): radar de
  tendencias, redacción por etapas, portadas, programación, piloto.
- **¿Trabajas con más gente?** (breve): equipos, roles e invitaciones; cuentas con
  correo o Google.
- **Para quién es**: no técnicos, emprendedores, agencias pequeñas.
- **FAQ** (6–8): ¿necesito saber programar? · ¿sirve mi web de ChatGPT/Claude/v0? ·
  ¿puedo usar mi dominio? · ¿cuánto cuesta la IA? (honesto: conectas tu propia clave
  y decides cuándo gastas; a mano es gratis) · ¿y si prefiero editar en mi propia
  herramienta? (sí: re-subes el ZIP) · ¿puedo volver atrás si rompo algo? (historial
  y revertir) · ¿puedo trabajar en equipo?
- **CTA final** + footer sencillo (enlaces legales como placeholder).

### Restricciones DURAS (no negociables)

- **Usa los tokens «Alto Voltaje» TAL CUAL** (papel/tinta cálido + lima `#C4F000` +
  Space Grotesk). Nada de paletas nuevas. Si necesitas una clase que no exista en
  `01-tokens.md`, defínela siguiendo las recetas y documéntala.
- **CTA principal: empezar a usar Estrénala.** Un botón primario que lleva al
  registro (deja el enlace como `#registro`, yo lo conecto al integrar). **UN** solo
  botón primario por vista. **Sin precios** ni tabla de planes.
- **Un único archivo HTML autocontenido**: CSS embebido, sin CDN, sin assets
  externos, sin Google Fonts (Space Grotesk se autoaloja con next/font al integrar;
  en el mock declara `font-family:"Space Grotesk",system-ui,...`). El logo:
  incrústalo en base64 desde los PNG adjuntos o usa el wordmark de texto como en la
  404; en la integración pondré el PNG real.
- **Móvil primero**: perfecta en un móvil de 360px. Sin JavaScript salvo lo
  imprescindible (menú móvil con CSS/`<details>`).
- **Honestidad radical**: cero testimonios inventados, cero cifras inventadas, cero
  logos de clientes falsos. **Nada de «IA gratis ilimitada»** — la IA es con la clave
  del usuario y opt-in. Si dejas hueco para prueba social futura, márcalo con
  `<!-- placeholder -->` y que la página funcione sin él.
- **SEO y accesibilidad**: HTML semántico (header/main/section/footer, un solo h1),
  `<title>` y `meta description` reales, `alt`, contraste AA, foco visible.
- Textos en español, cercanos, sin jerga técnica. Tú escribes el copy final (eres
  bueno en eso): claro, con personalidad, sin humo.

### Entregable final, con ESTE nombre de archivo

- `11-landing.html` — la landing completa, con un bloque de comentario al inicio que
  liste: decisiones tomadas, clases nuevas añadidas sobre `01-tokens.md` (si las hay)
  y cualquier nota de integración.

Antes de empezar, hazme las preguntas que necesites. Luego ve al punto 1.
