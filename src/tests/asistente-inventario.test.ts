import { describe, it, expect } from "vitest";
import { construirInventario, serializarInventario } from "@/src/asistente/inventario";
import { applyEdits } from "@/src/editor/apply";

const DOC = (cuerpo: string) => `<!doctype html><html><head><title>t</title></head><body>${cuerpo}</body></html>`;

describe("construirInventario — qué nodos ve el asistente", () => {
  it("incluye hojas de texto con su tag y su texto", () => {
    const inv = construirInventario(DOC("<h1>Hola</h1><p>Mundo</p>"));
    expect(inv.map((n) => ({ tag: n.tag, texto: n.texto }))).toEqual([
      { tag: "h1", texto: "Hola" },
      { tag: "p", texto: "Mundo" },
    ]);
  });

  it("excluye contenedores con hijos-elemento (solo entran sus hojas)", () => {
    const inv = construirInventario(DOC("<section><h2>Título</h2><p>Cuerpo</p></section>"));
    // section NO aparece; sí h2 y p
    expect(inv.map((n) => n.tag)).toEqual(["h2", "p"]);
  });

  it("no incluye subárboles excluidos (script/style/head)", () => {
    const inv = construirInventario(
      DOC("<h1>Ok</h1><script>alert(1)</script><style>.a{color:red}</style>")
    );
    expect(inv.map((n) => n.tag)).toEqual(["h1"]);
    expect(inv.some((n) => n.texto.includes("alert"))).toBe(false);
  });

  it("normaliza espacios y recorta", () => {
    const inv = construirInventario(DOC("<p>  hola   \n  mundo </p>"));
    expect(inv[0].texto).toBe("hola mundo");
  });

  it("ignora nodos sin texto", () => {
    const inv = construirInventario(DOC("<p></p><span>   </span><h1>algo</h1>"));
    expect(inv.map((n) => n.tag)).toEqual(["h1"]);
  });

  it("trunca el texto largo con maxTexto", () => {
    const largo = "a".repeat(50);
    const inv = construirInventario(DOC(`<p>${largo}</p>`), { maxTexto: 10 });
    expect(inv[0].texto).toBe("aaaaaaaaaa…");
  });

  it("respeta maxNodos", () => {
    const inv = construirInventario(DOC("<p>1</p><p>2</p><p>3</p>"), { maxNodos: 2 });
    expect(inv).toHaveLength(2);
  });
});

describe("construirInventario — los ids son consistentes con applyEdits", () => {
  it("el id del inventario direcciona el nodo correcto al aplicar una op", () => {
    const html = DOC("<h1>Antiguo</h1><p>Otro</p>");
    const inv = construirInventario(html);
    const h1 = inv.find((n) => n.tag === "h1")!;
    const out = applyEdits(html, [{ nodeId: h1.id, kind: "text", value: "Nuevo" }]);
    expect(out).toContain("<h1>Nuevo</h1>");
    expect(out).toContain("<p>Otro</p>");
  });
});

describe("serializarInventario", () => {
  it("formatea una línea por nodo con id, tag y texto", () => {
    const txt = serializarInventario([
      { id: 3, tag: "h1", texto: "Hola" },
      { id: 4, tag: "p", texto: "Mundo" },
    ]);
    expect(txt).toBe("#3 <h1>: Hola\n#4 <p>: Mundo");
  });
});
