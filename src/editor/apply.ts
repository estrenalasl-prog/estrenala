import { walkElementsInOrder, type WalkedElement } from "./walk";
import { mergeStyleProperty } from "./style";
import { sanitizeInline } from "./sanitize-inline";

/** Dónde va una imagen nueva respecto al elemento elegido. */
export type PosicionImagen = "antes" | "despues";

export type EditOp =
  | { page: string; nodeId: number; kind: "text"; value: string }
  | { page: string; nodeId: number; kind: "richText"; value: string }
  | { page: string; nodeId: number; kind: "href"; value: string }
  | { page: string; nodeId: number; kind: "src"; value: string; assetId: string }
  | { page: string; nodeId: number; kind: "insertImage"; value: string; assetId: string; alt: string; posicion: PosicionImagen }
  | { page: string; nodeId: number; kind: "align"; value: Alineacion }
  | { page: string; nodeId: number; kind: "style"; property: "color"; value: string }
  | { page: string; nodeId: number; kind: "textNode"; index: number; value: string };

// Op por página (sin `page`, sin `assetId`): lo que recibe applyEdits.
export type PageOp =
  | { nodeId: number; kind: "text"; value: string }
  | { nodeId: number; kind: "richText"; value: string }
  | { nodeId: number; kind: "href"; value: string }
  | { nodeId: number; kind: "src"; value: string }
  | { nodeId: number; kind: "insertImage"; value: string; alt: string; posicion: PosicionImagen }
  | { nodeId: number; kind: "align"; value: Alineacion }
  | { nodeId: number; kind: "style"; property: "color"; value: string }
  | { nodeId: number; kind: "textNode"; index: number; value: string };

/**
 * Alinear una imagen. El cliente manda la INTENCIÓN, no el CSS: así el navegador
 * no puede colar declaraciones raras en el atributo `style` de la página de nadie,
 * y el día que haya que cambiar cómo se centra una imagen se cambia en un sitio.
 *
 * Se traduce a márgenes automáticos, que es lo que centra un bloque. `display:
 * block` va incluido porque sin él los márgenes automáticos no hacen nada: una
 * imagen es en línea por defecto, y ese es el motivo por el que «centrar» parece
 * no funcionar en medio internet.
 */
export type Alineacion = "izquierda" | "centro" | "derecha";

const MARGENES: Record<Alineacion, [string, string]> = {
  izquierda: ["0", "auto"],
  centro: ["auto", "auto"],
  derecha: ["auto", "0"],
};

export function escapeHtmlText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Valor entre comillas dobles: basta con &, " y <.
export function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * El `<img>` que se inserta en la página del cliente.
 *
 * Lleva estilo en línea a propósito: se está metiendo una imagen dentro del diseño
 * de otro, del que no sabemos nada. Sin `max-width:100%` una foto de 4000px de
 * ancho revienta la maqueta en el móvil, y eso lo vería el visitante, no el
 * dueño. `display:block` quita el hueco que deja la línea base debajo de una
 * imagen en línea, que es la rareza que hace pensar «esto ha quedado torcido».
 *
 * `loading="lazy"` porque estas imágenes van dentro de la página, no de cabecera:
 * no hay motivo para que retrasen la primera pintada.
 */
function imgHtml(src: string, alt: string): string {
  return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" style="max-width:100%;height:auto;display:block">`;
}

type Edit = { start: number; end: number; text: string };

function pushAttrEdit(edits: Edit[], el: WalkedElement, name: string, value: string, replacedAttrs: Set<string>): void {
  const text = `${name}="${escapeAttr(value)}"`;
  const loc = el.attrLocations[name];
  if (loc) {
    edits.push({ start: loc.start, end: loc.end, text });
  } else {
    let at = el.startTagStart + 1 + el.tagName.length; // tras "<tag"
    // Insert after any attributes being replaced in this batch
    for (const attr of replacedAttrs) {
      const loc = el.attrLocations[attr];
      if (loc && loc.end > at) at = loc.end;
    }
    edits.push({ start: at, end: at, text: " " + text });
  }
}

