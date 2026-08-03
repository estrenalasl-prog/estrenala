import { textosPublico } from "@/src/i18n/publico";
import type { Idioma } from "@/src/i18n/idiomas";

/**
 * La página que ve quien acaba de enviar el formulario de una web de cliente.
 *
 * Va en el idioma del VISITANTE y no en el de la página, al revés que el sello.
 * Aquí ya no estamos dentro del documento del cliente —esto es una página
 * nuestra, servida desde su dominio— así que no hay nada con lo que desentonar, y
 * lo único que se sabe de quien está leyendo es lo que dice su navegador.
 *
 * Autocontenida y sin assets externos, como la 404: se sirve desde el dominio del
 * cliente, donde nuestros archivos no existen.
 */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function paginaGracias(idioma: Idioma, volverA: string): string {
  const t = textosPublico(idioma).gracias;
  const volver = esc(volverA);
  return `<!doctype html>
<html lang="${idioma}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.titulo)}</title><meta name="robots" content="noindex">
<style>
:root{--lienzo:#F5F6F1;--superficie:#FFF;--borde:#DEDFD6;--texto:#141509;--texto-2:#55584C;
--acento:#C4F000;--acento-texto:#5E7300;--sans:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
*{box-sizing:border-box}html,body{height:100%}
body{margin:0;background:var(--lienzo);color:var(--texto);font:16px/1.6 var(--sans);
display:grid;place-items:center;padding:24px;-webkit-font-smoothing:antialiased}
.caja{max-width:440px;text-align:center}
.marca-ok{width:64px;height:64px;border-radius:18px;background:var(--texto);color:var(--acento);
display:grid;place-items:center;margin:0 auto 24px}
.marca-ok svg{width:30px;height:30px}
h1{font-size:27px;font-weight:700;letter-spacing:-.03em;margin:0 0 10px;line-height:1.2;text-wrap:balance}
p{color:var(--texto-2);margin:0 0 26px;text-wrap:pretty}
a{display:inline-flex;align-items:center;justify-content:center;height:46px;padding:0 22px;
border-radius:9px;background:var(--acento);color:var(--texto);font:600 15px var(--sans);text-decoration:none}
a:hover{background:#B4E000}
</style></head><body>
<div class="caja">
<div class="marca-ok"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 12.5l5.5 5.5L20.5 6.5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
<h1>${esc(t.titulo)}</h1>
<p>${esc(t.texto)}</p>
<a href="${volver}">${esc(t.volver)}</a>
</div>
</body></html>`;
}
