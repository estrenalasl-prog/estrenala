import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
});
