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
  it("text clásica + textNode sobre el mismo nodo hoja: gana textNode, sin corrupción", () => {
    const conB = `<p>Uno <b>dos</b></p>`;
    const idB = walkElementsInOrder(conB).find((e) => e.tagName === "b")!.id;
    const out = applyEdits(conB, [
      { nodeId: idB, kind: "text", value: "LONGREPLACEMENT" },
      { nodeId: idB, kind: "textNode", index: 0, value: "Y" },
    ]);
    expect(out).toBe(`<p>Uno <b>Y</b></p>`);
  });
  it("la op text clásica respeta los subárboles excluidos", () => {
    const conSvg = `<svg><text><tspan>x</tspan></text></svg>`;
    const idT = walkElementsInOrder(conSvg).find((e) => e.tagName === "tspan")!.id;
    expect(applyEdits(conSvg, [{ nodeId: idT, kind: "text", value: "y" }])).toBe(conSvg);
  });
});

// Meter una imagen NUEVA donde no habia ninguna. Hasta ahora solo se podia
// cambiar la de un <img> que ya estuviera, asi que quien no tenia hueco para foto
// no podia ponerla.
describe("applyEdits · insertar imagen", () => {
  const SRC = "/wc-uploads/11111111-2222-3333-4444-555555555555.webp";
  const IMG = `<img src="${SRC}" alt="Un gato" loading="lazy" style="max-width:100%;height:auto;display:block">`;
  const ins = (nodeId: number, posicion: "antes" | "despues") =>
    ({ nodeId, kind: "insertImage" as const, value: SRC, alt: "Un gato", posicion });

  it("la pone despues del elemento elegido", () => {
    const html = `<div><p>Hola</p></div>`;
    expect(applyEdits(html, [ins(1, "despues")])).toBe(`<div><p>Hola</p>${IMG}</div>`);
  });

  it("y antes, si se pide antes", () => {
    const html = `<div><p>Hola</p></div>`;
    expect(applyEdits(html, [ins(1, "antes")])).toBe(`<div>${IMG}<p>Hola</p></div>`);
  });

  // Un <img> o un <br> no tienen etiqueta de cierre: su final es el final de la
  // etiqueta de apertura. Sin esto la insercion caeria en la nada.
  it("junto a un elemento sin cierre (<img>) cae en el sitio bueno", () => {
    const html = `<div><img src="/a.png"></div>`;
    expect(applyEdits(html, [ins(1, "despues")])).toBe(`<div><img src="/a.png">${IMG}</div>`);
  });

  it("escapa las comillas del texto alternativo", () => {
    const html = `<div><p>x</p></div>`;
    const r = applyEdits(html, [{ nodeId: 1, kind: "insertImage", value: SRC, alt: 'Foto "buena"', posicion: "despues" }]);
    expect(r).toContain('alt="Foto &quot;buena&quot;"');
    expect(r).not.toContain('alt="Foto "buena""');
  });

  // «Antes de <html>» la dejaria FUERA del documento y «antes de <body>» dentro
  // del <head>, donde no se ve. Se ignora en vez de romper la pagina.
  //
  // Los nodos se buscan por nombre de etiqueta y no a ojo: con ids adivinados,
  // este test pasaria igual si diera la casualidad de que apuntan a un <title>
  // --que tambien esta excluido-- y no probaria lo que dice probar.
  it("no se cuelga de <html>, <head> ni <body>", () => {
    const html = `<html><head><title>t</title></head><body><p>x</p></body></html>`;
    const porTag = new Map(walkElementsInOrder(html).map((e) => [e.tagName, e.id]));
    for (const tag of ["html", "head", "body"]) {
      const id = porTag.get(tag);
      expect(id, `falta el nodo <${tag}> en el recorrido`).toBeTypeOf("number");
      for (const donde of ["antes", "despues"] as const) {
        expect(applyEdits(html, [ins(id!, donde)]), `<${tag}> ${donde}`).toBe(html);
      }
    }
    // Y el <p>, que SI admite imagen, demuestra que no se esta ignorando todo.
    expect(applyEdits(html, [ins(porTag.get("p")!, "despues")])).toContain("<img ");
  });

  it("tampoco dentro de <script>, <style> o <svg>", () => {
    const html = `<body><script>var a=1</script><svg><circle/></svg></body>`;
    expect(applyEdits(html, [ins(1, "despues"), ins(2, "despues"), ins(3, "antes")])).toBe(html);
  });

  // Sin distinguirlas por cual es y donde va, dos fotos distintas debajo del mismo
  // parrafo dejarian solo la ultima.
  it("dos imagenes DISTINTAS en el mismo sitio entran las dos", () => {
    const SRC2 = "/wc-uploads/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.png";
    const r = applyEdits(`<div><p>x</p></div>`, [
      { nodeId: 1, kind: "insertImage", value: SRC, alt: "a", posicion: "despues" },
      { nodeId: 1, kind: "insertImage", value: SRC2, alt: "b", posicion: "despues" },
    ]);
    expect(r).toContain(SRC);
    expect(r).toContain(SRC2);
    expect([...r.matchAll(/<img /g)]).toHaveLength(2);
  });

  it("pero la MISMA imagen mandada dos veces al mismo sitio entra una", () => {
    const r = applyEdits(`<div><p>x</p></div>`, [ins(1, "despues"), ins(1, "despues")]);
    expect([...r.matchAll(/<img /g)]).toHaveLength(1);
  });

  it("insertar no estorba a una edicion de texto en el mismo nodo", () => {
    const r = applyEdits(`<div><p>Hola</p></div>`, [
      { nodeId: 1, kind: "text", value: "Adios" },
      ins(1, "despues"),
    ]);
    expect(r).toBe(`<div><p>Adios</p>${IMG}</div>`);
  });

  it("un nodo que no existe se ignora sin tocar nada", () => {
    const html = `<div><p>x</p></div>`;
    expect(applyEdits(html, [ins(99, "despues")])).toBe(html);
  });
});

