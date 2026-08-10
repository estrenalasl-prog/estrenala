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
  /**
   * El texto de TODO el subárbol, no solo el de los hijos directos.
   *
   * `text` se queda corto justo donde más importa: un héroe animado palabra a
   * palabra —`<h1><span class="word">Agencia</span> <span…`— tiene `text` vacío,
   * y es lo que genera cualquier constructor de webs con IA. Quien pregunte «qué
   * dice este encabezado» tiene que preguntarle a esto.
   *
   * Sin `<script>` ni `<style>`: su contenido es código, no texto de la página.
   */
  deepText: string;
  attrs: Record<string, string>;
  attrLocations: Record<string, { start: number; end: number }>;
  /** Nodos de texto significativos (hijos directos con algo no-blanco), en orden documental. */
  textNodes: TextNodeInfo[];
  /**
   * El elemento que lo contiene, o null si está en la raíz.
   *
   * Hace falta para mover un bloque: mover es cambiarlo de sitio ENTRE SUS
   * HERMANOS, y sin saber de quién cuelga cada uno no hay forma de saber quiénes
   * son hermanos. Los ids se reparten en orden documental, así que los hermanos
   * salen ordenados sin tener que ordenarlos.
   */
  parentId: number | null;
  /** true si el elemento ES un excluido para edición de texto o vive dentro de uno. */
  textoExcluido: boolean;
};

// Subárboles donde no se edita texto suelto (regla compartida con annotate/apply).
const EXCLUIDOS = new Set(["head", "script", "style", "textarea", "svg", "math"]);

export function walkElementsInOrder(html: string): WalkedElement[] {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const out: WalkedElement[] = [];
  let nextId = 0;

  // Devuelve el texto del subárbol que acaba de recorrer, para que cada elemento
  // pueda quedarse con el suyo sin volver a bajar por sus hijos (así el coste
  // sigue siendo una sola pasada y no una por elemento).
  const visit = (node: unknown, excluido: boolean, padre: number | null): string => {
    const n = node as {
      tagName?: string;
      nodeName?: string;
      value?: string;
      attrs?: { name: string; value: string }[];
      childNodes?: unknown[];
      sourceCodeLocation?: {
        startOffset: number;
        startTag?: { endOffset: number };
        endTag?: { startOffset: number; endOffset: number };
        attrs?: Record<string, { startOffset: number; endOffset: number }>;
      } | null;
    };
    if (n.nodeName === "#text") return n.value ?? "";
    const loc = n.sourceCodeLocation;
    let excluidoHijos = excluido;
    let mio = -1; // dónde ha quedado este elemento en `out`, para completarlo luego
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
        const raw = html.slice(tl.startOffset, tl.endOffset);
        // parse5 fusiona fragmentos separados por marcado real (foster parenting,
        // texto tras </body>): el rango fuente incluiría tags. No direccionable.
        if (/<[a-zA-Z/!?]/.test(raw)) continue;
        textNodes.push({ index: idx++, start: tl.startOffset, end: tl.endOffset, raw });
      }
      mio = out.length;
      out.push({
        id: nextId,
        parentId: padre,
        tagName: n.tagName,
        deepText: "", // se rellena al volver de los hijos, más abajo

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
      nextId++;
      excluidoHijos = propioExcluido;
    }
    let subarbol = "";
    const idPropio = mio >= 0 ? out[mio].id : padre;
    if (n.childNodes) for (const c of n.childNodes) subarbol += visit(c, excluidoHijos, idPropio);
    if (mio >= 0) out[mio].deepText = subarbol;
    // El contenido de un <script> o un <style> es código: no es texto de la
    // página y no debe subir a lo que digan sus antepasados.
    return n.tagName === "script" || n.tagName === "style" ? "" : subarbol;
  };
  visit(doc, false, null);
  return out;
}
