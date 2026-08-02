import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { conFormato, conValores, sinFormato } from "@/src/i18n/formato";
import { rellenar } from "@/src/i18n/rellenar";

const pinta = (n: React.ReactNode) => renderToStaticMarkup(<>{n}</>);

describe("las marcas de formato", () => {
  it("negrita, resaltado y tachado", () => {
    expect(pinta(conFormato("hola **tú**"))).toBe("hola <b>tú</b>");
    expect(pinta(conFormato("al [[mundo]]"))).toBe('al <span class="hl">mundo</span>');
    expect(pinta(conFormato("~~antes~~"))).toBe('<span class="tach">antes</span>');
  });

  it("nombres de archivo y énfasis, que llegaron con el panel", () => {
    expect(pinta(conFormato("borra el `sitemap.xml` de tu web"))).toBe(
      "borra el <code>sitemap.xml</code> de tu web"
    );
    expect(pinta(conFormato("lo que editaste _dentro_ de aquí"))).toBe(
      "lo que editaste <i>dentro</i> de aquí"
    );
  });

  it("un texto sin marcas se devuelve pelado", () => {
    expect(conFormato("sin nada")).toBe("sin nada");
  });

  it("sinFormato quita las cinco, para un title o un aria-label", () => {
    expect(sinFormato("**a** [[b]] ~~c~~ `d` _e_")).toBe("a b c d e");
  });
});

describe("conValores: los datos del usuario NO pasan por el intérprete", () => {
  it("mete el valor donde va y respeta las marcas de alrededor", () => {
    expect(pinta(conValores("Se borrará {nombre}. **No se puede deshacer.**", {
      nombre: <b>mi-web</b>,
    }))).toBe("Se borrará <b>mi-web</b>. <b>No se puede deshacer.</b>");
  });

  /**
   * El motivo entero de que exista esta función. Media gente llama a su carpeta
   * `mi_web_v2`, y con `rellenar` + `conFormato` esa web saldría en pantalla como
   * «mi<i>web</i>v2» — justo en el aviso de borrarla, que es donde uno lee el
   * nombre para comprobar que va a borrar la que quiere.
   */
  it("un nombre con guiones bajos sale entero, sin cursivas", () => {
    const html = pinta(conValores("Se borrará {nombre}.", { nombre: <b>mi_web_v2</b> }));
    expect(html).toBe("Se borrará <b>mi_web_v2</b>.");
    expect(html).not.toContain("<i>");
  });

  it("un nombre con asteriscos tampoco se interpreta", () => {
    expect(pinta(conValores("Se borrará {nombre}.", { nombre: <b>a**b</b> })))
      .toBe("Se borrará <b>a**b</b>.");
  });

  it("un hueco sin valor se queda tal cual, no se traga el texto", () => {
    expect(pinta(conValores("Hola {quien}", {}))).toBe("Hola {quien}");
  });

  it("el mismo hueco dos veces se rellena las dos", () => {
    expect(pinta(conValores("{x} y {x}", { x: <i>ya</i> }))).toBe("<i>ya</i> y <i>ya</i>");
  });

  /**
   * Que un valor traiga a su vez un hueco no puede disparar una segunda vuelta:
   * es la misma trampa que ya mordió en `rellenar`, donde alguien llamado
   * «{enlace}» acababa con el enlace en su nombre.
   */
  it("un valor que parece un hueco no se vuelve a mirar", () => {
    expect(pinta(conValores("Hola {quien}", { quien: <b>{"{quien}"}</b> })))
      .toBe("Hola <b>{quien}</b>");
  });
});

/**
 * Los textos del blog hablan de los huecos de la plantilla DEL USUARIO, que
 * llevan llave doble. Con el patrón de antes, «{{titulo}}» se leía como el hueco
 * `titulo` metido entre dos llaves sueltas: bastaba con que una pantalla pasara
 * un valor llamado `titulo` para que a alguien le saliera el título de su propio
 * artículo en mitad de las instrucciones. Y ahí el hueco no es un hueco: es el
 * nombre literal que el sistema busca dentro de su HTML.
 */
describe("la llave doble es literal, no un hueco", () => {
  const frase = "escribe los {{titulo}}, {{contenido}}… dentro de tu HTML";

  it("rellenar no la toca, ni con un valor de ese nombre", () => {
    expect(rellenar(frase, { titulo: "Mi artículo" })).toBe(frase);
  });

  it("conValores tampoco", () => {
    expect(pinta(conValores(frase, { titulo: <b>Mi artículo</b> }))).toBe(frase.replace("…", "…"));
  });

  it("y la llave simple de al lado sigue funcionando", () => {
    expect(rellenar("{{titulo}} vale {n} euros", { titulo: "X", n: "3" })).toBe("{{titulo}} vale 3 euros");
  });

  it("con backticks alrededor, el <code> se pinta entero", () => {
    expect(pinta(conFormato("los `{{titulo}}` van dentro"))).toBe("los <code>{{titulo}}</code> van dentro");
  });
});
