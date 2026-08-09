import type { Articulo } from "../tipos";

// OJO al escribir aquí: el cuerpo es una plantilla de TypeScript, así que cada
// comilla invertida del Markdown va escapada (\`.zip\`). Sin escapar, la primera
// cierra la cadena y el archivo no compila.
export const publicarWebHechaConIa: Articulo = {
  slug: "publicar-web-hecha-con-ia",
  titulo: "Cómo publicar la web que te ha hecho la IA",
  descripcion:
    "Le pediste una web a ChatGPT, Claude o v0, te la descargaste en un .zip y ahí sigue. Esto es lo que falta para que exista, y las cuatro formas de conseguirlo.",
  entradilla:
    "Le pediste una web a la IA. Quedó mejor de lo que esperabas. La descargaste… y lleva tres semanas en la carpeta de Descargas. No es culpa tuya: nadie te dijo que faltaba la mitad.",
  fecha: "2026-08-09",
  tema: "Publicar",
  cuerpo: `
Pasa siempre igual. Le describes a ChatGPT el negocio, te devuelve una web, la
abres en el navegador y piensas *«pues está mejor que la que me pidieron 1.200 €
por hacer»*. Le das a descargar, aparece un archivo \`.zip\` en la carpeta de
Descargas… y ahí se acaba la historia.

Semanas después el archivo sigue ahí. Y la sensación es que hiciste algo mal.

No hiciste nada mal. Lo que pasa es que **una web y un archivo de web no son la
misma cosa**, y nadie te lo explicó.

## Lo que te ha dado la IA, y lo que no

Dentro de ese \`.zip\` hay lo que se llama una web estática: un puñado de archivos
\`.html\` con el texto, un \`.css\` con los colores y las tipografías, y una carpeta
de imágenes. Eso es la web entera. Está completa.

Lo que no está es todo lo demás:

- **Una dirección.** Algo que la gente pueda escribir. Ahora mismo la única forma
  de verla es tener el archivo en tu ordenador.
- **Un sitio donde viva.** Un ordenador encendido las 24 horas que le entregue
  esos archivos a quien los pida. A eso se le llama servidor.
- **El candado.** El HTTPS, que es lo que hace que el navegador no ponga «No es
  seguro» en la barra de direcciones. Sin él, Chrome asusta a tus clientes antes
  de que lean nada.

Son tres cosas separadas, y ninguna te la puede dar la IA que escribió el código.
Es como si te hubieran construido la casa entera pero no tuvieras el solar.

{{figura:que-falta}}

## Las cuatro salidas

Cuando buscas cómo hacerlo, internet te ofrece básicamente esto:

| | Cuesta | Hace falta saber | Editar después |
|---|---|---|---|
| **GitHub Pages** | Gratis | Git, terminal, un repositorio | Editando código |
| **Netlify / Vercel** | Gratis al principio | Poco, pero en inglés y con jerga | Editando código |
| **Hosting clásico** | 3–10 €/mes | FTP, panel cPanel, algo de paciencia | Editando código |
| **Estrénala** | Gratis para empezar | Arrastrar un archivo | Desde la propia web |

Voy a ser honesto contigo, porque si no esto no vale nada:

**Si sabes usar Git, vete a GitHub Pages o a Vercel.** Son gratis, son excelentes
y no te hace falta nadie. En serio. No tiene sentido que pagues por algo que ya
sabes hacer en diez minutos.

**Si no sabes lo que es Git**, esas dos opciones te van a costar una tarde
entera, y probablemente acabes con la web publicada pero sin saber cómo cambiarle
un número de teléfono. Que es exactamente el problema que vas a tener dentro de
tres semanas.

Y el hosting clásico —el de toda la vida, con su panel lleno de iconos— sigue
siendo FTP: subir archivos a mano, uno por uno, y volver a subirlos enteros cada
vez que cambies una coma.

## La parte que de verdad se atraganta: el dominio

Publicar la web es lo fácil. Lo que hunde a la gente es conectar su dominio.

Si has comprado *tunegocio.com* en algún sitio, ese sitio te da un panel con una
tabla que se llama **zona DNS**. Esa tabla decide a qué servidor va a parar quien
escriba tu dominio. Tienes que tocarla. No hay forma de evitarlo.

Lo que confunde es que los nombres no significan nada para un humano normal:

- Un registro **A** dice «este dominio apunta a este servidor». Es el importante.
- Un registro **CNAME** dice «esto es otro nombre para aquello». El típico
  \`www.tunegocio.com\` que lleva a \`tunegocio.com\`.
- Un registro **AAAA** es como el A, pero para direcciones modernas. **Y este es
  el que te va a arruinar la tarde**: si tu dominio tenía una web antes, es muy
  probable que aún tenga un AAAA apuntando a la anterior. Cambias el A, todo
  parece correcto, y la mitad de los navegadores siguen viendo la web vieja
  porque prefieren el AAAA. No hay ningún mensaje de error. Simplemente no
  funciona, y no sabes por qué.

Y luego está la espera. Los cambios de DNS tardan: a veces diez minutos, a veces
unas horas. Durante ese rato tu web funciona para unos y no para otros, lo cual
es profundamente desesperante si no sabes que es normal.

## Y después de publicar, lo que nadie cuenta

Aquí es donde se decide si tu web sigue viva dentro de un año.

Tu web publicada es un archivo de código. El día que cambien tus horarios de
verano, o subas los precios, o quieras poner la foto nueva del local, tienes dos
opciones: abrir el HTML y editarlo con cuidado de no romper nada, o volver a
pedírselo a la IA y subirlo todo otra vez.

Las dos son malas. Y la consecuencia siempre es la misma: **no lo cambias.** La
web se queda con los horarios del año pasado, y acaba dando peor impresión que no
tener web.

## Cómo lo hacemos nosotros

Estrénala existe justo para el hueco que dejan las otras opciones: publicar sin
saber, y **poder cambiar cosas después sin tocar código**.

1. **Arrastras el \`.zip\`** tal cual te lo dio la IA. Sin descomprimir, sin tocar
   nada.
2. **Eliges la dirección.** Te damos una gratis del tipo
   \`tunegocio.estrenala.com\` y ya está online, con el candado puesto.
3. **Conectas tu dominio** cuando quieras. Te decimos exactamente qué registros
   tocar, en qué panel, y te avisamos si te has dejado el AAAA puesto — que es lo
   que le pasa a casi todo el mundo.
4. **Cambias textos e imágenes** haciendo clic encima, viendo la web de verdad.
   Sin editores raros, sin código.

Y si un día te quieres ir, te descargas tu web entera en un \`.zip\` y te la
llevas. Es tuya. No la secuestramos.

## Empieza por el paso pequeño

No hace falta que decidas nada hoy. Sube el archivo y ponle la dirección gratis:
tardas menos que en leer este artículo y ya tienes un enlace que mandar por
WhatsApp.

Lo del dominio propio lo dejas para cuando te apetezca. Pero al menos la web
existe, que es la diferencia entre tener una web y tener un archivo.
`,
  preguntas: [
    {
      p: "¿Puedo publicar una web hecha con ChatGPT sin saber programar?",
      r: "Sí. El archivo .zip que te descargas ya contiene la web terminada; lo único que falta es un sitio donde alojarla y una dirección. En Estrénala arrastras el archivo y en un clic está online con HTTPS, sin tocar código ni instalar nada.",
    },
    {
      p: "¿Qué hago con el archivo .zip que me ha dado la IA?",
      r: "No lo descomprimas. Súbelo tal cual: dentro están el HTML, el CSS y las imágenes en la estructura correcta, y descomprimirlo antes solo suele complicar las rutas de los archivos.",
    },
    {
      p: "¿Cuánto tarda en funcionar mi dominio después de conectarlo?",
      r: "Los cambios de DNS suelen tardar entre diez minutos y unas pocas horas en extenderse. Durante ese rato es normal que la web funcione para unas personas y para otras no. Si pasado un día sigue sin verse, casi siempre es que quedó un registro AAAA antiguo apuntando a la web anterior.",
    },
    {
      p: "¿Es mejor GitHub Pages o Vercel que Estrénala?",
      r: "Si sabes usar Git y la terminal, GitHub Pages y Vercel son gratuitos, excelentes y no necesitas nada más. Estrénala tiene sentido cuando no quieres aprender eso y, sobre todo, cuando quieres poder cambiar textos e imágenes tú mismo más adelante sin volver a tocar el código.",
    },
    {
      p: "¿Puedo llevarme mi web si me voy?",
      r: "Sí. Puedes descargar tu web completa en un archivo .zip en cualquier momento, con todos sus archivos, y subirla donde quieras. No hay bloqueo ni formato propietario.",
    },
  ],
};
