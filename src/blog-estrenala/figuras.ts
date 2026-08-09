/**
 * Los dibujos de los artículos.
 *
 * Van aparte del texto y se llaman desde el Markdown con `{{figura:nombre}}`.
 * Metidos a pelo en el cuerpo, un SVG de treinta líneas parte el artículo en dos
 * y ya nadie se atreve a tocar el párrafo de al lado.
 *
 * Son SVG y no imágenes: pesan menos que un JPEG pequeño, se ven nítidos en
 * cualquier pantalla, salen con los colores de la marca y —lo que más importa—
 * el texto de dentro es texto de verdad, así que se puede leer, buscar y copiar.
 * Una captura con letras dentro no la lee nadie que use un lector de pantalla.
 */

const TINTA = "#141509";
const LIMA = "#C4F000";
const BORDE = "#DEDFD6";
const APAGADO = "#9A9C8F";
const TEXTO2 = "#55584C";

/**
 * Lo que trae el .zip y lo que le falta.
 *
 * Es el argumento entero del artículo en un vistazo: a la izquierda, sólido y
 * cerrado, lo que ya tienes; a la derecha, en línea discontinua, las tres cosas
 * que no. La discontinua no es un adorno: es lo que dice «esto todavía no
 * existe» sin tener que escribirlo.
 */
const QUE_FALTA = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" width="720" height="300"
     role="img" aria-labelledby="tit-falta desc-falta">
  <title id="tit-falta">Lo que trae el archivo y lo que le falta</title>
  <desc id="desc-falta">El archivo .zip contiene el HTML, el CSS y las imágenes. Fuera de él
  quedan tres cosas que hay que conseguir aparte: una dirección, un servidor donde viva y el
  candado del HTTPS.</desc>

  <!-- Lo que ya tienes -->
  <rect x="1" y="34" width="300" height="232" rx="14" fill="#FFFFFF" stroke="${BORDE}" stroke-width="2"/>
  <text x="20" y="22" font-family="Space Grotesk, system-ui, sans-serif" font-size="13"
        font-weight="700" fill="${TINTA}" letter-spacing="1.2">LO QUE TIENES</text>
  <text x="24" y="72" font-family="Space Grotesk, system-ui, sans-serif" font-size="19"
        font-weight="700" fill="${TINTA}">mi-web.zip</text>
  <g font-family="Space Grotesk, system-ui, sans-serif" font-size="15" fill="${TEXTO2}">
    <circle cx="32" cy="112" r="4" fill="${LIMA}"/><text x="48" y="117">index.html · el texto</text>
    <circle cx="32" cy="152" r="4" fill="${LIMA}"/><text x="48" y="157">estilo.css · los colores</text>
    <circle cx="32" cy="192" r="4" fill="${LIMA}"/><text x="48" y="197">imagenes/ · las fotos</text>
  </g>
  <text x="24" y="240" font-family="Space Grotesk, system-ui, sans-serif" font-size="14"
        fill="${APAGADO}">La web entera. Está completa.</text>

  <!-- La flecha -->
  <path d="M318 150 h64" stroke="${BORDE}" stroke-width="2" fill="none"/>
  <path d="M376 143 l10 7 -10 7" stroke="${BORDE}" stroke-width="2" fill="none" stroke-linejoin="round"/>

  <!-- Lo que falta -->
  <text x="418" y="22" font-family="Space Grotesk, system-ui, sans-serif" font-size="13"
        font-weight="700" fill="${TINTA}" letter-spacing="1.2">LO QUE FALTA</text>
  <g stroke="${APAGADO}" stroke-width="2" stroke-dasharray="7 6" fill="none">
    <rect x="400" y="34" width="318" height="64" rx="12"/>
    <rect x="400" y="118" width="318" height="64" rx="12"/>
    <rect x="400" y="202" width="318" height="64" rx="12"/>
  </g>
  <g font-family="Space Grotesk, system-ui, sans-serif">
    <text x="424" y="62" font-size="17" font-weight="700" fill="${TINTA}">Una dirección</text>
    <text x="424" y="84" font-size="14" fill="${APAGADO}">algo que la gente pueda escribir</text>
    <text x="424" y="146" font-size="17" font-weight="700" fill="${TINTA}">Un sitio donde viva</text>
    <text x="424" y="168" font-size="14" fill="${APAGADO}">encendido las 24 horas</text>
    <text x="424" y="230" font-size="17" font-weight="700" fill="${TINTA}">El candado</text>
    <text x="424" y="252" font-size="14" fill="${APAGADO}">o Chrome dirá «No es seguro»</text>
  </g>
