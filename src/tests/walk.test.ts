import { describe, it, expect } from "vitest";
import { walkElementsInOrder } from "@/src/editor/walk";

describe("walkElementsInOrder", () => {
  const html = `<h1>Hola</h1><p>Uno <b>dos</b></p>`;

  it("asigna ids incrementales en orden de documento (omite html/body auto-insertados)", () => {
    const els = walkElementsInOrder(html);
    expect(els.map((e) => [e.id, e.tagName])).toEqual([
      [0, "h1"], [1, "p"], [2, "b"],
    ]);
  });

  it("marca hasElementChildren correctamente", () => {
    const els = walkElementsInOrder(html);
    expect(els.find((e) => e.tagName === "h1")!.hasElementChildren).toBe(false);
    expect(els.find((e) => e.tagName === "p")!.hasElementChildren).toBe(true);
  });

  it("el tramo [startTagEnd, endTagStart) delimita el contenido", () => {
    const els = walkElementsInOrder(html);
    const h1 = els.find((e) => e.tagName === "h1")!;
    expect(html.slice(h1.startTagEnd, h1.endTagStart!)).toBe("Hola");
    const b = els.find((e) => e.tagName === "b")!;
    expect(html.slice(b.startTagEnd, b.endTagStart!)).toBe("dos");
  });

  it("captura el texto directo del nodo", () => {
    const els = walkElementsInOrder(html);
    expect(els.find((e) => e.tagName === "h1")!.text).toBe("Hola");
    expect(els.find((e) => e.tagName === "p")!.text).toBe("Uno ");
  });

  it("elemento void (img) tiene endTagStart null", () => {
    const els = walkElementsInOrder(`<img src="x.png">`);
    expect(els[0].tagName).toBe("img");
    expect(els[0].endTagStart).toBeNull();
  });

  it("expone los valores de atributos en attrs", () => {
    const els = walkElementsInOrder(`<a href="/x" class="c">hi</a>`);
    expect(els[0].attrs.href).toBe("/x");
    expect(els[0].attrs.class).toBe("c");
  });

  it("expone el tramo name=\"value\" de cada atributo en attrLocations", () => {
    const src = `<a href="/x">hi</a>`;
    const a = walkElementsInOrder(src)[0];
    const loc = a.attrLocations.href;
    expect(src.slice(loc.start, loc.end)).toBe(`href="/x"`);
  });

  it("attrs vacío y attrLocations vacío cuando no hay atributos", () => {
    const els = walkElementsInOrder(`<p>hi</p>`);
    expect(els[0].attrs).toEqual({});
    expect(els[0].attrLocations).toEqual({});
  });

  it("el punto de inserción startTagStart+1+tagName.length cae tras '<tag'", () => {
    const src = `<a href="/x">hi</a>`;
    const a = walkElementsInOrder(src)[0];
    expect(src.slice(a.startTagStart, a.startTagStart + 1 + a.tagName.length)).toBe("<a");
  });
});
