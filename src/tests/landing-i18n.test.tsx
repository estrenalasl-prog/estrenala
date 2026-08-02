import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { conFormato, sinFormato } from "@/src/i18n/formato";
import { CATALOGO_LANDING, textosLanding } from "@/src/i18n/landing";
import { IDIOMAS, type Idioma } from "@/src/i18n/idiomas";

const pinta = (n: React.ReactNode) => renderToStaticMarkup(<>{n}</>);

/**
 * El selector de idioma se pinta en TRES sitios: la cabecera, el menú del móvil
 * y el pie. Los tres marcan el idioma actual con `aria-current`, pero cada uno
 * cuelga de un contenedor distinto y por tanto necesita SU regla de CSS.
 *
 * El 2026-08-02, al unificar los tres en una sola lista de enlaces, la regla se
 * escribió solo para el desplegable de la cabecera. En el pie, el italiano salía
 * del mismo color que los otros cuatro: no se sabía cuál estabas viendo. Lo vio
 * Sebas en el paso 4 de la guía — y yo mismo había escrito en esa guía que tenía
 * que verse marcado.
 */
it("el idioma actual se marca en los tres sitios donde está el selector", () => {
  const css = readFileSync(resolve(process.cwd(), "app/_landing/landing.css"), "utf-8");
  const sitios = [
    ".landing .menu-idioma .panel a[aria-current]", // cabecera
    ".landing .idiomas-movil a[aria-current]",      // menú del móvil
    ".landing .pie-col a[aria-current]",            // pie
  ];
  for (const s of sitios) expect(css, `sin marcar: ${s}`).toContain(s);
});

/**
 * Un `<a>` es horizontal por defecto. Metidos en un contenedor `display:block`,
 * los cinco idiomas se ponían en fila dentro de un panel de 210px y se salían
 * por la derecha. Lo vio Sebas en el móvil, en el paso 5.
 */
it("los idiomas del menú móvil van en columna, no en fila", () => {
  const css = readFileSync(resolve(process.cwd(), "app/_landing/landing.css"), "utf-8");
  // Hay DOS reglas `.idiomas-movil`: la de escritorio, que lo esconde, y la de
  // dentro del media query. Vale con que alguna lo ponga en columna — buscar solo
  // la primera cogía la de escritorio, y este test no habría pasado nunca.
  const reglas = [...css.matchAll(/\.landing \.idiomas-movil\{([^}]*)\}/g)].map((m) => m[1]);
  expect(reglas.length, "ya no existe la regla de .idiomas-movil").toBeGreaterThan(0);
  expect(reglas.some((r) => r.includes("flex-direction:column")), "los <a> se pondrían en fila").toBe(true);
});

/**
 * En móvil se esconde el botón de la cabecera, PERO no todos los botones que hay
 * dentro de <nav>: dentro del menú de la hamburguesa va el de registro, que es
 * el principal de la página. Sin el `>`, la misma regla alcanzaba a los dos y
 * ese botón no se ha visto nunca en un móvil.
 *
 * Es de los peores fallos posibles —el botón que convierte, invisible en la
 * mitad del tráfico— y no lo nota nadie: la página se ve perfecta, simplemente
 * le falta algo que no sabes que debería estar.
 */
it("el botón de registro del menú móvil no se esconde con el de la cabecera", () => {
  const css = readFileSync(resolve(process.cwd(), "app/_landing/landing.css"), "utf-8");
  expect(css).toContain(".landing .top nav > .btn{display:none}");
  // La versión sin `>` es justo la que se llevaba el botón por delante.
  expect(css, "vuelve a esconder TODOS los botones del nav").not.toMatch(
    /\.landing \.top nav \.btn\s*\{[^}]*display:\s*none/
  );
});

describe("formato dentro de las frases", () => {
  it("**así** es negrita", () => {
    expect(pinta(conFormato("Cambies como cambies, **vuelves atrás**."))).toBe(
      "Cambies como cambies, <b>vuelves atrás</b>."
    );
  });

  it("[[así]] es el resaltado en lima", () => {
    expect(pinta(conFormato("Lo ponemos [[en el mundo]]."))).toBe(
      'Lo ponemos <span class="hl">en el mundo</span>.'
    );
  });

  it("~~así~~ es el tachado", () => {
    expect(pinta(conFormato("~~Subirla~~ te lleva semanas."))).toBe(
      '<span class="tach">Subirla</span> te lleva semanas.'
    );
  });

  it("una frase sin marcas se queda tal cual", () => {
    expect(conFormato("Sin nada que marcar")).toBe("Sin nada que marcar");
  });

  it("varias marcas en la misma frase", () => {
    expect(pinta(conFormato("**uno** y [[dos]]"))).toBe('<b>uno</b> y <span class="hl">dos</span>');
  });

  // Nada de dangerouslySetInnerHTML: si algún día un texto trae un `<`, tiene que
  // salir escapado y no abrir una etiqueta.
  it("el texto se escapa, no se interpreta", () => {
    expect(pinta(conFormato("**<b>x</b>**"))).toBe("<b>&lt;b&gt;x&lt;/b&gt;</b>");
  });

  it("sinFormato quita las marcas para los sitios donde no cabe un elemento", () => {
    expect(sinFormato("**uno**, [[dos]] y ~~tres~~")).toBe("uno, dos y tres");
    expect(sinFormato("nada que quitar")).toBe("nada que quitar");
  });
});

