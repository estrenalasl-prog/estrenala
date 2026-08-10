import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RECUADROS, PROPIEDADES_RECUADRO } from "@/src/editor/apply";

/**
 * `public/wc-editor.js` corre DENTRO de la web del cliente, en un iframe. Su
 * problema de siempre es que no lo ve nadie: ni TypeScript, ni el build, ni
 * `node --check`. El 2026-08-02 una función y un `var` compartieron nombre, el
 * `var` ganó, y el menú se quedó sin la mitad de los controles. Sintaxis válida,
 * tests en verde, build limpio. Lo vio Sebas al abrirlo.
 *
 * El test de al lado (wc-editor.test.ts) cierra esa puerta concreta mirando el
 * texto del archivo. Esto va un paso más allá: EJECUTA el script contra un DOM
 * de mentira y abre el menú de verdad, así que un TypeError dentro de
 * `construir` —el fallo de aquel día— sale aquí en vez de en el navegador.
 *
 * El DOM es falso a propósito, y por tanto miente en lo que no se le ha pedido:
 * no hay maquetación, ni cascada, ni herencia. Sirve para «este botón existe y
 * manda esta op», no para «esto se ve bien». Eso último se sigue mirando en el
 * navegador.
 */
const FUENTE = readFileSync(resolve(process.cwd(), "public/wc-editor.js"), "utf-8");

type Mensaje = { type?: string; op?: Record<string, unknown> };

type Estilo = Record<string, unknown> & { _puestas: [string, string][]; _quitadas: string[] };

type Rect = { top: number; bottom: number; left: number; right: number; width: number; height: number };

interface Nodo {
  nodeType: number;
  tagName: string;
  style: Estilo;
  children: Nodo[];
  textContent: string;
  innerHTML: string;
  value: string;
  type: string;
  title: string;
  placeholder: string;
  min: string;
  max: string;
  parentNode: Nodo | null;
  readonly parentElement: Nodo | null;
  readonly nextSibling: Nodo | null;
  offsetHeight: number;
  offsetWidth: number;
  readonly firstChild: Nodo | null;
  appendChild(h: Nodo): Nodo;
  insertBefore(h: Nodo, ref: Nodo | null): Nodo;
  addEventListener(t: string, f: (e: unknown) => void): void;
  removeEventListener(): void;
  setAttribute(n: string, v: string): void;
  getAttribute(n: string): string | null;
  hasAttribute(n: string): boolean;
  removeAttribute(n: string): void;
  readonly attributes: { name: string }[];
  contains(o: unknown): boolean;
  closest(): Nodo | null;
  focus(): void;
  getBoundingClientRect(): Rect;
  /** Dónde cae el elemento en pantalla. Los tests de colocación lo cambian. */
  _rect: Rect;
  scrollIntoView(): void;
  _attrs: Record<string, string>;
  _oyentes: Record<string, ((e: unknown) => void)[]>;
  /** Dispara el oyente que se le colgó, como haría el navegador. */
  _disparar(t: string, e?: unknown): void;
}

function crearEstilo(): Estilo {
  const puestas: [string, string][] = [];
  const quitadas: string[] = [];
  const estilo: Estilo = {
    cssText: "",
    setProperty(n: string, v: string) { puestas.push([n, v]); estilo[n] = v; },
    removeProperty(n: string) { quitadas.push(n); delete estilo[n]; },
    _puestas: puestas,
    _quitadas: quitadas,
  };
  return estilo;
}

function desenganchar(h: Nodo) {
  const p = h.parentNode;
  if (!p) return;
  const i = p.children.indexOf(h);
  if (i !== -1) p.children.splice(i, 1);
}

