import { describe, it, expect } from "vitest";
import { rellenar, escaparHtml } from "@/src/i18n/rellenar";
import { CATALOGO_CUENTA, textosCuenta } from "@/src/i18n/cuenta";
import { IDIOMAS, type Idioma } from "@/src/i18n/idiomas";

describe("rellenar", () => {
  it("sustituye lo que le dices", () => {
    expect(rellenar("Hola {nombre}", { nombre: "Sebas" })).toBe("Hola Sebas");
  });

  it("sustituye TODAS las veces que aparece", () => {
    expect(rellenar("{a} y {a}", { a: "x" })).toBe("x y x");
  });

  /**
   * Lo que entra por un valor NO se vuelve a mirar. Si se buscaran llaves en el
   * resultado, alguien podría llamarse `{enlace}` y acabaría con el enlace de
   * verificación de otro metido dentro de su propio nombre.
   */
  it("lo que entra por un valor no se vuelve a sustituir", () => {
    const r = rellenar("Hola {nombre}, entra en {enlace}", {
      nombre: "{enlace}",
      enlace: "https://estrenala.com/verificar?token=SECRETO",
    });
    expect(r).toBe("Hola {enlace}, entra en https://estrenala.com/verificar?token=SECRETO");
  });

  it("un hueco que no le das se queda a la vista, no desaparece", () => {
    // Feo, pero se ve. Borrarlo dejaría una frase incompleta con pinta de correcta.
    expect(rellenar("Hola {nombre}", {})).toBe("Hola {nombre}");
  });

  it("escaparHtml no deja escapar una etiqueta", () => {
    expect(escaparHtml('<b>"x"</b> & y')).toBe("&lt;b&gt;&quot;x&quot;&lt;/b&gt; &amp; y");
  });
});

type Hoja = { clave: string; valor: string };
function hojas(obj: unknown, prefijo = ""): Hoja[] {
  if (typeof obj === "string") return [{ clave: prefijo, valor: obj }];
  if (obj && typeof obj === "object") {
    return Object.entries(obj).flatMap(([k, v]) => hojas(v, prefijo ? `${prefijo}.${k}` : k));
  }
  return [];
}
const huecos = (s: string) => [...s.matchAll(/\{([a-zA-Z]+)\}/g)].map((m) => m[1]).sort();

describe.each(IDIOMAS)("textos de la cuenta · %s", (idioma: Idioma) => {
  const t = textosCuenta(idioma);

  it("no tiene ni un texto vacío", () => {
    const vacios = hojas(t).filter((h) => h.valor.trim() === "").map((h) => h.clave);
    expect(vacios, `vacíos: ${vacios.join(", ")}`).toEqual([]);
  });

  /**
   * LO MÁS IMPORTANTE DE ESTE FICHERO.
   *
   * Un correo de verificación sin `{enlace}` es un correo que no sirve para nada:
   * llega bien escrito, con su botón, y el botón no lleva a ninguna parte —o
   * peor, el texto plano se queda sin enlace y quien no ve HTML no puede entrar—.
   * Y en italiano no lo iba a ver nadie hasta que se quejara un cliente.
   */
  it("los cuatro correos llevan su enlace en el texto plano", () => {
    for (const [nombre, correo] of Object.entries(t.correos)) {
      expect(correo.texto, `${nombre}: el texto plano se ha quedado sin enlace`).toContain("{enlace}");
    }
  });

  it("no hay huecos inventados: solo nombre, org, rol y enlace", () => {
    const conocidos = ["nombre", "org", "rol", "enlace"];
    for (const { clave, valor } of hojas(t)) {
      for (const h of huecos(valor)) {
        expect(conocidos, `${clave}: hueco desconocido «{${h}}»`).toContain(h);
      }
    }
  });
});

describe("los cinco idiomas de la cuenta dicen lo mismo", () => {
  const clavesEs = hojas(CATALOGO_CUENTA.es).map((h) => h.clave);

  it("todos tienen exactamente las mismas claves", () => {
    for (const idioma of IDIOMAS) {
      expect(hojas(CATALOGO_CUENTA[idioma]).map((h) => h.clave), idioma).toEqual(clavesEs);
    }
  });

  /**
   * Los huecos tienen que ser LOS MISMOS en los cinco. Traduciendo es facilísimo
   * dejarse un `{org}` —la frase sigue leyéndose bien sin él— y entonces la
   * invitación italiana no dice a qué espacio te invitan.
   */
  it("cada frase tiene los mismos huecos en los cinco idiomas", () => {
    for (const { clave, valor } of hojas(CATALOGO_CUENTA.es)) {
      const esperados = huecos(valor);
      if (esperados.length === 0) continue;
      for (const idioma of IDIOMAS) {
        const suyo = hojas(CATALOGO_CUENTA[idioma]).find((h) => h.clave === clave);
        expect(huecos(suyo?.valor ?? ""), `${idioma} · ${clave}`).toEqual(esperados);
      }
    }
  });

  it("nadie se ha dejado el fichero a medio traducir", () => {
    const es = hojas(CATALOGO_CUENTA.es);
    for (const idioma of IDIOMAS) {
      if (idioma === "es") continue;
      const otro = hojas(CATALOGO_CUENTA[idioma]);
      const iguales = es.filter((h, i) => h.valor === otro[i].valor).length;
      expect(iguales / es.length, `${idioma} se parece demasiado al español`).toBeLessThan(0.2);
    }
  });
});
