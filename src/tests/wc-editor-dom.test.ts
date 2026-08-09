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
    appendChild(h: Nodo) { h.parentNode = nodo; nodo.children.push(h); return h; },
    insertBefore(h: Nodo, ref: Nodo | null) {
      h.parentNode = nodo;
      const i = ref ? nodo.children.indexOf(ref) : -1;
      if (i === -1) nodo.children.push(h); else nodo.children.splice(i, 0, h);
      return h;
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
  return new Proxy(nodo, {
    set(o, k, v) {
      if (k === "innerHTML" && v === "") o.children.length = 0;
      (o as unknown as Record<string | symbol, unknown>)[k] = v;
      return true;
    },
  });
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
    // Un <p> es un bloque y un <span> no: es lo único que el script le pregunta
    // al navegador para decidir si los controles de bloque surten efecto.
    getComputedStyle: (el: Nodo) => ({
      display: el.tagName === "SPAN" || el.tagName === "A" ? "inline" : "block",
      color: "rgb(20, 21, 9)",
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
    for (const esperado of ["Alineación del texto", "Aire arriba", "Aire abajo", "Recuadro", "Añadir una imagen"]) {
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

describe("wc-editor.js · dónde NO salen los controles de bloque", () => {
  // Un `text-align` sobre un <span> en línea y un `margin-top` sobre él no hacen
  // absolutamente nada: el botón se pulsaría, no pasaría nada y parecería roto.
  // Es el mismo fallo que ya tuvo la alineación de imágenes.
  it("un elemento en línea no los trae", () => {
    const { menu } = abrirMenu("span");
    const textos = todos(menu).map((n) => n.textContent);
    expect(textos).not.toContain("Alineación del texto");
    expect(textos).not.toContain("Recuadro");
    // Pero sigue siendo editable: el menú no se queda vacío.
    expect(textos).toContain("Añadir una imagen");
  });
});
