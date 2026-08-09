import type { Articulo } from "../tipos";

// Recordatorio: las comillas invertidas del Markdown van escapadas (\`asi\`).
export const cambiarTextoSinTocarCodigo: Articulo = {
  slug: "cambiar-texto-web-sin-tocar-codigo",
  titulo: "Cambiar un texto de tu web sin tocar el código",
  descripcion:
    "Cambian tus horarios y hay que actualizar la web. Las tres formas habituales de hacerlo, por qué las tres acaban en que no lo cambias, y cómo debería ser.",
  entradilla:
    "Cambias el horario de verano. Abres la carpeta de tu web, ves cuatrocientas líneas de código y la cierras. «Ya lo haré el finde». Es septiembre y sigue poniendo el horario de julio: así es como se muere una web.",
  fecha: "2026-08-09",
  tema: "Editar",
  resumen: [
    "Por qué el problema no es publicar la web, sino el primer cambio que hace falta después.",
    "Las tres formas habituales de actualizarla y qué falla exactamente en cada una.",
    "Por qué volver a pedírselo a la IA es peor de lo que parece, aunque sea lo más cómodo.",
  ],
  cuerpo: `
Nadie abandona una web el día que la publica. La abandona el día que hay que
cambiarle algo y no sabe cómo.

Y siempre hay algo. Suben los precios. Cambia el horario. Se va la persona cuyo
nombre está en «Nuestro equipo». Te haces fotos nuevas del local. Pones una
promoción de Navidad que hay que quitar en enero.

Si cada uno de esos cambios cuesta una tarde, no los haces. Y una web con los
horarios del año pasado **da peor impresión que no tener web**: dice que el
negocio no está atendido.

## Las tres formas de hacerlo, y qué falla en cada una

### 1. Abrir el HTML y editarlo

Es lo que te dirá cualquiera que sepa: «pero si es solo cambiar un texto».

Y es verdad, hasta que el texto que buscas está entre dos etiquetas raras y no
sabes dónde acaba. Borras un \`</div>\` de más y la mitad de la página se descoloca.
Como no lo ves hasta que subes el archivo, descubres el destrozo cuando ya está
en internet.

El problema no es la dificultad. Es el **miedo**: cuando cada cambio puede romper
algo que no sabes arreglar, dejas de hacer cambios.

### 2. Volver a pedírselo a la IA

Lo más cómodo, y lo que parece obvio. Pero tiene una trampa que no se ve venir.

La IA no edita: **regenera**. Le pides que cambie el horario y te devuelve una
web nueva que se parece mucho. Casi siempre viene con algo de propina: un color
ligeramente distinto, un párrafo reescrito «mejor», una sección que ha decidido
reordenar, una foto que ya no está donde estaba.

Así que revisas la web entera para comprobar un cambio de dos palabras. Y a la
tercera vez que pasa, dejas de hacerlo.

Hay algo más de fondo: cuando editas por chat, **la versión buena de tu web es la
que la IA se acuerde de reconstruir**. No hay original. Cada cambio es una tirada
de dados sobre todo lo demás.

### 3. Llamar a alguien

Funciona, y es lo que acaba haciendo mucha gente. Pero cambiar un horario no
justifica una factura, así que se acumulan: *«cuando tenga tres o cuatro cosas le
escribo»*. Y las tres o cuatro cosas tardan meses en juntarse.

## Cómo debería ser

Hacer clic encima del texto y escribir. Nada más.

Suena tonto de tan simple, pero cambia la naturaleza del asunto. Si cambiar un
precio son quince segundos, lo cambias. Y una web que se toca es una web que
sigue viva.

Tres cosas que hacen que funcione de verdad:

- **Ves tu web mientras la editas**, no un formulario con casillas. Escribes
  encima de lo que va a ver el cliente.
- **Solo se puede tocar lo que es contenido.** El diseño no se toca sin querer,
  porque no está a mano.
- **Hay marcha atrás.** Cada publicación guarda una copia, así que si te
  arrepientes, vuelves a la anterior. Eso es lo que quita el miedo, y el miedo es
  el verdadero motivo por el que las webs se quedan viejas.

## Lo que hacemos, y lo que no

En Estrénala editas haciendo clic sobre tu propia web: textos e imágenes. Se
publica cuando tú le das, no antes, y cada publicación queda guardada por si hay
que volver atrás.

Y ahora lo que **no** hace, porque prefiero decírtelo yo a que lo descubras tú:
hoy se cambia el contenido, no la maquetación. Mover una sección de sitio o
cambiar la separación entre dos bloques todavía no se puede desde el editor.

Si tu web necesita un rediseño, esto no es lo que buscas. Si lo que necesitas es
que los horarios estén bien y las fotos sean las de ahora, es exactamente esto.

## La prueba de los treinta segundos

Antes de elegir dónde publicar tu web, haz este ejercicio: imagina que mañana
cambias el número de teléfono.

¿Sabrías hacerlo tú solo, sin ayuda y sin miedo a romper nada?

Si la respuesta es no, da igual lo bonita que sea. Dentro de un año estará
desactualizada, y una web desactualizada es peor que ninguna.
`,
  preguntas: [
    {
      p: "¿Puedo cambiar el texto de mi web sin saber programar?",
      r: "Sí, si la plataforma donde está publicada tiene un editor visual. En Estrénala haces clic sobre el texto de tu propia web y escribes encima; no hay que abrir ningún archivo ni saber HTML. Lo que no puedes hacer sin tocar código es cambiar la maquetación: mover secciones o alterar la separación entre bloques.",
    },
    {
      p: "¿Es mala idea pedirle a la IA que actualice mi web?",
      r: "Para un cambio pequeño, sí. La IA no edita, regenera: te devuelve una web nueva parecida, y casi siempre con cambios de propina que no pediste (un color distinto, un párrafo reescrito, una sección reordenada). Acabas revisando la web entera para comprobar un cambio de dos palabras.",
    },
    {
      p: "¿Qué pasa si me equivoco al editar y rompo algo?",
      r: "En una plataforma con historial, vuelves a la versión anterior y ya está. Cada publicación guarda una copia de cómo estaba la web. Poder deshacer es lo que quita el miedo, y el miedo es el motivo real por el que la mayoría de webs pequeñas se quedan sin actualizar.",
    },
    {
      p: "¿Cada cuánto hay que actualizar la web de un negocio?",
      r: "No hay una norma, pero sí un mínimo: cualquier dato que un cliente pueda usar para presentarse en tu puerta o llamarte —horarios, dirección, teléfono, precios— tiene que estar bien siempre. Un horario equivocado no es un detalle: es un cliente que va y se encuentra cerrado.",
    },
  ],
};