function crearNodo(tag: string): Nodo {
  const nodo: Nodo = {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    style: crearEstilo(),
    children: [],
    textContent: "",
    innerHTML: "",
    value: "",
    type: "",
    title: "",
    placeholder: "",
    min: "",
    max: "",
    parentNode: null,
    _attrs: {},
    _oyentes: {},
    get firstChild() { return nodo.children[0] ?? null; },
    get parentElement() { return nodo.parentNode; },
    // Un DOM de verdad MUEVE el nodo: lo quita de donde estuviera antes de
    // ponerlo. Sin desengancharlo, mover un bloque lo duplicaba — y el test de
    // «volver al sitio» fallaba por culpa del harness, no del código.
    appendChild(h: Nodo) { desenganchar(h); h.parentNode = nodo; nodo.children.push(h); return h; },
    insertBefore(h: Nodo, ref: Nodo | null) {
      desenganchar(h);
      h.parentNode = nodo;
      const i = ref ? nodo.children.indexOf(ref) : -1;
      if (i === -1) nodo.children.push(h); else nodo.children.splice(i, 0, h);
      return h;
    },
    // El hermano siguiente. Aquí no hay nodos de texto, así que coincide con
    // `nextElementSibling`; en el navegador podría ser el espacio en blanco de
    // entre medias, y da igual: insertar antes de él deja el bloque en el mismo
    // sitio.
    get nextSibling() {
      const p = nodo.parentNode;
      if (!p) return null;
      return p.children[p.children.indexOf(nodo) + 1] ?? null;
    },
    addEventListener(t: string, f: (e: unknown) => void) { (nodo._oyentes[t] ??= []).push(f); },
    removeEventListener() {},
    setAttribute(n: string, v: string) { nodo._attrs[n] = String(v); },
    getAttribute(n: string) { return Object.hasOwn(nodo._attrs, n) ? nodo._attrs[n] : null; },
    hasAttribute(n: string) { return Object.hasOwn(nodo._attrs, n); },
    removeAttribute(n: string) { delete nodo._attrs[n]; },
    // Como el `attributes` del navegador: la lista de los que tiene puestos. Se
    // mira para saber si una negrita lleva estilo propio y por tanto no se puede
    // fundir con el texto de alrededor.
    get attributes() { return Object.keys(nodo._attrs).map((name) => ({ name })); },
    contains(o: unknown) { return o === nodo; },
    closest() { return null; },
    focus() {},
    _rect: { top: 100, bottom: 140, left: 40, right: 400, width: 360, height: 40 },
    getBoundingClientRect: () => nodo._rect,
    scrollIntoView() {},
    offsetHeight: 0,
    offsetWidth: 0,
    /** Dispara el oyente que se le colgó, como haría el navegador. */
    _disparar(t: string, e: unknown = {}) { for (const f of nodo._oyentes[t] ?? []) f(e); },
  };
  // `innerHTML = ""` es cómo el script vacía el menú antes de reconstruirlo.
  //
  // Esto era un Proxy y fue un error sutil: los hijos guardaban el proxy, pero
  // los getters de dentro comparaban contra el objeto crudo, así que
  // `children.indexOf(este)` daba -1 y `nextSibling` devolvía el PRIMER hermano.
  // El test de mover falló por eso, no por el código. Con una propiedad definida
  // sobre el propio objeto no hay dos identidades que confundir.
  let html = "";
  Object.defineProperty(nodo, "innerHTML", {
    get: () => html,
    set: (v: string) => { html = v; if (v === "") nodo.children.length = 0; },
  });
  return nodo;
}

/** Todos los descendientes, en orden. Para buscar un botón por su texto. */
function todos(n: Nodo): Nodo[] {
  return n.children.flatMap((h: Nodo) => [h, ...todos(h)]);
}
function botonConTexto(raiz: Nodo, texto: string): Nodo {
  const b = todos(raiz).find((n) => n.tagName === "BUTTON" && n.textContent === texto);
  expect(b, `no hay ningún botón «${texto}» en el menú`).toBeTruthy();
  return b!;
}

/**
 * El `display` que el navegador le da de serie a cada etiqueta. Es lo ÚNICO que
 * el script le pregunta al navegador, así que aquí no se puede improvisar: la
 * primera versión decía que un `<td>` es «block» y el test de las tablas falló
 * por culpa del DOM falso, no del código. Un harness que miente convierte un
 * test en verde en una promesa vacía.
 */
const DISPLAY_REAL: Record<string, string> = {
  SPAN: "inline", A: "inline", STRONG: "inline", EM: "inline", B: "inline", I: "inline",
  SMALL: "inline", "WC-T": "inline",
  LI: "list-item",
  TABLE: "table", TR: "table-row", TD: "table-cell", TH: "table-cell",
};

