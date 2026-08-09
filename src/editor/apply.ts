import { walkElementsInOrder, type WalkedElement } from "./walk";
import { mergeStyleProperty, quitarStyleProperty } from "./style";
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
  | { page: string; nodeId: number; kind: "textAlign"; value: Alineacion }
  | { page: string; nodeId: number; kind: "size"; value: number }
  | { page: string; nodeId: number; kind: "margen"; value: number; lado?: LadoMargen }
  | { page: string; nodeId: number; kind: "recuadro"; value: Recuadro }
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
  | { nodeId: number; kind: "textAlign"; value: Alineacion }
  | { nodeId: number; kind: "size"; value: number }
  | { nodeId: number; kind: "margen"; value: number; lado?: LadoMargen }
  | { nodeId: number; kind: "recuadro"; value: Recuadro }
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

export const MARGENES: Record<Alineacion, [string, string]> = {
  izquierda: ["0", "auto"],
  centro: ["auto", "auto"],
  derecha: ["auto", "0"],
};

/**
 * Alinear el TEXTO de un bloque. Es otra cosa que alinear el bloque: `MARGENES`
 * mueve la caja dentro de su hueco (lo que quiere una imagen), y esto mueve las
 * letras dentro de la caja (lo que quiere un párrafo). Se separan porque mezclarlas
 * hacía que «centrar» un título le pusiera `display:block` y lo sacara de su fila.
 */
export const TEXT_ALIGN: Record<Alineacion, string> = {
  izquierda: "left",
  centro: "center",
  derecha: "right",
};

/**
 * Ancho de la imagen, en tanto por ciento de su hueco.
 *
 * Va de la mano de la alineación y no es un adorno: una foto normal es más ancha
 * que la columna donde cae, así que se queda al 100% y **alinearla no mueve
 * nada** —no sobra espacio que repartir—. El botón parece roto cuando en realidad
 * está haciendo su trabajo. Le pasó a Sebas el 2026-08-02, y por eso el tamaño
 * llegó después: se ve al usarlo, no al escribirlo.
 *
 * Es un NÚMERO y no cuatro botones con nombre. Empezó siendo
 * «Pequeña/Mediana/Grande», y Sebas: «no parece profesional». Tenía razón: poner
 * nombres a los tamaños es no atreverse a dar la cifra, y obliga a que uno de los
 * cuatro sea el que quiere. Con una barra y su número al lado, el que quiere es
 * siempre el suyo.
 */
export const ANCHO_MIN = 10;
export const ANCHO_MAX = 100;

/** Aire por ARRIBA y por ABAJO, en píxeles. Sebas: «que no queden tan pegadas». */
export const MARGEN_MIN = 0;
export const MARGEN_MAX = 120;

/**
 * Qué lado del margen toca la op.
 *
 * Las imágenes lo mueven con un solo control («ambos»): una foto centrada quiere
 * el mismo aire arriba que abajo, y dos barras para eso son dos decisiones donde
 * había una. En los textos no: el hueco que se quiere abrir casi siempre está a
 * un lado —un título despegado del párrafo de arriba, un párrafo separado de la
 * foto de abajo— y un control único obliga a mover el otro lado también.
 *
 * Sigue sin haber izquierda y derecha: esos los usa la alineación (`MARGENES`), y
 * si el margen también los tocara, subirlo descentraría la foto que el usuario
 * acaba de centrar. Dos controles no pueden pelearse por la misma propiedad.
 */
export type LadoMargen = "ambos" | "arriba" | "abajo";

const PROPIEDADES_MARGEN: Record<LadoMargen, string[]> = {
  ambos: ["margin-top", "margin-bottom"],
  arriba: ["margin-top"],
  abajo: ["margin-bottom"],
};

/**
 * Los recuadros.
 *
 * Se mandan por NOMBRE, igual que la alineación: el navegador dice «suave» y el
 * servidor decide qué CSS es eso. Así no hay forma de colar declaraciones en la
 * página de nadie, y el día que un recuadro se vea mal se arregla en un sitio.
 *
 * Los tres colores son grises y `currentColor` a propósito. Un recuadro con el
 * lima de Estrénala se vería precioso aquí y fuera de sitio en la web del
 * cliente, que tiene su propia paleta: el editor no le mete a nadie nuestros
 * colores. Un gris al 10% se ve tanto sobre fondo claro como sobre fondo oscuro,
 * y `currentColor` toma el color del texto que ya hay, así que la barra lateral
 * combina siempre, sin saber nada de la web.
 */
