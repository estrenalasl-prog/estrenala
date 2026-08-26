import type { Articulo } from "../tipos";

// Recordatorio: las comillas invertidas del Markdown van escapadas (\`asi\`).
export const webSeVeMalEnElMovil: Articulo = {
  slug: "web-se-ve-mal-en-el-movil",
  titulo: "¿Por qué tu web se ve mal en el móvil?",
  descripcion:
    "Tu web se ve perfecta en el ordenador y diminuta en el móvil. Casi siempre es una línea que falta. Cómo comprobarlo en un minuto y qué significa.",
  entradilla:
    "Abres tu web en el ordenador y está preciosa. La abres en el móvil y aparece encogida, con la letra ilegible y hay que hacer pellizco para leer nada. No la has roto: le falta una línea, y hasta que no esté, Google también la ve así.",
  fecha: "2026-08-26",
  tema: "Móvil",
  resumen: [
    "La línea que falta en ocho de cada diez webs que se ven encogidas en el móvil.",
    "Cómo comprobar si la tuya la lleva, sin instalar nada y en menos de un minuto.",
    "Por qué esto no es solo estético: Google puntúa tu web por lo que ve en un teléfono.",
  ],
  cuerpo: `
Antes de nada, mira si te suena alguna de estas tres:

- La web sale **entera pero diminuta**, como si alguien hubiera metido la
  pantalla del ordenador dentro del móvil.
- Se ve bien de ancho, pero **hay que deslizar hacia el lado** para leer los
  párrafos.
- Todo está en su sitio, pero al cargar **el texto pega un salto** y acabas
  pulsando otra cosa.

Las tres tienen causas distintas y las tres tienen arreglo. Vamos por orden.

## La primera: falta una línea

Si tu web sale entera pero encogida, casi seguro le falta esto en la cabecera:

\`<meta name="viewport" content="width=device-width, initial-scale=1">\`

Suena a jerga, pero lo que dice es sencillo: **«móvil, dibuja esta página al
ancho que tú tengas»**.

Sin esa línea, el navegador del teléfono hace lo que hacía en 2007: se inventa
que la pantalla mide unos 980 puntos —el ancho de un ordenador de la época—,
dibuja la web ahí y luego la encoge entera para que quepa. Por eso se ve
completa y minúscula a la vez.

Es una línea. No cambia nada del diseño. Y es la diferencia entre una web que se
lee en el móvil y una que no.

### Cómo saber si la tuya la lleva

Sin instalar nada, desde el ordenador:

1. Abre tu web.
2. Pulsa **Ctrl+U** (o clic derecho, «Ver código fuente»).
3. Busca con **Ctrl+F** la palabra \`viewport\`.

Si aparece, la tienes. Si no aparece ninguna vez, ahí está tu problema.

## La segunda: algo es más ancho que la pantalla

Si tu web se ve bien de tamaño pero hay que deslizar hacia el lado, es que
dentro hay algo que no cabe: una imagen grande, una tabla, o un bloque al que
alguien le puso un ancho fijo en píxeles.

El culpable habitual es un ancho escrito a mano —\`width: 900px\`— que en un
ordenador cabe de sobra y en un teléfono de 390 puntos se sale por la derecha y
arrastra la página entera con él.

Es más laborioso de encontrar que lo anterior, porque hay que dar con el
elemento concreto. Un truco: ve estrechando la ventana del navegador en el
ordenador hasta que aparezca la barra de deslizar de abajo, y mira qué es lo
último que deja de caber.

## La tercera: el salto al cargar

Esta es la más molesta de las tres, porque no la ves si tienes buena conexión.

Cuando una imagen no dice **cuánto va a medir**, el navegador no le reserva
sitio: pinta el texto y, cuando la imagen llega, la mete de golpe y **empuja
todo lo demás hacia abajo**. Quien estaba a punto de pulsar un botón acaba
pulsando el de al lado.

Se arregla diciendo el tamaño de cada imagen en el propio HTML
(\`width="800" height="600"\`). No cambia cómo se ve: solo reserva el hueco antes
de que llegue la foto.

## Por qué esto no es solo estético

Aquí está la parte que casi nadie cuenta.

**Google mira tu web con un teléfono, no con un ordenador.** Desde hace años, la
versión que rastrea, guarda y puntúa es la del móvil. La del ordenador le da
igual.

O sea que si tu web se ve encogida en un teléfono, no es que «se vea peor en el
móvil»: es que **la versión que Google juzga es la mala**. Y como más de la mitad
de las visitas de una web pequeña llegan desde el móvil, quien entra y ve letra
ilegible se va antes de saber a qué te dedicas.

## Resumen: síntoma, causa y arreglo

| Lo que ves | Qué es | Cuánto cuesta |
| --- | --- | --- |
| Todo entero y minúsculo | Falta la línea del \`viewport\` | Una línea |
| Hay que deslizar de lado | Algo tiene un ancho fijo | Buscar el elemento |
| El texto salta al cargar | Imágenes sin medidas | Un rato |
| Los botones quedan pegados | Diseño pensado con ratón | Rediseñar esa parte |

Las dos primeras filas son la mayoría de los casos, y la primera es literalmente
una línea de texto.

## Y si tu web la ha hecho una IA

Casi siempre trae el \`viewport\` puesto: los modelos han aprendido con webs
modernas y esa línea va en todas. Los fallos que sí aparecen son los otros dos,
sobre todo el de las imágenes sin medidas.

En Estrénala eso te lo decimos sin que preguntes: al subir tu web se le pasa un
examen de diecisiete comprobaciones, y **«no está preparada para el móvil»** y
**«imágenes sin tamaño»** son dos de ellas. Con el nombre en cristiano y
diciéndote en qué página está cada una, que es lo que hace falta para poder
arreglarlo.

Ver que algo falla es fácil. Saber qué es lo que falla es lo que cuesta.
`,
  preguntas: [
    {
      p: "¿Cómo sé si mi web está preparada para el móvil?",
      r: "La prueba rápida: ábrela en tu teléfono. Si tienes que hacer pellizco para leer, no lo está. Para saber el motivo, abre el código fuente desde el ordenador con Ctrl+U y busca la palabra viewport: si no aparece, le falta la línea que le dice al móvil cómo dibujarla.",
    },
    {
      p: "¿Qué es la etiqueta viewport y por qué importa tanto?",
      r: "Es una línea en la cabecera del HTML que le dice al navegador del móvil que dibuje la página al ancho real del teléfono. Sin ella, el móvil supone que la pantalla mide unos 980 puntos, dibuja la web para ese tamaño y luego la encoge entera, que es por lo que se ve completa y minúscula a la vez.",
    },
    {
      p: "¿Google penaliza que mi web se vea mal en el móvil?",
      r: "Más que penalizarte, es que te juzga por ahí. Google rastrea y puntúa la versión móvil de tu web, no la de ordenador. Si la que ve en el teléfono está encogida o se sale por los lados, esa es la que cuenta para tu posición, por muy bien que se vea en un ordenador.",
    },
    {
      p: "¿Por qué el texto de mi web salta mientras carga?",
      r: "Porque hay imágenes que no dicen cuánto van a medir. El navegador pinta primero el texto y, cuando la imagen llega, la mete de golpe y empuja todo hacia abajo. Se arregla poniendo el ancho y el alto de cada imagen en el HTML, que reserva el hueco antes de que la foto llegue.",
    },
    {
      p: "¿Las webs hechas con IA vienen preparadas para el móvil?",
      r: "Normalmente sí en lo básico: casi todas traen la etiqueta viewport puesta, porque los modelos han aprendido con webs modernas. Lo que sí suele faltarles es el tamaño declarado de las imágenes, que provoca el salto al cargar, y algún bloque con ancho fijo que se sale de la pantalla.",
    },
  ],
};
