import { describe, it, expect } from "vitest";
import { datosDeLaPagina, fichaDeLaPagina, conFicha, conTarjetaAlCompartir, ID_FICHA } from "@/src/seo/ficha";

const URL_PAG = "https://micafe.com/contacto.html";
const BASE = "https://micafe.com/";

const WEB = `<!doctype html><html lang="es"><head>
<title>Contacto — Cafetería La Esquina</title>
<meta name="description" content="Dónde estamos y cómo llegar.">
<link rel="apple-touch-icon" href="/icono-180.png">
</head><body>
<img src="fotos/local.jpg" alt="El local">
<a href="tel:+34952123456">952 12 34 56</a>
<a href="mailto:hola@micafe.com?subject=Hola">Escríbenos</a>
<a href="https://www.instagram.com/laesquinamalaga">Instagram</a>
<a href="https://facebook.com/laesquina/">Facebook</a>
<a href="https://otrositio.com">Un amigo</a>
</body></html>`;

/** Saca el JSON que se ha inyectado, deshaciendo el escape del `<`. */
function fichaDe(html: string): { "@graph": Record<string, unknown>[] } {
  const m = html.match(new RegExp(`id="${ID_FICHA}">([\\s\\S]*?)</script>`));
  if (!m) throw new Error("no se ha inyectado ninguna ficha");
  return JSON.parse(m[1].replace(/\\u003c/g, "<"));
}
const nodo = (html: string, tipo: string) =>
  fichaDe(html)["@graph"].find((n) => n["@type"] === tipo) as Record<string, unknown>;

/** La ficha solo se pone en la portada, así que casi todo se prueba ahí. */
const enPortada = (html: string) => conFicha(html, { url: BASE, base: BASE, esPortada: true });

describe("lo que se saca de la página", () => {
  const d = datosDeLaPagina(WEB, URL_PAG);

  it("el nombre del sitio sale de detrás del separador del título", () => {
    expect(d.nombreSitio).toBe("Cafetería La Esquina");
    expect(d.titulo).toBe("Contacto — Cafetería La Esquina");
  });

  it("un título sin separador NO da nombre de empresa: no se deduce nada", () => {
    const solo = datosDeLaPagina(WEB.replace(/<title>[^<]*<\/title>/, "<title>Contacto</title>"), URL_PAG);
    expect(solo.nombreSitio).toBeNull();
  });

  it("las rutas relativas se vuelven absolutas contra la página", () => {
    expect(d.imagen).toBe("https://micafe.com/fotos/local.jpg");
    expect(d.logo).toBe("https://micafe.com/icono-180.png");
  });

  it("teléfono y correo salen de sus enlaces, sin el ?subject", () => {
    expect(d.telefono).toBe("+34952123456");
    expect(d.correo).toBe("hola@micafe.com");
  });

  it("solo entran como redes los perfiles de redes conocidas", () => {
    expect(d.redes).toEqual([
      "https://www.instagram.com/laesquinamalaga",
      "https://facebook.com/laesquina/",
    ]);
  });

  /**
   * Un enlace a `instagram.com` a secas no identifica a nadie: es un enlace a
   * Instagram, no al perfil del negocio. Metido en `sameAs` le estaríamos
   * diciendo a Google que nuestro cliente ES Instagram.
   */
  it("un enlace pelado a la red, sin perfil, no cuenta", () => {
    const html = WEB.replace('https://www.instagram.com/laesquinamalaga', "https://instagram.com/");
    expect(datosDeLaPagina(html, URL_PAG).redes).toEqual(["https://facebook.com/laesquina/"]);
  });

  it("un favicon pequeño NO se usa como logo", () => {
    const html = WEB.replace('rel="apple-touch-icon"', 'rel="icon"');
    expect(datosDeLaPagina(html, URL_PAG).logo).toBeNull();
  });

  it("og: manda sobre lo demás", () => {
    const html = WEB.replace("<title>", '<meta property="og:site_name" content="La Esquina"><title>');
    expect(datosDeLaPagina(html, URL_PAG).nombreSitio).toBe("La Esquina");
  });
});

describe("el grafo", () => {
  it("la organización y el sitio quedan enlazados entre sí", () => {
    const html = enPortada(WEB);
    const org = nodo(html, "Organization");
    const web = nodo(html, "WebSite");

    expect(org["@id"]).toBe("https://micafe.com/#organizacion");
    expect(web["@id"]).toBe("https://micafe.com/#web");
    expect(web.publisher).toEqual({ "@id": org["@id"] });
    expect(fichaDe(html)["@graph"]).toHaveLength(2);
  });

  it("lleva teléfono, correo, logo y redes cuando están en la página", () => {
    const org = nodo(enPortada(WEB), "Organization");
    expect(org).toMatchObject({
      name: "Cafetería La Esquina",
      telephone: "+34952123456",
      email: "hola@micafe.com",
      logo: "https://micafe.com/icono-180.png",
    });
    expect(org.sameAs).toHaveLength(2);
  });

  /**
   * LA REGLA de todo el módulo: si el dato no está en la página, la propiedad no
   * sale. Ponerle a Google un teléfono deducido es firmarle a nuestro cliente
   * datos falsos.
   */
  it("lo que no está en la página no aparece inventado", () => {
    const pelada = `<html><head><title>Hola — Mi Sitio</title></head><body><p>Nada</p></body></html>`;
    const org = nodo(enPortada(pelada), "Organization");
    expect(Object.keys(org).sort()).toEqual(["@id", "@type", "name", "url"]);
  });

  /**
   * SOLO LA PORTADA, y lo decidió la web real de pruebas: el nombre se deduce
   * del título de cada página, y allí el índice del blog decía «Quantiva Core
   * Agentes IA» mientras las tres páginas legales decían «Quantiva Technology».
   * Las cuatro declarando el MISMO `#organizacion`: dos identidades
   * contradictorias para el mismo id, que es peor que no declarar ninguna.
   */
  it("una página que no es la portada no lleva ficha", () => {
    expect(conFicha(WEB, { url: URL_PAG, base: BASE, esPortada: false })).toBe(WEB);
  });

  /**
   * LA OTRA REGLA. Si la web no dice de quién es, lo único que podríamos
   * declarar es un `WebPage` con su título dentro — y ese título Google ya lo ha
   * leído del `<title>`. No informa de nada: solo mete un bloque más en todas
   * las páginas. Lo destapó un test de resolve-site que exigía que la web se
   * sirviera byte a byte igual, y tenía razón.
   */
  it("sin nombre de sitio NO hay ficha, aunque haya título", () => {
    expect(fichaDeLaPagina({
      datos: { nombreSitio: null, titulo: "Contacto", descripcion: "Algo", imagen: null, logo: null, telefono: null, correo: null, redes: [] },
      base: BASE, esPortada: true,
    })).toBeNull();

    const sinSeparador = `<html><head><title>Contacto</title></head><body><p>x</p></body></html>`;
    expect(enPortada(sinSeparador)).toBe(sinSeparador);
  });
});

