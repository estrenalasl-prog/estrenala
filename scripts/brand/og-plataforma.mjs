// Genera la tarjeta que se ve al compartir estrenala.com (og:image, 1200×630).
//
// Se ejecuta A MANO y el PNG resultante se commitea: no cambia salvo que cambie
// la marca, y así no hay nada que rasterizar en producción.
//   node scripts/brand/og-plataforma.mjs
//
// Reutiliza el mismo rasterizador que las portadas del blog (resvg + la Space
// Grotesk del repo, NUNCA las fuentes del sistema): mismos bytes en cualquier
// máquina. El logo va incrustado en el SVG como data URI.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initWasm, Resvg } from "@resvg/resvg-wasm";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FUENTES = path.join(RAIZ, "src", "blog", "portada", "fuentes");
const SALIDA = path.join(RAIZ, "public", "brand", "og.png");

// Tokens del sistema visual (docs/design/01-tokens.md).
const LIENZO = "#F5F6F1";
const TEXTO = "#141509";
const TEXTO_2 = "#55584C";
const ACENTO = "#C4F000";
const ACENTO_TEXTO = "#5E7300";

const logo = readFileSync(path.join(RAIZ, "public", "brand", "logo-tinta.png")).toString("base64");

// COMPOSICIÓN CENTRADA, y no por gusto: WhatsApp no enseña la tarjeta entera,
// la RECORTA A UN CUADRADO por el centro (visto el 2026-07-29 con la primera
// versión, que iba alineada a la izquierda: el recorte se comió el logo y dejó
// un trozo de texto suelto). En 1200×630 ese cuadrado es la franja x=285..915,
// así que TODO lo que se entienda tiene que caber ahí dentro.
//
// X, LinkedIn y Slack sí la enseñan entera en 1200×630, que es el tamaño
// estándar: por eso no se cambia el lienzo, solo dónde vive el contenido.
const CENTRO = 600;

// Y POCO TEXTO, Y GRANDE. WhatsApp Web no enseña la tarjeta a tamaño completo:
// la mete en una miniatura de ~80 px de lado. Ahí un texto de 50 px del original
// acaba midiendo 3 px: ilegible, se ponga como se ponga.
//
// La clave es que en esa vista WhatsApp YA enseña el título y la descripción
// como texto de verdad, perfectamente legibles, al lado de la miniatura. O sea
// que la imagen no tiene que contar nada: tiene que ser RECONOCIBLE. Por eso
// manda el logo, a lo grande, y sobra todo lo demás — la dirección la escribe
// WhatsApp sola debajo, y el subtítulo solo era ruido.
//
// A tamaño completo (X, LinkedIn, WhatsApp del móvil) el reclamo sigue estando.

// El logo original es 460×115 (proporción 4:1 exacta). A 620 de ancho ocupa
// x=290..910, justo dentro del cuadrado central seguro (285..915).
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${LIENZO}"/>
  <image href="data:image/png;base64,${logo}" x="290" y="158" width="620" height="155"/>
  <g font-family="Space Grotesk" fill="${TEXTO}" font-weight="700" font-size="46"
     letter-spacing="-1.2" text-anchor="middle">
    <text x="${CENTRO}" y="424">Tu web hecha con IA,</text>
    <text x="${CENTRO}" y="482">por fin en directo.</text>
  </g>
  <rect x="0" y="614" width="1200" height="16" fill="${ACENTO}"/>
</svg>`;

await initWasm(readFileSync(path.join(RAIZ, "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm")));
const r = new Resvg(svg, {
  font: {
    fontBuffers: [
      readFileSync(path.join(FUENTES, "SpaceGrotesk-Bold.ttf")),
      readFileSync(path.join(FUENTES, "SpaceGrotesk-Medium.ttf")),
    ],
    defaultFontFamily: "Space Grotesk",
  },
});
const png = Buffer.from(r.render().asPng());
writeFileSync(SALIDA, png);
console.log(`✔ ${path.relative(RAIZ, SALIDA)} — 1200×630, ${(png.length / 1024).toFixed(0)} kB`);
