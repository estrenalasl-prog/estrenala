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
