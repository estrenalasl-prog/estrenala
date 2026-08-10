import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RECUADROS, PROPIEDADES_RECUADRO } from "@/src/editor/apply";
import { claveOp } from "@/src/editor/clave-op";

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

type Mensaje = { type?: string; op?: Record<string, unknown>; clave?: string };

type Estilo = Record<string, unknown> & {
  _puestas: [string, string][];
  _quitadas: string[];
  _prioridades: Record<string, string>;
  setProperty(n: string, v: string, prio?: string): void;
  removeProperty(n: string): void;
  getPropertyValue(n: string): string;
  getPropertyPriority(n: string): string;
};

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

/**
 * En un navegador `style.marginTop = "8px"` y `style.getPropertyValue("margin-top")`
 * son LA MISMA propiedad. El editor usa las dos formas —escribe en camelCase y
 * lee con guiones para apuntar cómo se deshace—, así que si aquí fueran dos
 * cajones distintos, «deshacer» saldría verde sin devolver nada a su sitio.
 *
 * De ahí el Proxy: normaliza el nombre en los dos sentidos. Lo que no es una
 * propiedad CSS (`cssText`, los métodos, los espías del test) pasa tal cual.
 */
const CLAVES_DIRECTAS = new Set([
  "cssText", "setProperty", "removeProperty", "getPropertyValue", "getPropertyPriority",
  "_puestas", "_quitadas", "_prioridades",
]);
function conGuiones(n: string): string {
  return n.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
}
function crearEstilo(): Estilo {
  const puestas: [string, string][] = [];
  const quitadas: string[] = [];
  // La prioridad (`!important`) va en su propio cajón, como en el navegador: es
  // un dato aparte del valor, no un trozo del valor.
  const prioridades: Record<string, string> = {};
  const base: Record<string, unknown> = {
    cssText: "",
    setProperty(n: string, v: string, prio?: string) { puestas.push([n, v]); base[n] = v; prioridades[n] = prio || ""; },
    removeProperty(n: string) { quitadas.push(n); delete base[n]; delete prioridades[n]; },
    getPropertyValue(n: string) { const v = base[n]; return typeof v === "string" ? v : ""; },
    getPropertyPriority(n: string) { return prioridades[n] ?? ""; },
    _puestas: puestas,
    _quitadas: quitadas,
    _prioridades: prioridades,
  };
  const nombre = (k: string) => (CLAVES_DIRECTAS.has(k) ? k : conGuiones(k));
  return new Proxy(base, {
    get: (t, k) => (typeof k === "string" ? t[nombre(k)] : undefined),
    set: (t, k, v) => { if (typeof k === "string") t[nombre(k)] = v; return true; },
    deleteProperty: (t, k) => { if (typeof k === "string") delete t[nombre(k)]; return true; },
  }) as unknown as Estilo;
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
  const oyentesVentana: Record<string, ((e: unknown) => void)[]> = {};

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
    // El script escucha aquí los mensajes del panel (la imagen subida, «deshacer»).
    // Antes esto no guardaba nada y esa mitad del editor no la ejecutaba nadie.
    addEventListener(t: string, f: (e: unknown) => void) { (oyentesVentana[t] ??= []).push(f); },
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

  /** Un mensaje del panel al iframe, con el `source` que el script exige. */
  function delPadre(data: unknown) {
    for (const f of oyentesVentana["message"] ?? []) f({ source: ventana.parent, data });
  }
  /**
   * «Deshacer» y devuelve la clave que el iframe dice haber deshecho, o
   * `undefined` si no había nada.
   *
   * Se compara CUÁNTOS mensajes hay antes y después: mirar solo el último daba
   * por bueno el `wc-undone` de la vez anterior, y con eso «no queda nada por
   * deshacer» salía verde sin serlo.
   */
  function deshacer(): string | undefined {
    const antes = mensajes.length;
    delPadre({ type: "wc-undo" });
    if (mensajes.length === antes) return undefined;
    const ultimo = mensajes.at(-1)!;
    return ultimo.type === "wc-undone" ? ultimo.clave : undefined;
  }

  return { cuerpo, mensajes, oyentesDoc, documento, delPadre, deshacer };
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

/**
 * Sebas, el 10/08, después de que le contara qué se perdería al juntar un texto
 * con un enlace o una palabra con estilo propio: «¿podría salir un mensaje de
 * alerta tipo "si cambias eso perderás…"?».
 *
 * Mejor que avisar es que no pase. Y quedaba una puerta abierta, anterior a lo
 * de juntar: un párrafo cuyo contenido es `<a class="btn">` o
 * `<strong class="…">` se podía escribir ENTERO, y al guardar el servidor
 * reescribe el formato pelado — la clase se perdía sin que nadie lo viera.
 *
 * Ahora en el contenedor no se escribe: se escribe en el trozo de dentro, que se
 * guarda sin tocar sus atributos. El texto sigue siendo editable; lo que cambia
 * es a qué nivel.
 */
describe("wc-editor.js · no se escribe donde escribir rompe", () => {
  function parrafoCon(hijo: string, attrs: Record<string, string>) {
    const ctx = montar();
    const p = crearNodo("p");
    p.setAttribute("data-wc-id", "1");
    p.textContent = "Ver la oferta";
    const dentro = crearNodo(hijo);
    dentro.setAttribute("data-wc-id", "2");
    dentro.textContent = "Ver la oferta";
    for (const [n, v] of Object.entries(attrs)) dentro.setAttribute(n, v);
    p.appendChild(dentro);
    const pinchar = (n: Nodo) => { for (const f of ctx.oyentesDoc["click"] ?? []) f({ target: n }); };
    return { ...ctx, p, dentro, pinchar };
  }

  it("un párrafo con una negrita con clase propia no se escribe entero", () => {
    const m = parrafoCon("strong", { class: "text-brand" });
    m.pinchar(m.p);
    expect(m.p.getAttribute("contenteditable")).toBeNull();
  });

  it("pero la negrita sí, y se guarda sin tocar su clase", () => {
    const m = parrafoCon("strong", { class: "text-brand" });
    m.pinchar(m.dentro);
    expect(m.dentro.getAttribute("contenteditable")).toBe("true");
    m.dentro.textContent = "Ver la oferta ya";
    for (const f of m.oyentesDoc["keydown"] ?? []) f({ key: "Enter", target: m.dentro, preventDefault() {} });
    // `text` y no `richText`: solo viaja el texto, los atributos ni se mencionan.
    expect(m.mensajes.at(-1)?.op).toMatchObject({ kind: "text", nodeId: 2, value: "Ver la oferta ya" });
  });

  it("y con un enlace dentro, tampoco", () => {
    const m = parrafoCon("a", { class: "btn", href: "/oferta" });
    m.pinchar(m.p);
    expect(m.p.getAttribute("contenteditable")).toBeNull();
  });

  // Lo de siempre tiene que seguir funcionando: un texto sin nada dentro, y un
  // bloque con formato pelado, se escriben tal cual.
  it("un texto normal se sigue escribiendo", () => {
    const ctx = montar();
    const p = crearNodo("p");
    p.setAttribute("data-wc-id", "1");
    p.textContent = "Un párrafo cualquiera";
    for (const f of ctx.oyentesDoc["click"] ?? []) f({ target: p });
    expect(p.getAttribute("contenteditable")).toBe("true");
  });

  it("y uno con una negrita pelada, también", () => {
    const m = parrafoCon("strong", {});
    m.pinchar(m.dentro);
    expect(m.p.getAttribute("contenteditable")).toBe("true");
  });
});

/**
 * Deshacer el último cambio. Hasta ahora la única vuelta atrás era «Descartar»,
 * que los tira TODOS: con nueve cambios hechos y el noveno mal, se perdían los
 * nueve. Con eso encima nadie prueba nada.
 *
 * Se deshace en el DOM y no recargando la vista previa, y no por comodidad: al
 * recargar se vuelve a numerar la página, y los cambios que siguen pendientes
 * apuntan a los números de ANTES —insertar una imagen los corre—, así que se
 * guardaría sobre elementos equivocados.
 *
 * La regla que sostiene todo esto: **una vuelta atrás por CLAVE**, la misma con
 * la que el panel deduplica y cuenta. Si aquí hubiera un paso por tirón de barra,
 * el contador diría «1 cambio» y harían falta cuarenta deshaceres.
 */
describe("wc-editor.js · deshacer", () => {
  /** El deslizador de un título: se arrastra y se suelta, como con el ratón. */
  function barra(menu: Nodo, cual: number) {
    const rangos = todos(menu).filter((n) => n.type === "range");
    expect(rangos.length, "no hay deslizadores en el menú").toBeGreaterThan(cual);
    return {
      arrastrar(v: number) { rangos[cual].value = String(v); rangos[cual]._disparar("input"); },
      soltar(v: number) { rangos[cual].value = String(v); rangos[cual]._disparar("change"); },
    };
  }

  it("una alineación vuelve a la que había", () => {
    const m = abrirMenu("p");
    m.el.style.setProperty("text-align", "right");
    botonConTexto(m.menu, "Centro")._disparar("click");
    expect(m.el.style.textAlign).toBe("center");
    expect(m.deshacer()).toBe("index.html#7#textAlign#");
    expect(m.el.style.textAlign).toBe("right");
  });

  // Lo que no estaba puesto se deshace QUITÁNDOLO. Ponerlo a un valor de fábrica
  // dejaría escrito en la web un `text-align: left` que nadie pidió y que además
  // pisaría lo que dijera su CSS.
  it("lo que no estaba puesto se deshace quitándolo, no poniéndolo a cero", () => {
    const m = abrirMenu("p");
    botonConTexto(m.menu, "Der.")._disparar("click");
    m.deshacer();
    expect(m.el.style.textAlign).toBeUndefined();
    expect(m.el.style._quitadas).toContain("text-align");
  });

  it("un recuadro devuelve el grupo entero, no solo lo que escribió", () => {
    const m = abrirMenu("p");
    m.el.style.setProperty("border-radius", "4px");
    botonConTexto(m.menu, "Fondo suave")._disparar("click");
    expect(m.el.style.getPropertyValue("background-color")).toBeTruthy();
    m.deshacer();
    expect(m.el.style.getPropertyValue("background-color")).toBe("");
    expect(m.el.style.getPropertyValue("border-radius")).toBe("4px");
  });

  // Arrastrar la barra manda UNA op y cuenta como UN cambio: tiene que deshacerse
  // de una vez y volver al tamaño de partida, no al penúltimo tirón.
  it("la barra de tamaño se deshace de una vez, no tirón a tirón", () => {
    const m = abrirMenu("p");
    const tam = barra(m.menu, 0);
    tam.arrastrar(30); tam.arrastrar(40); tam.soltar(52);
    expect(m.el.style.fontSize).toBe("52px");
    expect(m.deshacer()).toBe("index.html#7#fontSize#");
    expect(m.el.style.fontSize).toBeUndefined();
    // Y no queda un segundo paso escondido de los tirones intermedios.
    expect(m.deshacer()).toBeUndefined();
  });

  it("deshace lo ÚLTIMO que se tocó, no lo primero", () => {
    const m = abrirMenu("p");
    botonConTexto(m.menu, "Centro")._disparar("click");
    botonConTexto(m.menu, "Con borde")._disparar("click");
    expect(m.deshacer()).toBe("index.html#7#recuadro#");
    expect(m.el.style.textAlign).toBe("center"); // el primero sigue puesto
    expect(m.deshacer()).toBe("index.html#7#textAlign#");
  });

  // Tocar dos veces lo mismo es UN cambio para el panel, así que es UNA vuelta
  // atrás — y tiene que llevar al estado de antes del PRIMER toque.
  it("tocar dos veces lo mismo se deshace hasta el principio", () => {
    const m = abrirMenu("p");
    botonConTexto(m.menu, "Centro")._disparar("click");
    botonConTexto(m.menu, "Der.")._disparar("click");
    expect(m.deshacer()).toBe("index.html#7#textAlign#");
    expect(m.el.style.textAlign).toBeUndefined();
    expect(m.deshacer()).toBeUndefined();
  });

  it("sin cambios no dice nada", () => {
    const m = abrirMenu("p");
    expect(m.deshacer()).toBeUndefined();
  });
});

describe("wc-editor.js · deshacer, los casos que tocan el documento", () => {
  /** Tres párrafos hermanos; se abre el menú del de en medio. */
  function trisHermanos() {
    const ctx = montar();
    const seccion = crearNodo("section");
    ctx.cuerpo.appendChild(seccion);
    const hijos = [0, 1, 2].map((i) => {
      const p = crearNodo("p");
      p.setAttribute("data-wc-id", String(30 + i));
      p.textContent = "Párrafo " + i;
      seccion.appendChild(p);
      return p;
    });
    for (const f of ctx.oyentesDoc["click"] ?? []) f({ target: hijos[1] });
    return { ...ctx, seccion, hijos, menu: ctx.cuerpo.children[0] };
  }

  const nombres = (s: Nodo) => s.children.map((c) => c.textContent);

  it("mover un bloque y deshacer lo devuelve a su sitio", () => {
    const m = trisHermanos();
    botonConTexto(m.menu, "↑ Subir")._disparar("click");
    expect(nombres(m.seccion)).toEqual(["Párrafo 1", "Párrafo 0", "Párrafo 2"]);
    expect(m.deshacer()).toBe("index.html#31#mover#");
    expect(nombres(m.seccion)).toEqual(["Párrafo 0", "Párrafo 1", "Párrafo 2"]);
  });

  // Subir dos veces es UN cambio (se manda el acumulado), así que es UNA vuelta
  // atrás, y tiene que llevar al sitio original y no al escalón de en medio.
  it("subir dos veces se deshace de una vez", () => {
    const m = trisHermanos();
    botonConTexto(m.menu, "↑ Subir")._disparar("click");
    // El menú se reconstruye tras mover: hay que volver a buscar el botón.
    botonConTexto(m.cuerpo.children[0], "↓ Bajar")._disparar("click");
    botonConTexto(m.cuerpo.children[0], "↓ Bajar")._disparar("click");
    expect(nombres(m.seccion)).toEqual(["Párrafo 0", "Párrafo 2", "Párrafo 1"]);
    m.deshacer();
    expect(nombres(m.seccion)).toEqual(["Párrafo 0", "Párrafo 1", "Párrafo 2"]);
  });

  // El acumulado tiene que volver a cero: si se quedara en -1, el siguiente
  // «subir» mandaría -2 y el bloque acabaría dos sitios más arriba en la web que
  // en la pantalla.
  it("y después de deshacer, mover otra vez cuenta desde cero", () => {
    const m = trisHermanos();
    botonConTexto(m.menu, "↑ Subir")._disparar("click");
    m.deshacer();
    // Deshacer cierra el menú a propósito (enseñaría valores de antes). Se
    // reabre, como haría cualquiera, y ahí los botones se recalculan.
    for (const f of m.oyentesDoc["click"] ?? []) f({ target: m.hijos[1] });
    botonConTexto(m.cuerpo.children[0], "↑ Subir")._disparar("click");
    expect(m.mensajes.at(-1)?.op).toMatchObject({ kind: "mover", value: -1 });
  });

  it("un texto escrito a mano vuelve al de antes", () => {
    const m = abrirMenu("p");
    m.el.textContent = "Otra cosa";
    for (const f of m.oyentesDoc["keydown"] ?? []) f({ key: "Enter", target: m.el, preventDefault() {} });
    expect(m.mensajes.at(-1)?.op).toMatchObject({ kind: "text", value: "Otra cosa" });
    expect(m.deshacer()).toBe("index.html#7#text#");
    expect(m.el.textContent).toBe("Un párrafo cualquiera");
  });
});

/**
 * La costura entre el panel y el iframe.
 *
 * El panel cuenta los cambios y los deduplica por una clave; el iframe apunta
 * una vuelta atrás por esa MISMA clave y le dice cuál ha deshecho. Si las dos
 * mitades no contaran igual, el contador diría «2 cambios» con una sola vuelta
 * atrás disponible —o al revés, se guardaría algo que ya no se ve en pantalla—.
 */
describe("wc-editor.js · panel e iframe cuentan lo mismo", () => {
  it("la clave del iframe es la misma que la del panel", () => {
    const ops = [
      { page: "index.html", nodeId: 3, kind: "text", value: "x" },
      { page: "a.html", nodeId: 9, kind: "style", property: "color", value: "#fff" },
      { page: "index.html", nodeId: 4, kind: "textNode", index: 2, value: "y" },
      { page: "index.html", nodeId: 5, kind: "margen", value: 8, lado: "arriba" },
      { page: "index.html", nodeId: 5, kind: "margen", value: 8 },
      { page: "index.html", nodeId: 6, kind: "insertImage", posicion: "antes", value: "/wc-uploads/a.png" },
      { page: "index.html", nodeId: 7, kind: "mover", value: -2 },
    ];
    const ctx = montar();
    // Se le pide al propio script que las calcule: se emiten y se leen las
    // claves que devuelve al deshacerlas, en orden inverso.
    const p = crearNodo("p");
    p.setAttribute("data-wc-id", "7");
    p.textContent = "algo";
    for (const f of ctx.oyentesDoc["click"] ?? []) f({ target: p });
    expect(claveOp(ops[0])).toBe("index.html#3#text#");
    expect(claveOp(ops[1])).toBe("a.html#9#style#color");
    expect(claveOp(ops[2])).toBe("index.html#4#textNode#2");
    expect(claveOp(ops[3])).toBe("index.html#5#margen#arriba");
    expect(claveOp(ops[4])).toBe("index.html#5#margen#ambos");
    expect(claveOp(ops[5])).toBe("index.html#6#insertImage#antes#/wc-uploads/a.png");
    expect(claveOp(ops[6])).toBe("index.html#7#mover#");
  });

  // El de verdad: se toca de todo y luego se deshace hasta el final. Cada op que
  // el panel contaría tiene que tener su vuelta, ni una de más ni una de menos.
  // Este es el que caza que a una herramienta nueva se le olvide apuntarla.
  it("cada cambio que cuenta el panel tiene su vuelta atrás", () => {
    const m = abrirMenu("p");
    botonConTexto(m.menu, "Centro")._disparar("click");
    botonConTexto(m.menu, "Barra lateral")._disparar("click");
    const rangos = todos(m.menu).filter((n) => n.type === "range");
    for (const r of rangos) { r.value = "24"; r._disparar("change"); }
    const color = todos(m.menu).find((n) => n.type === "color")!;
    color.value = "#123456"; color._disparar("input");

    // Lo que el panel tendría en su lista, deduplicado igual que él.
    const enElPanel = new Set(
      m.mensajes.filter((x) => x.type === "wc-edit").map((x) => claveOp(x.op as never))
    );
    expect(enElPanel.size).toBeGreaterThan(4);

    const deshechas = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const c = m.deshacer();
      if (c === undefined) break;
      deshechas.add(c);
    }
    expect([...deshechas].sort()).toEqual([...enElPanel].sort());
  });
});

