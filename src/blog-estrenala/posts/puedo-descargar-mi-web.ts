import type { Articulo } from "../tipos";

// Recordatorio: las comillas invertidas del Markdown van escapadas (\`asi\`).
export const puedoDescargarMiWeb: Articulo = {
  slug: "puedo-descargar-mi-web-y-llevarmela",
  titulo: "¿Puedes descargar tu web y llevártela?",
  descripcion:
    "Antes de pagar un año por adelantado, comprueba si puedes bajarte tu web y montarla en otro sitio. La prueba de los cinco minutos y qué mirar.",
  entradilla:
    "Todo el mundo pregunta cuánto cuesta al mes. Casi nadie pregunta cómo se sale. Y esa segunda pregunta es la que decide si dentro de dos años tu web sigue siendo tuya o es de otro.",
  fecha: "2026-08-19",
  tema: "Portabilidad",
  resumen: [
    "Una prueba de cinco minutos para saber si tu web es tuya de verdad o solo mientras pagues.",
    "Las cuatro cosas que tienes que poder llevarte: con los archivos solos no basta.",
    "Cómo distinguir una descarga que sirve de una que te deja un montón de piezas sueltas.",
  ],
  cuerpo: `
Para antes de seguir leyendo: entra en el sitio donde tengas tu web y busca un
botón que ponga «descargar», «exportar» o «bajar mi web». Date cinco minutos.

Si lo encuentras y te baja un archivo, tranquilo. Si a los cinco minutos sigues
buscando por menús y ayudas, ya tienes la respuesta, y conviene saberla **ahora**
y no el día que la necesites.

## Por qué esta pregunta y no otra

Nadie contrata una web pensando en irse. Pero hay tres días en los que esto deja
de ser teórico, y ninguno de los tres lo eliges tú:

- **Suben el precio.** Lo que pagabas 9 pasa a 29 y tú ya tienes ahí dos años de
  cambios.
- **Cierra el servicio.** Pasa constantemente con herramientas jóvenes, y el
  aviso suele ser de treinta días.
- **Se te queda pequeña.** Quieres una tienda, o contratas a alguien que sabe
  más, y hay que mover la web a otro sitio.

En los tres, la pregunta es la misma: ¿me llevo lo que he construido, o empiezo
de cero?

## «Llevarte tu web» son cuatro cosas, no una

Aquí es donde casi todo el mundo se queda corto. Poder bajarte los archivos está
bien, pero es solo la primera de cuatro.

**1. Los archivos.** El HTML, las imágenes, los estilos. Lo que hace falta para
que la web exista fuera de ahí.

**2. El dominio.** Si tu dirección es \`tunegocio.com\` y lo compraste tú, es tuyo
y te lo llevas apuntando a otro sitio. Si tu dirección es
\`tunegocio.laplataforma.com\`, no te llevas nada: es una dirección suya que te
dejan usar. El día que te vas, quien tenía tu enlace guardado se queda sin nada.

**3. Lo que has escrito DESPUÉS.** Esta es la que se escapa. Subiste una web de
cinco páginas, y desde entonces has cambiado textos, has puesto fotos nuevas y
has publicado veinte artículos. La descarga tiene que traer **eso**, lo de hoy,
no la copia de lo que subiste el primer día.

**4. Las direcciones.** Si tus artículos viven en \`/blog/mi-articulo\` y al
mudarte pasan a \`/posts/mi-articulo\`, todos los enlaces que existan por ahí se
rompen y Google tiene que empezar a conocerte otra vez. Que las direcciones se
mantengan vale casi tanto como los archivos.

## Qué preguntar, y qué respuesta es buena

| Pregunta | Respuesta buena | Mala señal |
| --- | --- | --- |
| ¿Hay botón de descargar? | Sí, y lo veo yo desde mi panel | «Escríbenos y te lo preparamos» |
| ¿Qué me bajo? | La web tal y como está hoy | Solo lo que subiste al principio |
| ¿En qué plan? | En todos, también el gratis | Solo en el plan caro |
| ¿El dominio es mío? | Sí, lo compraste tú y lo apuntas donde quieras | Es un subdominio suyo |
| ¿Se abre sola? | Abres el archivo y se ve la web | Hace falta su programa para verla |

Esa última fila es la trampa fina. Hay sitios que sí te dan un archivo, pero
dentro no hay una web: hay piezas en un formato que solo entiende su propio
programa. Es como llevarte los muebles de casa desmontados y sin instrucciones.

## La prueba definitiva: ábrela sin internet

Cuando consigas tu descarga, haz esto:

1. Descomprime el archivo.
2. Busca dentro uno que se llame \`index.html\`.
3. Haz doble clic.

**Se tiene que ver tu web.** Con sus textos, sus fotos y sus colores, en tu
navegador, sin estar conectado a nada. Si se ve, eso es una web de verdad y la
puede publicar cualquiera en cualquier sitio. Si se abre en blanco o llena de
símbolos raros, lo que te has bajado no te sirve.

Tarda treinta segundos y te dice más que cualquier página de precios.

## Lo que hacemos nosotros

Ya que va de esto, lo justo es decir dónde estamos.

En Estrénala tienes un botón de **Descargar mi web** en el panel. Te baja un ZIP
con tu web **tal y como está hoy**: los cambios que hayas hecho a clic, las fotos
que hayas subido y los artículos que haya publicado el blog, todo dentro. Se abre
haciendo doble clic y se puede subir a cualquier otro sitio.

Está en **todos los planes, también el gratuito**. Y no lleva ni nuestro sello ni
nada nuestro: esa parte la ponemos al servir, no es tuya, así que no viaja.

No lo contamos por generosidad. Lo contamos porque una herramienta que necesita
encerrarte para que te quedes tiene un problema peor que el candado.

## Y si la respuesta era «no»

Si has hecho la prueba de los cinco minutos y no has encontrado el botón, no
corras a cambiarte hoy. Pero tampoco pagues un año por adelantado sin saberlo.

Escribe a su soporte y pregunta las cinco de la tabla. Lo que te contesten —y
lo que tarden— ya es media respuesta.
`,
  preguntas: [
    {
      p: "¿Cómo sé si puedo descargar mi web de donde la tengo?",
      r: "Entra en tu panel y busca un botón de «descargar» o «exportar» durante cinco minutos. Si no aparece por ninguna parte, escribe a su soporte y pregúntalo directamente. Que no esté a la vista suele significar que no existe, porque es de las cosas que se enseñan cuando se tienen.",
    },
    {
      p: "¿Me puedo llevar mi dominio si cambio de plataforma?",
      r: "Si lo compraste tú a tu nombre, sí: un dominio es tuyo y solo hay que apuntarlo a otro servidor cambiando un registro. Si tu dirección es un subdominio de la plataforma, del tipo tunegocio.suplataforma.com, ese no te lo llevas nunca porque no es tuyo.",
    },
    {
      p: "¿La descarga incluye los cambios que he hecho después de subirla?",
      r: "Depende de la plataforma, y es la pregunta más importante de todas. Lo que necesitas es una copia de tu web tal y como está hoy, con los textos que has cambiado, las fotos que has subido y lo que hayas publicado desde entonces. Una copia de lo que subiste el primer día no te sirve de nada.",
    },
    {
      p: "¿Qué hago con el ZIP una vez descargado?",
      r: "Descomprímelo, busca dentro el archivo index.html y haz doble clic: se tiene que ver tu web en el navegador sin estar conectado. A partir de ahí lo puedes subir a cualquier alojamiento que acepte archivos, o a otra plataforma que admita subir un ZIP.",
    },
    {
      p: "¿En Estrénala puedo bajarme mi web en el plan gratuito?",
      r: "Sí. El botón de descargar está en todos los planes, incluido el gratis, y te da tu web al día en un ZIP que se abre solo. No lleva nuestro sello ni ninguna marca nuestra, porque eso se añade al servir la web y no forma parte de lo tuyo.",
    },
  ],
};
