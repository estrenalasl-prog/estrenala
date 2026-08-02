// Reescritura ligera, solo para el preview. NO muta el archivo almacenado.
// Limitación conocida (increment 1): no procesa `srcset` ni CSS en archivos .css
// externos (esos cargan por su propia ruta de preview y usan rutas relativas o se
// sirven tal cual). Cubre el caso mayoritario: src/href/url() root-absolutos.
export function rewriteHtml(html: string, baseHref: string): string {
  // 1) Reescribir src/href root-absolutos: un solo "/" no seguido de otro "/".
  let out = html.replace(
    /(\s(?:src|href)\s*=\s*["'])\/(?!\/)/gi,
    (_m, prefijo: string) => prefijo + baseHref
  );

  // 2) Reescribir url(/...) en estilos inline y <style>.
  out = out.replace(
    /url\(\s*(['"]?)\/(?!\/)/gi,
    (_m, comilla: string) => `url(${comilla}${baseHref}`
  );

  // 3) Inyectar <base> (después de reescribir, para no tocar su propia href).
  const baseTag = `<base href="${baseHref}">`;
  const headMatch = out.match(/<head[^>]*>/i);
  if (headMatch) {
    const idx = out.indexOf(headMatch[0]) + headMatch[0].length;
    return out.slice(0, idx) + baseTag + out.slice(idx);
  }
  return baseTag + out;
}

/**
 * Apunta las imágenes SUBIDAS al asset del proyecto, en vez de a la ruta que
 * tendrán en la web publicada.
 *
 * Hace falta porque una imagen recién subida todavía NO está dentro del snapshot
 * —sus bytes se copian ahí al guardar—, así que la ruta pública daría 404 y el
 * usuario vería un hueco roto justo cuando está comprobando si le gusta.
 *
 * Se aplica DESPUÉS de `rewriteHtml`, y por eso se come cualquier prefijo que
 * este le haya puesto delante: si se aplicara antes, `rewriteHtml` reescribiría
 * la ruta del panel y la dejaría apuntando a la nada.
 *
 * Vale para el blog y para el editor de páginas: los dos escriben la ruta pública
 * y los dos tienen que enseñar la imagen antes de que exista ahí.
 */
// Literal a propósito, NO `new RegExp` con plantilla: ahí `\s` se queda en `s` y
// `\.` en `.`, porque la plantilla se come la barra antes de que lo vea la
// expresión regular. Pasó al mover esta función: el patrón acabó diciendo
// «cualquier cosa menos la letra ese», paraba en la `s` de «projects» y dejaba
// medio prefijo sin sustituir. Compilaba, y solo lo cazó un test que comparaba la
// cadena entera.
const RE_ASSET_SUBIDO =
  /[^\s"'()]*\/wc-uploads\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([a-z0-9]{2,5})/gi;

export function apuntarAssetsAlPanel(html: string, projectId: string): string {
  return (html ?? "").replace(
    RE_ASSET_SUBIDO,
    (_m, id: string, ext: string) =>
      `/api/projects/${projectId}/assets/${id.toLowerCase()}.${ext.toLowerCase()}`
  );
}
