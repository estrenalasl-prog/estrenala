import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * El logo del pie salía aplastado en el móvil (09/08). Dos reglas conspiraban:
 * `.landing img` fijaba `max-width:100%` sin `height:auto`, y el logo del pie
 * fijaba el alto sin liberar el ancho. Con el ancho recortado por la pantalla y
 * el alto clavado, la proporción se rompe.
 *
 * En el escritorio también estaba mal, pero como el ancho cabía no se notaba: el
 * fallo solo daba la cara donde la pantalla es más estrecha que la imagen.
 */
const css = readFileSync(
  path.resolve(process.cwd(), "app/_landing/landing.css"),
  "utf8"
);

describe("las imágenes de la portada no se deforman", () => {
  it("`max-width:100%` nunca va sin `height:auto`", () => {
    const base = css.match(/\.landing img\s*\{([^}]*)\}/)?.[1];
    expect(base, "no se encuentra la regla base de imágenes").toBeTruthy();
    expect(base).toContain("max-width:100%");
    expect(
      base,
      "al recortarse el ancho, sin height:auto la imagen se aplasta"
    ).toMatch(/height:\s*auto/);
  });

  it("todo logo con alto fijo libera el ancho", () => {
    const malos: string[] = [];
    for (const m of css.matchAll(/([^{}]*\blogo[\w-]*)\s*\{([^}]*)\}/g)) {
      const [, selector, cuerpo] = m;
      if (!/height:\s*\d+px/.test(cuerpo)) continue;
      if (!/width:\s*auto/.test(cuerpo)) malos.push(selector.trim());
    }
    // Y que de verdad haya mirado logos: si el patrón deja de encontrarlos, el
    // test pasaría sin comprobar nada.
    const conAlto = [...css.matchAll(/[^{}]*\blogo[\w-]*\s*\{[^}]*height:\s*\d+px[^}]*\}/g)];
    expect(conAlto.length, "no se ha encontrado ningún logo con alto fijo").toBeGreaterThan(1);
    expect(malos, `alto fijo sin width:auto: ${malos.join(" · ")}`).toEqual([]);
  });
});
