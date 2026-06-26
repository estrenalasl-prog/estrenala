import { walkElementsInOrder } from "./walk";

export function annotateForEdit(html: string): string {
  const inserts = walkElementsInOrder(html)
    .map((e) => ({ at: e.startTagStart + 1 + e.tagName.length, text: ` data-wc-id="${e.id}"` }))
    .sort((a, b) => b.at - a.at); // descendente: no desplaza offsets posteriores

  let out = html;
  for (const ins of inserts) {
    out = out.slice(0, ins.at) + ins.text + out.slice(ins.at);
  }
  return out;
}
