import type { Articulo } from "../tipos";

// Recordatorio: las comillas invertidas del Markdown van escapadas (\`asi\`).
export const webIaPosicionarGoogle: Articulo = {
  slug: "web-hecha-con-ia-posicionar-google",
  titulo: "¿Google encontrará la web que te ha hecho la IA?",
  descripcion:
    "La IA te escribe una web correcta para Google, pero eso no basta para que aparezca. Qué falta, por qué el dominio importa más de lo que crees y qué hacer hoy.",
  entradilla:
    "Tu web ya está online. Buscas el nombre de tu negocio en Google y no sale. Ni en la segunda página. No está rota: es que publicar y aparecer son dos cosas distintas, y nadie te avisó de la segunda.",
  fecha: "2026-08-09",
  tema: "SEO",
  resumen: [
    "Qué partes del posicionamiento te da hecha la IA y cuáles no puede darte nunca.",
    "Por qué una dirección recién estrenada tarda semanas en aparecer, y qué acelera eso.",
    "La diferencia real entre un subdominio gratis y tu propio dominio, contada sin humo.",
  ],
  cuerpo: `
Vamos con la respuesta corta: **sí, pero no sola y no esta semana.**

La parte buena es que las webs que escriben ChatGPT o Claude suelen estar
técnicamente bien para Google: HTML limpio, un solo \`<h1>\`, encabezados en orden,
textos de verdad y no imágenes con letras dentro. Eso, que suena a poco, es más
de lo que tienen muchas webs hechas por agencias.

Lo que falta no es calidad. Es todo lo que ocurre **fuera** del archivo.

## Lo que la IA te da, y lo que no puede darte

Te da la estructura y los textos. No te puede dar:

- **Una dirección con historia.** Google desconfía de lo que acaba de nacer, y
  con razón: es lo que hacen las webs de spam.
- **Que alguien más te enlace.** Un enlace desde otra web es un voto, y es de lo
  que más pesa. Ningún archivo trae votos dentro.
- **Un sitemap y un robots.txt** que le digan a Google qué mirar. Casi ningún
  \`.zip\` los trae.
- **Contenido nuevo cada cierto tiempo.** Una web que no cambia nunca le dice a
  Google que no hay nada que volver a mirar.

## Las cuatro cosas que sí puedes controlar

**1. Que te dejen pasar.** El \`robots.txt\` es un archivo que dice qué se puede
rastrear. Si no existe, se rastrea todo, que suele estar bien. El problema es al
revés: hay plataformas que publican con un \`noindex\` puesto «hasta que estés
listo», y luego nadie se acuerda de quitarlo. Meses invisible sin saberlo.

**2. Que sepa qué hay.** El \`sitemap.xml\` es la lista de tus páginas. No hace que
subas puestos, pero hace que Google no se deje ninguna, y en una web de cinco
páginas eso importa.

**3. Que cada página se explique.** El \`title\` y la \`description\` son lo que se
lee en el resultado de búsqueda. Si tus cinco páginas comparten el mismo título
—cosa habitual cuando la IA genera varias de golpe—, Google tiene que adivinar
cuál enseñar, y a veces no enseña ninguna.

**4. Dónde vive.** Y esto es lo que menos se cuenta.

## Subdominio gratis o dominio propio: la verdad

Casi todas las plataformas te dan una dirección gratis del tipo
\`tunegocio.laplataforma.com\`. Funciona, es instantánea y no cuesta nada. Para
empezar está muy bien.

Pero para Google **la autoridad se acumula en el dominio**, y ese dominio no es
tuyo. Si algún día te mudas, no te llevas nada: la dirección cambia, y todo lo
que hubieras conseguido se queda allí.

Con tu propio dominio pasa lo contrario: lo que ganes es tuyo para siempre, te
lleves la web a donde te la lleves. Cuesta unos 10–15 € al año.

Mi consejo, sin rodeos: **empieza con el subdominio gratis hoy mismo**, porque
tener la web online vale más que no tenerla. Y compra tu dominio esta semana, no
dentro de seis meses, porque cada mes que pasa es autoridad que estás
acumulando en una dirección prestada.

## Lo que de verdad mueve la aguja

Nada de lo anterior te va a poner el primero. Lo que lo hace es aburrido:
**responder a lo que la gente pregunta.**

Si tienes un restaurante en Fuengirola, no compites por «restaurante»: compites
por «dónde comer paella en Fuengirola un domingo». Y eso no se gana con etiquetas
técnicas, se gana teniendo una página que lo conteste.

Por eso los negocios que aparecen tienen blog, y los que no, no. No porque el
blog sea mágico, sino porque un blog es la excusa para tener veinte páginas que
contestan veinte preguntas en lugar de una que dice «Bienvenidos».

Y sí: esto que estás leyendo es exactamente eso.

## Qué hacemos nosotros

Todo lo del punto 1 al 3 lo ponemos solo. No hay que configurar nada:

- **Sitemap y \`robots.txt\`** generados para tu web, con sus páginas de verdad.
- **El interruptor de «que Google no me encuentre todavía»** está a la vista, en
  la misma pantalla que la dirección, y avisa de que está puesto. No es un ajuste
  escondido que se te olvide.
- **Dominio propio** cuando quieras, con el certificado incluido.
- Y el **blog automático**, que publica dentro de tu web estática sin necesidad
  de montar un WordPress detrás.

## Ten paciencia con las fechas

Una dirección nueva tarda de dos a ocho semanas en empezar a aparecer para su
propio nombre, y meses para cualquier cosa competida. Eso es normal y no hay
truco.

Lo que sí puedes hacer hoy: dar de alta la web en Search Console, mandarle el
sitemap y **comprobar que no está puesto el noindex**. Es media hora y te ahorra
descubrir en noviembre que llevabas desde agosto invisible.
`,
  preguntas: [
    {
      p: "¿Una web hecha con IA posiciona peor en Google?",
      r: "No por estar hecha con IA. Google valora lo que la página ofrece a quien la lee, no la herramienta con la que se escribió. De hecho el HTML que generan ChatGPT o Claude suele estar bien estructurado. Lo que falla no es la calidad del archivo, sino lo que hay alrededor: dirección nueva, sin enlaces de otras webs y sin contenido que se actualice.",
    },
    {
      p: "¿Cuánto tarda una web nueva en aparecer en Google?",
      r: "Entre dos y ocho semanas para búsquedas de su propio nombre, y meses para términos competidos. Se acelera dándola de alta en Search Console y mandando el sitemap, pero no hay forma de saltarse la espera.",
    },
    {
      p: "¿Es mejor un dominio propio que un subdominio gratis para el SEO?",
      r: "Sí, porque la autoridad que gana una web se acumula en el dominio, y un subdominio gratis pertenece a la plataforma. Si te mudas, no te llevas nada. Empieza con el subdominio gratis para estar online hoy, pero compra tu dominio pronto: cada mes cuenta.",
    },
    {
      p: "¿Necesito un sitemap si mi web solo tiene cinco páginas?",
      r: "No es imprescindible, pero ayuda a que Google no se deje ninguna, y no cuesta nada porque debería generarse solo. Lo que sí es crítico es lo contrario: asegurarte de que no hay un noindex puesto, porque eso sí deja la web invisible entera y no da ningún aviso.",
    },
    {
      p: "¿Sirve de algo tener un blog en una web pequeña?",
      r: "Sirve, pero no por el blog en sí. Sirve porque te da una página por cada pregunta que hace tu cliente, en lugar de una sola página que dice a qué te dedicas. Un negocio local con quince artículos que responden dudas reales aparece en muchas más búsquedas que uno con una portada perfecta.",
    },
  ],
};
