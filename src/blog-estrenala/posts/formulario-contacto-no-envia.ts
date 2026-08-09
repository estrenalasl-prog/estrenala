import type { Articulo } from "../tipos";

// Recordatorio: las comillas invertidas del Markdown van escapadas (\`asi\`).
export const formularioContactoNoEnvia: Articulo = {
  slug: "formulario-contacto-web-ia-no-envia",
  titulo: "El formulario de tu web hecha con IA no envía nada",
  descripcion:
    "Rellena tú mismo el formulario de contacto de tu web y verás que no llega a ninguna parte. Por qué pasa, cómo comprobarlo en treinta segundos y cómo se arregla.",
  entradilla:
    "Abre tu web. Rellena tu propio formulario de contacto. Envíalo. Ahora mira tu correo: no hay nada, y no lo va a haber. Le pasa a casi todas las webs hechas con IA, y el visitante nunca te lo va a decir.",
  fecha: "2026-08-09",
  tema: "Formularios",
  resumen: [
    "Cómo comprobar en treinta segundos si tu formulario está tirando mensajes a la basura.",
    "Por qué el HTML dibuja el formulario pero no puede enviarlo, por muy bien hecho que esté.",
    "Las cuatro maneras de arreglarlo, y lo que la ley te obliga a contar si empiezas a guardar datos.",
  ],
  cuerpo: `
Haz esto ahora, antes de seguir leyendo. Abre tu web, vete a la página de
contacto, escribe cualquier cosa y dale a enviar.

¿Qué ha pasado? Casi seguro una de estas tres:

- La página se ha recargado y el formulario se ha quedado en blanco, como si
  hubiera funcionado.
- No ha pasado absolutamente nada.
- Se ha abierto tu programa de correo con un mensaje a medio escribir.

Ninguna de las tres significa que el mensaje haya llegado a ningún sitio.

## Por qué pasa, y por qué no es un fallo de la IA

Un formulario tiene dos mitades, y solo una está en el archivo que te dieron.

La mitad que ves —las cajas, las etiquetas, el botón— es HTML, y la IA la hace
perfecta. La otra mitad es lo que ocurre **al pulsar**: alguien tiene que recoger
lo escrito, guardarlo y avisarte. Eso no es HTML. Es un programa corriendo en un
servidor, y en tu archivo no hay ninguno.

Cuando la IA escribe \`<form>\` sin decirle a dónde mandarlo, el navegador hace lo
único que sabe: recargar la página con los datos pegados en la dirección. Y ya.

Es un poco como poner un buzón precioso en la puerta sin abrir el agujero por
detrás. La gente echa las cartas, y las cartas se quedan dentro de la pared.

## Lo que de verdad duele

Que no funcione tiene arreglo. Lo grave es **cómo se entera uno**.

Un formulario roto no da error. No sale nada en rojo. El visitante escribe,
pulsa, ve que la página se recarga y **se va convencido de que te ha escrito**.
Tú no recibes nada y no sabes que existió. Él espera respuesta dos días y luego
llama a otro.

Puedes estar meses así. Nadie te va a escribir para decirte «oye, que tu
formulario no funciona»: quien lo intenta, por definición, no puede contactarte.

## Las cuatro salidas

| | Cuesta | Lo malo |
|---|---|---|
| **\`mailto:\`** | Gratis | Abre el programa de correo del visitante. La mitad no tiene ninguno configurado y la mitad de la otra mitad abandona. |
| **Formspree, Getform…** | Gratis con tope, luego 8–25 $/mes | Hay que registrarse aparte, tocar el HTML y los datos de tus clientes viven en un tercero más. |
| **Programarlo** | Tu tiempo, o el de alguien | Necesitas un servidor con código detrás. Si estás leyendo esto, no es tu camino. |
| **Estrénala** | Incluido | Lo enciendes tú y ya está. |

Lo del \`mailto:\` merece una nota, porque es lo que más se ve en webs hechas con
IA y parece que funciona cuando lo pruebas tú. Claro que funciona: **tú** sí
tienes el correo configurado en el ordenador. Tu cliente lo abre desde el móvil,
en Chrome, con el correo en la web de Gmail, y no pasa nada.

## Y ahora la parte que nadie cuenta: la ley

En el momento en que guardas el nombre, el correo o el teléfono de alguien, estás
tratando datos personales. Eso trae obligaciones concretas, y no son opcionales
por ser pequeño:

- **Decir quién los recoge y para qué**, ahí mismo, junto al formulario.
- **Enlazar tu política de privacidad**, y que exista de verdad.
- **Pedir consentimiento** con una casilla que NO venga marcada.
- **Poder borrarlos** si alguien te lo pide.

Esto es un argumento de peso contra el \`mailto:\` y contra pegar tu correo a la
vista: no es solo que funcione peor, es que un correo en texto plano en una
página web lo recogen los robots de spam en cuestión de días.

## Cómo lo resolvemos nosotros

En Estrénala la recogida de formularios **viene apagada**, y es a propósito.

Encenderla hace que la plataforma empiece a guardar datos de terceros —los de tus
clientes—, y eso lo tiene que decidir el dueño de la web, no nosotros. Mientras
esté apagada, tu web se sirve exactamente como la subiste, sin que toquemos una
letra.

Cuando la enciendes:

1. **No hay que cambiar el HTML.** El formulario que ya tienes, el que escribió
   la IA, empieza a funcionar tal cual.
2. Los mensajes se guardan y los ves en tu panel, con la página y la fecha.
3. Se te avisa de los que no has leído.

Y si un cliente te pide que borres sus datos, los borras tú desde ahí.

## Ve a probarlo

En serio, ahora. Es lo más barato que puedes hacer hoy por tu web: rellenar tu
propio formulario y ver si te llega.

Si no te llega, ya sabes cuántos mensajes se han perdido: los que no recuerdas
haber recibido.
`,
  preguntas: [
    {
      p: "¿Cómo sé si el formulario de mi web funciona?",
      r: "Rellénalo tú mismo desde el móvil, con datos reales, y envíalo. Si no te llega ningún correo ni aparece en ninguna parte en cinco minutos, no funciona. Que la página se recargue o se vacíe el formulario no significa nada: es lo que hace el navegador por defecto aunque no haya nadie recogiendo el mensaje.",
    },
    {
      p: "¿Por qué la IA no me hace un formulario que funcione?",
      r: "Porque no puede. La IA escribe el HTML, que es la parte visible del formulario, pero enviar el mensaje necesita un programa corriendo en un servidor, y eso no cabe en un archivo que te descargas. No es un descuido suyo: es que son dos cosas distintas.",
    },
    {
      p: "¿Vale con poner mi correo en la web en vez de un formulario?",
      r: "Funciona, pero tiene dos problemas. Los robots de spam rastrean páginas buscando correos en texto plano y el tuyo se llenará de basura en pocos días. Y pierdes a quien no quiere abrir su programa de correo solo para preguntarte un precio.",
    },
    {
      p: "¿Qué tengo que cumplir si guardo los datos de quien me escribe?",
      r: "Tienes que decir quién recoge los datos y para qué, junto al propio formulario; enlazar una política de privacidad que exista de verdad; pedir consentimiento con una casilla sin marcar; y poder borrar los datos de alguien si te lo pide. Aplica igual aunque seas una sola persona y recibas tres mensajes al mes.",
    },
    {
      p: "¿Tengo que cambiar el HTML de mi web para que funcione el formulario?",
      r: "En Estrénala no. El formulario que ya escribió la IA empieza a funcionar en cuanto enciendes la recogida, sin tocar el código. La opción viene apagada por defecto porque guardar datos de terceros lo decide el dueño de la web.",
    },
  ],
};
