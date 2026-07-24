import { describe, it, expect } from "vitest";
import { annotateForEdit } from "@/src/editor/annotate";
import { applyEdits } from "@/src/editor/apply";

// Anota (asigna data-wc-id como en el preview), toma el id del primer elemento
// que casa el selector y aplica una op richText contra el HTML SIN anotar.
function idDe(htmlAnotado: string, tag: string): number {
  const m = htmlAnotado.match(new RegExp(`<${tag}[^>]*data-wc-id="(\\d+)"`));
  return m ? Number(m[1]) : -1;
}

describe("applyEdits — op richText", () => {
  it("mete formato en línea saneado dentro del párrafo", () => {
    const html = "<html><body><p>Hola mundo</p></body></html>";
    const nodeId = idDe(annotateForEdit(html), "p");
    const out = applyEdits(html, [{ nodeId, kind: "richText", value: "Hola <b>mundo</b> del <i>test</i>" }]);
    expect(out).toBe("<html><body><p>Hola <b>mundo</b> del <i>test</i></p></body></html>");
  });

  it("descarta lo peligroso al aplicar (script, atributos de evento)", () => {
    const html = "<html><body><p>x</p></body></html>";
    const nodeId = idDe(annotateForEdit(html), "p");
    const out = applyEdits(html, [{ nodeId, kind: "richText", value: '<b onclick="mal()">ok</b><script>alert(1)</script>' }]);
    expect(out).toBe("<html><body><p><b>ok</b></p></body></html>");
  });

  it("permite reeditar un párrafo que YA tiene formato (hijos en línea)", () => {
    const html = "<html><body><p>Hola <b>mundo</b></p></body></html>";
    const nodeId = idDe(annotateForEdit(html), "p");
    const out = applyEdits(html, [{ nodeId, kind: "richText", value: "solo <i>cursiva</i>" }]);
    expect(out).toBe("<html><body><p>solo <i>cursiva</i></p></body></html>");
  });

  it("enlace con href inseguro se desenvuelve al guardar", () => {
    const html = "<html><body><p>x</p></body></html>";
    const nodeId = idDe(annotateForEdit(html), "p");
    const out = applyEdits(html, [{ nodeId, kind: "richText", value: '<a href="javascript:alert(1)">click</a> aquí' }]);
    expect(out).toBe("<html><body><p>click aquí</p></body></html>");
  });

  it("si llegan text y richText del mismo nodo, gana richText", () => {
    const html = "<html><body><p>x</p></body></html>";
    const nodeId = idDe(annotateForEdit(html), "p");
    const out = applyEdits(html, [
      { nodeId, kind: "text", value: "plano" },
      { nodeId, kind: "richText", value: "<b>rico</b>" },
    ]);
    expect(out).toBe("<html><body><p><b>rico</b></p></body></html>");
  });
});
