# Prompt para la sesión de LANDING en claude.ai

**Antes de enviar el prompt, adjunta al chat estos archivos** (arrástralos desde el
explorador; están todos en el proyecto):

1. `docs/design/README.md` — el sistema v2 «Alto Voltaje» y sus decisiones
2. `docs/design/01-tokens.md` — la fuente de verdad de tokens (paleta, tipografía, recetas)
3. `docs/design/02-componentes.html` — hoja de componentes
4. `docs/design/07-404-publica.html` — el tono de la marca hablando al público
5. `public/brand/logo-tinta.png` — logo real para fondos claros (transparente)
6. `public/brand/logo-blanco.png` — logo real para fondos oscuros (transparente)

Opcionales si el chat admite más: `docs/design/04-panel.html` y `05-proyecto.html`,
para que el mock del producto dentro del hero se parezca a la plataforma real.

---

## El prompt (copia desde aquí hasta el final)

Eres un diseñador senior de producto y de webs de marketing. Trabaja en español.
Este es el MISMO proyecto de la sesión anterior: el sistema visual v2 «Alto
Voltaje» (te adjunto sus tokens, componentes y README) ya está integrado en la
plataforma real. Ahora toca la pieza que dejamos fuera a propósito: **la landing
pública de marketing**.

**La marca ya está decidida:** se llama **Estrénala** y vivirá en **estrenala.com**
(dominio ya comprado). Te adjunto el logo real en sus dos variantes con fondo
transparente: `logo-tinta.png` para fondos claros y `logo-blanco.png` para fondos
oscuros. Tagline que ya usamos en la 404 pública: «Tu web hecha con IA, por fin
en directo».

**Qué es el producto (véndelo, pero sin inventar nada):** «el WordPress para webs
hechas con IA». Mi usuario (emprendedores y agencias pequeñas en España, gente NO
técnica) tiene una web en HTML que le generó una IA (Claude, ChatGPT, v0…) y se
queda atascado justo después: la IA no se la pone online. Estrénala le da:

1. **Subirla online en un clic**: arrastra el ZIP y su web queda publicada con
   subdominio propio o su dominio, con HTTPS.
2. **Editarla sin código**: hace clic sobre su web real y edita textos, enlaces,
   imágenes, botones y colores en el sitio, con historial y revertir.
3. **Un blog que escribe solo**: radar de temas en tendencia, redacción por
   etapas con IA, portada automática, publicación programada y un «piloto
   automático» que publica sin que tenga que acordarse.

Todo lo anterior EXISTE y funciona. No prometas nada que no esté en esa lista
(nada de e-commerce, plantillas, hosting de apps, etc.).

**Qué quiero de esta sesión (en este orden):**

1. Proponme la **estructura de la landing** (lista de secciones con una línea de
   intención cada una) y **2 opciones de hero** distintas como artifacts para
   compararlas: una más sobria y una más valiente. Yo elijo.
2. Con mi OK, **produce la landing completa** en un único archivo.

**Estructura orientativa** (ajústala si tienes una mejor, dime por qué):

- **Hero**: la promesa en una frase, subtítulo con el «para quién», UN botón
  primario, y un mock visual del producto hecho con CSS puro (sin imágenes
  externas) que recuerde al panel/proyecto reales adjuntos.
- **El problema** (corto): «la IA te hizo la web… ¿y ahora qué?».
- **Cómo funciona en 3 pasos**: Importa → Edita haciendo clic → Publica.
- **El blog automático** merece su propia sección (es lo más diferencial):
  radar de tendencias, redacción por etapas, portadas, programación, piloto.
- **Para quién es**: no técnicos, emprendedores, agencias pequeñas.
- **FAQ** (5–7): ¿necesito saber programar?, ¿sirve mi web de ChatGPT/Claude/v0?,
  ¿puedo usar mi dominio?, ¿cuánto cuesta la IA del blog? (respuesta honesta: el
  usuario conecta su propia clave y decide cuándo gasta), ¿puedo volver atrás si
  rompo algo?, etc.
- **CTA final** + footer sencillo (enlaces legales como placeholder).

**Restricciones DURAS (no negociables):**

- **Usa los tokens «Alto Voltaje» TAL CUAL** (papel/tinta cálido + lima `#C4F000`
  + Space Grotesk). Nada de paletas nuevas. Si necesitas alguna clase nueva que
  no exista en `01-tokens.md`, defínela siguiendo las recetas y documéntala.
- **CTA principal: «acceso anticipado» con captura de email** (todavía NO hay
  registro público de usuarios; el formulario apuntará a un backend que haré yo,
  tú deja el `<form>` semántico con su estado de éxito visible). UN solo botón
  primario por vista, como siempre.
- **Un único archivo HTML autocontenido**: CSS embebido, sin CDN, sin assets
  externos, sin Google Fonts (Space Grotesk se autoaloja con next/font al
  integrar; en el mockup declara `font-family:"Space Grotesk",system-ui,...` y
  listo). El logo: incrústalo en base64 desde los PNG adjuntos o usa el wordmark
  de texto como en la 404; en la integración pondré el PNG real.
- **Móvil primero**: tiene que verse perfecta en un móvil de 360px. Sin
  JavaScript salvo lo imprescindible (el menú móvil puede ser CSS/`<details>`).
- **Honestidad**: cero testimonios inventados, cero cifras inventadas, cero
  logos de clientes falsos. Si diseñas hueco para prueba social futura, márcalo
  con un comentario `<!-- placeholder -->` y que la página funcione sin él.
- **SEO y accesibilidad**: HTML semántico (header/main/section/footer, un solo
  h1), `<title>` y `meta description` reales, atributos `alt`, contraste AA,
  foco visible (ya hay token de anillo de foco).
- Textos en español, cercanos, sin jerga técnica. Tú escribes el copy final
  (eres bueno en eso): claro, con personalidad, sin humo.

**Entregable final, con ESTE nombre de archivo** (mi asistente de código lo
integrará en Next.js con los mismos tokens):

- `11-landing.html` — la landing completa, con un bloque de comentario al inicio
  que liste: decisiones tomadas, clases nuevas añadidas sobre `01-tokens.md` (si
  las hay) y cualquier nota de integración.

Antes de empezar, hazme las preguntas que necesites. Luego ve al punto 1.
