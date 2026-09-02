import type { Articulo } from "../tipos";

// Recordatorio: las comillas invertidas del Markdown van escapadas (\`asi\`).
export const puedeChatgptRecomendarTuWeb: Articulo = {
  slug: "puede-chatgpt-recomendar-tu-web",
  titulo: "¿Puede ChatGPT recomendar tu web?",
  descripcion:
    "Cada vez más gente pregunta a ChatGPT en vez de buscar en Google. Cómo saber si tu web puede salir ahí, qué ayuda de verdad y qué es humo.",
  entradilla:
    "«Oye, ¿me recomiendas una peluquería en Vigo?». Cada vez más gente escribe eso en ChatGPT en vez de en Google, y la respuesta nombra a tres negocios. Si el tuyo no está, casi nunca es por el motivo que te van a decir.",
  fecha: "2026-09-02",
  tema: "IA",
  resumen: [
    "La comprobación de treinta segundos que dice si les estás cerrando la puerta sin saberlo.",
    "Por qué una IA cita a unos y no a otros, que no funciona como la lista de Google.",
    "Qué ayuda de verdad, qué te van a vender caro, y cómo mirar hoy si ya te nombran.",
  ],
  cuerpo: `
Empecemos por lo que nadie comprueba. Abre esto en el navegador, cambiando el
nombre por el tuyo:

\`tudominio.com/robots.txt\`

Es un archivo de texto que toda web tiene y que le dice a los programas que la
visitan dónde pueden entrar. Busca dentro las palabras \`GPTBot\`, \`ClaudeBot\` o
\`PerplexityBot\`. Si alguna aparece seguida de un \`Disallow: /\`, ya tienes la
respuesta a la pregunta del título: **no**. Les estás cerrando la puerta, y no
hay nada más que optimizar hasta que eso cambie.

Parece difícil hacerlo sin querer. No lo es: bastantes alojamientos, plantillas y
servicios de seguridad lo traen **activado de serie**, con la buena intención de
protegerte de que te copien. El efecto secundario es que también desapareces de
las respuestas.

## Quién viene a tu web, y a qué

No hay «una IA» rastreando internet. Hay tres tipos de visitante y conviene no
mezclarlos, porque no quieres lo mismo de los tres:

| Quién llama | A qué viene | ¿Te interesa? |
| --- | --- | --- |
| \`OAI-SearchBot\`, \`Claude-SearchBot\`, \`PerplexityBot\` | Apuntarte en su índice | **Sí.** Es así como te encuentran |
| \`ChatGPT-User\`, \`Claude-User\` | Abrir tu web ahora, porque alguien lo ha pedido | **Sí.** Es una visita real |
| \`GPTBot\`, \`Google-Extended\` | Entrenar el modelo | Tú decides. No te trae visitas |

La fila de en medio es la que más se ignora y la más fácil de entender: cuando
alguien le dice a ChatGPT «mira esta web», ChatGPT **entra en tu web**. Si le
cierras, ve una puerta cerrada.

Lo razonable para un negocio pequeño es dejar entrar a las dos primeras filas y
decidir con calma sobre la tercera. Bloquearlo todo por si acaso es el error
habitual.

## Por qué cita a unos y no a otros

Aquí está la parte que casi nadie explica bien, y la que cambia lo que hay que
hacer.

**Una IA no ordena webs de la 1 a la 10.** No hay una lista. Cuando alguien
pregunta algo, el modelo busca, abre unas cuantas páginas, lee y **escribe una
respuesta nueva** con lo que ha entendido. Te nombra si se cumplen tres cosas, en
este orden:

1. **Te ha encontrado.** Si no estás en ningún buscador, no estás en la
   conversación. Esto es lo primero y no hay atajo.
2. **Tu página responde a esa pregunta concreta.** No a tu sector: a la pregunta.
3. **Puede leer la respuesta sin adivinarla.** Si está dentro de una imagen, de
   un vídeo o de un PDF escaneado, para el modelo no existe.

Fíjate en que el punto 1 es posicionamiento de toda la vida. Por eso la primera
recomendación sigue siendo la aburrida: si no sales en Google, empieza por ahí.

## Escribe la pregunta y contéstala

El punto 2 es donde se gana, y es más sencillo de lo que parece: **pon la
pregunta como título y respóndela en las dos primeras líneas.**

Compara. Alguien pregunta a qué hora abre una ferretería. En una web pone esto:

> En Ferretería Paco llevamos más de treinta años al servicio de nuestros
> clientes, ofreciendo un trato cercano y profesional…

Y en otra, esto:

> **¿Qué horario tiene Ferretería Paco?**
> Abrimos de 9:00 a 14:00 y de 17:00 a 20:00, de lunes a viernes. Los sábados,
> de 10:00 a 13:30. Domingos cerrado.

La segunda se puede citar tal cual. La primera no contesta nada.

No hace falta reescribir la web entera: con una sección de preguntas frecuentes
al final, escrita con las preguntas que de verdad te hace la gente por teléfono,
ya cubres la mayoría. Y de paso, esas mismas preguntas Google las enseña
desplegadas debajo de tu resultado.

## Lo que te van a vender

Ha aparecido un negocio entero alrededor de esto, con nombre propio —**AEO**,
por *Answer Engine Optimization*— y con cursos de varios miles de euros. El
diagnóstico de fondo es correcto: internet está cambiando de verdad. Pero hay dos
cosas que conviene separar.

**El archivo \`llms.txt\`.** Es un archivo de texto donde listas tus páginas para
que una IA sepa qué tienes. Se ha puesto de moda y lo vas a ver recomendado en
todas partes. Lo honesto es decir esto: **Google ha dicho públicamente que lo
ignora**, y con los demás no hay pruebas sólidas de que lo usen. Cuesta diez
minutos, así que ponlo si quieres; pero no pagues por él ni esperes visitas.

**Los cursos.** Lo que de verdad funciona son las tres cosas de la sección
anterior, y las tres son gratis y las puedes comprobar tú en una tarde.
Desconfía de cualquiera que te venda un atajo: si existiera, duraría dos semanas.

## Cómo mirar si ya te nombran

Tres pruebas, en este orden:

1. **Abre un chat nuevo.** En uno donde ya hayas hablado de tu negocio, la IA se
   acuerda y te dirá que sí. No vale.
2. **Pregunta por tu sector, no por tu marca.** «¿Qué fisioterapeutas hay en
   Gijón?» dice mucho más que «¿conoces Fisio Gijón?», que casi siempre encuentra
   algo aunque sea tu ficha de Google.
3. **Si no sales, busca lo mismo en Google.** Si tampoco sales ahí, ya sabes por
   dónde va: no es un problema de IA, es que aún no te conoce nadie.

## Resumen

| Lo que pasa | Qué es | Cuánto cuesta |
| --- | --- | --- |
| No apareces en ninguna IA | Tienes los rastreadores bloqueados | Una línea del \`robots.txt\` |
| Te encuentra pero no te cita | Tu web no responde preguntas | Una sección de preguntas |
| No sales ni en Google | Aún no te conoce nadie | Tiempo y enlaces |
| Tus datos están en una imagen | No hay texto que leer | Escribirlos como texto |

Las dos primeras filas se arreglan esta semana. La tercera es la de siempre y no
la arregla ninguna herramienta.

## Y si tu web la ha hecho una IA

Tiene una ventaja de salida: el texto es texto, no una imagen, y suele venir bien
ordenado por títulos. Ese punto ya lo llevas.

Lo que falla es lo anterior a todo eso. Una web que sigue en un ZIP en tu
ordenador no la lee ni Google ni ChatGPT ni nadie, y una publicada en un sitio
que bloquea rastreadores por defecto tampoco.

En Estrénala tu web sale online con la puerta abierta a los buscadores y a las
IAs, sin que tengas que tocar un \`robots.txt\` en tu vida. Y desde este mes, las
páginas de nuestra propia web se sirven también en texto plano a quien las lee
con una IA, porque predicar y no dar trigo se nota.

Que te encuentre una persona y que te encuentre un modelo se parecen mucho más de
lo que dicen los cursos: los dos necesitan que estés online, que se te entienda y
que alguien te haya enlazado alguna vez.
`,
  preguntas: [
    {
      p: "¿Cómo sé si ChatGPT puede leer mi web?",
      r: "Abre tudominio.com/robots.txt en el navegador y busca dentro las palabras GPTBot, ClaudeBot o PerplexityBot. Si alguna aparece con un Disallow: /, les estás cerrando la puerta. Muchos alojamientos y plugins de seguridad lo activan de serie sin avisar.",
    },
    {
      p: "¿Sirve de algo el archivo llms.txt?",
      r: "Por ahora, poco. Es un archivo de texto donde listas tus páginas para que una IA sepa qué tienes, pero Google ha dicho públicamente que lo ignora y con el resto no hay pruebas sólidas de que lo usen. Cuesta diez minutos ponerlo, así que no está de más; pagar por él, sí.",
    },
    {
      p: "¿Por qué ChatGPT no menciona mi negocio?",
      r: "Lo más probable es que no te haya encontrado, no que te haya descartado. Una IA no ordena webs en una lista: busca, lee unas cuantas páginas y escribe una respuesta. Si no apareces en los buscadores tampoco apareces ahí, así que la comprobación es buscar lo mismo en Google.",
    },
    {
      p: "¿Debo bloquear a las IAs para que no copien mi contenido?",
      r: "Depende de cuál. Puedes dejar entrar a los que construyen el índice de búsqueda —son los que hacen que te citen— y bloquear solo a los que entrenan modelos, que no te traen ninguna visita. Bloquearlos todos de golpe es lo que hace que desaparezcas de las respuestas.",
    },
    {
      p: "¿Es lo mismo posicionar en Google que aparecer en ChatGPT?",
      r: "No es lo mismo, pero se solapa mucho más de lo que se cuenta. Las IAs se apoyan en índices de búsqueda para encontrar páginas, así que estar bien posicionado sigue siendo el primer paso. Lo que cambia es el segundo: hay que responder preguntas concretas, no describir tu empresa.",
    },
  ],
};
