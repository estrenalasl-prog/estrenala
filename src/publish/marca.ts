// Marca «Hecho con Estrénala» de las webs del plan gratuito.
//
// Se inyecta AL SERVIR, no al publicar: así el día que alguien mejora de plan la
// marca desaparece al instante (sin republicar), y si cancela vuelve sola. El
// HTML guardado en el almacenamiento nunca se toca.
//
// Va con estilos EN LÍNEA y `all:initial` a propósito: el CSS de la web del
// cliente es desconocido y no queremos ni que nos rompa la insignia ni romperle
// nada a él. Sin clases genéricas, sin <style> global, sin JavaScript.

export const ID_MARCA = "estrenala-marca";
export const TEXTO_MARCA = "Hecho con Estrénala";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Protocolo relativo (//host) igual que la 404 pública: vale en local y en producción.
export function insigniaHtml(platformHost: string): string {
  const host = esc(platformHost);
  const base = "all:initial;box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const anchor = [
    base,
    "position:fixed;right:14px;bottom:14px;z-index:2147483000",
    "display:inline-flex;align-items:center;gap:7px",
    "padding:7px 12px;border-radius:999px",
    "background:#141509;color:#F5F6F1",
    "font-size:12.5px;font-weight:600;line-height:1;letter-spacing:-.01em",
    "text-decoration:none;cursor:pointer",
    "box-shadow:0 2px 10px -2px rgba(20,21,9,.35)",
  ].join(";");
  const punto = `${base};display:inline-block;width:7px;height:7px;border-radius:50%;background:#C4F000`;
  return (
    `<a id="${ID_MARCA}" href="//${host}/?ref=marca" target="_blank" rel="noopener noreferrer"` +
    ` aria-label="${TEXTO_MARCA}: publica tu web hecha con IA" style="${anchor}">` +
    `<span style="${punto}"></span>${TEXTO_MARCA}</a>`
  );
}

// Inserta la insignia justo antes del último </body>. Si el documento no lo
// tiene (HTML suelto o mal cerrado), la añade al final: el navegador la coloca
// igual. Idempotente: si ya está, devuelve el HTML tal cual.
export function conMarca(html: string, platformHost: string): string {
  if (html.includes(`id="${ID_MARCA}"`)) return html;
  const insignia = insigniaHtml(platformHost);
  const re = /<\/body\s*>/gi;
  let corte = -1;
  for (let m = re.exec(html); m; m = re.exec(html)) corte = m.index;
  return corte < 0 ? html + insignia : html.slice(0, corte) + insignia + html.slice(corte);
}