// Alinear una imagen: izquierda, centro o derecha. El cliente manda la INTENCION
// y el servidor decide el CSS, para que nadie pueda colar declaraciones raras en
// el atributo style de una pagina publicada.
describe("applyEdits · alinear", () => {
  const al = (nodeId: number, value: "izquierda" | "centro" | "derecha") =>
    ({ nodeId, kind: "align" as const, value });

  it("centrar pone margenes automaticos a los dos lados", () => {
    const r = applyEdits(`<img src="/a.png">`, [al(0, "centro")]);
    expect(r).toContain("margin-left: auto");
    expect(r).toContain("margin-right: auto");
  });

  it("izquierda y derecha sueltan el margen del lado que toca", () => {
    expect(applyEdits(`<img src="/a.png">`, [al(0, "izquierda")]))
      .toContain("margin-left: 0; margin-right: auto");
    expect(applyEdits(`<img src="/a.png">`, [al(0, "derecha")]))
      .toContain("margin-left: auto; margin-right: 0");
  });

  // Una imagen es en linea por defecto, y con eso los margenes automaticos no
  // hacen NADA. Es el motivo por el que «centrar» parece no funcionar en medio
  // internet.
  it("incluye display:block, sin el cual centrar no hace nada", () => {
    expect(applyEdits(`<img src="/a.png">`, [al(0, "centro")])).toContain("display: block");
  });

  it("respeta el estilo que ya tuviera la imagen", () => {
    const r = applyEdits(`<img src="/a.png" style="border-radius: 8px">`, [al(0, "centro")]);
    expect(r).toContain("border-radius: 8px");
    expect(r).toContain("margin-left: auto");
  });

  it("realinear no acumula: gana la ultima", () => {
    const r = applyEdits(`<img src="/a.png">`, [al(0, "centro"), al(0, "derecha")]);
    expect(r).toContain("margin-left: auto; margin-right: 0");
    expect([...r.matchAll(/margin-left/g)]).toHaveLength(1);
  });

  // EL CASO PELIGROSO: color y alineacion escriben el MISMO atributo. Si cada uno
  // empujara su propio tramo serian dos ediciones sobre el mismo rango de bytes y
  // el HTML saldria roto.
  it("color y alineacion a la vez producen UN solo atributo style, bien formado", () => {
    const r = applyEdits(`<img src="/a.png" style="border: 1px solid red">`, [
      { nodeId: 0, kind: "style", property: "color", value: "#333" },
      al(0, "centro"),
    ]);
    expect([...r.matchAll(/style=/g)]).toHaveLength(1);
    expect(r).toContain("border: 1px solid red");
    expect(r).toContain("color: #333");
    expect(r).toContain("margin-left: auto");
  });

  it("y tambien cuando la imagen NO tenia atributo style de antes", () => {
    const r = applyEdits(`<img src="/a.png">`, [
      { nodeId: 0, kind: "style", property: "color", value: "red" },
      al(0, "derecha"),
    ]);
    expect([...r.matchAll(/style=/g)]).toHaveLength(1);
    expect(r).toContain("color: red");
    expect(r).toContain("margin-right: 0");
  });
});