function montar() {
  const cuerpo = crearNodo("body");
  const guion = crearNodo("script");
  guion.setAttribute("data-page", "index.html");

  const mensajes: Mensaje[] = [];
  const oyentesDoc: Record<string, ((e: unknown) => void)[]> = {};

  const documento = {
    currentScript: guion,
    body: cuerpo,
    createElement: (t: string) => crearNodo(t),
    addEventListener(t: string, f: (e: unknown) => void) { (oyentesDoc[t] ??= []).push(f); },
    removeEventListener() {},
    querySelector: () => null,
    execCommand: () => true,
    createRange: () => ({ selectNodeContents() {}, cloneRange() { return {}; } }),
    activeElement: null,
    // El ancho de la ventana SIN la barra de scroll, que es contra lo que se
    // decide si el menú cabe a un lado.
    documentElement: { clientWidth: 1200 },
  };

  const ventana = {
    parent: { postMessage: (m: Mensaje) => { mensajes.push(m); } },
    // Qué es bloque y qué es en línea: es lo único que el script le pregunta al
    // navegador para decidir si los controles surten efecto. La lista es la de
    // verdad —una negrita y el `<wc-t>` que envuelve el texto suelto son en
    // línea—, porque si aquí mintiera, el test pasaría sobre un caso que en el
    // navegador se comporta al revés.
    getComputedStyle: (el: Nodo) => ({
      display: DISPLAY_REAL[el.tagName] ?? "block",
      color: "rgb(20, 21, 9)",
      fontSize: el.tagName === "H2" ? "32px" : "17px",
      marginTop: "12px",
      marginBottom: "4px",
      textAlign: "start",
    }),
    getSelection: () => ({ rangeCount: 0, isCollapsed: true, removeAllRanges() {}, addRange() {} }),
    addEventListener() {},
    scrollX: 0,
    scrollY: 0,
    innerHeight: 800,
    innerWidth: 1215,
  };

  // El script es un IIFE que no exporta nada: se le pasan `document` y `window`
  // como parámetros para que use los falsos en vez de buscarlos fuera.
  // `getComputedStyle` va suelto además de dentro de `window` porque el script
  // lo llama de las dos formas.
  new Function("document", "window", "getComputedStyle", FUENTE)(documento, ventana, ventana.getComputedStyle);

  return { cuerpo, mensajes, oyentesDoc, documento };
}

/** Abre el menú sobre un elemento, como hace un clic del usuario. */
function abrirMenu(tag: string, rect?: Partial<Rect>) {
  const ctx = montar();
  const el = crearNodo(tag);
  el.setAttribute("data-wc-id", "7");
  el.textContent = "Un párrafo cualquiera";
  if (rect) el._rect = { ...el._rect, ...rect };
  for (const f of ctx.oyentesDoc["click"] ?? []) f({ target: el });
  // El menú es el primer hijo que el script cuelga del body.
  const menu = ctx.cuerpo.children[0];
  expect(menu, "el script no ha montado el menú").toBeTruthy();
  return { ...ctx, el, menu };
}

describe("wc-editor.js · el menú se abre de verdad", () => {
  let m: ReturnType<typeof abrirMenu>;
  beforeEach(() => { m = abrirMenu("p"); });

  // Este es el test que habría cazado el fallo del 2026-08-02: `construir`
  // reventaba a mitad y todo lo que iba después desaparecía del menú, sin error
  // visible en ninguna parte.
  it("un párrafo trae los controles de bloque enteros", () => {
    const textos = todos(m.menu).map((n) => n.textContent);
    for (const esperado of ["Alineación del texto", "Tamaño de la letra", "Aire arriba", "Aire abajo", "Recuadro", "Añadir una imagen"]) {
      expect(textos, `falta «${esperado}» en el menú`).toContain(esperado);
    }
  });

  it("centrar manda la intención, no CSS", () => {
    botonConTexto(m.menu, "Centro")._disparar("click");
    const op = m.mensajes.at(-1)?.op;
    expect(op).toMatchObject({ kind: "textAlign", value: "centro", nodeId: 7, page: "index.html" });
  });

  it("y lo pinta al momento con lo mismo que escribirá el servidor", () => {
    botonConTexto(m.menu, "Der.")._disparar("click");
    expect(m.el.style.textAlign).toBe("right");
    // Nada de display:block: eso sacaría un título de la fila donde estaba.
    expect(m.el.style.display).toBeUndefined();
  });

  it("el recuadro borra el grupo entero antes de escribir el suyo", () => {
    botonConTexto(m.menu, "Fondo suave")._disparar("click");
    expect(m.el.style._quitadas).toEqual([...PROPIEDADES_RECUADRO]);
    expect(m.el.style._puestas).toEqual(RECUADROS.suave.map((d) => [...d]));
    expect(m.mensajes.at(-1)?.op).toMatchObject({ kind: "recuadro", value: "suave" });
  });

  it("«Ninguno» borra y no escribe nada", () => {
    botonConTexto(m.menu, "Ninguno")._disparar("click");
    expect(m.el.style._quitadas).toEqual([...PROPIEDADES_RECUADRO]);
    expect(m.el.style._puestas).toEqual([]);
    expect(m.mensajes.at(-1)?.op).toMatchObject({ kind: "recuadro", value: "ninguno" });
  });

  // Las dos barras arrancan donde está el elemento AHORA, cada una en su lado.
  // Si arrancaran en un valor de fábrica, el primer arrastre daría un salto que
  // nadie ha pedido; y si las dos leyeran el mismo lado, «aire abajo» empezaría
  // mintiendo.
  it("cada barra arranca en el margen que ya tenía su lado", () => {
    const numeros = todos(m.menu).filter((n) => n.type === "number");
    expect(numeros.map((n) => n.value)).toContain("12"); // marginTop
    expect(numeros.map((n) => n.value)).toContain("4");  // marginBottom
  });
});

