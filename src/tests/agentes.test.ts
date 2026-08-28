import { describe, it, expect } from "vitest";
import { aceptaMarkdown, rutaMarkdown, paginaDeSegmentos, PREFIJO_MD } from "@/src/agentes/rutas";
import { markdownDeRuta, sinMarcas, figurasComoTexto } from "@/src/agentes/markdown";
import { textoLlms } from "@/src/agentes/llms";
import { ARTICULOS, rutaArticulo, RUTA_BLOG } from "@/src/blog-estrenala/indice";
import { IDIOMAS, rutaDeIdioma } from "@/src/i18n/idiomas";
import { textosLanding } from "@/src/i18n/landing";
import { RUTAS_PRIVADAS } from "@/src/config/rutas-plataforma";
import {
  reglasRobots, textoRobots, SENALES_CONTENIDO, ZONAS_PRIVADAS,
} from "@/src/config/robots-plataforma";

const BASE = "https://estrenala.com";

/**
 * Lo que se le sirve a quien lee la web con una IA: la misma página en Markdown
 * y el índice de /llms.txt.
 *
 * Lo que estos tests protegen de verdad no es el formato, es que sea EL MISMO
 * TEXTO que ve una persona. Servir a un robot algo distinto de lo que ve el
 * visitante tiene nombre —cloaking— y se penaliza; y aunque no se penalizara,
 * una segunda copia del texto que nadie mira se queda vieja sola.
 */

describe("aceptaMarkdown", () => {
  // El caso que importa: un navegador NO puede acabar viendo texto plano.
  it("un navegador normal no pide Markdown, aunque traiga comodín", () => {
    const chrome = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";
    expect(aceptaMarkdown(chrome)).toBe(false);
    expect(aceptaMarkdown("*/*")).toBe(false);
    expect(aceptaMarkdown(null)).toBe(false);
    expect(aceptaMarkdown("")).toBe(false);
  });

  it("un agente que lo pide por su nombre, sí", () => {
    expect(aceptaMarkdown("text/markdown")).toBe(true);
    expect(aceptaMarkdown("text/markdown, */*;q=0.1")).toBe(true);
    expect(aceptaMarkdown("  TEXT/MARKDOWN  ")).toBe(true);
  });

  it("pedirlo con q=0 es pedir que NO", () => {
    expect(aceptaMarkdown("text/markdown;q=0")).toBe(false);
  });

  it("si prefiere HTML, se le da HTML: manda la cabecera, no nosotros", () => {
    expect(aceptaMarkdown("text/html, text/markdown;q=0.5")).toBe(false);
    expect(aceptaMarkdown("text/html;q=0.5, text/markdown")).toBe(true);
    expect(aceptaMarkdown("text/html;q=0.8, text/markdown;q=0.8")).toBe(true);
  });
});

describe("rutaMarkdown", () => {
  it("las páginas de contenido tienen versión en Markdown", () => {
    expect(rutaMarkdown("/")).toBe(PREFIJO_MD);
    expect(rutaMarkdown("/en")).toBe(`${PREFIJO_MD}/en`);
    expect(rutaMarkdown("/blog")).toBe(`${PREFIJO_MD}/blog`);
    expect(rutaMarkdown("/blog/publicar-web-hecha-con-ia")).toBe(`${PREFIJO_MD}/blog/publicar-web-hecha-con-ia`);
  });

  /**
   * EL punto delicado de todo esto. `/md` sirve texto sin mirar la sesión, así
   * que lo único que impide que sea una puerta trasera al panel es que aquí no
   * se traduzca nunca una ruta privada.
   */
  it("nada privado tiene versión en Markdown", () => {
    for (const privada of RUTAS_PRIVADAS) {
      expect(rutaMarkdown(privada), privada).toBeNull();
      expect(rutaMarkdown(`${privada}/loquesea`), privada).toBeNull();
    }
    for (const p of ["/settings", "/login", "/api/projects/x/edits", "/projects/9f8c1d2e-0000-4000-8000-abc"]) {
      expect(rutaMarkdown(p), p).toBeNull();
    }
  });

  it("lo que no es contenido, tampoco", () => {
    for (const p of ["/legal/cookies", "/brand", "/registro", "/blogotro", "/md", "/md/blog"]) {
      expect(rutaMarkdown(p), p).toBeNull();
    }
  });

  // Lo que sale de aquí se pega dentro de una ruta que el middleware reescribe.
  it("un slug raro no se traduce a ninguna ruta", () => {
    for (const p of ["/blog/MAYUS", "/blog/con espacio", "/blog/../secreto", "/blog/a/b", "/blog/a%2Fb"]) {
      expect(rutaMarkdown(p), p).toBeNull();
    }
  });

  it("paginaDeSegmentos deshace el prefijo", () => {
    expect(paginaDeSegmentos(undefined)).toBe("/");
    expect(paginaDeSegmentos([])).toBe("/");
    expect(paginaDeSegmentos(["en"])).toBe("/en");
    expect(paginaDeSegmentos(["blog", "x"])).toBe("/blog/x");
  });

  // La vuelta completa: todo lo que el middleware promete traducir, el route
  // handler tiene que saber escribirlo. Si una de las dos listas se mueve sin la
  // otra, esto queda en 404 y nadie se entera.
  it("todo lo que se traduce, se sabe escribir", () => {
    const paginas = [
      ...IDIOMAS.map(rutaDeIdioma),
      RUTA_BLOG,
      ...ARTICULOS.map((a) => rutaArticulo(a.slug)),
    ];
    for (const pagina of paginas) {
      const md = rutaMarkdown(pagina);
      expect(md, pagina).not.toBeNull();
      expect(markdownDeRuta(pagina, BASE), pagina).toBeTruthy();
    }
  });
});

