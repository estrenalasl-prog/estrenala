import type { Articulo } from "./tipos";

/**
 * La portada 1200×630 de cada artículo: la tarjeta que sale al pegar el enlace
 * en WhatsApp o LinkedIn, y la miniatura del listado.
 *
 * Se genera, no se busca. Una foto de banco de un señor con un portátil no dice
 * nada de lo que hay dentro, se nota a un kilómetro que es de banco, y hay que
 * elegirla a mano cada vez. Esto sale de la marca, es distinta para cada
 * artículo porque el título es distinto, y el siguiente artículo la tiene sin
 * que nadie haga nada.
 *
 * Sin fotos, sin degradados de moda y sin círculos de relleno: fondo tinta,
 * el lima en un solo sitio, y el título grande. La misma disciplina que la
 * portada de la web.
 */

const ANCHO = 1200;
const ALTO = 630;
const MARGEN = 84;
const CAJA = ANCHO - MARGEN * 2;

const TINTA = "#141509";
const LIMA = "#C4F000";
const HUESO = "#F3F4EC";
const APAGADO = "#74766A";

/**
 * Cuánto ocupa un texto, a ojo.
 *
 * resvg no mide, así que se estima: 0.56 em por carácter en Space Grotesk Bold.
 * Solo se usa para cosas que perdonan el error —el ancho de una pastilla y el
 * corte de las líneas—, y el texto de la pastilla va CENTRADO dentro de ella,
 * así que si el cálculo se queda corto o largo sigue pareciendo intencionado.
 */
const EM = 0.56;
const ancho = (t: string, tam: number) => t.length * tam * EM;

function escapar(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Corta el título por ANCHO real estimado, no por número de caracteres. */
function lineas(titulo: string, tam: number): string[] {
  const out: string[] = [];
  let actual = "";
  for (const p of titulo.trim().split(/\s+/)) {
    const cand = actual ? `${actual} ${p}` : p;
    if (ancho(cand, tam) <= CAJA || !actual) actual = cand;
    else { out.push(actual); actual = p; }
  }
  if (actual) out.push(actual);
  return out;
}

/** El tamaño más grande con el que el título cabe en tres líneas. */
function encajar(titulo: string): { tam: number; ls: string[] } {
  for (const tam of [76, 66, 58, 50, 44]) {
    const ls = lineas(titulo, tam);
    if (ls.length <= 3) return { tam, ls };
  }
  const ls = lineas(titulo, 44);
  return { tam: 44, ls: ls.slice(0, 3) };
}

export function svgPortada(a: Pick<Articulo, "titulo" | "tema">): string {
  const { tam, ls } = encajar(a.titulo);
  const alto = Math.round(tam * 1.15);
  // El bloque de título se ancla ABAJO, sobre la firma: así uno de dos líneas y
  // otro de tres empiezan a distinta altura pero acaban en la misma, y las
  // tarjetas se ven de la misma familia en el muro de LinkedIn.
  const base = ALTO - 148;
  const y0 = base - (ls.length - 1) * alto;

  const tamPastilla = 24;
  const anchoPastilla = Math.round(ancho(a.tema.toUpperCase(), tamPastilla) + 46);

  const tspans = ls
    .map((l, i) => `<tspan x="${MARGEN}" y="${y0 + i * alto}">${escapar(l)}</tspan>`)
    .join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">` +
    `<rect width="${ANCHO}" height="${ALTO}" fill="${TINTA}"/>` +
    // El listón lima del borde: es lo único de color a sangre, y lo que hace
    // que la tarjeta se reconozca antes de leer nada. 16 y no 12 porque en la
    // miniatura de WhatsApp la imagen se ve a un tercio, y a 12 desaparecía.
    `<rect x="0" y="0" width="16" height="${ALTO}" fill="${LIMA}"/>` +
    // Marca de agua: el mismo rectángulo redondeado del logo, enorme y cortado
    // por el borde. Sugiere la marca sin repetir el logotipo entero.
    // Los dos arrancan en la MISMA x: desalineados parecían un error de montaje
    // en vez de un patrón.
    `<rect x="1000" y="-100" width="380" height="380" rx="70" fill="${LIMA}" opacity="0.08"/>` +
    `<rect x="1000" y="320" width="380" height="380" rx="70" fill="${LIMA}" opacity="0.05"/>` +
    // La pastilla del tema
    `<rect x="${MARGEN}" y="74" width="${anchoPastilla}" height="46" rx="23" fill="${LIMA}"/>` +
    `<text x="${MARGEN + anchoPastilla / 2}" y="105" text-anchor="middle" font-family="Space Grotesk" ` +
    `font-size="${tamPastilla}" font-weight="700" fill="${TINTA}" letter-spacing="1.4">${escapar(a.tema.toUpperCase())}</text>` +
    // El título
    `<text font-family="Space Grotesk" font-size="${tam}" font-weight="700" fill="${HUESO}">${tspans}</text>` +
    // La firma, con un guion lima delante
    `<rect x="${MARGEN}" y="${ALTO - 84}" width="34" height="5" rx="2.5" fill="${LIMA}"/>` +
    `<text x="${MARGEN + 50}" y="${ALTO - 74}" font-family="Space Grotesk" font-size="25" font-weight="500" ` +
    `fill="${APAGADO}">estrenala.com</text>` +
    `</svg>`
  );
}
