import { describe, it, expect } from "vitest";
import { annotateForEdit } from "@/src/editor/annotate";
import { walkElementsInOrder } from "@/src/editor/walk";

describe("annotateForEdit", () => {
  it("inyecta data-wc-id tras el nombre de etiqueta", () => {
    expect(annotateForEdit(`<h1>Hola</h1>`)).toBe(`<h1 data-wc-id="0">Hola</h1>`);
  });

  it("conserva atributos previos", () => {
    expect(annotateForEdit(`<a href="/x">L</a>`)).toBe(`<a data-wc-id="0" href="/x">L</a>`);
  });

  it("numera en orden de documento y no toca el contenido", () => {
    const out = annotateForEdit(`<h1>A</h1><p>B <b>C</b></p>`);
    expect(out).toBe(`<h1 data-wc-id="0">A</h1><p data-wc-id="1"><wc-t data-wc-tn="1:0">B </wc-t><b data-wc-id="2">C</b></p>`);
  });
});

describe("annotate v2: wrappers wc-t en elementos mixtos", () => {
  it("envuelve el texto suelto de un mixto con el id del padre y el índice", () => {
    const html = `<p>Hola <strong>mundo</strong> adios</p>`;
    const out = annotateForEdit(html);
    const p = walkElementsInOrder(html).find((e) => e.tagName === "p")!;
    expect(out).toContain(`<wc-t data-wc-tn="${p.id}:0">Hola </wc-t>`);
    expect(out).toContain(`<wc-t data-wc-tn="${p.id}:1"> adios</wc-t>`);
  });
  it("un elemento de texto puro (hoja) NO se envuelve", () => {
    const out = annotateForEdit(`<p>solo texto</p>`);
    expect(out).not.toContain("wc-t");
  });
  it("no envuelve dentro de subárboles excluidos", () => {
    const out = annotateForEdit(
      `<html><head><title>t</title><script>var x = 1;</script></head>` +
      `<body><svg><text>a<tspan>b</tspan>c</text></svg></body></html>`
    );
    expect(out).not.toContain("wc-t");
  });
  it("el texto envuelto conserva las entidades del fuente", () => {
    const out = annotateForEdit(`<p><b>x</b>a &amp; b</p>`);
    expect(out).toContain(`>a &amp; b</wc-t>`);
  });
  it("los data-wc-id existentes no cambian de valor por los wrappers", () => {
    const html = `<div><p>Hola <b>x</b></p><span>y</span></div>`;
    const sinWrap = walkElementsInOrder(html);
    const out = annotateForEdit(html);
    for (const e of sinWrap) expect(out).toContain(`data-wc-id="${e.id}"`);
  });
});
