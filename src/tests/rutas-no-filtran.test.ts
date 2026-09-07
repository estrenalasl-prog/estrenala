import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, relative } from "node:path";

/**
 * Ninguna ruta le cuenta al navegador el mensaje de una excepción.
 *
 * El patrón `{ error: e instanceof Error ? e.message : "…" }` parece prudente y
 * no lo es: lo que llega a ese punto NO son los errores que uno escribe para que
 * los lea alguien —esos son `EditorError` y `PublishError`, y se devuelven
 * aparte—, sino lo de dentro de la máquina. Un fallo de Postgres sale con el
 * nombre de la tabla y de la columna; uno del almacenamiento, con el del bucket.
 *
 * El 2026-09-03, preparando el Show HN, había siete sitios así repartidos por
 * cinco archivos. Se quitaron todos y esto vigila que no vuelvan: es un patrón
 * que se copia y pega sin pensarlo, porque parece que informa mejor.
 *
 * Lo que sí se hace: el motivo va al log del servidor —donde sirve para
 * arreglarlo— y el usuario recibe una frase suya, traducida.
 */
const API = resolve(process.cwd(), "app/api");

function rutas(dir = API): string[] {
  const encontradas: string[] = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const camino = resolve(dir, entrada.name);
    if (entrada.isDirectory()) encontradas.push(...rutas(camino));
    else if (entrada.name === "route.ts") encontradas.push(camino);
  }
  return encontradas;
}

/**
 * Devolver el mensaje de la excepción, en cualquiera de sus formas.
 *
 * Se mira solo lo que va DENTRO de una respuesta: `console.error(…e.message…)`
 * es justo lo que queremos que siga habiendo.
 */
const FILTRA = [
  /error:\s*e instanceof Error\s*\?\s*e\.message/,
  /jsonError\(\s*e instanceof Error\s*\?\s*e\.message/,
  /error:\s*\(?e as Error\)?\.message/,
  /json\(\s*\{\s*error:\s*e\.message/,
];

describe("las rutas no filtran lo de dentro", () => {
  const todas = rutas();

  it("hay rutas que mirar (si esto falla, el recorrido dejó de encontrar nada)", () => {
    expect(todas.length).toBeGreaterThan(20);
  });

  it("ninguna devuelve al navegador el mensaje de una excepción", () => {
    const culpables: string[] = [];
    for (const camino of todas) {
      const fuente = readFileSync(camino, "utf8");
      for (const patron of FILTRA) {
        if (patron.test(fuente)) {
          culpables.push(relative(process.cwd(), camino).split("\\").join("/"));
          break;
        }
      }
    }
    expect(culpables, `filtran el mensaje de la excepción: ${culpables.join(", ")}`).toEqual([]);
  });

  /**
   * El motivo no se puede perder: si no sale por la respuesta y tampoco se
   * registra, un fallo en producción no deja ni rastro. Pasó el 08/08 con una
   * web que no se dejaba borrar y nadie supo por qué.
   *
   * Solo se exige donde se quitó el mensaje crudo (los «No se pudo …»). El
   * «Error interno» de toda la vida lo usan otras veintitantas rutas sin
   * registrar nada: es una deuda real, pero es anterior a esto y arreglarla son
   * veintitrés archivos. Que este test no la cubra es a propósito, no un olvido.
   */
  it("las que dejaron de contar el motivo, lo registran", () => {
    const sinLog: string[] = [];
    for (const camino of todas) {
      const fuente = readFileSync(camino, "utf8");
      const generico = /jsonError\(\s*"No se pudo/.test(fuente);
      if (generico && !fuente.includes("console.error")) {
        sinLog.push(relative(process.cwd(), camino).split("\\").join("/"));
      }
    }
    expect(sinLog, `tragan el error sin registrarlo: ${sinLog.join(", ")}`).toEqual([]);
  });
});