/**
 * Sebas, el 10/08, enseñando el menú abierto sobre un punto de lista: solo salía
 * «Añadir una imagen».
 *
 * El motivo: un `<li>` que mezcla texto con un enlace no se edita entero — el
 * texto suelto va envuelto en un `<wc-t>` para poder cambiarlo por su cuenta, y
 * ese elemento es EN LÍNEA. Sobre él, alineación y márgenes no harían nada, así
 * que se escondían... y en una lista con enlaces no había forma de llegar a
 * ellos por ningún lado.
 *
 * Ahora los controles apuntan al BLOQUE que contiene lo que se ha pinchado.
 */
describe("wc-editor.js · sobre qué actúan los controles de bloque", () => {
  /** Un hijo dentro de su bloque, como en la web real. */
  function abrirDentroDe(padre: string, hijo: string) {
    const ctx = montar();
    const bloque = crearNodo(padre);
    bloque.setAttribute("data-wc-id", "3");
    const dentro = crearNodo(hijo);
    dentro.setAttribute("data-wc-id", "9");
    dentro.textContent = "un trozo de texto";
    bloque.appendChild(dentro);
    for (const f of ctx.oyentesDoc["click"] ?? []) f({ target: dentro });
    return { ...ctx, bloque, dentro, menu: ctx.cuerpo.children[0] };
  }

  it("pinchando una negrita, el recuadro es el del párrafo", () => {
    const m = abrirDentroDe("p", "strong");
    expect(todos(m.menu).map((n) => n.textContent)).toContain("Diseño del párrafo");
    botonConTexto(m.menu, "Con borde")._disparar("click");
    // El id que viaja es el del PÁRRAFO (3), no el de la negrita (9).
    expect(m.mensajes.at(-1)?.op).toMatchObject({ kind: "recuadro", value: "borde", nodeId: 3 });
    expect(m.bloque.style._puestas.length).toBeGreaterThan(0);
    expect(m.dentro.style._puestas).toEqual([]);
  });

  it("el trozo de texto de un punto de lista llega al punto entero", () => {
    const m = abrirDentroDe("li", "span");
    expect(todos(m.menu).map((n) => n.textContent)).toContain("Diseño del punto de la lista");
    botonConTexto(m.menu, "Centro")._disparar("click");
    expect(m.mensajes.at(-1)?.op).toMatchObject({ kind: "textAlign", nodeId: 3 });
    expect(m.bloque.style.textAlign).toBe("center");
  });

  /**
   * El caso EXACTO de la captura del 10/08: un `<li>` que mezcla texto con un
   * enlace. El texto suelto lo envuelve `annotate.ts` en un `<wc-t
   * data-wc-tn="3:0">`, que no lleva `data-wc-id` propio y es en línea. Eso es
   * lo que se resolvía al pasar el ratón, y por eso el menú salía con «Añadir
   * una imagen» y nada más.
   */
  it("el <wc-t> del texto suelto —el de la captura— también llega al punto", () => {
    const ctx = montar();
    const li = crearNodo("li");
    li.setAttribute("data-wc-id", "3");
    const suelto = crearNodo("wc-t");
    suelto.setAttribute("data-wc-tn", "3:0"); // sin data-wc-id: no es un nodo del documento
    suelto.textContent = "Hasta 100 ediciones diarias gratis";
    li.appendChild(suelto);
    for (const f of ctx.oyentesDoc["click"] ?? []) f({ target: suelto });

    const menu = ctx.cuerpo.children[0];
    expect(todos(menu).map((n) => n.textContent)).toContain("Diseño del punto de la lista");
    botonConTexto(menu, "Barra lateral")._disparar("click");
    expect(ctx.mensajes.at(-1)?.op).toMatchObject({ kind: "recuadro", value: "lateral", nodeId: 3 });
  });

  // Y el límite: subir sin freno acabaría poniéndole un recuadro al <section> de
  // la maqueta. Solo se sube a bloques de TEXTO.
  it("no se sube hasta la maqueta buscando un bloque", () => {
    const m = abrirDentroDe("section", "span");
    const textos = todos(m.menu).map((n) => n.textContent);
    expect(textos).not.toContain("Recuadro");
    // Pero el elemento sigue siendo editable: el menú no se queda vacío.
    expect(textos).toContain("Añadir una imagen");
  });
});

