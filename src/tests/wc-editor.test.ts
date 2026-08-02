import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isSafeHref } from "@/src/editor/validate-op";

// `public/wc-editor.js` es el script que corre DENTRO de la web del cliente, en un
// iframe. No pasa por TypeScript, no lo importa ningún módulo y no se puede probar
// con jsdom sin montar medio navegador. O sea que hay una familia de fallos que no
// ve absolutamente nada: ni los tests, ni el typecheck, ni el build, ni
// `node --check`. Solo se ven abriendo el menú y mirando.
//
// Esto no lo prueba todo, pero sí cierra la puerta por la que ya se coló uno.
const FUENTE = readFileSync(resolve(process.cwd(), "public/wc-editor.js"), "utf-8");

describe("wc-editor.js", () => {
  it("compila como JavaScript", () => {
    expect(() => new Function(FUENTE)).not.toThrow();
  });

  /**
   * El 2026-08-02 se añadió una función `barra(...)` para las barras deslizantes.
   * Ya existía un `var barra` —la barra de formato de texto— en el mismo ámbito.
   * Cuando un `var` y una función comparten nombre, el `var` gana: al abrir el
   * menú, `barra` era un div, llamarlo lanzaba TypeError y reventaba `construir`
   * entero, así que desaparecían el tamaño, el margen y «Añadir una imagen».
   *
   * Sintaxis válida. Tests en verde. Build limpio. Lo vio Sebas al abrir el menú.
   */
  it("ninguna función se llama igual que un var (el var gana y la deja muerta)", () => {
    const vars = [...FUENTE.matchAll(/^\s{2}var\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
    const funciones = [...FUENTE.matchAll(/^\s{2}function\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
    const colisiones = funciones.filter((f) => vars.includes(f));
    expect(colisiones, `colisionan con un var: ${colisiones.join(", ")}`).toEqual([]);
  });

  it("no hay dos funciones con el mismo nombre (la última gana en silencio)", () => {
    const nombres = [...FUENTE.matchAll(/^\s{2}function\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
    const repetidos = nombres.filter((n, i) => nombres.indexOf(n) !== i);
    expect([...new Set(repetidos)], "declaradas dos veces").toEqual([]);
  });

  // Los tipos de op que este script emite tienen que existir en el motor. Si se
  // escribe mal uno, el servidor lo descarta en silencio: el usuario ve el cambio
  // en pantalla, guarda, y al recargar no está.
  it("solo emite tipos de op que el motor sabe aplicar", () => {
    const emitidos = [...FUENTE.matchAll(/kind:\s*"([a-zA-Z]+)"/g)].map((m) => m[1]);
    const conocidos = ["text", "richText", "href", "src", "insertImage", "align", "size", "margen", "style", "textNode"];
    const desconocidos = [...new Set(emitidos)].filter((k) => !conocidos.includes(k));
    expect(desconocidos, `el motor no conoce: ${desconocidos.join(", ")}`).toEqual([]);
    // Y que de verdad emite algo, no vaya a ser que el regex deje de encontrar nada
    // y este test pase por no mirar nada.
    expect(emitidos.length).toBeGreaterThan(5);
  });

  /**
   * El preview se pinta en un iframe con `sandbox="allow-scripts"` y SIN
   * `allow-modals`. En un documento sandboxed así, el navegador se salta
   * alert/confirm/prompt y devuelve null sin preguntar nada: el botón del enlace
   * de la barra de formato estuvo sin hacer NADA, en silencio, desde que se
   * escribió. Todo lo que haya que preguntar se pregunta con DOM propio.
   */
  it("no usa alert/confirm/prompt (el sandbox del preview se los salta)", () => {
    const modales = [...FUENTE.matchAll(/\bwindow\.(alert|confirm|prompt)\s*\(/g)].map((m) => m[1]);
    expect(modales, `el sandbox los ignora: ${modales.join(", ")}`).toEqual([]);
  });

  it("el iframe del preview sigue sin allow-same-origin", () => {
    // `allow-scripts` + `allow-same-origin` juntos dejan que el documento de dentro
    // se quite el sandbox a sí mismo. Dentro corre la web de un cliente: no.
    const panel = readFileSync(resolve(process.cwd(), "app/projects/[id]/PreviewPane.tsx"), "utf-8");
    const sandbox = panel.match(/sandbox="([^"]*)"/);
    expect(sandbox, "el iframe del preview ya no declara sandbox").not.toBeNull();
    expect(sandbox![1].split(/\s+/)).not.toContain("allow-same-origin");
  });

  /**
   * `hrefSeguro` (aquí) y `isSafeHref` (servidor) tienen que decir lo mismo. Si el
   * editor deja pasar una dirección que el servidor rechaza, `sanitizeInline`
   * desenvuelve el <a> al guardar: el usuario ve su enlace puesto, publica, y el
   * enlace no está. Sin ningún error por el camino.
   */
  it("valida los enlaces igual que el servidor", () => {
    const i = FUENTE.indexOf("function hrefSeguro");
    expect(i, "ya no existe hrefSeguro en el editor").toBeGreaterThan(-1);
    let j = FUENTE.indexOf("{", i), prof = 0, fin = j;
    for (; fin < FUENTE.length; fin++) {
      if (FUENTE[fin] === "{") prof++;
      else if (FUENTE[fin] === "}" && --prof === 0) break;
    }
    const hrefSeguro = new Function(`${FUENTE.slice(i, fin + 1)}; return hrefSeguro;`)() as (u: string) => boolean;

    const casos = [
      "https://estrenala.es", "http://x.com/a?b=1", "mailto:hola@estrenala.es", "tel:+34600000000",
      "/precios", "#contacto", "contacto.html", "../index.html", "",
      "javascript:alert(1)", "JavaScript:alert(1)", "java\tscript:alert(1)", "  javascript:alert(1)  ",
      "data:text/html,<script>", "vbscript:msgbox", "ftp://x.com", "file:///etc/passwd",
    ];
    for (const c of casos) {
      expect(hrefSeguro(c), `discrepan en ${JSON.stringify(c)}`).toBe(isSafeHref(c));
    }
  });
});
