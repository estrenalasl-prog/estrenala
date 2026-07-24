import { promises as fs } from "fs";
import path from "path";
import { initWasm, Resvg } from "@resvg/resvg-wasm";

// Rasteriza el SVG de portada a PNG (WhatsApp/X no muestran SVG en og:image).
// WASM puro —sin binarios nativos— y SOLO las fuentes del repo (nunca las del
// sistema): mismos bytes en Windows (dev) y en el Docker de producción, donde
// no hay ninguna fuente instalada. Los archivos leídos aquí están declarados
// en outputFileTracingIncludes (next.config.ts) por el output standalone.

const DIR_FUENTES = path.join(process.cwd(), "src", "blog", "portada", "fuentes");
// Ruta calculada a mano y no con require.resolve: si el bundler la ve como
// import intenta procesar el .wasm y revienta («Can't resolve 'wbg'»).
const RUTA_WASM = path.join(process.cwd(), "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm");

let listo: Promise<Buffer[]> | null = null;

// Init una sola vez por proceso (initWasm falla si se repite); si fallara,
// se suelta la promesa para poder reintentar en la siguiente llamada.
function preparar(): Promise<Buffer[]> {
  if (!listo) {
    listo = (async () => {
      await initWasm(await fs.readFile(RUTA_WASM));
      return Promise.all([
        fs.readFile(path.join(DIR_FUENTES, "SpaceGrotesk-Bold.ttf")),
        fs.readFile(path.join(DIR_FUENTES, "SpaceGrotesk-Medium.ttf")),
      ]);
    })();
    listo.catch(() => { listo = null; });
  }
  return listo;
}

export async function rasterizarPortadaPng(svg: string): Promise<Buffer> {
  const fuentes = await preparar();
  const r = new Resvg(svg, {
    font: { fontBuffers: fuentes, defaultFontFamily: "Space Grotesk" },
  });
  return Buffer.from(r.render().asPng());
}