export function applyEdits(html: string, ops: PageOp[]): string {
  const byId = new Map(walkElementsInOrder(html).map((e) => [e.id, e]));
  // dedup: la última op por (nodeId, kind, property) gana
  const dedup = new Map<string, PageOp>();
  for (const op of ops) {
    // Las imágenes NUEVAS se distinguen por cuál es y dónde va: si no, meter dos
    // fotos distintas debajo del mismo párrafo dejaría solo la última. Mandar la
    // misma otra vez al mismo sitio sí se colapsa, que es lo que se quiere.
    const extra =
      op.kind === "style" ? op.property
        : op.kind === "textNode" ? String(op.index)
        : op.kind === "insertImage" ? `${op.posicion}#${op.value}`
        : "";
    dedup.set(`${op.nodeId}#${op.kind}#${extra}`, op);
  }
  // Exclusión mutua text/textNode por nodo: en un nodo hoja, el rango de su único
  // nodo de texto coincide con el rango de contenido de la op "text" clásica — si
  // ambas llegaran en el mismo lote, sus edits solaparían y corromperían el HTML.
  // Gana la más específica (textNode).
  const nodosConTextNode = new Set<number>();
  for (const op of dedup.values()) if (op.kind === "textNode") nodosConTextNode.add(op.nodeId);
  // richText y text sobre el mismo nodo hoja escribirían el mismo rango: gana la
  // rica (formato en línea). También excluye la text clásica.
  const nodosConRichText = new Set<number>();
  for (const op of dedup.values()) if (op.kind === "richText") nodosConRichText.add(op.nodeId);
  // Un atributo NUEVO se inserta tras el tramo de cualquier atributo que se
  // esté REEMPLAZANDO en el mismo nodo: así los reemplazados conservan su
  // posición original y los nuevos quedan después (orden determinista). El
  // orden de atributos es irrelevante para HTML; esto solo fija el resultado.
  const replacedAttrsPerNode = new Map<number, Set<string>>();
  for (const op of dedup.values()) {
    const el = byId.get(op.nodeId);
    if (!el) continue;
    if (op.kind === "href" && el.attrLocations["href"]) {
      const s = replacedAttrsPerNode.get(op.nodeId) ?? new Set();
      s.add("href");
      replacedAttrsPerNode.set(op.nodeId, s);
    } else if (op.kind === "src" && el.attrLocations["src"]) {
      const s = replacedAttrsPerNode.get(op.nodeId) ?? new Set();
      s.add("src");
      replacedAttrsPerNode.set(op.nodeId, s);
    } else if ((op.kind === "style" || op.kind === "align") && el.attrLocations["style"]) {
      const s = replacedAttrsPerNode.get(op.nodeId) ?? new Set();
      s.add("style");
      replacedAttrsPerNode.set(op.nodeId, s);
    }
  }

  // El color y la alineación escriben el MISMO atributo `style`. Si cada op
  // empujara su propio tramo, serían dos ediciones sobre el mismo rango de bytes y
  // el HTML saldría corrupto. Se funden todas en una cadena por nodo y se escribe
  // una sola vez, más abajo.
  const estiloPorNodo = new Map<number, string>();
  for (const op of dedup.values()) {
    if (op.kind !== "style" && op.kind !== "align") continue;
    const el = byId.get(op.nodeId);
    if (!el) continue;
    let s = estiloPorNodo.get(op.nodeId) ?? el.attrs.style ?? "";
    if (op.kind === "style") {
      s = mergeStyleProperty(s, op.property, op.value);
    } else {
      const [ml, mr] = MARGENES[op.value];
      s = mergeStyleProperty(s, "display", "block");
      s = mergeStyleProperty(s, "margin-left", ml);
      s = mergeStyleProperty(s, "margin-right", mr);
    }
    estiloPorNodo.set(op.nodeId, s);
  }
  const edits: Edit[] = [];
  for (const op of dedup.values()) {
    const el = byId.get(op.nodeId);
    if (!el) continue;
    const replacedAttrs = replacedAttrsPerNode.get(op.nodeId) ?? new Set();
    if (op.kind === "text") {
      if (el.textoExcluido) continue;
      if (nodosConTextNode.has(op.nodeId)) continue;
      if (nodosConRichText.has(op.nodeId)) continue;
      if (el.hasElementChildren) continue;
      if (el.endTagStart == null) continue;
      edits.push({ start: el.startTagEnd, end: el.endTagStart, text: escapeHtmlText(op.value) });
    } else if (op.kind === "richText") {
      // Sustituye TODO el contenido interno por el fragmento saneado. A
      // diferencia de "text", admite hijos de formato en línea (no se salta por
      // hasElementChildren) y no escapa: sanea (lista blanca re-serializada).
      if (el.textoExcluido) continue;
      if (nodosConTextNode.has(op.nodeId)) continue;
      if (el.endTagStart == null) continue;
      edits.push({ start: el.startTagEnd, end: el.endTagStart, text: sanitizeInline(op.value) });
    } else if (op.kind === "href") {
      pushAttrEdit(edits, el, "href", op.value, replacedAttrs);
    } else if (op.kind === "src") {
      pushAttrEdit(edits, el, "src", op.value, replacedAttrs);
    } else if (op.kind === "insertImage") {
      // Imagen NUEVA, como hermana del elemento elegido. A diferencia de "src",
      // que solo cambia una que ya estaba, aquí se añade HTML al documento: por
      // eso lleva sus propias guardas.
      //
      // Nada de meterla dentro de <head>, <script>, <style>, <svg> o <math>:
      // `textoExcluido` marca esos subárboles enteros. Y nada de colgarla de
      // <html>, <head> o <body>, porque «antes de <html>» la dejaría fuera del
      // documento y «antes de <body>» dentro del <head>.
      if (el.textoExcluido) continue;
      if (["html", "head", "body"].includes(el.tagName)) continue;
      // `endTagEnd` es null en los elementos sin cierre (<img>, <br>, <hr>): ahí
      // el final del elemento ES el final de su etiqueta de apertura.
      const at = op.posicion === "antes" ? el.startTagStart : (el.endTagEnd ?? el.startTagEnd);
      edits.push({ start: at, end: at, text: imgHtml(op.value, op.alt) });
    } else if (op.kind === "textNode") {
      if (el.textoExcluido) continue;
      const t = el.textNodes.find((x) => x.index === op.index);
      if (!t) continue;
      edits.push({ start: t.start, end: t.end, text: escapeHtmlText(op.value) });
    }
    // `style` y `align` no se tratan aquí: ya se fundieron arriba en una sola
    // cadena por nodo, y se escriben en el bucle siguiente.
  }

  for (const [nodeId, valor] of estiloPorNodo) {
    const el = byId.get(nodeId);
    if (!el) continue;
    pushAttrEdit(edits, el, "style", valor, replacedAttrsPerNode.get(nodeId) ?? new Set());
  }
  // Orden descendente por offset. Los tramos de atributos viven dentro del
  // start-tag y el de contenido tras él → no se solapan; dos inserciones en el
  // mismo punto se aplican ambas (ambos atributos quedan presentes).
  edits.sort((a, b) => b.start - a.start);
  let out = html;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}
