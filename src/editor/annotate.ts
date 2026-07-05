import { walkElementsInOrder } from "./walk";

// Marcado solo-preview (jamás se guarda): data-wc-id en cada elemento y, en los
// elementos MIXTOS (hijos elemento + texto suelto), cada nodo de texto significativo
// envuelto en <wc-t data-wc-tn="<idPadre>:<índice>">…</wc-t>. `wc-t` no existe en
// HTML: es inline, sin estilos de navegador, y el CSS del sitio no lo conoce.
export function annotateForEdit(html: string): string {
  const inserts: { at: number; text: string }[] = [];
  for (const e of walkElementsInOrder(html)) {
    inserts.push({ at: e.startTagStart + 1 + e.tagName.length, text: ` data-wc-id="${e.id}"` });
    if (e.hasElementChildren && !e.textoExcluido) {
      for (const t of e.textNodes) {
        inserts.push({ at: t.start, text: `<wc-t data-wc-tn="${e.id}:${t.index}">` });
        inserts.push({ at: t.end, text: `</wc-t>` });
      }
    }
  }
  inserts.sort((a, b) => b.at - a.at);
  let out = html;
  for (const ins of inserts) out = out.slice(0, ins.at) + ins.text + out.slice(ins.at);
  return out;
}