// El tamano existe PORQUE la alineacion sola no se notaba: una foto normal es mas
// ancha que su columna, se queda al 100% y entonces centrarla no mueve nada
// --no sobra espacio que repartir--. Se vio usandolo, no escribiendolo.
// El tamano existe PORQUE la alineacion sola no se notaba: una foto normal es mas
// ancha que su columna, se queda al 100% y entonces centrarla no mueve nada. Y es
// un NUMERO y no cuatro botones con nombre porque Sebas dijo que «Pequena /
// Normal» no parecia profesional -- tenia razon: poner nombres a los tamanos es no
// atreverse a dar la cifra.
describe("applyEdits · tamano de la imagen", () => {
  const tam = (nodeId: number, value: number) => ({ nodeId, kind: "size" as const, value });

  it("escribe el ancho que le pidan, en tanto por ciento", () => {
    expect(applyEdits(`<img src="/a.png">`, [tam(0, 37)])).toContain("width: 37%");
    expect(applyEdits(`<img src="/a.png">`, [tam(0, 100)])).toContain("width: 100%");
  });

  // Sin esto, cambiar solo el ancho deforma la foto: el fallo clasico de
  // «achicar la imagen» y que salga aplastada.
  it("lleva height:auto para no deformar la foto", () => {
    expect(applyEdits(`<img src="/a.png">`, [tam(0, 50)])).toContain("height: auto");
  });

  it("arrastrar la barra no acumula anchos: gana el ultimo", () => {
    const r = applyEdits(`<img src="/a.png">`, [tam(0, 30), tam(0, 45), tam(0, 62)]);
    expect(r).toContain("width: 62%");
    expect([...r.matchAll(/width:/g)]).toHaveLength(1);
  });

  it("tamano y alineacion juntos: UN atributo style con las dos cosas", () => {
    const r = applyEdits(`<img src="/a.png">`, [
      tam(0, 50),
      { nodeId: 0, kind: "align", value: "centro" },
    ]);
    expect([...r.matchAll(/style=/g)]).toHaveLength(1);
    expect(r).toContain("width: 50%");
    expect(r).toContain("margin-left: auto");
  });
});

