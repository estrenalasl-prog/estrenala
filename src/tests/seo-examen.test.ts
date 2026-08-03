import { describe, it, expect } from "vitest";
import { examinarPagina, examinarSitio, type ClaveFallo } from "@/src/seo/examen";

/** Una página que lo tiene TODO bien. Es la referencia de todo el archivo. */
const PERFECTA = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cafetería La Esquina — Café de especialidad en Málaga</title>
  <meta name="description" content="Tostamos nuestro propio café en el centro de Málaga. Desayunos, brunch y grano para llevar, de martes a domingo.">
  <link rel="icon" href="/favicon.ico">
  <meta property="og:image" content="https://laesquina.com/portada.jpg">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"CafeOrCoffeeShop"}</script>
</head>
<body>
  <h1>Café de especialidad en el centro de Málaga</h1>
  <h2>Nuestra carta</h2>
  <img src="/tostado.jpg" alt="Grano recién tostado" width="800" height="600">
  <p><a href="/carta">Ver la carta completa</a></p>
</body>
</html>`;

// Se examinan como PORTADA: es la única página donde se mira la ficha para
// buscadores, porque es la única donde se pone (ver ficha.ts).
const claves = (html: string): ClaveFallo[] => examinarPagina(html, "/", true).fallos.map((f) => f.clave);
const busca = (html: string, clave: ClaveFallo) =>
  examinarPagina(html, "/", true).fallos.find((f) => f.clave === clave);

describe("examen de una página", () => {
  it("una página bien hecha no tiene ni un fallo", () => {
    expect(claves(PERFECTA)).toEqual([]);
    expect(examinarSitio({ paginas: [{ ruta: "/", html: PERFECTA }] }).nota).toBe(100);
  });

  it("una página vacía saca todos los fallos de estructura", () => {
    const c = claves(`<html><head></head><body><p>Hola</p></body></html>`);
    expect(c).toContain("sinTitulo");
    expect(c).toContain("sinDescripcion");
    expect(c).toContain("sinH1");
    expect(c).toContain("sinViewport");
    expect(c).toContain("sinLang");
    expect(c).toContain("sinOgImage");
    expect(c).toContain("sinFavicon");
    expect(c).toContain("sinDatosEstructurados");
  });

  it("un <title> vacío cuenta igual que no tenerlo", () => {
    expect(claves(PERFECTA.replace(/<title>[^<]*<\/title>/, "<title>  </title>"))).toContain("sinTitulo");
  });

  it("avisa del título largo y enseña cuál es", () => {
    const largo = "Cafetería La Esquina — Café de especialidad, brunch, desayunos y grano para llevar en Málaga centro";
    const f = busca(PERFECTA.replace(/<title>[^<]*<\/title>/, `<title>${largo}</title>`), "tituloLargo");
    expect(f?.ejemplos).toEqual([largo]);
    // Y no lo confunde con no tenerlo.
    expect(claves(PERFECTA.replace(/<title>[^<]*<\/title>/, `<title>${largo}</title>`))).not.toContain("sinTitulo");
  });

  it("una descripción de más de 160 se avisa, una de 160 no", () => {
    const meta = (n: number) =>
      PERFECTA.replace(/(<meta name="description" content=")[^"]*/, `$1${"a".repeat(n)}`);
    expect(claves(meta(160))).not.toContain("descripcionLarga");
    expect(claves(meta(161))).toContain("descripcionLarga");
  });
});

describe("encabezados", () => {
  it("varios h1 se avisan, con sus textos", () => {
    const f = busca(PERFECTA.replace("<h2>Nuestra carta</h2>", "<h1>Otro título</h1>"), "variosH1");
    expect(f?.cuantos).toBe(2);
    expect(f?.ejemplos).toContain("Otro título");
  });

  it("saltarse un nivel (h1 → h3) se avisa", () => {
    expect(claves(PERFECTA.replace("<h2>Nuestra carta</h2>", "<h3>Nuestra carta</h3>"))).toContain("saltoEncabezados");
  });

  /**
   * Bajar y volver a subir NO es un salto: `h2 → h3 → h2 → h3` es un índice
   * correcto con dos secciones. Comparar contra el mínimo visto en vez de contra
   * el anterior marcaría esto como error y sería un aviso falso en casi cualquier
   * página con dos secciones.
   */
  it("volver a un nivel ya usado no es saltarse ninguno", () => {
    const cuerpo = "<h1>A</h1><h2>B</h2><h3>C</h3><h2>D</h2><h3>E</h3>";
    expect(claves(PERFECTA.replace("<h1>Café de especialidad en el centro de Málaga</h1>\n  <h2>Nuestra carta</h2>", cuerpo)))
      .not.toContain("saltoEncabezados");
  });

  it("una página sin ningún encabezado no inventa saltos", () => {
    const c = claves(`<html lang="es"><body><p>Solo texto</p></body></html>`);
    expect(c).toContain("sinH1");
    expect(c).not.toContain("saltoEncabezados");
  });
});

describe("imágenes", () => {
  /**
   * LA DECISIÓN de todo el módulo: `alt=""` es la forma CORRECTA de decir «esta
   * imagen es decorativa, no la leas». Contarlo como fallo sería regañar a quien
   * lo hizo bien, y encima empujarle a ponerle texto a una raya de adorno, que es
   * peor que dejarlo vacío.
   */
  it("alt=\"\" es correcto y NO cuenta como fallo", () => {
    const html = PERFECTA.replace(/alt="[^"]*"/, 'alt=""');
    expect(claves(html)).not.toContain("imagenesSinAlt");
  });

  it("sin el atributo alt sí cuenta, con cuántas y sus nombres", () => {
    const html = PERFECTA.replace(
      '<img src="/tostado.jpg" alt="Grano recién tostado" width="800" height="600">',
      '<img src="/tostado.jpg" width="800" height="600"><img src="/fotos/local.png?v=2" width="1" height="1">'
    );
    const f = busca(html, "imagenesSinAlt");
    expect(f?.cuantos).toBe(2);
    expect(f?.ejemplos).toEqual(["tostado.jpg", "local.png"]); // sin la ?v=2
  });

  it("no enseña más de cinco ejemplos aunque haya veinte", () => {
    const veinte = Array.from({ length: 20 }, (_, i) => `<img src="/f${i}.jpg" width="1" height="1">`).join("");
    const f = busca(PERFECTA.replace("<p>", veinte + "<p>"), "imagenesSinAlt");
    expect(f?.cuantos).toBe(20);
    expect(f?.ejemplos).toHaveLength(5);
  });

  it("falta cualquiera de width/height y se avisa del salto de maquetación", () => {
    for (const img of ['<img src="/a.jpg" alt="a">', '<img src="/a.jpg" alt="a" width="10">', '<img src="/a.jpg" alt="a" height="10">']) {
      const html = PERFECTA.replace(/<img [^>]*>/, img);
      expect(claves(html), img).toContain("imagenesSinTamano");
    }
  });

  it("una imagen incrustada en el propio HTML no se cuenta", () => {
    const html = PERFECTA.replace(/<img [^>]*>/, '<img src="data:image/gif;base64,R0lGOD">');
    const c = claves(html);
    expect(c).not.toContain("imagenesSinAlt");
    expect(c).not.toContain("imagenesSinTamano");
  });
});

describe("cabecera", () => {
  it("og:image vale escrito con property o con name", () => {
    for (const attr of ["property", "name"]) {
      const html = PERFECTA.replace('property="og:image"', `${attr}="og:image"`);
      expect(claves(html), attr).not.toContain("sinOgImage");
    }
  });

  it("un lang vacío es como no tenerlo", () => {
    expect(claves(PERFECTA.replace('lang="es"', 'lang=""'))).toContain("sinLang");
  });

  it("el favicon vale en cualquiera de sus tres formas", () => {
    for (const rel of ["icon", "shortcut icon", "apple-touch-icon"]) {
      const html = PERFECTA.replace('rel="icon"', `rel="${rel}"`);
      expect(claves(html), rel).not.toContain("sinFavicon");
    }
  });

  it("un <script> normal no cuenta como datos estructurados", () => {
    const html = PERFECTA.replace('type="application/ld+json"', 'type="text/javascript"');
    expect(claves(html)).toContain("sinDatosEstructurados");
  });
});

describe("enlaces que no dicen a dónde llevan", () => {
  it("los pilla en los cinco idiomas, con flechas y mayúsculas", () => {
    for (const texto of ["Leer más →", "CLIC AQUÍ", "Read more", "Saiba mais", "En savoir plus", "Clicca qui"]) {
      const html = PERFECTA.replace("Ver la carta completa", texto);
      expect(claves(html), texto).toContain("enlacesGenericos");
    }
  });

  /**
   * «Leer más sobre nuestros talleres» es un enlace perfectamente claro. Buscar
   * por «contiene» lo marcaría, y un aviso falso enseña a ignorar los avisos.
   */
  it("no marca un enlace que EMPIEZA por una fórmula pero sigue diciendo a dónde va", () => {
    const html = PERFECTA.replace("Ver la carta completa", "Leer más sobre nuestros talleres");
    expect(claves(html)).not.toContain("enlacesGenericos");
  });

  /**
   * Visto en la web real: el texto envuelto en `<span>` para animarlo. Mirando
   * solo el texto DIRECTO del `<a>` no se ve nada y el enlace se escapa.
   */
  it("lo pilla aunque el texto vaya envuelto en spans", () => {
    const html = PERFECTA.replace(
      "Ver la carta completa",
      '<span class="w">Leer</span> <span class="w">más</span>'
    );
    expect(claves(html)).toContain("enlacesGenericos");
  });

  it("un <a> sin href no se examina: es un ancla, no un enlace", () => {
    const html = PERFECTA.replace('<a href="/carta">Ver la carta completa</a>', "<a>aquí</a>");
    expect(claves(html)).not.toContain("enlacesGenericos");
  });
});

describe("examen del sitio entero", () => {
  const con = (titulo: string, extra = "") =>
    PERFECTA.replace(/<title>[^<]*<\/title>/, `<title>${titulo}</title>`).replace("</body>", extra + "</body>");

  it("el mismo título en dos páginas se avisa una vez, nombrando las dos", () => {
    const r = examinarSitio({
      paginas: [
        { ruta: "/", html: con("Mi Web") },
        { ruta: "/contacto.html", html: con("Mi Web") },
        { ruta: "/carta.html", html: con("La carta — Mi Web") },
      ],
    });
    const f = r.fallos.find((x) => x.clave === "titulosRepetidos");
    expect(f?.paginas.sort()).toEqual(["/", "/contacto.html"]);
    expect(f?.ejemplos).toEqual(["Mi Web"]);
  });

  it("un título ausente no se cuenta además como repetido", () => {
    const sinTitulo = PERFECTA.replace(/<title>[^<]*<\/title>/, "");
    const r = examinarSitio({
      paginas: [{ ruta: "/a", html: sinTitulo }, { ruta: "/b", html: sinTitulo }],
    });
    expect(r.fallos.map((f) => f.clave)).toContain("sinTitulo");
    expect(r.fallos.map((f) => f.clave)).not.toContain("titulosRepetidos");
  });

  /**
   * La nota va por FRACCIÓN de páginas afectadas. Si no, quien arregla nueve de
   * diez páginas ve la misma nota que antes y deja de arreglar.
   */
  it("un fallo en una página de diez cuesta la décima parte que en las diez", () => {
    // Cada página con SU título y SU descripción: si no, saltarían además los
    // dos fallos de «repetido» y la cuenta mediría otra cosa. Lo cazó el propio
    // examen la primera vez que se corrió esto.
    const propia = (i: number) =>
      con(`Página ${i}`).replace(/(<meta name="description" content=")[^"]*/, `$1Descripción distinta de la página ${i}`);
    const sinViewport = (h: string) => h.replace(/<meta name="viewport"[^>]*>/, "");

    const unaDeDiez = examinarSitio({
      paginas: Array.from({ length: 10 }, (_, i) => ({
        ruta: `/p${i}`,
        html: i === 9 ? sinViewport(propia(i)) : propia(i),
      })),
    });
    const diezDeDiez = examinarSitio({
      paginas: Array.from({ length: 10 }, (_, i) => ({ ruta: `/p${i}`, html: sinViewport(propia(i)) })),
    });

    expect(unaDeDiez.nota).toBe(99);  // 100 - 15/10
    expect(diezDeDiez.nota).toBe(85); // 100 - 15
  });

  it("los fallos salen ordenados por lo que pesan, el peor primero", () => {
    const rota = `<html><head></head><body><p>Nada</p></body></html>`;
    const r = examinarSitio({ paginas: [{ ruta: "/", html: rota }] });
    expect(r.fallos[0].clave).toBe("sinTitulo");
    expect(r.fallos[1].clave).toBe("sinViewport");
    expect(r.fallos.at(-1)?.gravedad).toBe("aviso");
  });

  it("la nota nunca baja de cero por mucho que se acumule", () => {
    const rota = `<html><head></head><body><p>Nada</p><a href="/x">aquí</a><img src="/a.jpg"></body></html>`;
    const r = examinarSitio({ paginas: [{ ruta: "/", html: rota }] });
    expect(r.nota).toBeGreaterThanOrEqual(0);
    expect(r.nota).toBeLessThan(30);
  });

  it("dice cuántas ha mirado y cuántas hay, para no mentir cuando hay tope", () => {
    const r = examinarSitio({ paginas: [{ ruta: "/", html: PERFECTA }], totales: 40 });
    expect(r.examinadas).toBe(1);
    expect(r.totales).toBe(40);
  });

  it("sin páginas no se inventa una nota", () => {
    expect(examinarSitio({ paginas: [] })).toMatchObject({ nota: 0, fallos: [], examinadas: 0 });
  });

  /**
   * Solo se marca como «lo arreglamos nosotros» lo que se puede añadir SIN que
   * la web se vea distinta: una etiqueta invisible. El `viewport` queda fuera
   * aunque sepamos de memoria la línea que falta, porque ponerlo cambia cómo se
   * dibuja la página en el móvil y una web no responsive pasaría a verse cortada.
   */
  it("marca cuáles sabe arreglar la plataforma sola, y solo esas", () => {
    const rota = `<html><head><title>Contacto — Mi Negocio</title></head><body><img src="/a.jpg"></body></html>`;
    const r = examinarSitio({ paginas: [{ ruta: "/", html: rota }] });
    const arreglables = r.fallos.filter((f) => f.arreglable).map((f) => f.clave).sort();
    expect(arreglables).toEqual(["sinDatosEstructurados", "sinOgImage"]);
    expect(r.fallos.find((f) => f.clave === "sinViewport")?.arreglable).toBe(false);
  });

  /**
   * La ficha necesita saber de QUIÉN es la web, y eso sale del `og:site_name` o
   * del nombre detrás del separador del título. Sin eso no se genera (ficha.ts),
   * así que prometerlo aquí sería mentir.
   */
  it("no promete la ficha si la web no dice de quién es", () => {
    const anonima = `<html><head><title>Contacto</title></head><body><p>x</p></body></html>`;
    const r = examinarSitio({ paginas: [{ ruta: "/", html: anonima }] });
    expect(r.fallos.find((f) => f.clave === "sinDatosEstructurados")?.arreglable).toBe(false);
  });

  /**
   * La imagen que ponemos al compartir es la primera de la propia página. En una
   * página sin ninguna imagen no hay nada que poner, así que basta una así para
   * que el conjunto deje de prometerlo: «lo arreglamos» a medias, en la pantalla
   * donde nos están conociendo, es mentira.
   */
  it("basta una página que no se pueda arreglar para no prometerlo en el conjunto", () => {
    const conFoto = `<html><head><title>A — Mi Negocio</title></head><body><img src="/a.jpg" alt="a"></body></html>`;
    const sinFoto = `<html><head><title>B — Mi Negocio</title></head><body><p>Solo texto</p></body></html>`;

    const todasConFoto = examinarSitio({ paginas: [{ ruta: "/a", html: conFoto }, { ruta: "/b", html: conFoto }] });
    expect(todasConFoto.fallos.find((f) => f.clave === "sinOgImage")?.arreglable).toBe(true);

    const mezcla = examinarSitio({ paginas: [{ ruta: "/a", html: conFoto }, { ruta: "/b", html: sinFoto }] });
    expect(mezcla.fallos.find((f) => f.clave === "sinOgImage")?.arreglable).toBe(false);
  });

  /**
   * La ficha solo se mira en la portada, porque es la única página donde se pone
   * (ver ficha.ts). Avisar de veinte artículos «sin ficha» sería inventarse un
   * problema de veinte páginas donde hay uno de una.
   */
  it("la ficha para buscadores solo se le exige a la portada", () => {
    const sinFicha = `<html><head><title>X — Mi Negocio</title></head><body><p>x</p></body></html>`;
    const r = examinarSitio({
      paginas: [{ ruta: "index.html", html: sinFicha }, { ruta: "blog/uno.html", html: sinFicha }],
      portada: "index.html",
    });
    expect(r.fallos.find((f) => f.clave === "sinDatosEstructurados")?.paginas).toEqual(["index.html"]);
  });
});
