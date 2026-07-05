import { parse } from "parse5";

export type TextNodeInfo = { index: number; start: number; end: number; raw: string };

export type WalkedElement = {
  id: number;
  tagName: string;
  startTagStart: number;
  startTagEnd: number;
  endTagStart: number | null;
  endTagEnd: number | null;
  hasElementChildren: boolean;
  text: string;
  attrs: Record<string, string>;
  attrLocations: Record<string, { start: number; end: number }>;
  /** Nodos de texto significativos (hijos directos con algo no-blanco), en orden documental. */
  textNodes: TextNodeInfo[];
  /** true si el elemento ES un excluido para edición de texto o vive dentro de uno. */
  textoExcluido: boolean;
};

// Subárboles donde no se edita texto suelto (regla compartida con annotate/apply).
const EXCLUIDOS = new Set(["head", "script", "style", "textarea", "svg", "math"]);

export function walkElementsInOrder(html: string): WalkedElement[] {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const out: WalkedElement[] = [];
  let nextId = 0;

  const visit = (node: unknown, excluido: boolean) => {
    const n = node as {
      tagName?: string;
      attrs?: { name: string; value: string }[];
      childNodes?: unknown[];
      sourceCodeLocation?: {
        startOffset: number;
        startTag?: { endOffset: number };
        endTag?: { startOffset: number; endOffset: number };
        attrs?: Record<string, { startOffset: number; endOffset: number }>;
      } | null;
    };
    const loc = n.sourceCodeLocation;
    let excluidoHijos = excluido;
    if (typeof n.tagName === "string" && loc && loc.startTag) {
      const propioExcluido = excluido || EXCLUIDOS.has(n.tagName);
      const kids = (n.childNodes ?? []) as {
        tagName?: string; nodeName?: string; value?: string;
        sourceCodeLocation?: { startOffset: number; endOffset: number } | null;
      }[];
      const attrs: Record<string, string> = {};
      for (const a of n.attrs ?? []) attrs[a.name] = a.value;
      const attrLocations: Record<string, { start: number; end: number }> = {};
      for (const [name, l] of Object.entries(loc.attrs ?? {})) {
        attrLocations[name] = { start: l.startOffset, end: l.endOffset };
      }
      const textNodes: TextNodeInfo[] = [];
      let idx = 0;
      for (const c of kids) {
        if (c.nodeName !== "#text") continue;
        if (!/\S/.test(c.value ?? "")) continue;
        const tl = c.sourceCodeLocation;
        if (!tl) continue; // texto sintetizado sin posición en el fuente: no direccionable
        textNodes.push({
          index: idx++,
          start: tl.startOffset,
          end: tl.endOffset,
          raw: html.slice(tl.startOffset, tl.endOffset),
        });
      }
      out.push({
        id: nextId++,
        tagName: n.tagName,
        startTagStart: loc.startOffset,
        startTagEnd: loc.startTag.endOffset,
        endTagStart: loc.endTag ? loc.endTag.startOffset : null,
        endTagEnd: loc.endTag ? loc.endTag.endOffset : null,
        hasElementChildren: kids.some((c) => typeof c.tagName === "string"),
        text: kids.filter((c) => c.nodeName === "#text").map((c) => c.value ?? "").join(""),
        attrs,
        attrLocations,
        textNodes,
        textoExcluido: propioExcluido,
      });
      excluidoHijos = propioExcluido;
    }
    if (n.childNodes) for (const c of n.childNodes) visit(c, excluidoHijos);
  };
  visit(doc, false);
  return out;
}
