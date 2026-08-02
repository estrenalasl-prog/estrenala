import { ALLOWED_IMAGE_EXTS } from "@/src/editor/validate-op";

// Imágenes DENTRO del cuerpo de un artículo, además de la portada. Un artículo de
// blog con una sola foto de cabecera se lee pobre, y son justo los artículos con
// los que el cliente espera posicionar.
//
// Van como assets normales (`/wc-uploads/<uuid>.<ext>`), la misma ruta que usa el
// editor de páginas para las imágenes que sustituye. Y esa ruta solo funciona en la
// web publicada porque los BYTES se copian dentro del snapshot: no hay una carpeta
// compartida de la que tiren todas las webs. Por eso existe `imagenesDelCuerpo`:
// para saber qué archivos hay que copiar al aplicar el blog.
//
// Si esa copia se olvidara, las imágenes se verían bien en la vista previa (que sí
// lee los assets del proyecto) y saldrían ROTAS en el blog del cliente. Ningún test
// lo detecta: hay que publicar y mirar.

const RE_ASSET = new RegExp(
  `/wc-uploads/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\\.(${ALLOWED_IMAGE_EXTS.join("|")})`,
  "gi"
);

export type ImagenCuerpo = { assetId: string; ext: string; ruta: string };

/**
 * Los assets que referencia el markdown, sin repetidos y en orden de aparición.
 *
 * Se busca por la RUTA y no por la sintaxis `![]()` a propósito: el usuario puede
 * escribir `<img src="...">` a mano dentro del markdown, y esa imagen también hay
 * que copiarla. Buscar la ruta cubre las dos formas.
 */
export function imagenesDelCuerpo(md: string): ImagenCuerpo[] {
  const vistos = new Set<string>();
  const out: ImagenCuerpo[] = [];
  for (const m of (md ?? "").matchAll(RE_ASSET)) {
    const assetId = m[1].toLowerCase();
    if (vistos.has(assetId)) continue;
    vistos.add(assetId);
    out.push({ assetId, ext: m[2].toLowerCase(), ruta: `/wc-uploads/${assetId}.${m[2].toLowerCase()}` });
  }
  return out;
}

/**
 * Mete una imagen en el markdown por donde esté el cursor, y devuelve dónde dejarlo
 * después.
 *
 * La imagen queda SIEMPRE en su propio párrafo, con una línea en blanco antes y
 * otra después. Si no, markdown la trata como parte del párrafo y sale metida en
 * mitad del texto en línea, que no es lo que quiere nadie al pulsar «insertar
 * imagen». Y si el cursor cae dentro de una palabra, se parte esa palabra: por eso
 * la inserción rompe línea aunque el sitio elegido esté a medias.
 *
 * El texto alternativo va escapado de `]`, que es lo único que cerraría el corchete
 * antes de tiempo y dejaría el markdown roto.
 */
export function insertarImagen(
  md: string,
  cursor: number,
  ruta: string,
  alt: string
): { md: string; cursor: number } {
  const texto = md ?? "";
  const pos = Math.max(0, Math.min(cursor, texto.length));
  const antes = texto.slice(0, pos);
  const despues = texto.slice(pos);

  const bloque = `![${(alt ?? "").replace(/[[\]]/g, "")}](${ruta})`;

  // Cuántos saltos hacen falta a cada lado para que quede en su propio párrafo.
  // Al principio del documento no se mete línea en blanco delante, y al final no
  // se deja de más: sobrarían y ensucian el markdown que luego el usuario lee.
  const faltanAntes = antes === "" ? "" : "\n\n".slice(0, 2 - saltosFinales(antes));
  const faltanDespues = despues === "" ? "\n" : "\n\n".slice(0, 2 - saltosIniciales(despues));

  const nuevo = antes + faltanAntes + bloque + faltanDespues + despues;
  return { md: nuevo, cursor: (antes + faltanAntes + bloque).length };
}

// Vivía aquí, pero le hace la misma falta al editor de páginas: una imagen recién
// subida tampoco está en el snapshot cuando el editor enseña cómo quedaría. Se
// mudó a `src/preview/rewrite.ts`, que es su sitio, y se reexporta para no
// obligar a quien ya la usaba a cambiar de puerta.
export { apuntarAssetsAlPanel } from "@/src/preview/rewrite";

function saltosFinales(s: string): number {
  const m = s.match(/\n{1,2}$/);
  return m ? m[0].length : 0;
}

function saltosIniciales(s: string): number {
  const m = s.match(/^\n{1,2}/);
  return m ? m[0].length : 0;
}
