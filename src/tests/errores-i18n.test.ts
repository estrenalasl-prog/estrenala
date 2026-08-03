import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ERRORES, traducirError } from "@/src/i18n/errores";
import { IDIOMAS, type Idioma } from "@/src/i18n/idiomas";

const OTROS = IDIOMAS.filter((i) => i !== "es") as Exclude<Idioma, "es">[];

function ficheros(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next" || e === ".git") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) ficheros(p, out);
    else if (p.endsWith(".ts") || p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

// Todo el código menos el propio mapa y los tests: si se buscara en ellos, cada
// clave se encontraría a sí misma y este test no comprobaría nada.
const CODIGO = [...ficheros("src"), ...ficheros("app")]
  .filter((p) => !p.includes(join("i18n", "errores")) && !p.includes(join("src", "tests")))
  .map((p) => readFileSync(p, "utf-8"))
  .join("\n");

describe("los errores del servidor, traducidos", () => {
  it("hay unos cuantos", () => {
    expect(Object.keys(ERRORES).length).toBeGreaterThan(50);
  });

  it("cada uno está en los cuatro idiomas y sin dejarse ninguno", () => {
    const malas: string[] = [];
    for (const [es, trads] of Object.entries(ERRORES)) {
      for (const idioma of OTROS) {
        const v = trads[idioma];
        if (!v || v.trim() === "") malas.push(`${idioma} · «${es}»`);
      }
    }
    expect(malas, malas.join("\n")).toEqual([]);
  });

  /**
   * EL test de este montaje.
   *
   * La clave es el mensaje en español, letra por letra. Si alguien reescribe un
   * error —le añade un punto, le cambia una palabra— la clave deja de coincidir
   * y ese error vuelve a salir en español para todo el mundo, en silencio: no
   * falla nada, no hay hueco a la vista, simplemente deja de traducirse.
   *
   * Así que se comprueba al revés: cada clave de aquí tiene que seguir
   * existiendo tal cual en el código.
   */
  it("cada clave sigue existiendo, palabra por palabra, en el código", () => {
    const huerfanas = Object.keys(ERRORES).filter((es) => !CODIGO.includes(`"${es}"`));
    expect(
      huerfanas,
      `Estos mensajes ya no existen en el código, así que su traducción no se usa nunca:\n` +
      huerfanas.map((h) => `  «${h}»`).join("\n")
    ).toEqual([]);
  });

  /**
   * El otro fallo posible: que un error salga a la pantalla SIN pasar por
   * `jsonError`, y entonces da igual lo bien traducido que esté el mapa.
   *
   * Me pasó al escribir esto. La primera pasada buscaba `EditorError` a secas y
   * había otras dos clases —`PublishError` e `ImportError`— con catorce mensajes
   * de los que más se ven: los de conectar un dominio y los de subir el ZIP.
   * Quedaron en español y nada avisó.
   */
  it("ningún mensaje de un error nuestro sale sin pasar por jsonError", () => {
    const malos: string[] = [];
    for (const p of ficheros("app")) {
      // Cron y el webhook de Stripe contestan a una máquina, no a una persona.
      if (p.includes(join("api", "cron")) || p.includes(join("api", "stripe"))) continue;
      for (const linea of readFileSync(p, "utf-8").split("\n")) {
        // `{ error: e.message }` es el patrón exacto que se me escapó con
        // PublishError: coge el texto de un error NUESTRO y lo suelta tal cual.
        // Las cadenas literales no se miran aquí — dejar «JSON inválido» en
        // español es una decisión, no un olvido.
        if (/NextResponse\.json\(\s*\{\s*error:\s*\w+\.message/.test(linea)) {
          malos.push(`${p}: ${linea.trim()}`);
        }
      }
    }
    expect(malos, `Estos no pasan por jsonError:\n${malos.join("\n")}`).toEqual([]);
  });

  it("en español devuelve lo mismo que entró", () => {
    for (const es of Object.keys(ERRORES)) expect(traducirError(es, "es")).toBe(es);
  });

  it("lo que no está en el mapa sale tal cual, no vacío", () => {
    expect(traducirError("Firma no válida", "en")).toBe("Firma no válida");
    expect(traducirError("", "fr")).toBe("");
  });

  // Un mensaje llamado «constructor» devolvería la función Object con la
  // búsqueda directa. Mismo fallo que ya mordió en contentTypeFor.
  it("un mensaje con nombre de propiedad de Object no rompe nada", () => {
    for (const raro of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      expect(typeof traducirError(raro, "en")).toBe("string");
      expect(traducirError(raro, "en")).toBe(raro);
    }
  });

  describe.each(OTROS)("en %s", (idioma) => {
    it("traduce de verdad y no deja el español", () => {
      // El portugués se parece mucho al español y alguno coincide de veras
      // («Etapa desconocida» no, pero los hay). Se mira el conjunto, no cada uno.
      const iguales = Object.entries(ERRORES).filter(([es, t]) => t[idioma] === es).length;
      const total = Object.keys(ERRORES).length;
      expect(iguales / total, `${idioma} se parece demasiado al español`).toBeLessThan(0.1);
    });
  });
});