// Sebas, al ver dos fotos seguidas: «que no queden tan pegadas».
describe("applyEdits · margen de la imagen", () => {
  const mg = (nodeId: number, value: number) => ({ nodeId, kind: "margen" as const, value });

  it("pone la separacion arriba y abajo", () => {
    const r = applyEdits(`<img src="/a.png">`, [mg(0, 24)]);
    expect(r).toContain("margin-top: 24px");
    expect(r).toContain("margin-bottom: 24px");
  });

  it("cero de verdad quita el aire, no lo deja a medias", () => {
    const r = applyEdits(`<img src="/a.png">`, [mg(0, 0)]);
    expect(r).toContain("margin-top: 0px");
    expect(r).toContain("margin-bottom: 0px");
  });

  // EL punto: el margen NO toca los lados, que son de la alineacion. Si los
  // tocara, subirlo descentraria la foto que se acaba de centrar.
  it("no descentra una imagen ya centrada", () => {
    const r = applyEdits(`<img src="/a.png">`, [
      { nodeId: 0, kind: "align", value: "centro" },
      mg(0, 40),
    ]);
    expect(r).toContain("margin-left: auto");
    expect(r).toContain("margin-right: auto");
    expect(r).toContain("margin-top: 40px");
  });

  // Los cuatro controles a la vez sobre la misma imagen, que es lo que acabara
  // haciendo cualquiera que le coja el gusto.
  it("tamano + alineacion + margen + color: UN solo atributo bien formado", () => {
    const r = applyEdits(`<img src="/a.png" style="border-radius: 8px">`, [
      { nodeId: 0, kind: "size", value: 55 },
      { nodeId: 0, kind: "align", value: "centro" },
      mg(0, 20),
      { nodeId: 0, kind: "style", property: "color", value: "red" },
    ]);
    expect([...r.matchAll(/style=/g)]).toHaveLength(1);
    expect(r).toContain("border-radius: 8px");
    expect(r).toContain("width: 55%");
    expect(r).toContain("margin-left: auto");
    expect(r).toContain("margin-top: 20px");
    expect(r).toContain("color: red");
    // Y sin duplicar ninguna propiedad, que es como se cuela un valor muerto.
    expect([...r.matchAll(/margin-top/g)]).toHaveLength(1);
    expect([...r.matchAll(/width:/g)]).toHaveLength(1);
  });
});

// Lo que Sebas pedía desde el principio: hasta ahora el editor solo dejaba
// cambiar el CONTENIDO, y para separar un título de su párrafo o meterlo en un
// recuadro había que bajarse el ZIP y tocar CSS.
describe("applyEdits · alineación del TEXTO", () => {
  const ta = (nodeId: number, value: "izquierda" | "centro" | "derecha") =>
    ({ nodeId, kind: "textAlign" as const, value });

  it("centrar escribe text-align, no márgenes", () => {
    const r = applyEdits(`<p>Hola</p>`, [ta(0, "centro")]);
    expect(r).toContain("text-align: center");
    expect(r).not.toContain("margin-left");
  });

  // EL punto por el que `textAlign` es una op distinta de `align`: alinear una
  // imagen pone `display:block`, y hacer eso con un título lo saca de la fila
  // donde estaba (una cabecera con logo y menú, por ejemplo).
  it("no pone display:block, que sacaría el elemento de su fila", () => {
    expect(applyEdits(`<h1>Hola</h1>`, [ta(0, "derecha")])).not.toContain("display: block");
  });

  it("los tres valores se traducen al CSS que toca", () => {
    expect(applyEdits(`<p>x</p>`, [ta(0, "izquierda")])).toContain("text-align: left");
    expect(applyEdits(`<p>x</p>`, [ta(0, "centro")])).toContain("text-align: center");
    expect(applyEdits(`<p>x</p>`, [ta(0, "derecha")])).toContain("text-align: right");
  });

  // Una imagen alineada y un párrafo con el texto centrado son cosas distintas
  // que pueden convivir en el mismo nodo sin pelearse por una propiedad.
  it("convive con la alineación de bloque sin pisarla", () => {
    const r = applyEdits(`<div>x</div>`, [
      { nodeId: 0, kind: "align", value: "centro" },
      ta(0, "derecha"),
    ]);
    expect([...r.matchAll(/style=/g)]).toHaveLength(1);
    expect(r).toContain("margin-left: auto");
    expect(r).toContain("text-align: right");
  });
});

