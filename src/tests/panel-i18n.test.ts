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
});