describe("las marcas del catálogo se quitan", () => {
  it("el resaltado y el tachado desaparecen; la negrita se queda", () => {
    expect(sinMarcas("Tu web ya está lista. [[Estrénala]].")).toBe("Tu web ya está lista. Estrénala.");
    // «~~Subirla~~ te lleva semanas» en Markdown sería texto BORRADO: diría lo
    // contrario de lo que pone en la página.
    expect(sinMarcas("La IA te hizo la web. ~~Subirla~~ te lleva semanas.")).toBe(
      "La IA te hizo la web. Subirla te lleva semanas."
    );
    expect(sinMarcas("editar **a mano es gratis**")).toBe("editar **a mano es gratis**");
  });

  it("un dibujo se convierte en su pie, no en un marcador suelto", () => {
    expect(figurasComoTexto("antes\n\n{{figura:que-falta}}\n\ndespués")).toContain("*(Figura:");
    expect(figurasComoTexto("{{figura:que-falta}}")).not.toContain("{{figura");
    // Uno que no existe se deja tal cual: mejor un marcador visible que borrar
    // texto sin avisar.
    expect(figurasComoTexto("{{figura:no-existe}}")).toBe("{{figura:no-existe}}");
  });
});

describe("markdownDeRuta", () => {
  it("un artículo trae su título, su dirección de verdad y su cuerpo", () => {
    const a = ARTICULOS[0];
    const md = markdownDeRuta(rutaArticulo(a.slug), BASE)!;
    expect(md.startsWith(`# ${a.titulo}\n`)).toBe(true);
    expect(md).toContain(`> ${a.descripcion}`);
    expect(md).toContain(`${BASE}${rutaArticulo(a.slug)}`);
    expect(md).toContain(a.entradilla);
    for (const q of a.preguntas) expect(md).toContain(q.p);
  });

  // Si esto falla es que el cuerpo llegó a un modelo con el andamiaje dentro.
  it("no quedan marcadores ni etiquetas en ningún artículo", () => {
    for (const a of ARTICULOS) {
      const md = markdownDeRuta(rutaArticulo(a.slug), BASE)!;
      expect(md, a.slug).not.toContain("{{figura");
      expect(md, a.slug).not.toContain("<svg");
      expect(md, a.slug).not.toMatch(/\[\[|\]\]/);
    }
  });

  it("el índice del blog nombra TODOS los artículos, con su enlace", () => {
    const md = markdownDeRuta(RUTA_BLOG, BASE)!;
    for (const a of ARTICULOS) {
      expect(md, a.slug).toContain(a.titulo);
      expect(md, a.slug).toContain(`${BASE}${rutaArticulo(a.slug)}`);
    }
  });

  /**
   * Lo que hace legítimo servir Markdown: es el MISMO texto. Las preguntas
   * frecuentes salen del catálogo de la landing, no de una copia.
   */
  it("la landing dice lo mismo que la página, en los cinco idiomas", () => {
    for (const idioma of IDIOMAS) {
      const t = textosLanding(idioma);
      const md = markdownDeRuta(rutaDeIdioma(idioma), BASE)!;
      expect(md, idioma).toContain(t.meta.titulo);
      expect(md, idioma).toContain(t.meta.descripcion);
      for (const q of t.faq.preguntas) expect(md, `${idioma}: ${q.p}`).toContain(sinMarcas(q.p));
      expect(md, idioma).toContain(`${BASE}${rutaDeIdioma(idioma)}`);
    }
  });

  it("lo que no existe no se inventa", () => {
    for (const p of ["/blog/articulo-que-no-existe", "/settings", "/legal/cookies", "/xx"]) {
      expect(markdownDeRuta(p, BASE), p).toBeNull();
    }
  });
});

