import { hashDeterminista, luminancia } from "./colores";

// Portada SVG 1200×630 (proporción og:image): degradado con los colores del
// sitio, formas decorativas posicionadas por hash del título (determinista) y
// el título en grande. Desde 4f2 es un intermedio: se rasteriza a PNG (png.ts)
// con la Space Grotesk del repo antes de subirse; la pila de sistema queda de
// respaldo por si el SVG se abre suelto en un navegador.

const ANCHO = 1200;
const ALTO = 630;
const MAX_CHARS_LINEA = 24;
const MAX_LINEAS = 4;
const MARGEN_X = 80;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function trocearTitulo(titulo: string): string[] {
  const palabras = titulo.trim().split(/\s+/);
  const lineas: string[] = [];
  let actual = "";
  for (const p of palabras) {
    const candidata = actual ? `${actual} ${p}` : p;
    if (candidata.length <= MAX_CHARS_LINEA || !actual) actual = candidata;
    else { lineas.push(actual); actual = p; }
  }
  if (actual) lineas.push(actual);
  if (lineas.length > MAX_LINEAS) {
    const recortadas = lineas.slice(0, MAX_LINEAS);
    recortadas[MAX_LINEAS - 1] += "…";
    return recortadas;
  }
  return lineas;
}

export function generarSvgPortada(input: { titulo: string; sitio: string; colores: [string, string] }): string {
  const [c1, c2] = input.colores;
  const lineas = trocearTitulo(input.titulo);
  const tam = lineas.length <= 2 ? 72 : lineas.length === 3 ? 60 : 50;
  const alturaLinea = Math.round(tam * 1.2);
  const yInicial = Math.round((ALTO - lineas.length * alturaLinea) / 2 + tam * 0.85);
  const media = (luminancia(c1) + luminancia(c2)) / 2;
  const colorTexto = media > 150 ? "#111827" : "#ffffff";

  // Formas decorativas deterministas: mismas para el mismo título.
  const h = hashDeterminista(input.titulo);
  const cx1 = 880 + (h % 240);
  const cy1 = 60 + ((h >> 4) % 160);
  const cx2 = 60 + ((h >> 8) % 200);
  const cy2 = 480 + ((h >> 12) % 120);

  const tspans = lineas
    .map((l, i) => `<tspan x="${MARGEN_X}" y="${yInicial + i * alturaLinea}">${escapeXml(l)}</tspan>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>` +
    `</linearGradient></defs>` +
    `<rect width="${ANCHO}" height="${ALTO}" fill="url(#g)"/>` +
    `<circle cx="${cx1}" cy="${cy1}" r="280" fill="#ffffff" opacity="0.10"/>` +
    `<circle cx="${cx2}" cy="${cy2}" r="200" fill="#000000" opacity="0.08"/>` +
    `<circle cx="${cx1 - 320}" cy="${cy2 - 60}" r="8" fill="${colorTexto}" opacity="0.35"/>` +
    `<text font-family="'Space Grotesk', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" ` +
    `font-size="${tam}" font-weight="700" fill="${colorTexto}">${tspans}</text>` +
    `<text x="${MARGEN_X}" y="${ALTO - 48}" font-family="'Space Grotesk', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" ` +
    `font-size="26" font-weight="500" fill="${colorTexto}" opacity="0.85">${escapeXml(input.sitio)}</text>` +
    `</svg>`;
}
