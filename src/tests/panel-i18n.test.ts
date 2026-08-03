import { describe, it, expect } from "vitest";
import { CATALOGO_PANEL, textosPanel } from "@/src/i18n/panel";
import { CATALOGO_LANDING } from "@/src/i18n/landing";
import { CATALOGO_CUENTA } from "@/src/i18n/cuenta";
import { CATALOGO_AJUSTES, textosAjustes } from "@/src/i18n/ajustes";
import { CATALOGO_BLOG, textosBlog } from "@/src/i18n/blog";
import { CATALOGO_PUBLICO } from "@/src/i18n/publico";
import { CATALOGO_LEGAL } from "@/src/i18n/legal";
import { IDIOMAS, type Idioma } from "@/src/i18n/idiomas";
import { patronHuecos } from "@/src/i18n/rellenar";

type Hoja = { clave: string; valor: string };
function hojas(obj: unknown, prefijo = ""): Hoja[] {
  if (typeof obj === "string") return [{ clave: prefijo, valor: obj }];
  if (Array.isArray(obj)) return obj.flatMap((v, i) => hojas(v, `${prefijo}[${i}]`));
  if (obj && typeof obj === "object") {
    return Object.entries(obj).flatMap(([k, v]) => hojas(v, prefijo ? `${prefijo}.${k}` : k));
  }
  return [];
}
// El MISMO patrón que usan `rellenar` y `conValores`. Si el test tuviera el suyo
// estaría midiendo otra cosa que la que hace el código.
const huecos = (s: string) => [...s.matchAll(patronHuecos())].map((m) => m[1]).sort();

/**
 * TODOS los catálogos que existen, y las mismas comprobaciones para todos.
 *
 * Empezó valiendo solo para el panel, y con tres ya era fácil añadir el cuarto y
 * olvidarse de vigilarlo — que es justo lo que pasó al aparecer «ajustes». Si
 * mañana hay uno nuevo, se añade a esta lista y hereda todo lo de abajo.
 */
const CATALOGOS = {
  landing: CATALOGO_LANDING,
  cuenta: CATALOGO_CUENTA,
  panel: CATALOGO_PANEL,
  ajustes: CATALOGO_AJUSTES,
  blog: CATALOGO_BLOG,
  publico: CATALOGO_PUBLICO,
  legal: CATALOGO_LEGAL,
} as const;

type Catalogo = Record<Idioma, unknown>;
const lista = Object.entries(CATALOGOS) as [string, Catalogo][];

describe.each(lista)("catálogo «%s»", (_nombre, cat) => {
  const clavesEs = hojas(cat.es).map((h) => h.clave);

  it("no está vacío", () => {
    expect(clavesEs.length).toBeGreaterThan(5);
  });

  it("los cinco idiomas tienen exactamente las mismas claves", () => {
    for (const idioma of IDIOMAS) {
      expect(hojas(cat[idioma]).map((h) => h.clave), idioma).toEqual(clavesEs);
    }
  });

  it("no hay ni un texto vacío en ningún idioma", () => {
    for (const idioma of IDIOMAS) {
      const vacios = hojas(cat[idioma]).filter((h) => h.valor.trim() === "").map((h) => h.clave);
      expect(vacios, `${idioma} · vacíos: ${vacios.join(", ")}`).toEqual([]);
    }
  });

  it("cada frase tiene los mismos huecos en los cinco idiomas", () => {
    for (const { clave, valor } of hojas(cat.es)) {
      const esperados = huecos(valor);
      if (esperados.length === 0) continue;
      for (const idioma of IDIOMAS) {
        const suyo = hojas(cat[idioma]).find((h) => h.clave === clave);
        expect(huecos(suyo?.valor ?? ""), `${idioma} · ${clave}`).toEqual(esperados);
      }
    }
  });

  /**
   * Se mide por CARACTERES, no por número de claves.
   *
   * Contando claves, un catálogo pequeño salta en falso: «Cookies» y «política
   * de cookies» se dicen igual en portugués, y con seis claves eso ya es un
   * tercio del fichero. Y al revés, contar claves deja pasar lo grave — diez
   * etiquetas de una palabra traducidas y el párrafo largo copiado tal cual es
   * un 9 % de claves iguales y la mitad del texto sin traducir.
   *
   * Lo que delata un fichero a medias es la MASA de texto repetido, y eso es lo
   * que se mide aquí.
   */
  it("nadie se ha dejado el fichero a medio traducir", () => {
    const es = hojas(cat.es);
    const total = es.reduce((n, h) => n + h.valor.length, 0);
    for (const idioma of IDIOMAS) {
      if (idioma === "es") continue;
      const otro = hojas(cat[idioma]);
      const copiado = es.reduce((n, h, i) => (h.valor === otro[i].valor ? n + h.valor.length : n), 0);
      expect(copiado / total, `${idioma} se parece demasiado al español`).toBeLessThan(0.25);
    }
  });

  /**
   * `conValores` parte la frase por los huecos y pasa cada trozo por `conFormato`,
   * así que una marca no puede quedar a caballo de un hueco: `**{nombre}**` se
   * rompería en «**» + el nombre + «**», y los asteriscos saldrían a la vista.
   *
   * Se comprueba en todos los catálogos y no solo donde se usa hoy, porque la
   * tentación de escribir `**{algo}**` aparece cada vez que hay que resaltar un
   * dato — y en el idioma en el que se cuele, nadie lo va a mirar.
   */
  it("ninguna marca de formato queda a caballo de un hueco", () => {
    const pares: Array<[string, RegExp]> = [["**", /\*\*/g], ["`", /`/g], ["_", /_/g], ["~~", /~~/g]];
    const malas: string[] = [];
    for (const idioma of IDIOMAS) {
      for (const { clave, valor } of hojas(cat[idioma])) {
        // Exactamente los trozos que `conValores` le pasa a `conFormato`: el
        // patrón captura, así que `split` intercala las claves y hay que quedarse
        // con los pares. Si aquí se partiera de otra forma, el test estaría
        // midiendo algo que el código no hace.
        for (const trozo of valor.split(patronHuecos()).filter((_, i) => i % 2 === 0)) {
          for (const [marca, re] of pares) {
            if ((trozo.match(re)?.length ?? 0) % 2 === 1) {
              malas.push(`${idioma} · ${clave} · «${marca}» suelto en «${trozo}»`);
            }
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

// Las funciones de acceso, que son por donde entra todo el mundo.
describe.each(IDIOMAS)("acceso por idioma · %s", (idioma: Idioma) => {
  it("devuelve el catálogo que toca", () => {
    expect(textosPanel(idioma)).toBe(CATALOGO_PANEL[idioma]);
    expect(textosAjustes(idioma)).toBe(CATALOGO_AJUSTES[idioma]);
    expect(textosBlog(idioma)).toBe(CATALOGO_BLOG[idioma]);
  });
});
