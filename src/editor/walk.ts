import { parse } from "parse5";

export type WalkedElement = {
  id: number;
  tagName: string;
  startTagStart: number;
  startTagEnd: number;
  endTagStart: number | null;
  hasElementChildren: boolean;
  text: string;
  attrs: Record<string, string>;
  attrLocations: Record<string, { start: number; end: number }>;
};

export function walkElementsInOrder(html: string): WalkedElement[] {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const out: WalkedElement[] = [];
  let nextId = 0;

  const visit = (node: unknown) => {
    const n = node as {
      tagName?: string;
      attrs?: { name: string; value: string }[];
      childNodes?: unknown[];
      sourceCodeLocation?: {
        startOffset: number;
        startTag?: { endOffset: number };
        endTag?: { startOffset: number };
        attrs?: Record<string, { startOffset: number; endOffset: number }>;
      } | null;
    };
    const loc = n.sourceCodeLocation;
    if (typeof n.tagName === "string" && loc && loc.startTag) {
      const kids = (n.childNodes ?? []) as { tagName?: string; nodeName?: string; value?: string }[];
      const attrs: Record<string, string> = {};
      for (const a of n.attrs ?? []) attrs[a.name] = a.value;
      const attrLocations: Record<string, { start: number; end: number }> = {};
      for (const [name, l] of Object.entries(loc.attrs ?? {})) {
        attrLocations[name] = { start: l.startOffset, end: l.endOffset };
      }
      out.push({
        id: nextId++,
        tagName: n.tagName,
        startTagStart: loc.startOffset,
        startTagEnd: loc.startTag.endOffset,
        endTagStart: loc.endTag ? loc.endTag.startOffset : null,
        hasElementChildren: kids.some((c) => typeof c.tagName === "string"),
        text: kids.filter((c) => c.nodeName === "#text").map((c) => c.value ?? "").join(""),
        attrs,
        attrLocations,
      });
    }
    if (n.childNodes) for (const c of n.childNodes) visit(c);
  };
  visit(doc);
  return out;
}
