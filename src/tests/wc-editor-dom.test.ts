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
  readonly firstChild: Nodo | null;
  appendChild(h: Nodo): Nodo;
  insertBefore(h: Nodo, ref: Nodo | null): Nodo;
  addEventListener(t: string, f: (e: unknown) => void): void;
  removeEventListener(): void;
  setAttribute(n: string, v: string): void;
  getAttribute(n: string): string | null;
  hasAttribute(n: string): boolean;
  removeAttribute(n: string): void;
  contains(o: unknown): boolean;
  closest(): Nodo | null;
  focus(): void;
  getBoundingClientRect(): { top: number; bottom: number; left: number; right: number; width: number; height: number };
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
    contains(o: unknown) { return o === nodo; },
    closest() { return null; },
    focus() {},
    getBoundingClientRect: () => ({ top: 100, bottom: 140, left: 40, right: 400, width: 360, height: 40 }),
    scrollIntoView() {},
    offsetHeight: 0,
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
  };

  // El script es un IIFE que no exporta nada: se le pasan `document` y `window`
  // como parámetros para que use los falsos en vez de buscarlos fuera.
  // `getComputedStyle` va suelto además de dentro de `window` porque el script
  // lo llama de las dos formas.
  new Function("document", "window", "getComputedStyle", FUENTE)(documento, ventana, ventana.getComputedStyle);

  return { cuerpo, mensajes, oyentesDoc, documento };
}

/** Abre el menú sobre un elemento, como hace un clic del usuario. */
function abrirMenu(tag: string) {
  const ctx = montar();
  const el = crearNodo(tag);
  el.setAttribute("data-wc-id", "7");
  el.textContent = "Un párrafo cualquiera";
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
