import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Dónde sale el mensaje de error importa tanto como qué dice.
 *
 * El 2026-08-05 conectar un dominio falló y el aviso se pintó DEBAJO del panel
 * desplegable, por detrás de «Despublicar la web»: fuera de la pantalla. Desde
 * el sitio del usuario, el botón simplemente no hacía nada. Costó una hora
 * averiguar que sí había un mensaje, y estaba escrito.
 *
 * No hay DOM en estos tests, así que se comprueba sobre el propio fuente: el
 * error de la dirección tiene que estar ANTES del `</details>` y el de publicar
 * DESPUÉS, porque su botón vive fuera.
 */
const src = readFileSync(
  path.resolve(process.cwd(), "app/projects/[id]/PublishBar.tsx"),
  "utf8"
);
const cierreDetails = src.indexOf("</details>");

describe("dónde se pinta el error de la barra de publicar", () => {
  it("el desplegable existe y se cierra una sola vez", () => {
    expect(cierreDetails, "no se encuentra el </details>").toBeGreaterThan(-1);
    expect(src.split("</details>")).toHaveLength(2);
  });

  it("el error de la dirección va DENTRO del desplegable", () => {
    const i = src.indexOf('error?.en === "direccion"');
    expect(i, "no se encuentra el error de dirección").toBeGreaterThan(-1);
    expect(
      i,
      "fuera del <details> cae por debajo de la zona de peligro y no se ve"
    ).toBeLessThan(cierreDetails);
  });

  it("el diagnóstico de DNS acompaña al error, también dentro", () => {
    const i = src.indexOf("<Diagnostico");
    expect(i, "no se encuentra el diagnóstico").toBeGreaterThan(-1);
    expect(i).toBeLessThan(cierreDetails);
  });

  it("el error de publicar va FUERA, que es donde está su botón", () => {
    const i = src.indexOf('error?.en === "publicar"');
    expect(i, "no se encuentra el error de publicar").toBeGreaterThan(-1);
    expect(i).toBeGreaterThan(cierreDetails);
  });

  /** Si el fallo vuelve a ser un `string` pelado, esto deja de tener sentido. */
  it("el fallo sigue sabiendo de dónde viene", () => {
    expect(src).toMatch(/en:\s*"publicar"/);
    expect(src).toMatch(/en:\s*"direccion"/);
  });
});