describe("applyEdits · aire arriba y abajo por separado", () => {
  it("«arriba» no toca el de abajo", () => {
    const r = applyEdits(`<p>x</p>`, [{ nodeId: 0, kind: "margen", value: 32, lado: "arriba" }]);
    expect(r).toContain("margin-top: 32px");
    expect(r).not.toContain("margin-bottom");
  });

  it("«abajo» no toca el de arriba", () => {
    const r = applyEdits(`<p>x</p>`, [{ nodeId: 0, kind: "margen", value: 18, lado: "abajo" }]);
    expect(r).toContain("margin-bottom: 18px");
    expect(r).not.toContain("margin-top");
  });

  // Sin el lado en la clave de deduplicación, la segunda op borraba a la primera
  // —misma op, mismo nodo— y el usuario veía que solo le hacía caso a una barra.
  it("las dos barras a la vez sobreviven las dos", () => {
    const r = applyEdits(`<p>x</p>`, [
      { nodeId: 0, kind: "margen", value: 40, lado: "arriba" },
      { nodeId: 0, kind: "margen", value: 8, lado: "abajo" },
    ]);
    expect(r).toContain("margin-top: 40px");
    expect(r).toContain("margin-bottom: 8px");
    expect([...r.matchAll(/style=/g)]).toHaveLength(1);
  });

  // Las imágenes siguen mandando la op sin `lado`, y tienen que seguir moviendo
  // los dos: es lo que hacía antes de que existieran los lados.
  it("sin lado sigue siendo «los dos», como antes", () => {
    const r = applyEdits(`<img src="/a.png">`, [{ nodeId: 0, kind: "margen", value: 24 }]);
    expect(r).toContain("margin-top: 24px");
    expect(r).toContain("margin-bottom: 24px");
  });
});

describe("applyEdits · recuadros", () => {
  const rc = (nodeId: number, value: "ninguno" | "suave" | "borde" | "lateral") =>
    ({ nodeId, kind: "recuadro" as const, value });

  it("«fondo suave» escribe fondo, redondeo y relleno", () => {
    const r = applyEdits(`<p>x</p>`, [rc(0, "suave")]);
    expect(r).toContain("background-color: rgba(128,128,128,.10)");
    expect(r).toContain("border-radius: 12px");
    expect(r).toContain("padding: 18px 20px");
  });

  it("la barra lateral usa el color del propio texto, no el nuestro", () => {
    // Un recuadro con el lima de Estrénala se vería fuera de sitio en la web del
    // cliente, que tiene su paleta. `currentColor` combina sin saber nada de ella.
    const r = applyEdits(`<p>x</p>`, [rc(0, "lateral")]);
    expect(r).toContain("border-left: 3px solid currentColor");
    expect(r).not.toMatch(/C4F000/i);
  });

  // Cambiar de recuadro no puede dejar restos del anterior: un borde olvidado
  // más una barra lateral da un marco con barra que nadie ha pedido.
  it("cambiar de recuadro no deja restos del anterior", () => {
    const conBorde = applyEdits(`<p>x</p>`, [rc(0, "borde")]);
    expect(conBorde).toContain("border: 1px solid");
    const aLateral = applyEdits(conBorde, [rc(0, "lateral")]);
    expect(aLateral).not.toContain("border: 1px solid");
    expect(aLateral).not.toContain("border-radius");
    expect(aLateral).toContain("border-left: 3px solid currentColor");
  });

  // «Ninguno» BORRA las propiedades en vez de ponerlas a cero: un `padding: 0`
  // no es «sin recuadro», es un cero pisando el relleno que la hoja de estilos
  // de la web ya le daba a ese elemento.
  it("«ninguno» borra las propiedades en vez de ponerlas a cero", () => {
    const conRecuadro = applyEdits(`<p>x</p>`, [rc(0, "suave")]);
    const sin = applyEdits(conRecuadro, [rc(0, "ninguno")]);
    expect(sin).not.toContain("padding");
    expect(sin).not.toContain("background");
    expect(sin).not.toContain("border-radius");
    expect(sin).not.toContain("padding: 0");
  });

  it("respeta lo que no es suyo", () => {
    const r = applyEdits(`<p style="color: red; padding: 4px">x</p>`, [rc(0, "ninguno")]);
    expect(r).toContain("color: red");
    expect(r).not.toContain("padding");
  });

  it("convive con el aire y la alineación en un solo atributo", () => {
    const r = applyEdits(`<p>x</p>`, [
      rc(0, "borde"),
      { nodeId: 0, kind: "margen", value: 30, lado: "arriba" },
      { nodeId: 0, kind: "textAlign", value: "centro" },
    ]);
    expect([...r.matchAll(/style=/g)]).toHaveLength(1);
    expect(r).toContain("border: 1px solid");
    expect(r).toContain("margin-top: 30px");
    expect(r).toContain("text-align: center");
  });
});
