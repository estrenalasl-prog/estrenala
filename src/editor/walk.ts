import { parse } from "parse5";

export type WalkedElement = {
  id: number;
  tagName: string;
  startTagStart: number;
  startTagEnd: number;
  endTagStart: number | null;
  hasElementChildren: boolean;
  text: string;
};

export function walkElementsInOrder(html: string): WalkedElement[] {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const out: WalkedElement[] = [];
  let nextId = 0;

  const visit = (node: unknown) => {
    const n = node as {
      tagName?: string;
      childNodes?: unknown[];
      sourceCodeLocation?: {
        startOffset: number;
        startTag?: { endOffset: number };
        endTag?: { startOffset: number };
      } | null;
    };
    const loc = n.sourceCodeLocation;
    if (typeof n.tagName === "string" && loc && loc.startTag) {
      const kids = (n.childNodes ?? []) as { tagName?: string; nodeName?: string; value?: string }[];
      out.push({
        id: nextId++,
        tagName: n.tagName,
        startTagStart: loc.startOffset,
        startTagEnd: loc.startTag.endOffset,
        endTagStart: loc.endTag ? loc.endTag.startOffset : null,
        hasElementChildren: kids.some((c) => typeof c.tagName === "string"),
        text: kids.filter((c) => c.nodeName === "#text").map((c) => c.value ?? "").join(""),
      });
    }
    if (n.childNodes) for (const c of n.childNodes) visit(c);
  };
  visit(doc);
  return out;
}
