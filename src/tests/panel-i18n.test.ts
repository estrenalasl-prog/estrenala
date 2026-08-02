import { describe, it, expect } from "vitest";
import { CATALOGO_PANEL, textosPanel } from "@/src/i18n/panel";
import { CATALOGO_LANDING } from "@/src/i18n/landing";
import { CATALOGO_CUENTA } from "@/src/i18n/cuenta";
import { IDIOMAS, type Idioma } from "@/src/i18n/idiomas";

type Hoja = { clave: string; valor: string };
function hojas(obj: unknown, prefijo = ""): Hoja[] {
  if (typeof obj === "string") return [{ clave: prefijo, valor: obj }];
  if (Array.isArray(obj)) return obj.flatMap((v, i) => hojas(v, `${prefijo}[${i}]`));
  if (obj && typeof obj === "object") {
    return Object.entries(obj).flatMap(([k, v]) => hojas(v, prefijo ? `${prefijo}.${k}` : k));
  }
  return [];
}
const huecos = (s: string) => [...s.matchAll(/\{([a-zA-Z]+)\}/g)].map((m) => m[1]).sort();

describe.each(IDIOMAS)("textos del panel · %s", (idioma: Idioma) => {
  it("no tiene ni un texto vacío", () => {
    const vacios = hojas(textosPanel(idioma)).filter((h) => h.valor.trim() === "").map((h) => h.clave);
    expect(vacios, `vacíos: ${vacios.join(", ")}`).toEqual([]);
  });
});

describe("los cinco idiomas del panel dicen lo mismo", () => {
  const clavesEs = hojas(CATALOGO_PANEL.es).map((h) => h.clave);

  it("todos tienen exactamente las mismas claves", () => {
    for (const idioma of IDIOMAS) {
      expect(hojas(CATALOGO_PANEL[idioma]).map((h) => h.clave), idioma).toEqual(clavesEs);
    }
  });

  it("cada frase tiene los mismos huecos en los cinco idiomas", () => {
    for (const { clave, valor } of hojas(CATALOGO_PANEL.es)) {
      const esperados = huecos(valor);
      if (esperados.length === 0) continue;
      for (const idioma of IDIOMAS) {
        const suyo = hojas(CATALOGO_PANEL[idioma]).find((h) => h.clave === clave);
        expect(huecos(suyo?.valor ?? ""), `${idioma} · ${clave}`).toEqual(esperados);
      }
    }
  });

  it("nadie se ha dejado el fichero a medio traducir", () => {
    const es = hojas(CATALOGO_PANEL.es);
    for (const idioma of IDIOMAS) {
      if (idioma === "es") continue;
      const otro = hojas(CATALOGO_PANEL[idioma]);
      const iguales = es.filter((h, i) => h.valor === otro[i].valor).length;
      expect(iguales / es.length, `${idioma} se parece demasiado al español`).toBeLessThan(0.25);
    }
  });
});

/**
 * Con tres catálogos ya es fácil añadir el cuarto y olvidarse de vigilarlo. Esto
 * comprueba que TODOS los que existen están completos en los cinco idiomas, sin
 * tener que acordarse de nada: si mañana aparece `src/i18n/loquesea/`, se añade
 * aquí y ya está — y si no se añade, al menos estos tres siguen cubiertos.
 */
describe("todos los catálogos, de una vez", () => {
  const catalogos = { landing: CATALOGO_LANDING, cuenta: CATALOGO_CUENTA, panel: CATALOGO_PANEL };

  it.each(Object.entries(catalogos))("%s: los cinco idiomas, mismas claves", (_nombre, cat) => {
    const ref = hojas(cat.es).map((h) => h.clave);
    expect(ref.length, "el catálogo está vacío").toBeGreaterThan(5);
    for (const idioma of IDIOMAS) {
      expect(hojas(cat[idioma]).map((h) => h.clave), idioma).toEqual(ref);
    }
  });

  /**
   * `conValores` parte la frase por los huecos y pasa cada trozo por `conFormato`,
   * así que una marca no puede quedar a caballo de un hueco: `**{nombre}**` se
   * rompería en «**» + el nombre + «**», y los asteriscos saldrían a la vista.
   *
   * Se comprueba en TODOS los catálogos y no solo donde se usa hoy, porque la
   * tentación de escribir `**{algo}**` aparece cada vez que hay que resaltar un
   * dato — y en el idioma en el que se cuele, nadie lo va a mirar.
   */
  const DELIMITADORES: Array<[string, RegExp]> = [
    ["**", /\*\*/g], ["`", /`/g], ["_", /_/g], ["~~", /~~/g], ["[[", /\[\[/g], ["]]", /\]\]/g],
  ];

  it.each(Object.entries(catalogos))("%s: ninguna marca a caballo de un hueco", (_nombre, cat) => {
    const malas: string[] = [];
    for (const idioma of IDIOMAS) {
      for (const { clave, valor } of hojas(cat[idioma])) {
        for (const trozo of valor.split(/\{[a-zA-Z]+\}/)) {
          for (const [marca, re] of DELIMITADORES) {
            const n = trozo.match(re)?.length ?? 0;
            // `[[` y `]]` van de dos en dos entre ellos, no consigo mismos.
            const impar = marca === "[[" || marca === "]]" ? false : n % 2 === 1;
            if (impar) malas.push(`${idioma} · ${clave} · «${marca}» suelto en «${trozo}»`);
          }
        }
        const abre = valor.match(/\[\[/g)?.length ?? 0;
        const cierra = valor.match(/\]\]/g)?.length ?? 0;
        if (abre !== cierra) malas.push(`${idioma} · ${clave} · [[ ]] descuadrados`);
      }
    }
    expect(malas, malas.join("\n")).toEqual([]);
  });
});