describe("wc-editor.js · los bordes de a qué bloque se sube", () => {
  function abrirEn(cadena: string[]) {
    const ctx = montar();
    const nodos = cadena.map((tag, i) => {
      const n = crearNodo(tag);
      n.setAttribute("data-wc-id", String(i + 1));
      return n;
    });
    for (let i = 1; i < nodos.length; i++) nodos[i - 1].appendChild(nodos[i]);
    const hoja = nodos[nodos.length - 1];
    hoja.textContent = "texto";
    for (const f of ctx.oyentesDoc["click"] ?? []) f({ target: hoja });
    return { ...ctx, nodos, menu: ctx.cuerpo.children[0] };
  }

  // Las webs hechas con IA meten texto suelto en un <div> constantemente.
  it("el texto suelto de un div llega al div que lo envuelve", () => {
    const m = abrirEn(["section", "div", "span"]);
    expect(todos(m.menu).map((n) => n.textContent)).toContain("Diseño del bloque");
    botonConTexto(m.menu, "Fondo suave")._disparar("click");
    // El div (2), no el <section> de la maqueta (1) ni el <span> (3).
    expect(m.mensajes.at(-1)?.op).toMatchObject({ kind: "recuadro", nodeId: 2 });
  });

  // Una celda no acepta márgenes, y subir por encima de ella se saltaría la
  // tabla entera para enmarcar lo que hubiera detrás.
  it("dentro de una tabla no se sube a nada", () => {
    const m = abrirEn(["div", "td", "span"]);
    expect(todos(m.menu).map((n) => n.textContent)).not.toContain("Recuadro");
  });
});

describe("wc-editor.js · el tamaño de la letra", () => {
  // Arranca en lo que MIDE, no en un valor de fábrica. Si empezara en 16 sobre
  // un título de 32, el primer arrastre lo encogería a la mitad sin que nadie lo
  // haya pedido — el mismo fallo que ya tuvo el ancho de las imágenes.
  it("la barra arranca en el tamaño que ya tiene el elemento", () => {
    const titulo = abrirMenu("h2");
    expect(todos(titulo.menu).filter((n) => n.type === "number").map((n) => n.value)).toContain("32");

    const parrafo = abrirMenu("p");
    expect(todos(parrafo.menu).filter((n) => n.type === "number").map((n) => n.value)).toContain("17");
  });
});

/**
 * Mover bloques. Lo que se comprueba aquí es lo que puede desincronizar la vista
 * previa de lo que se guarda, que es el fallo grave de esta herramienta.
 */