describe("llms.txt", () => {
  const txt = textoLlms(BASE);

  it("empieza por el nombre y una frase que dice qué somos", () => {
    expect(txt.startsWith("# Estrénala\n")).toBe(true);
    expect(txt).toContain(`> ${textosLanding("es").meta.descripcion}`);
  });

  it("lista todos los artículos con su descripción", () => {
    for (const a of ARTICULOS) {
      expect(txt, a.slug).toContain(`[${a.titulo}](${BASE}${rutaArticulo(a.slug)})`);
      expect(txt, a.slug).toContain(a.descripcion);
    }
  });

  /**
   * Los enlaces van a las direcciones DE VERDAD, no a `/md`. Si un modelo acaba
   * citándonos, tiene que citar la página que una persona puede abrir — no una
   * copia en texto plano sin diseño ni enlaces.
   */
  it("no enlaza a la copia en Markdown", () => {
    expect(txt).not.toContain(`${BASE}/md`);
    expect(txt).not.toContain("](/md");
  });

  it("dice lo que NO se puede hacer aquí, que es lo que más se malinterpreta", () => {
    expect(txt).toContain("NO se ejecuta código en servidor");
  });

  it("todos los enlaces son absolutos: un archivo así se lee fuera de contexto", () => {
    const enlaces = [...txt.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
    expect(enlaces.length).toBeGreaterThan(ARTICULOS.length);
    for (const e of enlaces) expect(e.startsWith(BASE), e).toBe(true);
  });
});

describe("robots.txt con señales de contenido", () => {
  const abierto = textoRobots(reglasRobots(false, `${BASE}/sitemap.xml`), SENALES_CONTENIDO);

  // El formato es el que generaba Next hasta hoy, línea por línea. Se fija
  // porque cambiarlo sin querer es fácil y no se nota hasta que un buscador se
  // queja — o peor, hasta que deja de rastrear algo en silencio.
  it("sale exactamente como salía, más las líneas nuevas", () => {
    const lineas = abierto.split("\n");
    expect(lineas).toContain("User-Agent: *");
    expect(lineas).toContain(`Content-Signal: ${SENALES_CONTENIDO}`);
    expect(lineas).toContain("Allow: /");
    for (const zona of ZONAS_PRIVADAS) expect(lineas).toContain(`Disallow: ${zona}`);
    expect(lineas).toContain(`Sitemap: ${BASE}/sitemap.xml`);
    expect(abierto.endsWith("\n")).toBe(true);
  });

  it("la señal dice: cítame sí, entréname no", () => {
    expect(SENALES_CONTENIDO).toBe("search=yes, ai-input=yes, ai-train=no");
  });

  it("el comentario explica la línea dentro del propio archivo", () => {
    expect(abierto).toContain("# Content-Signal:");
    expect(abierto).toContain("https://contentsignals.org");
    expect(abierto.indexOf("# Content-Signal:")).toBeLessThan(abierto.indexOf("User-Agent:"));
  });

  // Con el candado de pre-lanzamiento el archivo dice «no rastrees nada».
  // Ponerle al lado las condiciones de uso de lo que no debe mirar sería
  // contradecirse en el mismo archivo, igual que pasa con el Sitemap.
  it("con la plataforma escondida no se declara nada", () => {
    const oculto = textoRobots(reglasRobots(true, `${BASE}/sitemap.xml`), undefined);
    expect(oculto).toBe("User-Agent: *\nDisallow: /\n");
  });
});