// ---------------------------------------------------------------------------
// El catálogo. Aquí se vigila lo que el typecheck NO puede ver: que las claves
// existan es cosa suya, pero que estén TRADUCIDAS y bien formadas, no.

type Hoja = { clave: string; valor: string };

function hojas(obj: unknown, prefijo = ""): Hoja[] {
  if (typeof obj === "string") return [{ clave: prefijo, valor: obj }];
  if (Array.isArray(obj)) return obj.flatMap((v, i) => hojas(v, `${prefijo}[${i}]`));
  if (obj && typeof obj === "object") {
    return Object.entries(obj).flatMap(([k, v]) => hojas(v, prefijo ? `${prefijo}.${k}` : k));
  }
  return [];
}

/** Las que abren, para preguntar «¿esta frase lleva énfasis?». */
const MARCAS = ["**", "[[", "~~"] as const;
/** Abre y cierra. `**` y `~~` usan el mismo símbolo para las dos cosas; `[[` no. */
const PAREJAS: ReadonlyArray<readonly [string, string]> = [["**", "**"], ["[[", "]]"], ["~~", "~~"]];
const cuenta = (s: string, m: string) => s.split(m).length - 1;

describe.each(IDIOMAS)("catálogo · %s", (idioma: Idioma) => {
  const textos = textosLanding(idioma);

  it("no tiene ni un texto vacío", () => {
    const vacios = hojas(textos).filter((h) => h.valor.trim() === "").map((h) => h.clave);
    expect(vacios, `vacíos: ${vacios.join(", ")}`).toEqual([]);
  });

  // Un `**` suelto no rompe nada: sale impreso en la página. O sea que se vería
  // en producción, en un idioma que aquí no lee nadie.
  it("no deja marcas de formato a medio cerrar", () => {
    for (const { clave, valor } of hojas(textos)) {
      for (const [abre, cierra] of PAREJAS) {
        if (abre === cierra) expect(cuenta(valor, abre) % 2, `${clave}: «${abre}» impares`).toBe(0);
        else expect(cuenta(valor, abre), `${clave}: «${abre}» sin su «${cierra}»`).toBe(cuenta(valor, cierra));
      }
    }
    // Y que después de quitarlas no quede ningún resto suelto.
    for (const { clave, valor } of hojas(textos)) {
      expect(sinFormato(valor), clave).not.toMatch(/\*\*|\[\[|\]\]|~~/);
    }
  });

  it("la marca es la marca: «Estrénala» no se traduce", () => {
    const todo = hojas(textos).map((h) => h.valor).join(" ");
    expect(todo).toContain("Estrénala");
  });
});

// La comparación entre idiomas es donde salen los descuidos de verdad.
describe("los cinco idiomas dicen lo mismo", () => {
  const clavesEs = hojas(CATALOGO_LANDING.es).map((h) => h.clave);

  it("todos tienen exactamente las mismas claves, incluidas las del FAQ", () => {
    for (const idioma of IDIOMAS) {
      expect(hojas(CATALOGO_LANDING[idioma]).map((h) => h.clave), idioma).toEqual(clavesEs);
    }
  });

  // El resaltado en lima y el tachado no son adorno: son el diseño de esa frase.
  // Si una traducción se los deja, esa landing pierde el énfasis y nadie se
  // entera, porque para verlo hay que leer italiano y mirar la página.
  it("las frases con resaltado lo llevan en los cinco", () => {
    for (const { clave, valor } of hojas(CATALOGO_LANDING.es)) {
      for (const m of MARCAS) {
        if (cuenta(valor, m) === 0) continue;
        for (const idioma of IDIOMAS) {
          const suyo = hojas(CATALOGO_LANDING[idioma]).find((h) => h.clave === clave);
          expect(cuenta(suyo?.valor ?? "", m), `${idioma} · ${clave}: falta «${m}»`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("nadie se ha dejado un texto en español sin traducir", () => {
    // Un puñado de textos SON iguales en varios idiomas y está bien: «Blog»,
    // «Cookies», «Legal»… Se comprueba la proporción, que es lo que delata un
    // fichero copiado y a medio traducir.
    const es = hojas(CATALOGO_LANDING.es);
    for (const idioma of IDIOMAS) {
      if (idioma === "es") continue;
      const otro = hojas(CATALOGO_LANDING[idioma]);
      const iguales = es.filter((h, i) => h.valor === otro[i].valor).length;
      expect(iguales / es.length, `${idioma} se parece demasiado al español`).toBeLessThan(0.2);
    }
  });
});
