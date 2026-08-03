import { describe, it, expect } from "vitest";
import { detectarFormularios, formulariosMuertos } from "@/src/forms/detectar";
import {
  conFormulariosConectados, RUTA_ENVIO, CAMPO_TRAMPA, CAMPO_PAGINA, CAMPO_INDICE,
} from "@/src/forms/conectar";

const doc = (cuerpo: string) => `<!doctype html><html lang="es"><body>${cuerpo}</body></html>`;

const CONTACTO = `<form>
  <input type="text" name="nombre">
  <input type="email" name="email">
  <textarea name="mensaje"></textarea>
  <button type="submit">Enviar</button>
</form>`;

describe("detectar formularios", () => {
  it("un formulario sin action está muerto", () => {
    const [f] = detectarFormularios(doc(CONTACTO));
    expect(f.estado).toBe("muerto");
    expect(f.campos).toEqual(["nombre", "email", "mensaje"]);
  });

  it("los cuatro actions que no llevan a ninguna parte", () => {
    for (const action of ["", " ", "#", "#contacto", ".", "/"]) {
      const html = doc(CONTACTO.replace("<form>", `<form action="${action}">`));
      expect(detectarFormularios(html)[0].estado, `action="${action}"`).toBe("muerto");
    }
  });

  it("un formulario con su propio destino NO se toca", () => {
    for (const action of ["https://formspree.io/f/abc", "/api/contacto", "enviar.php"]) {
      const html = doc(CONTACTO.replace("<form>", `<form action="${action}">`));
      expect(detectarFormularios(html)[0].estado, action).toBe("ajeno");
    }
  });

  it("mailto se reconoce aparte: funciona mal, pero es su decisión", () => {
    const html = doc(CONTACTO.replace("<form>", `<form action="mailto:hola@ejemplo.com">`));
    expect(detectarFormularios(html)[0].estado).toBe("mailto");
  });

  it("si lo maneja su propio JavaScript, no se toca", () => {
    const html = doc(CONTACTO.replace("<form>", `<form onsubmit="enviar(event)">`));
    expect(detectarFormularios(html)[0].estado).toBe("propio");
  });

  /**
   * Adueñarse del buscador de alguien es romperle algo que SÍ le funcionaba: el
   * visitante escribe «horarios», pulsa, y en vez de buscar nos manda un mensaje.
   */
  it("el buscador del sitio no es un formulario de contacto", () => {
    const casos = [
      `<form><input type="search" name="loquesea"></form>`,
      `<form><input type="text" name="q"></form>`,
      `<form><input type="text" name="buscar"></form>`,
      `<form role="search"><input type="text" name="texto"></form>`,
    ];
    for (const c of casos) {
      expect(detectarFormularios(doc(c))[0].estado, c).toBe("buscador");
    }
  });

  it("pero un contacto de un solo campo de correo NO es un buscador", () => {
    const html = doc(`<form><input type="email" name="q"></form>`);
    expect(detectarFormularios(html)[0].estado).toBe("muerto");
  });

  it("un formulario vacío no se ofrece para conectar", () => {
    expect(formulariosMuertos(doc(`<form></form>`))).toEqual([]);
  });

  it("varios formularios en la misma página se numeran en orden", () => {
    const html = doc(`<form action="/ok"><input name="a"></form>${CONTACTO}${CONTACTO}`);
    const todos = detectarFormularios(html);
    expect(todos.map((f) => f.indice)).toEqual([0, 1, 2]);
    expect(todos.map((f) => f.estado)).toEqual(["ajeno", "muerto", "muerto"]);
    // El índice es el del `<form>` en la página, NO el de los muertos: si se
    // renumeraran, al arreglar el primero cambiaría el nombre de los otros y los
    // envíos guardados dejarían de corresponder con su formulario.
    expect(formulariosMuertos(html).map((f) => f.indice)).toEqual([1, 2]);
  });

  it("una página sin formularios no da nada", () => {
    expect(detectarFormularios(doc("<h1>Hola</h1>"))).toEqual([]);
  });
});

