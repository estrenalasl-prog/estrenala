import { describe, it, expect } from "vitest";
import { annotateForEdit } from "@/src/editor/annotate";

describe("annotateForEdit", () => {
  it("inyecta data-wc-id tras el nombre de etiqueta", () => {
    expect(annotateForEdit(`<h1>Hola</h1>`)).toBe(`<h1 data-wc-id="0">Hola</h1>`);
  });

  it("conserva atributos previos", () => {
    expect(annotateForEdit(`<a href="/x">L</a>`)).toBe(`<a data-wc-id="0" href="/x">L</a>`);
  });

  it("numera en orden de documento y no toca el contenido", () => {
    const out = annotateForEdit(`<h1>A</h1><p>B <b>C</b></p>`);
    expect(out).toBe(`<h1 data-wc-id="0">A</h1><p data-wc-id="1">B <b data-wc-id="2">C</b></p>`);
  });
});