export type Recuadro = "ninguno" | "suave" | "borde" | "lateral";

/**
 * Las propiedades que son PROPIEDAD del recuadro. Poner uno las borra todas y
 * escribe las suyas; «ninguno» las borra y no escribe nada.
 *
 * Se borran en vez de ponerse a cero porque un `padding: 0` no es «sin recuadro»:
 * es un cero pisando el relleno que la hoja de estilos de la web ya le daba a ese
 * elemento. Al borrarlas, vuelve a mandar el diseño original.
 *
 * Van también las formas abreviadas y las largas (`padding` y `padding-top`): si
 * solo se quitara la abreviada, un `padding-left` que hubiera quedado suelto se
 * sumaría al recuadro siguiente y nadie entendería de dónde sale.
 */
export const PROPIEDADES_RECUADRO = [
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "background", "background-color",
  "border", "border-top", "border-right", "border-bottom", "border-left",
  "border-width", "border-style", "border-color", "border-radius",
] as const;

export const RECUADROS: Record<Recuadro, ReadonlyArray<readonly [string, string]>> = {
  ninguno: [],
  suave: [
    ["background-color", "rgba(128,128,128,.10)"],
    ["border-radius", "12px"],
    ["padding", "18px 20px"],
  ],
  borde: [
    ["border", "1px solid rgba(128,128,128,.35)"],
    ["border-radius", "12px"],
    ["padding", "18px 20px"],
  ],
  lateral: [
    ["border-left", "3px solid currentColor"],
    ["padding", "4px 0 4px 16px"],
  ],
};

export function enteroEnRango(v: unknown, min: number, max: number): boolean {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}

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

/**
 * Las ops que escriben el atributo `style`. Están juntas porque comparten
 * destino: si cada una empujara su propio tramo de bytes, dos de ellas sobre el
 * mismo nodo producirían dos ediciones del mismo rango y el HTML saldría roto.
 * Se funden en una cadena y se escribe una vez.
 */
const KINDS_DE_ESTILO = ["style", "align", "textAlign", "size", "margen", "recuadro"] as const;

function esOpDeEstilo(op: PageOp): op is Extract<PageOp, { kind: (typeof KINDS_DE_ESTILO)[number] }> {
  return (KINDS_DE_ESTILO as readonly string[]).includes(op.kind);
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
    // El lado entra en la clave: «aire arriba» y «aire abajo» son la misma op
    // sobre el mismo nodo, y sin distinguirlas la segunda borraría la primera.
    const extra =
      op.kind === "style" ? op.property
        : op.kind === "textNode" ? String(op.index)
        : op.kind === "insertImage" ? `${op.posicion}#${op.value}`
        : op.kind === "margen" ? (op.lado ?? "ambos")
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
    } else if (esOpDeEstilo(op) && el.attrLocations["style"]) {
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
    if (!esOpDeEstilo(op)) continue;
    const el = byId.get(op.nodeId);
    if (!el) continue;
    let s = estiloPorNodo.get(op.nodeId) ?? el.attrs.style ?? "";
    if (op.kind === "style") {
      s = mergeStyleProperty(s, op.property, op.value);
    } else if (op.kind === "align") {
      const [ml, mr] = MARGENES[op.value];
      s = mergeStyleProperty(s, "display", "block");
      s = mergeStyleProperty(s, "margin-left", ml);
      s = mergeStyleProperty(s, "margin-right", mr);
    } else if (op.kind === "textAlign") {
      // Alinear el TEXTO dentro del bloque, que no es lo mismo que alinear el
      // bloque (`align`, para imágenes). Aquí no se toca `display`: ponerlo en
      // bloque sacaría el elemento de la fila donde estaba.
      s = mergeStyleProperty(s, "text-align", TEXT_ALIGN[op.value]);
    } else if (op.kind === "size") {
      // `height: auto` va siempre: sin él, cambiar solo el ancho deforma la foto.
      s = mergeStyleProperty(s, "display", "block");
      s = mergeStyleProperty(s, "width", op.value + "%");
      s = mergeStyleProperty(s, "height", "auto");
    } else if (op.kind === "recuadro") {
      for (const prop of PROPIEDADES_RECUADRO) s = quitarStyleProperty(s, prop);
      for (const [prop, valor] of RECUADROS[op.value]) s = mergeStyleProperty(s, prop, valor);
    } else {
      const sep = `${op.value}px`;
      for (const prop of PROPIEDADES_MARGEN[op.lado ?? "ambos"]) s = mergeStyleProperty(s, prop, sep);
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