describe("wc-editor.js · mover bloques", () => {
  /** Un padre con varios hijos, como una sección con tres párrafos. */
  function conHermanos(cuantos: number, cual: number, extras: string[] = []) {
    const ctx = montar();
    const padre = crearNodo("section");
    padre.setAttribute("data-wc-id", "0");
    const hijos = Array.from({ length: cuantos }, (_, i) => {
      const p = crearNodo("p");
      p.setAttribute("data-wc-id", String(i + 1));
      p.textContent = `Párrafo ${i + 1}`;
      padre.appendChild(p);
      return p;
    });
    // Cosas que la vista previa añade y el documento guardado NO tiene.
    for (const tag of extras) padre.appendChild(crearNodo(tag));
    for (const f of ctx.oyentesDoc["click"] ?? []) f({ target: hijos[cual] });
    return { ...ctx, padre, hijos, menu: ctx.cuerpo.children[0] };
  }

  it("subir manda el desplazamiento y mueve el bloque en la vista previa", () => {
    const m = conHermanos(3, 1);
    botonConTexto(m.menu, "↑ Subir")._disparar("click");
    expect(m.mensajes.at(-1)?.op).toMatchObject({ kind: "mover", value: -1, nodeId: 2 });
    expect(m.padre.children.map((c) => c.textContent)).toEqual(["Párrafo 2", "Párrafo 1", "Párrafo 3"]);
  });

  /**
   * EL punto de que el valor sea un acumulado. Dos clics tienen que mandar -2 en
   * una sola op: con dos ops de -1, la deduplicación se queda con una y el
   * bloque acabaría una posición más arriba en la web que en la pantalla.
   */
  it("dos clics mandan -2, no dos veces -1", () => {
    const m = conHermanos(3, 2);
    botonConTexto(m.menu, "↑ Subir")._disparar("click");
    botonConTexto(m.menu, "↑ Subir")._disparar("click");
    expect(m.mensajes.at(-1)?.op).toMatchObject({ kind: "mover", value: -2, nodeId: 3 });
    expect(m.padre.children.map((c) => c.textContent)).toEqual(["Párrafo 3", "Párrafo 1", "Párrafo 2"]);
  });

  it("volver al sitio manda 0, que el servidor descarta", () => {
    const m = conHermanos(3, 1);
    botonConTexto(m.menu, "↑ Subir")._disparar("click");
    botonConTexto(m.menu, "↓ Bajar")._disparar("click");
    expect(m.mensajes.at(-1)?.op).toMatchObject({ kind: "mover", value: 0 });
    expect(m.padre.children.map((c) => c.textContent)).toEqual(["Párrafo 1", "Párrafo 2", "Párrafo 3"]);
  });

  it("en los extremos el botón está apagado, no escondido", () => {
    const primero = conHermanos(3, 0);
    expect(botonConTexto(primero.menu, "↑ Subir")).toHaveProperty("disabled", true);
    expect(botonConTexto(primero.menu, "↓ Bajar")).not.toHaveProperty("disabled", true);

    const ultimo = conHermanos(3, 2);
    expect(botonConTexto(ultimo.menu, "↓ Bajar")).toHaveProperty("disabled", true);
  });

  /**
   * Lo que la vista previa añade y el documento guardado no tiene: el `<wc-t>`
   * que envuelve el texto suelto y el `<script>` del editor. Si contaran como
   * hermanos, el bloque se movería una posición de más al guardar — una cosa en
   * pantalla y otra en la web publicada.
   */
  it("no cuenta como hermanos lo que solo existe en la vista previa", () => {
    const m = conHermanos(2, 1, ["wc-t", "script"]);
    // Está el último de los DOS de verdad, aunque en el DOM tenga dos detrás.
    expect(botonConTexto(m.menu, "↓ Bajar")).toHaveProperty("disabled", true);
    botonConTexto(m.menu, "↑ Subir")._disparar("click");
    expect(m.mensajes.at(-1)?.op).toMatchObject({ kind: "mover", value: -1 });
  });
});

/**
 * Sebas, el 10/08, con el menú abierto encima del texto que acababa de elegir:
 * «el recuadro se abre encima de él, y no es en el único lado que pasa».
 *
 * Tenía razón. El menú se colocaba SIEMPRE debajo del elemento, y como mide más
 * de 400px tapaba justo la parte de la página en la que estabas trabajando: para
 * ver el efecto de un botón había que cerrarlo, mirar, y volver a abrirlo.
 *
 * Ahora se pone AL LADO siempre que quepa. Debajo solo queda como último recurso
 * —pantalla estrecha, o un bloque que ocupa todo el ancho—, que es cuando «al
 * lado» no existe.
 *
 * Las cuentas de aquí salen de la ventana falsa: 1200px de ancho útil, 800 de
 * alto, y un menú de 280 de ancho.
 */
