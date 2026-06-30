import { walkElementsInOrder } from "./walk";

export type EditOp = { page: string; nodeId: number; kind: "text"; value: string };

export function escapeHtmlText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function applyTextEdits(
  html: string,
  ops: { nodeId: number; value: string }[]
): string {
  const byId = new Map(walkElementsInOrder(html).map((e) => [e.id, e]));
  const dedup = new Map<number, string>();
  for (const op of ops) dedup.set(op.nodeId, op.value);
  const edits: { start: number; end: number; text: string }[] = [];
  for (const [nodeId, value] of dedup) {
    const el = byId.get(nodeId);
    if (!el) continue;                    // id inexistente
    if (el.hasElementChildren) continue;  // no es hoja de texto
    if (el.endTagStart == null) continue; // void / sin endTag
    edits.push({ start: el.startTagEnd, end: el.endTagStart, text: escapeHtmlText(value) });
  }
  edits.sort((a, b) => b.start - a.start); // descendente
  let out = html;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}
