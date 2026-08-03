import { detectarFormularios, type FormularioDetectado } from "./detectar";

/**
 * Conectar los formularios muertos de una web AL SERVIRLA.
 *
 * Mismo mecanismo que el sello: el HTML guardado no se toca nunca. Así el dueño
 * puede apagar la recogida y su web vuelve a estar exactamente como la subió, sin
 * republicar y sin que le hayamos reescrito su archivo.
 *
 * Se edita por POSICIONES sobre el fuente, no re-serializando el documento. Pasar
 * la web de un cliente por un serializador es reescribírsela entera: comillas,
 * mayúsculas de las etiquetas, entidades, espacios… todo cambia, y cualquier
 * diferencia es un fallo nuestro en una web que funcionaba.
 */

/** La dirección donde caen los envíos. Vive bajo un prefijo que nadie va a usar. */
export const RUTA_ENVIO = "/__estrenala/formulario";

/** El campo trampa. Un humano no lo ve; un robot lo rellena porque rellena todo. */
export const CAMPO_TRAMPA = "estrenala_no_rellenar";

/** En qué página se envió. Hace falta para saber qué formulario es cuál. */
export const CAMPO_PAGINA = "estrenala_pagina";

/** Cuál de los formularios de esa página. */
export const CAMPO_INDICE = "estrenala_form";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Los campos ocultos que se meten justo después de `<form …>`.
 *
 * La trampa va con `position:absolute;left:-9999px` y no con `display:none`: hay
 * robots que se saltan lo que está en `display:none` justamente porque saben que
 * suele ser una trampa. Y lleva `tabindex="-1"` y `autocomplete="off"` para que
 * ni el tabulador ni el autorrelleno del navegador se la encuentren — si el
 * navegador la rellenara solo, tiraríamos el mensaje de una persona real.
 */
function ocultos(pagina: string, indice: number): string {
  return (
    `<input type="hidden" name="${CAMPO_PAGINA}" value="${esc(pagina)}">` +
    `<input type="hidden" name="${CAMPO_INDICE}" value="${indice}">` +
    `<div style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden" aria-hidden="true">` +
    `<label>No rellenar<input type="text" name="${CAMPO_TRAMPA}" tabindex="-1" autocomplete="off" value=""></label>` +
    `</div>`
  );
}

type Edicion = { start: number; end: number; texto: string };

/**
 * Reescribe un atributo si está, y lo añade al final de la etiqueta si no.
 *
 * `attrLocations` da el rango del atributo ENTERO (`action="x"`), así que
 * sustituirlo es cambiar ese trozo. Para añadir se mete justo antes del `>`, que
 * es `startTagEnd - 1` salvo en las etiquetas que se cierran solas — un `<form>`
 * nunca lo hace, así que aquí es siempre así.
 */
function ponerAtributo(f: FormularioDetectado, nombre: string, valor: string): Edicion {
  const sitio = f.attrLocations[nombre];
  const texto = `${nombre}="${esc(valor)}"`;
  if (sitio) return { start: sitio.start, end: sitio.end, texto };
  return { start: f.startTagEnd - 1, end: f.startTagEnd - 1, texto: ` ${texto}` };
}

/**
 * @param pagina La ruta pública en la que se está sirviendo (`/contacto.html`).
 * @returns El HTML con los formularios muertos apuntando a la plataforma, y
 *          cuántos se han conectado.
 */
export function conFormulariosConectados(
  html: string,
  pagina: string
): { html: string; conectados: number } {
  const muertos = detectarFormularios(html).filter((f) => f.estado === "muerto" && f.campos.length > 0);
  if (muertos.length === 0) return { html, conectados: 0 };

  const ediciones: Edicion[] = [];
  for (const f of muertos) {
    ediciones.push(ponerAtributo(f, "action", RUTA_ENVIO));
    ediciones.push(ponerAtributo(f, "method", "post"));
    // Un `enctype` de subida de archivos no lo admitimos: se quita para que el
    // navegador mande el formulario normal y corriente.
    if (f.attrLocations.enctype) {
      ediciones.push(ponerAtributo(f, "enctype", "application/x-www-form-urlencoded"));
    }
    ediciones.push({ start: f.startTagEnd, end: f.startTagEnd, texto: ocultos(pagina, f.indice) });
  }

  // De atrás hacia delante: así cada corte usa posiciones que todavía son las del
  // fuente original. De delante hacia atrás, la primera edición desplaza todas las
  // demás y a partir de la segunda se estaría cortando por donde no es.
  ediciones.sort((a, b) => b.start - a.start);
  let salida = html;
  for (const e of ediciones) salida = salida.slice(0, e.start) + e.texto + salida.slice(e.end);

  return { html: salida, conectados: muertos.length };
}