describe("inyectar la ficha", () => {
  it("la mete dentro del <head>, antes de cerrarlo", () => {
    const html = enPortada(WEB);
    expect(html.indexOf(ID_FICHA)).toBeLessThan(html.indexOf("</head>"));
  });

  /**
   * Los suyos saben más de su negocio que nosotros, y dos fichas que se
   * contradicen son peores que una. Es además lo que pasa con TODOS los
   * artículos del blog, que ya nacen con la suya.
   */
  it("si la web ya trae datos estructurados, no se toca nada", () => {
    const conLosSuyos = WEB.replace("</head>", `<script type="application/ld+json">{"@type":"Cafe"}</script></head>`);
    expect(enPortada(conLosSuyos)).toBe(conLosSuyos);
  });

  it("una web sin <head> no acaba con la ficha dentro del cuerpo", () => {
    const suelto = `<html><body><h1>Hola</h1></body></html>`;
    const html = enPortada(suelto);
    // Sin título ni nombre no hay nada que contar, así que sale igual.
    expect(html).toBe(suelto);

    const conTitulo = `<title>Hola — Mi Sitio</title><html><body><h1>Hola</h1></body></html>`;
    const r = enPortada(conTitulo);
    expect(r.indexOf(ID_FICHA)).toBeLessThan(r.indexOf("<body"));
  });

  /**
   * El nombre sale del HTML del cliente, así que puede traer `</script>`. Sin
   * escapar el `<`, la etiqueta se cierra a mitad y el resto del JSON se pinta
   * como texto en su web: la vía clásica de colar marcado ajeno en una página.
   */
  it("un </script> dentro del título no rompe la etiqueta", () => {
    const malo = WEB.replace(
      "Contacto — Cafetería La Esquina",
      "Contacto — La Esquina&lt;/script&gt;&lt;img src=x onerror=alert(1)&gt;"
    );
    const html = enPortada(malo);
    const bloque = html.slice(html.indexOf(ID_FICHA), html.indexOf("</script>", html.indexOf(ID_FICHA)));
    expect(bloque).not.toContain("<");
    expect(bloque).toContain("\\u003c");
    // Y el JSON sigue siendo válido y con el texto entero.
    expect(nodo(html, "Organization").name).toContain("</script>");
  });

  it("no toca nada más del documento", () => {
    const raro = `<html><head><title>A — B</title></head><body>` +
      `<DIV CLASS='raro'>  espacios   y &amp; entidades  </DIV><img src=sin-comillas.png></body></html>`;
    const html = enPortada(raro);
    expect(html).toContain(`<DIV CLASS='raro'>  espacios   y &amp; entidades  </DIV>`);
    expect(html).toContain(`<img src=sin-comillas.png>`);
  });

  it("aplicarlo dos veces no duplica nada", () => {
    const una = enPortada(WEB);
    expect(enPortada(una)).toBe(una);
  });
});

describe("la imagen al compartir", () => {
  it("pone la primera imagen de la página, absoluta", () => {
    const html = conTarjetaAlCompartir(WEB, URL_PAG);
    expect(html).toContain('<meta property="og:image" content="https://micafe.com/fotos/local.jpg">');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
  });

  it("si ya declara og:image no se toca, aunque no nos guste", () => {
    const conLaSuya = WEB.replace("</head>", '<meta property="og:image" content="/otra.png"></head>');
    expect(conTarjetaAlCompartir(conLaSuya, URL_PAG)).toBe(conLaSuya);
  });

  /**
   * Declarar la tarjeta grande sin foto que enseñar deja un hueco en blanco, que
   * es peor que la tarjeta pequeña de siempre.
   */
  it("una página sin ninguna imagen sale idéntica", () => {
    const sinFotos = `<html><head><title>A — B</title></head><body><p>Texto</p></body></html>`;
    expect(conTarjetaAlCompartir(sinFotos, URL_PAG)).toBe(sinFotos);
  });

  it("una imagen incrustada no vale como tarjeta", () => {
    const html = WEB.replace('src="fotos/local.jpg"', 'src="data:image/gif;base64,R0lGOD"');
    expect(conTarjetaAlCompartir(html, URL_PAG)).toBe(html);
  });

  it("no pisa el twitter:card que ya tuviera", () => {
    const html = conTarjetaAlCompartir(WEB.replace("</head>", '<meta name="twitter:card" content="summary"></head>'), URL_PAG);
    expect(html.match(/twitter:card/g)).toHaveLength(1);
  });
});