describe("wc-editor.js · dónde se coloca el menú", () => {
  /** Abre el menú sobre un elemento que cae donde se le diga. */
  function colocar(rect: Partial<Rect>, alto = 0) {
    const m = abrirMenu("p", rect);
    if (alto > 0) {
      // El alto solo se conoce con el menú ya montado: se vuelve a colocar, que
      // es lo que hace el navegador en el fotograma siguiente.
      m.menu.offsetHeight = alto;
      for (const f of m.oyentesDoc["click"] ?? []) f({ target: m.el });
    }
    return m.menu.style;
  }

  it("a la derecha del elemento cuando hay sitio", () => {
    const s = colocar({ top: 100, bottom: 140, left: 40, right: 400 });
    // Pegado al borde derecho del elemento, solapando 2px: sin hueco muerto que
    // cruzar con el ratón.
    expect(s.left).toBe("398px");
    expect(s.top).toBe("100px");
  });

  it("a la izquierda cuando a la derecha ya no cabe", () => {
    const s = colocar({ top: 100, bottom: 140, left: 950, right: 1180 });
    expect(s.left).toBe("672px"); // 950 + 2 - 280
  });

  // Un bloque a todo el ancho no tiene lados libres. Antes que salirse de la
  // pantalla, se vuelve a lo de siempre.
  it("debajo cuando el bloque ocupa todo el ancho", () => {
    const s = colocar({ top: 100, bottom: 140, left: 0, right: 1200 });
    expect(s.left).toBe("0px");
    expect(s.top).toBe("138px");
  });

  it("puesto al lado, sube lo justo para no salirse por abajo", () => {
    const s = colocar({ top: 700, bottom: 740, left: 40, right: 400 }, 500);
    expect(s.left).toBe("398px");
    expect(s.top).toBe("292px"); // 800 - 500 - 8
  });

  // Un menú más alto que la ventana no cabe de ninguna forma: que se vea desde
  // arriba y ruede por dentro, en vez de quedarse con la cabecera fuera.
  it("y si es más alto que la ventana, arranca arriba del todo", () => {
    const s = colocar({ top: 700, bottom: 740, left: 40, right: 400 }, 900);
    expect(s.top).toBe("8px");
  });
});

/**
 * Sebas, el 10/08: «hay palabras que vienen sueltas… ¿podemos hacer una
 * herramienta para juntar todo el texto en 1?».
 *
 * Lo que veía: un punto de lista que empieza con una palabra en negrita se
 * partía en dos trozos que se elegían por separado. No lo parte la IA que
 * escribió la web —ahí es un `<li>` normal—, lo parte el editor: envuelve el
 * texto suelto en un `<wc-t>` para poder cambiarlo por su cuenta.
 *
 * Ahora se juntan. Pero solo CUANDO JUNTARLOS NO PIERDE NADA: al guardar un
 * texto con formato el servidor lo reescribe dejando las etiquetas peladas, así
 * que una negrita con `class` propia o un enlace (que tiene dirección) se
 * quedarían por el camino. En esos casos sigue cada trozo por su cuenta.
 */
describe("wc-editor.js · juntar el texto de un bloque", () => {
  /**
   * Un punto de lista como los que escribe la IA, ya anotado por la vista
   * previa: `<li><strong>X</strong><wc-t> resto</wc-t></li>`.
   */
  function listaConNegrita(attrsNegrita: Record<string, string> = {}, tagSegundo = "wc-t") {
    const ctx = montar();
    const li = crearNodo("li");
    li.setAttribute("data-wc-id", "3");
    li.textContent = "Automatización es esencial.";

    const fuerte = crearNodo("strong");
    fuerte.setAttribute("data-wc-id", "4");
    fuerte.textContent = "Automatización";
    for (const [n, v] of Object.entries(attrsNegrita)) fuerte.setAttribute(n, v);

    const resto = crearNodo(tagSegundo);
    if (tagSegundo === "wc-t") resto.setAttribute("data-wc-tn", "3:0");
    else resto.setAttribute("data-wc-id", "5");
    resto.textContent = " es esencial.";

    li.appendChild(fuerte);
    li.appendChild(resto);
    return { ...ctx, li, fuerte, resto };
  }

  /** Sobre qué elemento actúa el menú: se pregunta con el selector de color. */
  function aQuienApunta(ctx: ReturnType<typeof listaConNegrita>, pinchado: Nodo): number {
    for (const f of ctx.oyentesDoc["click"] ?? []) f({ target: pinchado });
    const menu = ctx.cuerpo.children[0];
    const color = todos(menu).find((n) => n.type === "color");
    expect(color, "el menú no trae selector de color").toBeTruthy();
    color!.value = "#ff0000";
    color!._disparar("input");
    return ctx.mensajes.at(-1)?.op?.nodeId as number;
  }

  it("pinchando la negrita se elige el punto entero, no la palabra", () => {
    const ctx = listaConNegrita();
    expect(aQuienApunta(ctx, ctx.fuerte)).toBe(3);
  });

  it("y pinchando el resto de la frase, también", () => {
    const ctx = listaConNegrita();
    expect(aQuienApunta(ctx, ctx.resto)).toBe(3);
  });

  // Aquí juntar SÍ perdería algo: al guardar, el servidor reescribe el formato
  // sin atributos y la negrita se quedaría sin su clase. Antes que cambiar la
  // web por detrás, se deja como estaba.
  it("una negrita con estilo propio NO se junta", () => {
    const ctx = listaConNegrita({ class: "text-lima" });
    expect(aQuienApunta(ctx, ctx.fuerte)).toBe(4);
  });

  // Un enlace tiene dirección propia: hay que poder pincharlo para cambiarla.
  it("con un enlace dentro, cada trozo sigue por su cuenta", () => {
    const ctx = listaConNegrita({}, "a");
    expect(aQuienApunta(ctx, ctx.fuerte)).toBe(4);
    // Y el enlace se sigue eligiendo a sí mismo.
    for (const f of ctx.oyentesDoc["click"] ?? []) f({ target: ctx.resto });
    const textos = todos(ctx.cuerpo.children[0]).map((n) => n.textContent);
    expect(textos).toContain("Enlace");
  });

  // El envoltorio solo existe en la vista previa: si viajara en lo que se
  // guarda, acabaría escrito en la web publicada del cliente.
  it("lo que se guarda no lleva el envoltorio de la vista previa", () => {
    const ctx = listaConNegrita();
    for (const f of ctx.oyentesDoc["click"] ?? []) f({ target: ctx.fuerte });
    ctx.li.innerHTML = '<strong data-wc-id="4">Automatización</strong><wc-t data-wc-tn="3:0"> ya no es opcional.</wc-t>';
    for (const f of ctx.oyentesDoc["keydown"] ?? []) f({ key: "Enter", target: ctx.li, preventDefault() {} });
    expect(ctx.mensajes.at(-1)?.op).toMatchObject({
      kind: "richText",
      nodeId: 3,
      value: '<strong data-wc-id="4">Automatización</strong> ya no es opcional.',
    });
  });
});