describe("conectar formularios al servir", () => {
  it("le pone nuestro action y method", () => {
    const { html, conectados } = conFormulariosConectados(doc(CONTACTO), "/contacto.html");
    expect(conectados).toBe(1);
    expect(html).toContain(`action="${RUTA_ENVIO}"`);
    expect(html).toContain(`method="post"`);
  });

  it("mete la trampa y la página", () => {
    const { html } = conFormulariosConectados(doc(CONTACTO), "/contacto.html");
    expect(html).toContain(`name="${CAMPO_TRAMPA}"`);
    expect(html).toContain(`name="${CAMPO_PAGINA}" value="/contacto.html"`);
  });

  /**
   * `display:none` no vale: hay robots que se saltan a propósito lo que está
   * oculto así, justamente porque saben que suele ser una trampa.
   */
  it("la trampa se esconde moviéndola fuera de la pantalla, no con display:none", () => {
    const { html } = conFormulariosConectados(doc(CONTACTO), "/x");
    const trozo = html.slice(html.indexOf("left:-9999px") - 200, html.indexOf(CAMPO_TRAMPA) + 200);
    expect(trozo).toContain("left:-9999px");
    expect(trozo).toContain('tabindex="-1"');
    expect(trozo).toContain('autocomplete="off"');
    expect(trozo).not.toContain("display:none");
  });

  it("NO toca los que ya van a alguna parte", () => {
    const original = doc(CONTACTO.replace("<form>", `<form action="https://formspree.io/f/abc">`));
    const { html, conectados } = conFormulariosConectados(original, "/contacto.html");
    expect(conectados).toBe(0);
    expect(html).toBe(original); // byte a byte
  });

  it("NO toca el buscador", () => {
    const original = doc(`<form><input type="search" name="q"></form>`);
    expect(conFormulariosConectados(original, "/").html).toBe(original);
  });

  it("una página sin formularios sale idéntica", () => {
    const original = doc("<h1>Hola</h1><p>qué tal</p>");
    expect(conFormulariosConectados(original, "/").html).toBe(original);
  });

  /**
   * La guarda de fondo de todo el módulo: se edita por posiciones sobre el
   * fuente, NO re-serializando. Pasar la web de un cliente por un serializador se
   * lo reescribe todo —comillas, mayúsculas, entidades, espacios— y cualquier
   * diferencia es un fallo nuestro en una web que iba bien.
   */
  it("no reescribe nada más del documento", () => {
    const original = doc(
      `<DIV CLASS='raro'>  texto   con    espacios &amp; entidades  </DIV>` +
      `<img src=sin-comillas.png>` +
      CONTACTO
    );
    const { html } = conFormulariosConectados(original, "/x");
    expect(html).toContain(`<DIV CLASS='raro'>  texto   con    espacios &amp; entidades  </DIV>`);
    expect(html).toContain(`<img src=sin-comillas.png>`);
  });

  it("respeta el action que ya existía sustituyéndolo, no duplicándolo", () => {
    const { html } = conFormulariosConectados(doc(CONTACTO.replace("<form>", `<form action="#">`)), "/x");
    expect(html.match(/action=/g)).toHaveLength(1);
  });

  /**
   * Con dos formularios hay que editar de ATRÁS hacia delante: cada corte usa
   * posiciones del fuente original, así que la primera edición desplazaría todas
   * las siguientes y a partir de la segunda se cortaría por donde no es.
   *
   * Se comprueba VOLVIENDO A ANALIZAR LA SALIDA, no contando trozos de texto. Y
   * no es un capricho: la primera versión de este test contaba apariciones de
   * `action=`, de `</form>` y del `<hr>`, y con el orden invertido **pasaba
   * igual** — el documento salía destrozado y esos trozos seguían estando ahí por
   * casualidad. Lo que hay que exigir es la propiedad de verdad: después de
   * conectar, no queda ningún formulario muerto.
   */
  it("con varios formularios los conecta TODOS, y la salida vuelve a analizarse bien", () => {
    const original = doc(CONTACTO + "<hr>" + CONTACTO);
    const { html, conectados } = conFormulariosConectados(original, "/x");
    expect(conectados).toBe(2);

    const despues = detectarFormularios(html);
    expect(despues).toHaveLength(2);                       // no se ha perdido ninguno
    expect(despues.every((f) => f.estado === "ajeno")).toBe(true); // ninguno sigue muerto
    expect(despues.map((f) => f.action)).toEqual([RUTA_ENVIO, RUTA_ENVIO]);
    // Y cada uno sabe cuál es: si se mezclaran, los envíos guardados apuntarían
    // al formulario equivocado.
    expect(html).toContain(`name="${CAMPO_INDICE}" value="0"`);
    expect(html).toContain(`name="${CAMPO_INDICE}" value="1"`);
    expect(html).toContain("<hr>");
  });

  it("conectar dos veces no duplica nada (idempotente)", () => {
    const una = conFormulariosConectados(doc(CONTACTO), "/x").html;
    expect(conFormulariosConectados(una, "/x")).toEqual({ html: una, conectados: 0 });
  });

  it("escapa la ruta de la página (llega de la URL)", () => {
    const { html } = conFormulariosConectados(doc(CONTACTO), `/x"><script>alert(1)</script>`);
    expect(html).not.toContain("<script>alert(1)");
  });
});
