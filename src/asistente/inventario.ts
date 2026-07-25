import { walkElementsInOrder } from "@/src/editor/walk";

// Un nodo de texto editable que el asistente puede ver y modificar. `id` es el
// mismo que asigna walkElementsInOrder (y que usa applyEdits): estable mientras
// no se añadan/quiten elementos, cosa que nuestras ediciones nunca hacen.
export type NodoEditable = { id: number; tag: string; texto: string };

export const MAX_TEXTO_NODO = 400;
export const MAX_NODOS = 400;

// Inventario de nodos editables de una página: hojas (sin hijos-elemento) con
// texto, fuera de los subárboles excluidos (head/script/style/svg/…). El texto se
// normaliza (espacios colapsados) y se trunca — es solo lo que LEE el modelo; lo
// que se APLICA luego son ops validadas aparte.
export function construirInventario(
  html: string,
  opts?: { maxTexto?: number; maxNodos?: number }
): NodoEditable[] {
  const maxTexto = opts?.maxTexto ?? MAX_TEXTO_NODO;
  const maxNodos = opts?.maxNodos ?? MAX_NODOS;
  const out: NodoEditable[] = [];
  for (const e of walkElementsInOrder(html)) {
    if (e.textoExcluido) continue;
    if (e.hasElementChildren) continue; // v1: solo hojas (contenedores → sus hojas)
    const texto = e.text.replace(/\s+/g, " ").trim();
    if (!texto) continue;
    out.push({
      id: e.id,
      tag: e.tagName,
      texto: texto.length > maxTexto ? texto.slice(0, maxTexto) + "…" : texto,
    });
    if (out.length >= maxNodos) break;
  }
  return out;
}

// Texto compacto para el prompt: una línea por nodo.
export function serializarInventario(nodos: NodoEditable[]): string {
  return nodos.map((n) => `#${n.id} <${n.tag}>: ${n.texto}`).join("\n");
}