/**
 * Sebas, el 10/08, con cuatro puntos de una lista recuadrados a la vez: «mira lo
 * que pasa ahora cuando paso el ratón por encima, se quedan marcados».
 *
 * Efecto colateral de juntar el texto: el recuadro pasó a pintarse sobre el
 * BLOQUE aunque el ratón estuviera sobre la negrita de dentro, pero el bloque no
 * se resolvía a sí mismo —un párrafo con una negrita no es «texto rico», porque
 * entre sus hijos está el envoltorio del texto suelto—. Al salir por su propio
 * borde no había nada que desmarcar y el recuadro se quedaba pegado.
 */
describe("wc-editor.js · el recuadro de «esto se puede tocar»", () => {
  function listaDePuntos(cuantos: number) {
    const ctx = montar();
    const lista = crearNodo("ul");
    ctx.cuerpo.appendChild(lista);
    const puntos = [];
    for (let i = 0; i < cuantos; i++) {
      const li = crearNodo("li");
      li.setAttribute("data-wc-id", String(10 + i));
      li.textContent = "Punto " + i + " con negrita";
      const fuerte = crearNodo("strong");
      fuerte.setAttribute("data-wc-id", String(20 + i));
      fuerte.textContent = "Punto " + i;
      const resto = crearNodo("wc-t");
      resto.setAttribute("data-wc-tn", 10 + i + ":0");
      resto.textContent = " con negrita";
      li.appendChild(fuerte); li.appendChild(resto);
      lista.appendChild(li);
      puntos.push({ li, fuerte });
    }
    const encima = (n: Nodo) => { for (const f of ctx.oyentesDoc["mouseover"] ?? []) f({ target: n }); };
    return { ...ctx, puntos, encima };
  }

  // El que fallaba: el ratón por el hueco del propio punto, sin tocar la negrita.
  it("un bloque se reconoce también desde sí mismo, no solo desde sus hijos", () => {
    const m = listaDePuntos(1);
    m.encima(m.puntos[0].li);
    expect(m.puntos[0].li.style.outline).toBeTruthy();
  });

  it("pasando por la negrita se marca el punto entero", () => {
    const m = listaDePuntos(1);
    m.encima(m.puntos[0].fuerte);
    expect(m.puntos[0].li.style.outline).toBeTruthy();
    expect(m.puntos[0].fuerte.style.outline).toBeFalsy();
  });

  // El ratón está en un sitio, no en cuatro.
  it("marcar el siguiente borra el anterior", () => {
    const m = listaDePuntos(3);
    m.encima(m.puntos[0].fuerte);
    m.encima(m.puntos[1].fuerte);
    m.encima(m.puntos[2].li);
    expect(m.puntos.map((p) => !!p.li.style.outline)).toEqual([false, false, true]);
  });
});
