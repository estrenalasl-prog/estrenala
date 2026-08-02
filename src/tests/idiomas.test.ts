import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  IDIOMAS, IDIOMA_POR_DEFECTO, NOMBRE_IDIOMA, PREFIJOS_PUBLICOS, COOKIE_IDIOMA,
  esIdioma, rutaDeIdioma, idiomaDeAcceptLanguage, idiomaDeLaPeticion, cookieIdioma,
  alternativasHreflang,
} from "@/src/i18n/idiomas";

describe("los cinco idiomas", () => {
  it("son los cinco decididos, sin repetidos", () => {
    expect([...IDIOMAS]).toEqual(["es", "en", "pt", "fr", "it"]);
    expect(new Set(IDIOMAS).size).toBe(IDIOMAS.length);
  });

  it("todos tienen nombre en su propio idioma", () => {
    for (const i of IDIOMAS) expect(NOMBRE_IDIOMA[i]?.trim()).toBeTruthy();
  });

  it("esIdioma no se cree cualquier cosa", () => {
    expect(esIdioma("es")).toBe(true);
    expect(esIdioma("de")).toBe(false);
    expect(esIdioma("ES")).toBe(false); // las URLs van en minúscula, sin ambigüedad
    expect(esIdioma("")).toBe(false);
    expect(esIdioma(null)).toBe(false);
    expect(esIdioma(["es"])).toBe(false);
  });
});

// El español se queda en la raíz porque es la dirección que ya está indexada y
// la que llevan escrita los enlaces que apuntan aquí. Moverla a /es sería
// regalar el posicionamiento que ya hay a cambio de simetría.
describe("rutas por idioma", () => {
  it("el español vive en la raíz, los demás con su prefijo", () => {
    expect(rutaDeIdioma("es")).toBe("/");
    expect(rutaDeIdioma("en")).toBe("/en");
    expect(rutaDeIdioma("it")).toBe("/it");
  });

  it("los prefijos públicos son exactamente los idiomas que NO son el de casa", () => {
    expect(PREFIJOS_PUBLICOS).toEqual(["/en", "/pt", "/fr", "/it"]);
    expect(PREFIJOS_PUBLICOS).not.toContain("/es");
  });

  // Si un idioma nuevo no llega a PREFIJOS_PUBLICOS, el middleware lo manda a
  // /login y esa landing no existe para nadie. Se deriva de IDIOMAS justo para
  // que no puedan discrepar, y esto lo vigila.
  it("cada idioma que no es el de casa tiene su prefijo abierto", () => {
    for (const i of IDIOMAS) {
      if (i === IDIOMA_POR_DEFECTO) continue;
      expect(PREFIJOS_PUBLICOS, `sin abrir: ${i}`).toContain(rutaDeIdioma(i));
    }
  });
});

// Sin hreflang, cinco páginas que dicen lo mismo son contenido duplicado: Google
// elige una y las otras cuatro no aparecen. Y tiene que ser RECÍPROCO — si una
// versión no se declara a sí misma, Google no se fía de ninguna.
describe("hreflang", () => {
  it("están las cinco, cada una apuntando a la suya, y el x-default", () => {
    const alt = alternativasHreflang();
    expect(alt).toEqual({ es: "/", en: "/en", pt: "/pt", fr: "/fr", it: "/it", "x-default": "/" });
  });

  it("cada versión se declara también a sí misma", () => {
    const alt = alternativasHreflang();
    for (const i of IDIOMAS) expect(alt[i], i).toBe(rutaDeIdioma(i));
  });

  it("el x-default lleva a la raíz, que es a donde va quien no encaja en ninguno", () => {
    expect(alternativasHreflang()["x-default"]).toBe(rutaDeIdioma(IDIOMA_POR_DEFECTO));
  });
});

// El middleware pide sesión para todo lo que no esté en su lista blanca, así que
// una landing que no aparezca ahí se va al 307 de /login y NO EXISTE. Que use la
// lista de idiomas en vez de repetirla a mano es lo que impide que discrepen.
it("el middleware abre las rutas de idioma desde la lista, no a mano", () => {
  const mw = readFileSync(resolve(process.cwd(), "middleware.ts"), "utf-8");
  expect(mw).toContain("PREFIJOS_PUBLICOS");
  expect(mw).toContain("RUTAS_IDIOMA.has(pathname)");
  for (const p of PREFIJOS_PUBLICOS) {
    expect(mw, `prefijo escrito a mano: ${p}`).not.toContain(`"${p}"`);
  }
});

// Traducir la landing y perder el idioma en el primer clic sería peor que no
// traducirla: promete algo que se rompe a los cinco segundos. El registro no
// lleva idioma en la URL —nadie busca en Google la página de registro de nadie—,
// así que la continuidad la da la cookie.
describe("el idioma sobrevive a la landing", () => {
  it("manda lo que eligió por encima de lo que pida su navegador", () => {
    expect(idiomaDeLaPeticion("it", "fr-FR,fr;q=0.9")).toBe("it");
  });

  it("sin elección, se hace caso al navegador", () => {
    expect(idiomaDeLaPeticion(null, "pt-PT,pt;q=0.9")).toBe("pt");
  });

  it("una cookie manipulada no cuela: se cae al navegador", () => {
    expect(idiomaDeLaPeticion("de", "fr")).toBe("fr");
    expect(idiomaDeLaPeticion("../../etc/passwd", null)).toBe("es");
  });

  it("sin nada de nada, español", () => {
    expect(idiomaDeLaPeticion(null, null)).toBe("es");
  });

  it("la cookie dura un año y no se escapa a otros sitios", () => {
    const c = cookieIdioma("fr", true);
    expect(c).toContain(`${COOKIE_IDIOMA}=fr`);
    expect(c).toContain("Path=/");
    expect(c).toContain(`Max-Age=${365 * 24 * 60 * 60}`);
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain("Secure");
  });

  // En local no hay https: con `Secure` el navegador tira la cookie y el idioma
  // no se recordaría al desarrollar, que es justo donde se prueba.
  it("sin https no lleva Secure", () => {
    expect(cookieIdioma("fr", false)).not.toContain("Secure");
  });
});

describe("idiomaDeAcceptLanguage", () => {
  it("coge el que más pesa, no el primero que pasa", () => {
    expect(idiomaDeAcceptLanguage("fr;q=0.4,it;q=0.9")).toBe("it");
  });

  it("entiende las variantes de país", () => {
    expect(idiomaDeAcceptLanguage("pt-BR,pt;q=0.9")).toBe("pt");
    expect(idiomaDeAcceptLanguage("en-GB")).toBe("en");
  });

  it("se salta los idiomas que no tenemos y sigue buscando", () => {
    expect(idiomaDeAcceptLanguage("de-DE,de;q=0.9,fr;q=0.8")).toBe("fr");
  });

  it("con un q=0 el idioma está RECHAZADO, no preferido", () => {
    expect(idiomaDeAcceptLanguage("it;q=0,en;q=0.5")).toBe("en");
  });

  it("a igualdad de peso manda el orden del navegador", () => {
    expect(idiomaDeAcceptLanguage("fr,it")).toBe("fr");
  });

  it("sin cabecera, con basura o sin nada conocido, español", () => {
    expect(idiomaDeAcceptLanguage(null)).toBe("es");
    expect(idiomaDeAcceptLanguage("")).toBe("es");
    expect(idiomaDeAcceptLanguage("*")).toBe("es");
    expect(idiomaDeAcceptLanguage("de,ja,zh-CN")).toBe("es");
    expect(idiomaDeAcceptLanguage(";;;q=")).toBe("es");
  });
});
