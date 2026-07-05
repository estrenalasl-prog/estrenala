import { walkElementsInOrder, type WalkedElement } from "./walk";
import { mergeStyleProperty } from "./style";

export type EditOp =
  | { page: string; nodeId: number; kind: "text"; value: string }
  | { page: string; nodeId: number; kind: "href"; value: string }
  | { page: string; nodeId: number; kind: "src"; value: string; assetId: string }
  | { page: string; nodeId: number; kind: "style"; property: "color"; value: string }
  | { page: string; nodeId: number; kind: "textNode"; index: number; value: string };

// Op por página (sin `page`, sin `assetId`): lo que recibe applyEdits.
export type PageOp =
  | { nodeId: number; kind: "text"; value: string }
  | { nodeId: number; kind: "href"; value: string }
  | { nodeId: number; kind: "src"; value: string }
  | { nodeId: number; kind: "style"; property: "color"; value: string }
  | { nodeId: number; kind: "textNode"; index: number; value: string };

export function escapeHtmlText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Valor entre comillas dobles: basta con &, " y <.
export function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
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
    const extra = op.kind === "style" ? op.property : op.kind === "textNode" ? String(op.index) : "";
    dedup.set(`${op.nodeId}#${op.kind}#${extra}`, op);
  }
  // Exclusión mutua text/textNode por nodo: en un nodo hoja, el rango de su único
  // nodo de texto coincide con el rango de contenido de la op "text" clásica — si
  // ambas llegaran en el mismo lote, sus edits solaparían y corromperían el HTML.
  // Gana la más específica (textNode).
  const nodosConTextNode = new Set<number>();
  for (const op of dedup.values()) if (op.kind === "textNode") nodosConTextNode.add(op.nodeId);
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
    } else if (op.kind === "style" && el.attrLocations["style"]) {
      const s = replacedAttrsPerNode.get(op.nodeId) ?? new Set();
      s.add("style");
      replacedAttrsPerNode.set(op.nodeId, s);
    }
  }
  const edits: Edit[] = [];
  for (const op of dedup.values()) {
    const el = byId.get(op.nodeId);
    if (!el) continue;
    const replacedAttrs = replacedAttrsPerNode.get(op.nodeId) ?? new Set();
    if (op.kind === "text") {
      if (el.textoExcluido) continue;
      if (nodosConTextNode.has(op.nodeId)) continue;
      if (el.hasElementChildren) continue;
      if (el.endTagStart == null) continue;
      edits.push({ start: el.startTagEnd, end: el.endTagStart, text: escapeHtmlText(op.value) });
    } else if (op.kind === "href") {
      pushAttrEdit(edits, el, "href", op.value, replacedAttrs);
    } else if (op.kind === "src") {
      pushAttrEdit(edits, el, "src", op.value, replacedAttrs);
    } else if (op.kind === "textNode") {
      if (el.textoExcluido) continue;
      const t = el.textNodes.find((x) => x.index === op.index);
      if (!t) continue;
      edits.push({ start: t.start, end: t.end, text: escapeHtmlText(op.value) });
    } else {
      const nuevo = mergeStyleProperty(el.attrs.style ?? "", op.property, op.value);
      pushAttrEdit(edits, el, "style", nuevo, replacedAttrs);
    }
  }
  // Orden descendente por offset. Los tramos de atributos viven dentro del
  // start-tag y el de contenido tras él → no se solapan; dos inserciones en el
  // mismo punto se aplican ambas (ambos atributos quedan presentes).
  edits.sort((a, b) => b.start - a.start);
  let out = html;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}
