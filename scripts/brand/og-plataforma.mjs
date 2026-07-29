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
// SOLO LA MARCA, SIN TEXTO. Y no es pereza: es la única salida.
//
// WhatsApp mete la tarjeta en una miniatura de ~80 px de lado —comprobado el
// 2026-07-29 en la app del móvil y en la web: las dos igual—, y ahí un texto de
// 46 px del original acaba midiendo 3 px. No hay diseño que lo arregle: solo
// añade un borrón debajo del logo.
//
// Y no se pierde nada al quitarlo, porque WhatsApp YA escribe al lado, como
// texto de verdad y perfectamente legible, el título («Estrénala — Tu web hecha
// con IA, por fin en directo»), la descripción y la dirección. Repetirlo dentro
// de la imagen era decir dos veces lo mismo, una de ellas ilegible.
//
// Así que la imagen hace lo único que una miniatura puede hacer: que te suene
// de qué marca es. A tamaño completo (X, LinkedIn) queda una tarjeta de marca
// limpia, que es exactamente lo que es.

// El logo original es 460×115 (proporción 4:1 exacta). A 570 de ancho ocupa
// x=315..885: llena el cuadrado seguro (285..915) dejando 30 de aire a cada
// lado, que en la miniatura son ~4 px. Más grande tocaría los bordes; el PNG de
// marca viene recortado a su contenido y no trae margen propio.
// La `y` lo centra en vertical, subido un pelo para compensar la barra de abajo.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${LIENZO}"/>
  <image href="data:image/png;base64,${logo}" x="315" y="236" width="570" height="143"/>
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
