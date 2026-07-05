import { describe, it, expect } from "vitest";
import { applyEdits, escapeHtmlText, escapeAttr } from "@/src/editor/apply";
import { walkElementsInOrder } from "@/src/editor/walk";

describe("escapeHtmlText", () => {
  it("escapa &, < y >", () => {
    expect(escapeHtmlText(`a < b & c > d`)).toBe(`a &lt; b &amp; c &gt; d`);
  });
});

describe("escapeAttr", () => {
  it("escapa &, comilla doble y <", () => {
    expect(escapeAttr(`a"&<b`)).toBe(`a&quot;&amp;&lt;b`);
  });
});

describe("applyEdits — text", () => {
  const html = `<h1>Hola</h1><p>Uno <b>dos</b></p>`; // ids: h1=0, p=1, b=2

  it("reemplaza el texto del nodo y deja el resto byte-idéntico", () => {
    expect(applyEdits(html, [{ nodeId: 0, kind: "text", value: "Adiós" }]))
      .toBe(`<h1>Adiós</h1><p>Uno <b>dos</b></p>`);
  });

  it("escapa el valor nuevo", () => {
    expect(applyEdits(`<h1>x</h1>`, [{ nodeId: 0, kind: "text", value: `<script>&` }]))
      .toBe(`<h1>&lt;script&gt;&amp;</h1>`);
  });

  it("ignora un nodo con hijos-elemento", () => {
    expect(applyEdits(html, [{ nodeId: 1, kind: "text", value: "x" }])).toBe(html);
  });

  it("ignora un id inexistente y un void (img)", () => {
    expect(applyEdits(html, [{ nodeId: 99, kind: "text", value: "x" }])).toBe(html);
    const h = `<img src="x.png">`;
    expect(applyEdits(h, [{ nodeId: 0, kind: "text", value: "y" }])).toBe(h);
  });
});

describe("applyEdits — href / src", () => {
  it("reemplaza un href existente", () => {
    expect(applyEdits(`<a href="/old">x</a>`, [{ nodeId: 0, kind: "href", value: "/new" }]))
      .toBe(`<a href="/new">x</a>`);
  });

  it("inserta href cuando no existe (tras '<a')", () => {
    expect(applyEdits(`<a class="c">x</a>`, [{ nodeId: 0, kind: "href", value: "/n" }]))
      .toBe(`<a href="/n" class="c">x</a>`);
  });

  it("reemplaza el src de una imagen", () => {
    expect(applyEdits(`<img src="/a.png">`, [{ nodeId: 0, kind: "src", value: "/wc-uploads/u.png" }]))
      .toBe(`<img src="/wc-uploads/u.png">`);
  });

  it("escapa comillas en el valor del atributo", () => {
    expect(applyEdits(`<a href="/o">x</a>`, [{ nodeId: 0, kind: "href", value: `/a"b` }]))
      .toBe(`<a href="/a&quot;b">x</a>`);
  });
});

describe("applyEdits — style:color", () => {
  it("inserta style cuando no existe", () => {
    expect(applyEdits(`<p>x</p>`, [{ nodeId: 0, kind: "style", property: "color", value: "#ff0000" }]))
      .toBe(`<p style="color: #ff0000">x</p>`);
  });

  it("mezcla color en un style existente conservando lo demás", () => {
    expect(applyEdits(`<p style="margin: 0">x</p>`, [{ nodeId: 0, kind: "style", property: "color", value: "red" }]))
      .toBe(`<p style="margin: 0; color: red">x</p>`);
  });
});

describe("applyEdits — combinados", () => {
  it("aplica texto + href + color sobre el mismo <a> sin corromper", () => {
    const out = applyEdits(`<a href="/o">hi</a>`, [
      { nodeId: 0, kind: "href", value: "/n" },
      { nodeId: 0, kind: "style", property: "color", value: "red" },
      { nodeId: 0, kind: "text", value: "bye" },
    ]);
    expect(out).toBe(`<a href="/n" style="color: red">bye</a>`);
  });

  it("dedup por (nodeId,kind,property): la última gana", () => {
    expect(applyEdits(`<a href="/o">x</a>`, [
      { nodeId: 0, kind: "href", value: "/a" },
      { nodeId: 0, kind: "href", value: "/b" },
    ])).toBe(`<a href="/b">x</a>`);
  });

  it("dos atributos NUEVOS en el mismo punto: ambos quedan presentes", () => {
    const out = applyEdits(`<a>link</a>`, [
      { nodeId: 0, kind: "href", value: "/n" },
      { nodeId: 0, kind: "style", property: "color", value: "red" },
    ]);
    expect(out).toContain(`href="/n"`);
    expect(out).toContain(`style="color: red"`);
    expect(out.startsWith("<a ")).toBe(true);
    expect(out.endsWith(">link</a>")).toBe(true);
  });

  it("edita el texto de un nodo anidado (b) dejando el resto intacto", () => {
    expect(applyEdits(`<h1>Hola</h1><p>Uno <b>dos</b></p>`, [{ nodeId: 2, kind: "text", value: "DOS" }]))
      .toBe(`<h1>Hola</h1><p>Uno <b>DOS</b></p>`);
  });
});

describe("op textNode (texto mixto)", () => {
  const html = `<p>Hola <strong>mundo</strong> adios &amp; fin</p>`;
  const idP = () => walkElementsInOrder(html).find((e) => e.tagName === "p")!.id;

  it("reemplaza el nodo de texto por índice, escapando y sin tocar el resto", () => {
    const out = applyEdits(html, [{ nodeId: idP(), kind: "textNode", index: 1, value: "y <fin>" }]);
    expect(out).toBe(`<p>Hola <strong>mundo</strong>y &lt;fin&gt;</p>`);
  });
  it("índice 0 y 1 en la misma pasada", () => {
    const out = applyEdits(html, [
      { nodeId: idP(), kind: "textNode", index: 0, value: "A " },
      { nodeId: idP(), kind: "textNode", index: 1, value: " B" },
    ]);
    expect(out).toBe(`<p>A <strong>mundo</strong> B</p>`);
  });
  it("índice inexistente → op ignorada", () => {
    expect(applyEdits(html, [{ nodeId: idP(), kind: "textNode", index: 7, value: "x" }])).toBe(html);
  });
  it("elemento excluido → op ignorada", () => {
    const conSvg = `<svg><text>a<tspan>b</tspan>c</text></svg>`;
    const idText = walkElementsInOrder(conSvg).find((e) => e.tagName === "text")!.id;
    expect(applyEdits(conSvg, [{ nodeId: idText, kind: "textNode", index: 0, value: "x" }])).toBe(conSvg);
  });
  it("dedup: la última op del mismo (nodo, índice) gana; índices distintos conviven", () => {
    const out = applyEdits(html, [
      { nodeId: idP(), kind: "textNode", index: 0, value: "primera " },
      { nodeId: idP(), kind: "textNode", index: 0, value: "ultima " },
    ]);
    expect(out).toBe(`<p>ultima <strong>mundo</strong> adios &amp; fin</p>`);
  });
  it("convive con ops de atributo en el mismo elemento", () => {
    const conA = `<a href="/x">ver <b>más</b> aquí</a>`;
    const idA = walkElementsInOrder(conA).find((e) => e.tagName === "a")!.id;
    const out = applyEdits(conA, [
      { nodeId: idA, kind: "href", value: "https://nuevo.com" },
      { nodeId: idA, kind: "textNode", index: 1, value: " allí" },
    ]);
    expect(out).toBe(`<a href="https://nuevo.com">ver <b>más</b> allí</a>`);
  });
});
