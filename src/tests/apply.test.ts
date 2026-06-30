import { describe, it, expect } from "vitest";
import { applyEdits, escapeHtmlText, escapeAttr } from "@/src/editor/apply";

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