</svg>`;

/**
 * Cómo queda una zona DNS bien puesta, y el registro que sobra.
 *
 * La fila del AAAA va tachada y en rojo porque es la única que hay que BORRAR, y
 * es la que nadie borra. El color no es decorativo: es la diferencia entre «esto
 * se pone» y «esto se quita», y en una tabla de cuatro filas grises eso no se
 * distingue.
 */
const ZONA_DNS = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 268" width="720" height="268"
     role="img" aria-labelledby="tit-dns desc-dns">
  <title id="tit-dns">Cómo queda la zona DNS al conectar un dominio</title>
  <desc id="desc-dns">Tabla de registros DNS. Un registro A con nombre arroba apuntando a la
  IP del servidor, y un CNAME con nombre www apuntando al dominio. Debajo, un registro AAAA
  tachado: es el que hay que borrar, porque apunta a la web anterior.</desc>

  <text x="4" y="14" font-family="Space Grotesk, system-ui, sans-serif" font-size="13"
        font-weight="700" fill="${TINTA}" letter-spacing="1.2">TU ZONA DNS, BIEN PUESTA</text>

  <g font-family="Space Grotesk, system-ui, sans-serif" font-size="12" font-weight="700"
     fill="${APAGADO}" letter-spacing="1">
    <text x="20" y="48">TIPO</text><text x="120" y="48">NOMBRE</text><text x="250" y="48">VALOR</text>
  </g>
  <line x1="4" y1="60" x2="716" y2="60" stroke="${BORDE}" stroke-width="2"/>

  <!-- Las dos que se ponen -->
  <rect x="4" y="70" width="712" height="46" rx="9" fill="#F2FBCB" stroke="#DDF08A" stroke-width="1.5"/>
  <g font-family="Space Grotesk, system-ui, sans-serif" font-size="15" fill="${TINTA}">
    <text x="20" y="99" font-weight="700">A</text>
    <text x="120" y="99">@</text>
    <text x="250" y="99" font-family="ui-monospace, Consolas, monospace" font-size="14">la IP del servidor</text>
  </g>
  <rect x="4" y="124" width="712" height="46" rx="9" fill="#F2FBCB" stroke="#DDF08A" stroke-width="1.5"/>
  <g font-family="Space Grotesk, system-ui, sans-serif" font-size="15" fill="${TINTA}">
    <text x="20" y="153" font-weight="700">CNAME</text>
    <text x="120" y="153">www</text>
    <text x="250" y="153" font-family="ui-monospace, Consolas, monospace" font-size="14">tunegocio.com</text>
  </g>

  <!-- La que hay que quitar -->
  <rect x="4" y="186" width="712" height="46" rx="9" fill="#FEF2F2" stroke="#FCA5A5" stroke-width="1.5"/>
  <g font-family="Space Grotesk, system-ui, sans-serif" font-size="15" fill="#B91C1C">
    <text x="20" y="215" font-weight="700">AAAA</text>
    <text x="120" y="215">@</text>
    <text x="250" y="215" font-family="ui-monospace, Consolas, monospace" font-size="14">2a02:… (la web anterior)</text>
  </g>
  <line x1="14" y1="209" x2="600" y2="209" stroke="#B91C1C" stroke-width="2"/>
  <text x="620" y="215" font-family="Space Grotesk, system-ui, sans-serif" font-size="13"
        font-weight="700" fill="#B91C1C">BÓRRALO</text>

  <text x="4" y="256" font-family="Space Grotesk, system-ui, sans-serif" font-size="13" fill="${APAGADO}">
    Mientras el AAAA siga ahí, media internet verá tu web vieja y no habrá ningún error.</text>
</svg>`;

export const FIGURAS: Record<string, { svg: string; pie: string }> = {
  "que-falta": {
    svg: QUE_FALTA,
    pie: "El archivo que te da la IA está completo. Lo que no viene dentro es todo lo demás.",
  },
  "zona-dns": {
    svg: ZONA_DNS,
    pie: "Dos registros que se ponen y uno que se quita. El que se quita es el que nadie quita.",
  },
};

/**
 * `{{figura:nombre}}` → el dibujo con su pie. Un nombre que no existe se queda
 * tal cual, visible: es más fácil de ver que un hueco silencioso.
 *
 * Se llama sobre el HTML YA convertido, no sobre el Markdown (el porqué, en
 * `render.ts`). Por eso se traga también el `<p>` que marked le pone alrededor
 * al marcador cuando va solo en su línea: un `<figure>` dentro de un `<p>` no es
 * HTML válido, y el navegador lo saca de ahí descolocando el aire de alrededor.
 */
export function insertarFiguras(html: string): string {
  const dibujo = (nombre: string) => {
    const f = FIGURAS[nombre];
    return f ? `<figure class="figura">${f.svg}<figcaption>${f.pie}</figcaption></figure>` : null;
  };
  return html
    .replace(/<p>\s*\{\{figura:([a-z0-9-]+)\}\}\s*<\/p>/g, (o, n: string) => dibujo(n) ?? o)
    .replace(/\{\{figura:([a-z0-9-]+)\}\}/g, (o, n: string) => dibujo(n) ?? o);
}
