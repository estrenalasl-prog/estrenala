import { describe, it, expect } from "vitest";
import { applyTextEdits, escapeHtmlText } from "@/src/editor/apply";

describe("escapeHtmlText", () => {
  it("escapa &, < y >", () => {
    expect(escapeHtmlText(`a < b & c > d`)).toBe(`a &lt; b &amp; c &gt; d`);
  });
});

describe("applyTextEdits", () => {
  const html = `<h1>Hola</h1><p>Uno <b>dos</b></p>`; // ids: h1=0, p=1, b=2

  it("reemplaza el texto del nodo objetivo y deja el resto byte-idéntico", () => {
    expect(applyTextEdits(html, [{ nodeId: 0, value: "Adiós" }]))
      .toBe(`<h1>Adiós</h1><p>Uno <b>dos</b></p>`);
  });

  it("edita un nodo anidado (b)", () => {
    expect(applyTextEdits(html, [{ nodeId: 2, value: "DOS" }]))
      .toBe(`<h1>Hola</h1><p>Uno <b>DOS</b></p>`);
  });

  it("escapa el valor nuevo", () => {
    expect(applyTextEdits(`<h1>x</h1>`, [{ nodeId: 0, value: `<script>&` }]))
      .toBe(`<h1>&lt;script&gt;&amp;</h1>`);
  });

  it("ignora un nodo con hijos-elemento (no hoja de texto)", () => {
    expect(applyTextEdits(html, [{ nodeId: 1, value: "x" }])).toBe(html);
  });

  it("ignora un id inexistente", () => {
    expect(applyTextEdits(html, [{ nodeId: 99, value: "x" }])).toBe(html);
  });

  it("aplica múltiples ops a la vez", () => {
    expect(applyTextEdits(html, [{ nodeId: 0, value: "A" }, { nodeId: 2, value: "C" }]))
      .toBe(`<h1>A</h1><p>Uno <b>C</b></p>`);
  });

  it("dedup por nodeId: la última op gana", () => {
    expect(applyTextEdits(`<h1>x</h1>`, [{ nodeId: 0, value: "A" }, { nodeId: 0, value: "B" }]))
      .toBe(`<h1>B</h1>`);
  });

  it("ignora un elemento void (img, sin endTag)", () => {
    const html = `<p>hola</p><img src="x.png">`; // p=0, img=1
    expect(applyTextEdits(html, [{ nodeId: 1, value: "y" }])).toBe(html);
  });
});
