import type { Articulo } from "../tipos";

// Recordatorio: las comillas invertidas del Markdown van escapadas (\`asi\`).
export const publicarWebV0LovableBolt: Articulo = {
  slug: "publicar-web-v0-lovable-bolt",
  titulo: "El ZIP que te da v0 o Lovable no es tu web todavía",
  descripcion:
    "Descargas tu proyecto de v0, Lovable o Bolt, lo subes a un alojamiento y no se ve nada. No está roto: te has bajado el código fuente, no la web.",
  entradilla:
    "Le das al botón de descargar, te bajas un ZIP de veinte megas, lo subes a tu alojamiento y sale una página en blanco o una lista de archivos. No has hecho nada mal. Lo que te has descargado todavía no es una web, y hay un paso en medio que nadie te cuenta.",
  fecha: "2026-09-09",
  tema: "Publicar",
  resumen: [
    "La comprobación de diez segundos que te dice cuál de los dos casos es el tuyo.",
    "Qué hay que hacer para convertir el proyecto en algo que se pueda subir, paso a paso.",
    "Cuándo esa conversión NO va a funcionar, y qué significa eso para lo que has hecho.",
  ],
  cuerpo: `
Antes de nada, la comprobación. Descomprime el ZIP y mira **qué hay en la raíz**,
en el primer nivel, sin entrar en ninguna carpeta.

Si ves un archivo llamado \`index.html\`, enhorabuena: eso sí es una web y la
puedes subir tal cual. Salta al final de este artículo.

Si en cambio lo que ves es esto:

\`\`\`
package.json
tsconfig.json
src/
components/
public/
\`\`\`

entonces te has descargado **el código fuente**, no la web. Y un alojamiento no
sabe qué hacer con código fuente, igual que un horno no sabe qué hacer con una
lista de la compra.

## Por qué pasa esto

v0, Lovable y Bolt no escriben páginas: escriben **programas** que fabrican
páginas. Están hechos con React, y React no es un formato que un navegador
entienda. Es un lenguaje intermedio que hay que **construir** —compilar— para que
salga de ahí el HTML, el CSS y el JavaScript que el navegador sí entiende.

Mientras estás en v0 o en Lovable, esa construcción la hacen ellos por ti, en sus
servidores, cada vez que le das a la vista previa. Por eso ahí se ve perfecto.
Cuando te descargas el proyecto, te llevas los ingredientes, no la cena.

Es una diferencia que casi nadie explica porque a quien escribe la guía le parece
obvia. No lo es en absoluto.

| Lo que te descargas | Lo que necesita un alojamiento |
| --- | --- |
| \`src/\`, \`components/\`, \`package.json\` | \`index.html\` y sus archivos al lado |
| Se tiene que construir antes | Se sirve tal cual |
| Pesa mucho: cientos de carpetas | Pesa poco: lo justo de la web |

## Cómo convertirlo en una web

Son tres órdenes en el terminal y hace falta tener [Node.js](https://nodejs.org)
instalado. No hay que saber programar: hay que copiar tres líneas.

Abre el terminal dentro de la carpeta que descomprimiste y escribe:

\`\`\`
npm install
\`\`\`

Se descarga todo lo que el proyecto necesita para construirse. Tarda un par de
minutos y llena una carpeta enorme llamada \`node_modules\`. **Esa carpeta no se
sube nunca a ningún sitio**; es solo para construir.

Después:

\`\`\`
npm run build
\`\`\`

Esto es lo que fabrica la web de verdad. Cuando termine, mira qué carpeta nueva
ha aparecido:

- **\`dist/\`** — es lo habitual en Lovable y en Bolt.
- **\`out/\`** — es lo habitual en los proyectos de v0, que son Next.js.

Abre esa carpeta. Ahora sí: dentro hay un \`index.html\`. **Eso es tu web.** Lo que
se sube es el contenido de esa carpeta, no el ZIP que te descargaste.

## Cuando no funciona, y es importante

A veces \`npm run build\` falla, o termina bien pero la web sale en blanco. Lo
normal es que no sea un fallo tuyo: es que **lo que has hecho no es una web, es
una aplicación**.

La diferencia práctica: una web son archivos que se envían tal cual a quien los
pide. Una aplicación necesita un programa **funcionando en un servidor** que
piense en cada visita. Si tu proyecto tiene alguna de estas cosas, es lo segundo:

- Registro y acceso de usuarios con contraseña.
- Una base de datos donde se guardan cosas.
- Cobros, pasarelas de pago, avisos de Stripe.
- Rutas de API, o cualquier cosa que la herramienta llamara «servidor».

Un proyecto así **no se puede convertir en archivos sueltos**, por mucho que se
insista. No es una limitación de tu alojamiento: es que le estás pidiendo a un
archivador que haga de cocinero. Necesita un alojamiento que ejecute código, que
es otro producto y otro precio.

Merece la pena saberlo pronto, porque cambia la decisión entera y mucha gente
descubre esto después de pagar un año por adelantado.

## Y si no quieres tocar el terminal

Es una postura razonable. Tienes tres caminos y conviene verlos con lo que
cuestan de verdad:

**Publicar donde lo hiciste.** v0, Lovable y Bolt tienen su propio botón de
publicar. Es lo más rápido, y a cambio tu web vive dentro de su suscripción: si
dejas de pagar o cierran, se va contigo.

**Pedir la versión estática.** Muchas de estas herramientas saben generar una web
de archivos sueltos si se lo pides así desde el principio: «hazme una web
estática, solo HTML y CSS, sin base de datos». Si lo que quieres es una web de
presentación —quién eres, qué haces, cómo contactarte—, esto te ahorra el
problema entero y además carga más rápido.

**Que alguien haga la construcción por ti.** Es lo que hacemos nosotros y no
vamos a fingir que es neutral: en Estrénala subes la carpeta y la web queda
publicada, con su dirección y su candado. Con una condición que decimos por
delante: **no ejecutamos código en servidor**. Si tu proyecto es de los de la
lista de arriba —con usuarios, base de datos o cobros—, aquí tampoco va a
funcionar, y preferimos decírtelo antes de que lo intentes.

## Lo que se lleva la gente que lo entiende

Que el botón de «descargar» de estas herramientas no significa lo que parece. No
te estás llevando tu web: te estás llevando las instrucciones para fabricarla.

Saber en cuál de los dos casos estás —archivos o aplicación— es lo que decide
todo lo demás: dónde puedes publicarla, cuánto te va a costar y si de verdad te
la puedes llevar el día que quieras.
`.trim(),
  preguntas: [
    {
      p: "¿Puedo subir el ZIP tal cual a mi alojamiento?",
      r: "Solo si al descomprimirlo ves un index.html en la raíz. Si lo que ves es package.json y una carpeta src, ese ZIP es código fuente y hay que construirlo antes: npm install y npm run build. Lo que se sube es la carpeta dist u out que aparece después, no el ZIP.",
    },
    {
      p: "¿Por qué se ve bien en la vista previa de v0 y no cuando lo subo?",
      r: "Porque la vista previa la construye v0 en sus servidores cada vez que la abres. Ahí estás viendo el resultado ya fabricado. Al descargar te llevas el proyecto sin fabricar, y esa construcción tiene que hacerla alguien: o tú en tu ordenador, o el sitio donde lo publiques.",
    },
    {
      p: "¿Qué carpeta tengo que subir después de construir?",
      r: "La que ha aparecido nueva al terminar npm run build: dist en Lovable y Bolt, out en los proyectos de v0 hechos con Next.js. Se sube el contenido de esa carpeta, no la carpeta metida dentro de otra, y nunca node_modules.",
    },
    {
      p: "¿Y si npm run build da error?",
      r: "Lo más frecuente es que el proyecto tenga login, base de datos o rutas de API. Eso no se puede convertir en archivos sueltos porque necesita un programa funcionando en un servidor. Ahí el camino no es insistir con la construcción, sino un alojamiento que ejecute código, que es otro producto.",
    },
    {
      p: "¿Cómo pido desde el principio una web que se pueda publicar en cualquier sitio?",
      r: "Diciéndoselo con esas palabras: una web estática, solo HTML y CSS, sin base de datos ni usuarios. Para una web de presentación es suficiente, carga más rápido y te la puedes llevar a donde quieras sin depender de quien la generó.",
    },
  ],
};