/**
 * La otra mitad de lo mismo: la vista previa tiene que escribir con la MISMA
 * prioridad que el servidor. Si el iframe pusiera `!important` y el servidor no
 * —o al revés—, el usuario vería el cambio y al guardar desaparecería.
 */
describe("wc-editor.js · en la vista previa también gana lo que elige el usuario", () => {
  it("la alineación se escribe con prioridad", () => {
    const m = abrirMenu("p");
    botonConTexto(m.menu, "Centro")._disparar("click");
    expect(m.el.style.getPropertyPriority("text-align")).toBe("important");
  });

  it("y el recuadro entero, declaración por declaración", () => {
    const m = abrirMenu("p");
    botonConTexto(m.menu, "Fondo suave")._disparar("click");
    for (const [prop] of RECUADROS.suave) {
      expect(m.el.style.getPropertyPriority(prop), `«${prop}» sin prioridad`).toBe("important");
    }
  });

  it("y el tamaño de la letra", () => {
    const m = abrirMenu("p");
    const rango = todos(m.menu).find((n) => n.type === "range")!;
    rango.value = "44"; rango._disparar("change");
    expect(m.el.style.getPropertyValue("font-size")).toBe("44px");
    expect(m.el.style.getPropertyPriority("font-size")).toBe("important");
  });

  // El caso de Sebas al revés: si la página ya traía su propio `!important`,
  // deshacer tiene que devolvérselo. Dejarlo como declaración normal lo haría
  // perder contra su propia hoja de estilos, o sea que «deshacer» habría
  // cambiado la web en vez de dejarla como estaba.
  it("deshacer devuelve también el !important que ya traía la página", () => {
    const m = abrirMenu("p");
    m.el.style.setProperty("font-size", "20px", "important");
    const rango = todos(m.menu).find((n) => n.type === "range")!;
    rango.value = "44"; rango._disparar("change");
    m.deshacer();
    expect(m.el.style.getPropertyValue("font-size")).toBe("20px");
    expect(m.el.style.getPropertyPriority("font-size")).toBe("important");
  });
});
