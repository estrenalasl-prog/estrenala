import { describe, it, expect } from "vitest";
import { resolvePublicSite } from "@/src/publish/resolve-site";
import { conMarca, ID_MARCA } from "@/src/publish/marca";
import { idiomaDeLaPagina } from "@/src/publish/idioma-pagina";
import { textosPublico } from "@/src/i18n/publico";
import { IDIOMAS } from "@/src/i18n/idiomas";
import {
  ROBOTS_NOINDEX, reapuntarCanonicos, reapuntarMetadatosImportados, reapuntarSitemap,
  dominiosAjenosDelSitemap,
} from "@/src/publish/seo";
import type { StorageAdapter } from "@/src/storage/types";
import type {
  ProjectStore, ProjectRow, SnapshotRow, SnapshotInfo,
  CreateProjectInput, CreateSnapshotInput, AssetRow, CreateAssetInput,
} from "@/src/repositories/types";

const PLAT = "localhost:3000";
const PREFIX = "projects/p1/snapshots/s1/";
const HTML = `<!doctype html><html><head><title>t</title></head><body><h1>Hola</h1></body></html>`;

class FakeStorage implements StorageAdapter {
  files = new Map<string, Buffer>();
  lecturas = 0; // para comprobar que resolver rutas no cuesta lecturas de más
  async put(key: string, body: Buffer | string) { this.files.set(key, Buffer.isBuffer(body) ? body : Buffer.from(body)); }
  async get(key: string) {
    this.lecturas++;
    const b = this.files.get(key);
    return b ? { body: b, contentType: key.endsWith(".css") ? "text/css; charset=utf-8" : "text/html; charset=utf-8" } : null;
  }
  async list(prefix: string) { return [...this.files.keys()].filter((k) => k.startsWith(prefix)); }
  async delete(key: string) { this.files.delete(key); }
}

type Sitio = {
  entryPath: string; storagePrefix: string; plan: string; noIndexar: boolean;
  dominio: string | null; subdominio: string | null;
};

class FakeStore implements ProjectStore {
  sitios = new Map<string, Sitio>(); // clave: "sub:x" | "dom:x"
  async createProjectWithSnapshot(i: CreateProjectInput) { return { projectId: i.projectId }; }
  async getProject(): Promise<ProjectRow | null> { return null; }
  async listProjects(): Promise<ProjectRow[]> { return []; }
  async setEntryPath(): Promise<void> {}
  async getCurrentSnapshot(): Promise<SnapshotRow | null> { return null; }
  async createSnapshot(_i: CreateSnapshotInput) {}
  async setCurrentSnapshot(): Promise<void> {}
  async listSnapshots(): Promise<SnapshotInfo[]> { return []; }
  async getSnapshotById(): Promise<SnapshotRow | null> { return null; }
  async createAsset(_i: CreateAssetInput) {}
  async getAsset(): Promise<AssetRow | null> { return null; }
  async getPublishedSiteByHost(q: { subdominio: string } | { dominio: string }) {
    const clave = "subdominio" in q ? `sub:${q.subdominio}` : `dom:${q.dominio}`;
    return this.sitios.get(clave) ?? null;
  }
  async setPublished(): Promise<void> {}
  async setNoIndexar(): Promise<void> {}
  async subdominioLibre(): Promise<boolean> { return true; }
  async setSubdominio(): Promise<boolean> { return true; }
  async dominioLibre(): Promise<boolean> { return true; }
  async setDominio(): Promise<boolean> { return true; }
}

// plan por defecto: de pago, para que estas pruebas comprueben el HTML tal cual.
// La marca del plan gratuito tiene su propio bloque más abajo.
function preparado(plan = "personal", extra: Partial<Sitio> = {}) {
  const storage = new FakeStorage();
  storage.files.set(PREFIX + "index.html", Buffer.from(HTML));
  storage.files.set(PREFIX + "css/app.css", Buffer.from("body{}"));
  const store = new FakeStore();
  const base = { entryPath: "index.html", storagePrefix: PREFIX, plan, noIndexar: false, dominio: null, subdominio: "cafe", ...extra };
  store.sitios.set("sub:cafe", base);
  store.sitios.set("dom:quantivatechnology.com", base);
  return { storage, store };
}

describe("resolvePublicSite", () => {
  it("sirve el entryPath en '/' byte-idéntico (sin <base>, sin data-wc-id) y no-cache", async () => {
    const { storage, store } = preparado();
    const r = await resolvePublicSite({ store, storage }, { host: "cafe.localhost:3000", platformHost: PLAT, pathSegments: [] });
    expect(r.status).toBe(200);
    expect(r.body.toString()).toBe(HTML);
    expect(r.body.toString()).not.toContain("<base");
    expect(r.cacheControl).toBe("no-cache");
  });

  it("sirve un asset con cache pública", async () => {
    const { storage, store } = preparado();
    const r = await resolvePublicSite({ store, storage }, { host: "cafe.localhost:3000", platformHost: PLAT, pathSegments: ["css", "app.css"] });
    expect(r.status).toBe(200);
    expect(r.contentType).toContain("text/css");
    expect(r.cacheControl).toBe("public, max-age=300");
  });

  it("resuelve por dominio propio", async () => {
    const { storage, store } = preparado();
    const r = await resolvePublicSite({ store, storage }, { host: "quantivatechnology.com", platformHost: PLAT, pathSegments: [] });
    expect(r.status).toBe(200);
  });

  it("host sin proyecto publicado → 404 'Esta web no está publicada'", async () => {
    const { storage, store } = preparado();
    const r = await resolvePublicSite({ store, storage }, { host: "nadie.localhost:3000", platformHost: PLAT, pathSegments: [] });
    expect(r.status).toBe(404);
    expect(r.body.toString()).toContain("Esta web no está publicada");
  });

  it("host de plataforma o desconocido → 404", async () => {
    const { storage, store } = preparado();
    const a = await resolvePublicSite({ store, storage }, { host: "localhost:3000", platformHost: PLAT, pathSegments: [] });
    const b = await resolvePublicSite({ store, storage }, { host: "a.b.localhost:3000", platformHost: PLAT, pathSegments: [] });
    expect(a.status).toBe(404);
    expect(b.status).toBe(404);
  });

  it("traversal → 400", async () => {
    const { storage, store } = preparado();
    const r = await resolvePublicSite({ store, storage }, { host: "cafe.localhost:3000", platformHost: PLAT, pathSegments: [".."] });
    expect(r.status).toBe(400);
  });

  it("archivo inexistente dentro del sitio → 404", async () => {
    const { storage, store } = preparado();
    const r = await resolvePublicSite({ store, storage }, { host: "cafe.localhost:3000", platformHost: PLAT, pathSegments: ["no.html"] });
    expect(r.status).toBe(404);
  });
});

// Sin esto, la plataforma solo servía el archivo cuando la URL coincidía letra
// por letra con su nombre guardado. Una web con blog o multipágina —o sea, la
// mayoría— se caía a trozos: la portada cargaba y el resto daba 404. Lo detectó
// el CTO de Quantiva preparando su web (2026-07-30).
describe("resolución de carpetas y URLs limpias", () => {
  // Una web como las de verdad: un blog en su carpeta y páginas sueltas.
  function conWeb(plan = "personal", extra: Partial<Sitio> = {}) {
    const { storage, store } = preparado(plan, extra);
    storage.files.set(PREFIX + "blog/index.html", Buffer.from("<html><body>ÍNDICE DEL BLOG</body></html>"));
    storage.files.set(PREFIX + "blog/mi-articulo.html", Buffer.from("<html><body>EL ARTÍCULO</body></html>"));
    storage.files.set(PREFIX + "contacto.html", Buffer.from("<html><body>CONTACTO</body></html>"));
    return { storage, store };
  }
  // `conBarra` va aparte de los segmentos a propósito: el catch-all de Next se
  // come el vacío y da ["blog"] tanto para /blog como para /blog/. Los tests
  // piden como pide Next, o no probarían lo que pasa de verdad.
  const pedir = (store: ProjectStore, storage: StorageAdapter, segs: string[], conBarra = false) =>
    resolvePublicSite({ store, storage }, { host: "cafe.localhost:3000", platformHost: PLAT, pathSegments: segs, conBarra });

  it("/blog/ sirve blog/index.html", async () => {
    const { storage, store } = conWeb();
    const r = await pedir(store, storage, ["blog"], true);
    expect(r.status).toBe(200);
    expect(r.body.toString()).toContain("ÍNDICE DEL BLOG");
    expect(r.contentType).toContain("text/html");
  });

  it("/blog (sin barra) redirige a /blog/ para que sus enlaces relativos caigan bien", async () => {
    // href="foto.html" desde /blog iría a /foto.html; desde /blog/, a /blog/foto.html.
    const { storage, store } = conWeb();
    const r = await pedir(store, storage, ["blog"]);
    expect(r.status).toBe(301);
    expect(r.location).toBe("/blog/");
  });

  it("y al revés: una URL limpia con barra se redirige a quitarla", async () => {
    // contacto.html en /contacto/ haría que href="equipo.html" fuese a
    // /contacto/equipo.html. La forma buena es sin barra.
    const { storage, store } = conWeb();
    const r = await pedir(store, storage, ["contacto"], true);
    expect(r.status).toBe(301);
    expect(r.location).toBe("/contacto");
  });

  it("un archivo pedido con barra también se normaliza", async () => {
    const { storage, store } = conWeb();
    const r = await pedir(store, storage, ["contacto.html"], true);
    expect(r.status).toBe(301);
    expect(r.location).toBe("/contacto.html");
  });

  it("la redirección no se come la query de una campaña", async () => {
    const { storage, store } = conWeb();
    const r = await resolvePublicSite({ store, storage }, {
      host: "cafe.localhost:3000", platformHost: PLAT, pathSegments: ["blog"], search: "?utm_source=instagram",
    });
    expect(r.location).toBe("/blog/?utm_source=instagram");
  });

  it("redirigir NO es un bucle: la dirección de destino ya se sirve", async () => {
    // El fallo que casi se despliega: si la barra no llega, se redirige a una
    // dirección que vuelve a entrar igual y el navegador da vueltas para siempre.
    const { storage, store } = conWeb();
    const salto = await pedir(store, storage, ["blog"]);
    expect(salto.location).toBe("/blog/");
    const destino = await pedir(store, storage, ["blog"], true); // como llegaría /blog/
    expect(destino.status).toBe(200);
  });

  it("un archivo que existe tal cual NUNCA se redirige", async () => {
    // Si alguien enlaza /contacto.html, se le sirve y punto: no somos quién para
    // imponerle URLs limpias a una web que no las usa.
    const { storage, store } = conWeb();
    for (const segs of [["contacto.html"], ["css", "app.css"], ["blog", "mi-articulo.html"]]) {
      const r = await pedir(store, storage, segs);
      expect(r.status).toBe(200);
    }
  });

  it("/blog/mi-articulo (URL limpia) sirve blog/mi-articulo.html", async () => {
    const { storage, store } = conWeb();
    const r = await pedir(store, storage, ["blog", "mi-articulo"]);
    expect(r.status).toBe(200);
    expect(r.body.toString()).toContain("EL ARTÍCULO");
  });

  it("/contacto (sin .html) sirve contacto.html", async () => {
    const { storage, store } = conWeb();
    const r = await pedir(store, storage, ["contacto"]);
    expect(r.status).toBe(200);
    expect(r.body.toString()).toContain("CONTACTO");
  });

  it("la carpeta gana a la página suelta: subir blog.html y luego activar el blog enseña el blog", async () => {
    const { storage, store } = conWeb();
    storage.files.set(PREFIX + "blog.html", Buffer.from("<html><body>EL VIEJO</body></html>"));
    expect((await pedir(store, storage, ["blog"], true)).body.toString()).toContain("ÍNDICE DEL BLOG");
  });

  it("un slug que acaba en punto y número NO se confunde con un archivo", async () => {
    // /\.\w+$/ habría dado esto por una extensión y devuelto 404.
    const { storage, store } = conWeb();
    storage.files.set(PREFIX + "precios-2024.5.html", Buffer.from("<html><body>PRECIOS</body></html>"));
    expect((await pedir(store, storage, ["precios-2024.5"])).body.toString()).toContain("PRECIOS");
  });

  it("lo servido así SIGUE llevando la insignia del plan gratuito", async () => {
    const { storage, store } = conWeb("free");
    const html = (await pedir(store, storage, ["blog"], true)).body.toString();
    expect(html).toContain(ID_MARCA);
    expect(html).toContain("ÍNDICE DEL BLOG");
  });

  it("y sigue siendo HTML para el resto: no-cache y canónico del dominio propio", async () => {
    const { storage, store } = conWeb("personal", { dominio: "quantivatechnology.com" });
    const r = await pedir(store, storage, ["blog"], true);
    expect(r.cacheControl).toBe("no-cache");
    // El canónico es la URL que han PEDIDO —con su barra—, no el archivo interno.
    expect(r.headers?.link).toBe('<https://quantivatechnology.com/blog/>; rel="canonical"');
  });

  it("una ruta que no existe de ninguna de las formas sigue dando 404", async () => {
    const { storage, store } = conWeb();
    expect((await pedir(store, storage, ["no-existe"])).status).toBe(404);
    expect((await pedir(store, storage, ["blog", "tampoco"])).status).toBe(404);
  });

  it("no pisa el sitemap de emergencia", async () => {
    const { storage, store } = conWeb();
    const r = await pedir(store, storage, ["sitemap.xml"]);
    expect(r.status).toBe(200);
    expect(r.contentType).toContain("application/xml");
  });

  it("a una web que va bien no le cuesta ni una lectura de más", async () => {
    const { storage, store } = conWeb();
    storage.lecturas = 0;
    await pedir(store, storage, ["contacto.html"]);
    expect(storage.lecturas).toBe(1);
  });

  it("un archivo conocido que falta tampoco: /favicon.ico lo pide el navegador en cada visita", async () => {
    const { storage, store } = conWeb();
    storage.lecturas = 0;
    const r = await pedir(store, storage, ["favicon.ico"]);
    expect(r.status).toBe(404);
    expect(storage.lecturas).toBe(1);
  });
});

describe("«Que Google no la encuentre todavía» (X-Robots-Tag)", () => {
  const pedir = (store: ProjectStore, storage: StorageAdapter, host: string, segs: string[] = []) =>
    resolvePublicSite({ store, storage }, { host, platformHost: PLAT, pathSegments: segs });

  it("por defecto NO manda ninguna cabecera de robots (publicar es querer que te vean)", async () => {
    const { storage, store } = preparado();
    const r = await pedir(store, storage, "cafe.localhost:3000");
    expect(r.headers?.["x-robots-tag"]).toBeUndefined();
  });

  it("con el interruptor puesto, el HTML sale con noindex, nofollow", async () => {
    const { storage, store } = preparado("personal", { noIndexar: true });
    const r = await pedir(store, storage, "cafe.localhost:3000");
    expect(r.status).toBe(200);
    expect(r.headers?.["x-robots-tag"]).toBe(ROBOTS_NOINDEX);
  });

  it("también protege lo que no es HTML (un PDF o una imagen se indexan igual)", async () => {
    const { storage, store } = preparado("personal", { noIndexar: true });
    const r = await pedir(store, storage, "cafe.localhost:3000", ["css", "app.css"]);
    expect(r.headers?.["x-robots-tag"]).toBe(ROBOTS_NOINDEX);
  });

  it("vale igual entrando por el dominio propio", async () => {
    const { storage, store } = preparado("personal", { noIndexar: true });
    const r = await pedir(store, storage, "quantivatechnology.com");
    expect(r.headers?.["x-robots-tag"]).toBe(ROBOTS_NOINDEX);
  });

  it("no toca el HTML: la web se sirve igual de byte-idéntica", async () => {
    const { storage, store } = preparado("personal", { noIndexar: true });
    expect((await pedir(store, storage, "cafe.localhost:3000")).body.toString()).toBe(HTML);
  });
});

describe("canónico cuando hay dominio propio", () => {
  const conDominio = () => preparado("personal", { dominio: "quantivatechnology.com" });
  const pedir = (store: ProjectStore, storage: StorageAdapter, host: string, segs: string[] = []) =>
    resolvePublicSite({ store, storage }, { host, platformHost: PLAT, pathSegments: segs });

  it("entrando por el subdominio, apunta al dominio propio", async () => {
    const { storage, store } = conDominio();
    const r = await pedir(store, storage, "cafe.localhost:3000");
    expect(r.headers?.link).toBe('<https://quantivatechnology.com/>; rel="canonical"');
  });

  it("conserva la ruta y la deja segura para una cabecera", async () => {
    const { storage, store } = conDominio();
    storage.files.set(PREFIX + "a b/c.html", Buffer.from(HTML));
    const r = await pedir(store, storage, "cafe.localhost:3000", ["a b", "c.html"]);
    expect(r.headers?.link).toBe('<https://quantivatechnology.com/a%20b/c.html>; rel="canonical"');
  });

  it("NO redirige: el DNS del dominio propio puede no apuntar todavía", async () => {
    const { storage, store } = conDominio();
    const r = await pedir(store, storage, "cafe.localhost:3000");
    expect(r.status).toBe(200);
    expect(r.location).toBeUndefined();
  });

  it("entrando ya por el dominio propio, no se anuncia canónico", async () => {
    const { storage, store } = conDominio();
    const r = await pedir(store, storage, "quantivatechnology.com");
    expect(r.headers?.link).toBeUndefined();
  });

  it("sin dominio propio no hay canónico que anunciar", async () => {
    const { storage, store } = preparado();
    expect((await pedir(store, storage, "cafe.localhost:3000")).headers?.link).toBeUndefined();
  });

  it("los assets no llevan canónico (solo tiene sentido en páginas)", async () => {
    const { storage, store } = conDominio();
    const r = await pedir(store, storage, "cafe.localhost:3000", ["css", "app.css"]);
    expect(r.headers?.link).toBeUndefined();
  });

  it("con noindex manda el noindex: canónico y noindex juntos se contradicen", async () => {
    const { storage, store } = preparado("personal", { dominio: "quantivatechnology.com", noIndexar: true });
    const r = await pedir(store, storage, "cafe.localhost:3000");
    expect(r.headers?.["x-robots-tag"]).toBe(ROBOTS_NOINDEX);
    expect(r.headers?.link).toBeUndefined();
  });
});

describe("canónicos del blog al conectar un dominio después", () => {
  // El blog congela la dirección pública dentro del HTML al escribir el artículo.
  const POST = '<html><head><link rel="canonical" href="https://cafe.localhost:3000/blog/x.html">' +
    '<meta property="og:url" content="https://cafe.localhost:3000/blog/x.html">' +
    '<script type="application/ld+json">{"image":"https://cafe.localhost:3000/blog/img/x.png"}</script>' +
    "</head><body>art</body></html>";

  function conBlog(extra: Partial<Sitio> = {}) {
    const { storage, store } = preparado("personal", { subdominio: "cafe", ...extra });
    storage.files.set(PREFIX + "blog/x.html", Buffer.from(POST));
    return { storage, store };
  }
  const pedir = (store: ProjectStore, storage: StorageAdapter, host: string) =>
    resolvePublicSite({ store, storage }, { host, platformHost: PLAT, pathSegments: ["blog", "x.html"] });

  it("sin dominio propio, el HTML sale tal cual", async () => {
    const { storage, store } = conBlog();
    expect((await pedir(store, storage, "cafe.localhost:3000")).body.toString()).toBe(POST);
  });

  it("con dominio propio, el canónico pasa a apuntar al dominio propio", async () => {
    const { storage, store } = conBlog({ dominio: "quantivatechnology.com" });
    const html = (await pedir(store, storage, "quantivatechnology.com")).body.toString();
    expect(html).toContain('href="https://quantivatechnology.com/blog/x.html"');
    expect(html).not.toContain("cafe.localhost:3000");
  });

  it("también el og:url y la imagen del JSON-LD", async () => {
    const { storage, store } = conBlog({ dominio: "quantivatechnology.com" });
    const html = (await pedir(store, storage, "quantivatechnology.com")).body.toString();
    expect(html).toContain('content="https://quantivatechnology.com/blog/x.html"');
    expect(html).toContain('"https://quantivatechnology.com/blog/img/x.png"');
  });

  it("entrando por el subdominio dice lo mismo: si no, serían dos canónicos que se contradicen", async () => {
    const { storage, store } = conBlog({ dominio: "quantivatechnology.com" });
    const r = await pedir(store, storage, "cafe.localhost:3000");
    const html = r.body.toString();
    expect(html).toContain('href="https://quantivatechnology.com/blog/x.html"');
    // La cabecera y el HTML tienen que decir lo MISMO.
    expect(r.headers?.link).toBe('<https://quantivatechnology.com/blog/x.html>; rel="canonical"');
  });
});

describe("reapuntarCanonicos", () => {
  it("no toca un dominio que solo empiece igual", () => {
    const html = 'a href="https://cafe.localhost:3000.malo.com/x"';
    expect(reapuntarCanonicos(html, "https://cafe.localhost:3000", "https://bueno.com")).toBe(html);
  });

  it("cambia la base seguida de barra, comilla o final", () => {
    expect(reapuntarCanonicos('"https://a.com/x"', "https://a.com", "https://b.com")).toBe('"https://b.com/x"');
    expect(reapuntarCanonicos('"https://a.com"', "https://a.com", "https://b.com")).toBe('"https://b.com"');
    expect(reapuntarCanonicos("https://a.com", "https://a.com", "https://b.com")).toBe("https://b.com");
  });

  it("si las dos bases son la misma, no hace nada", () => {
    expect(reapuntarCanonicos("https://a.com/x", "https://a.com", "https://a.com")).toBe("https://a.com/x");
  });
});

// Caso real: la web de Quantiva se escribió para quantivatechnology.com y se
// subió a Estrénala. El og:image seguía apuntando al dominio viejo, donde ese
// archivo NO existe, así que al compartir el enlace por WhatsApp salía la
// tarjeta sin imagen —«solo un recuadro»— aunque la imagen estuviera subida y
// se sirviera perfectamente desde aquí.
describe("reapuntarMetadatosImportados", () => {
  const CANONICO = '<link rel="canonical" href="https://vieja.com/">';

  it("reapunta la imagen de compartir al sitio donde se sirve de verdad", () => {
    const html = `${CANONICO}<meta property="og:image" content="https://vieja.com/assets/og.jpg">`;
    const out = reapuntarMetadatosImportados(html, "https://nueva.com");
    expect(out).toContain('content="https://nueva.com/assets/og.jpg"');
  });

  it("reapunta también el canónico y og:url, para no contradecir la cabecera Link", () => {
    const html = `${CANONICO}<meta property="og:url" content="https://vieja.com/contacto">`;
    const out = reapuntarMetadatosImportados(html, "https://nueva.com");
    expect(out).toContain('href="https://nueva.com/"');
    expect(out).toContain('content="https://nueva.com/contacto"');
  });

  it("NO toca una imagen alojada fuera: no es del dominio viejo, es de un CDN", () => {
    const html = `${CANONICO}<meta property="og:image" content="https://cdn.otro.com/foto.jpg">`;
    const out = reapuntarMetadatosImportados(html, "https://nueva.com");
    expect(out).toContain('content="https://cdn.otro.com/foto.jpg"'); // intacta
    expect(out).toContain('href="https://nueva.com/"'); // el canónico sí se reapunta
  });

  it("NO toca los enlaces al dominio viejo: siguen llevando a la web original", () => {
    const html = `${CANONICO}<a href="https://vieja.com/tienda">Tienda</a>`;
    const out = reapuntarMetadatosImportados(html, "https://nueva.com");
    expect(out).toContain('<a href="https://vieja.com/tienda">');
  });

  it("sin canónico ni og:url no se puede saber cuál era su dominio: no se inventa nada", () => {
    const html = '<meta property="og:image" content="https://vieja.com/assets/og.jpg">';
    expect(reapuntarMetadatosImportados(html, "https://nueva.com")).toBe(html);
  });

  it("si la web ya se escribió para donde se sirve, no cambia nada", () => {
    const html = '<link rel="canonical" href="https://nueva.com/"><meta property="og:image" content="https://nueva.com/a.jpg">';
    expect(reapuntarMetadatosImportados(html, "https://nueva.com")).toBe(html);
  });

  // WhatsApp y Facebook exigen URL absoluta en og:image: con una ruta que
  // empieza por "/" no enseñan nada. Esto no necesita saber el dominio viejo.
  it("vuelve absoluta una imagen de compartir escrita como ruta", () => {
    const html = '<meta property="og:image" content="/assets/og.jpg"><meta name="twitter:image" content="/assets/og.jpg">';
    const out = reapuntarMetadatosImportados(html, "https://nueva.com");
    expect(out).toContain('property="og:image" content="https://nueva.com/assets/og.jpg"');
    expect(out).toContain('name="twitter:image" content="https://nueva.com/assets/og.jpg"');
  });

  it("no confunde una ruta con una URL protocolo-relativa", () => {
    const html = `${CANONICO}<meta property="og:image" content="//cdn.otro.com/f.jpg">`;
    // `//host/x` NO es una ruta: es una URL sin protocolo y apunta fuera.
    expect(reapuntarMetadatosImportados(html, "https://nueva.com"))
      .toContain('content="//cdn.otro.com/f.jpg"');
  });
});

describe("sitemap de emergencia (webs sin blog)", () => {
  const pedir = (store: ProjectStore, storage: StorageAdapter, host = "cafe.localhost:3000") =>
    resolvePublicSite({ store, storage }, { host, platformHost: PLAT, pathSegments: ["sitemap.xml"] });

  it("una web sin sitemap recibe uno hecho con sus páginas", async () => {
    const { storage, store } = preparado();
    storage.files.set(PREFIX + "contacto.html", Buffer.from(HTML));
    const r = await pedir(store, storage);
    expect(r.status).toBe(200);
    expect(r.contentType).toContain("application/xml");
    const xml = r.body.toString();
    expect(xml).toContain("<loc>https://cafe.localhost:3000/</loc>"); // la entrada, como "/"
    expect(xml).toContain("<loc>https://cafe.localhost:3000/contacto.html</loc>");
    expect(xml).not.toContain("index.html"); // no se anuncia dos veces la portada
  });

  it("el índice de una carpeta se anuncia como la carpeta, no como su index.html", async () => {
    // Desde el 21 `blog/index.html` se sirve en las dos, así que anunciar la del
    // archivo sería regalarle a Google contenido duplicado.
    const { storage, store } = preparado();
    storage.files.set(PREFIX + "blog/index.html", Buffer.from(HTML));
    const xml = (await pedir(store, storage)).body.toString();
    // Con barra: es la forma en la que se sirve y la única buena de esa página.
    expect(xml).toContain("<loc>https://cafe.localhost:3000/blog/</loc>");
    expect(xml).not.toContain("/blog/index.html");
  });

  it("no incluye lo que no son páginas", async () => {
    const { storage, store } = preparado();
    const xml = (await pedir(store, storage)).body.toString();
    expect(xml).not.toContain("app.css");
  });

  it("si la web YA trae su sitemap, manda el suyo y no se fabrica nada", async () => {
    const { storage, store } = preparado();
    storage.files.set(PREFIX + "sitemap.xml", Buffer.from("<urlset>el mío</urlset>"));
    expect((await pedir(store, storage)).body.toString()).toBe("<urlset>el mío</urlset>");
  });

  it("con dominio propio, el sitemap apunta al dominio propio", async () => {
    const { storage, store } = preparado("personal", { dominio: "quantivatechnology.com" });
    const xml = (await pedir(store, storage)).body.toString();
    expect(xml).toContain("<loc>https://quantivatechnology.com/</loc>");
    expect(xml).not.toContain("cafe.localhost");
  });

  it("a quien pidió no salir en Google NO se le fabrica sitemap", async () => {
    const { storage, store } = preparado("personal", { noIndexar: true });
    expect((await pedir(store, storage)).status).toBe(404);
  });
});

describe("marca «Hecho con Estrénala» (plan gratuito)", () => {
  const pedir = (store: ProjectStore, storage: StorageAdapter, segs: string[] = []) =>
    resolvePublicSite({ store, storage }, { host: "cafe.localhost:3000", platformHost: PLAT, pathSegments: segs });

  it("el HTML del plan gratuito sale con la insignia justo antes de </body>", async () => {
    const { storage, store } = preparado("free");
    const html = (await pedir(store, storage)).body.toString();
    expect(html).toContain(textosPublico("es").marca.texto);
    expect(html.indexOf(`id="${ID_MARCA}"`)).toBeLessThan(html.indexOf("</body>"));
    expect(html).toContain("<h1>Hola</h1>"); // no se ha tocado nada del original
  });

  it("un plan de pago NO lleva marca", async () => {
    for (const plan of ["personal", "agencia"]) {
      const { storage, store } = preparado(plan);
      expect((await pedir(store, storage)).body.toString()).not.toContain(ID_MARCA);
    }
  });

  it("un plan desconocido cuenta como gratuito (ante la duda, marca)", async () => {
    const { storage, store } = preparado("inventado");
    expect((await pedir(store, storage)).body.toString()).toContain(ID_MARCA);
  });

  it("los assets que no son HTML se sirven intactos", async () => {
    const { storage, store } = preparado("free");
    const r = await pedir(store, storage, ["css", "app.css"]);
    expect(r.body.toString()).toBe("body{}");
  });

  it("la 404 pública no duplica la insignia (ya lleva su propia promo)", async () => {
    const { storage, store } = preparado("free");
    const r = await resolvePublicSite({ store, storage }, { host: "nadie.localhost:3000", platformHost: PLAT, pathSegments: [] });
    expect(r.body.toString()).not.toContain(ID_MARCA);
  });
});

describe("conMarca", () => {
  it("sin </body> la añade al final", () => {
    expect(conMarca("<h1>hola</h1>", PLAT).endsWith("</a>")).toBe(true);
  });

  it("usa el ÚLTIMO </body> (por si aparece dentro del texto)", () => {
    const html = "<body>habla de &lt;/body&gt; y esto: </body></html>";
    const salida = conMarca(html, PLAT);
    expect(salida.indexOf(ID_MARCA)).toBeGreaterThan(salida.indexOf("y esto:"));
  });

  it("es idempotente: no mete dos insignias", () => {
    const una = conMarca(HTML, PLAT);
    expect(conMarca(una, PLAT)).toBe(una);
  });

  it("escapa el host de la plataforma", () => {
    expect(conMarca(HTML, `x"><script>alert(1)</script>`, )).not.toContain("<script>alert(1)");
  });
});

describe("idiomaDeLaPagina", () => {
  it("lee el lang del <html>, con comillas dobles, simples o sin ellas", () => {
    expect(idiomaDeLaPagina(`<html lang="fr">`)).toBe("fr");
    expect(idiomaDeLaPagina(`<html lang='it'>`)).toBe("it");
    expect(idiomaDeLaPagina(`<html lang=pt>`)).toBe("pt");
  });

  it("manda la parte de delante: pt-BR es portugués y fr-CA es francés", () => {
    expect(idiomaDeLaPagina(`<html lang="pt-BR">`)).toBe("pt");
    expect(idiomaDeLaPagina(`<html lang="fr-CA">`)).toBe("fr");
    expect(idiomaDeLaPagina(`<html LANG="EN-GB">`)).toBe("en");
  });

  it("sin lang, o en un idioma que no hablamos, se cae al español", () => {
    expect(idiomaDeLaPagina(`<html>`)).toBe("es");
    expect(idiomaDeLaPagina(`<html lang="de">`)).toBe("es");
    expect(idiomaDeLaPagina(`<html lang="">`)).toBe("es");
    expect(idiomaDeLaPagina(`sin etiqueta html siquiera`)).toBe("es");
  });

  it("no se lo come el <html> de otro atributo parecido", () => {
    expect(idiomaDeLaPagina(`<html data-lang="fr"><body>`)).toBe("es");
  });

  /**
   * El patrón es de módulo. Si algún día lleva `g`, `exec` arrastra `lastIndex`
   * entre llamadas y la SEGUNDA página empieza a buscar por la mitad: la
   * primera visita saldría bien y la siguiente en español, sin que falle nada.
   */
  it("dos llamadas seguidas dan lo mismo (el patrón no arrastra estado)", () => {
    const pagina = `<html lang="it"><body>hola</body></html>`;
    expect(idiomaDeLaPagina(pagina)).toBe("it");
    expect(idiomaDeLaPagina(pagina)).toBe("it");
  });
});

describe("el sello habla el idioma de la PÁGINA, no el del dueño ni el del visitante", () => {
  const paginaEn = (lang: string) =>
    `<!doctype html><html lang="${lang}"><head><title>t</title></head><body><h1>Hola</h1></body></html>`;

  it("una web francesa lleva el sello en francés", () => {
    const html = conMarca(paginaEn("fr"), PLAT);
    expect(html).toContain(textosPublico("fr").marca.texto); // «Fait avec Estrénala»
    expect(html).not.toContain(textosPublico("es").marca.texto);
  });

  it("cada idioma pone el suyo", () => {
    for (const idioma of IDIOMAS) {
      expect(conMarca(paginaEn(idioma), PLAT)).toContain(textosPublico(idioma).marca.texto);
    }
  });

  it("una web sin lang sigue saliendo en español, como hasta ahora", () => {
    expect(conMarca(HTML, PLAT)).toContain(textosPublico("es").marca.texto);
  });

  it("el aria-label va traducido, no solo el texto visible", () => {
    expect(conMarca(paginaEn("it"), PLAT)).toContain(`aria-label="${textosPublico("it").marca.aria}"`);
  });

  it("sigue siendo idempotente en cualquier idioma", () => {
    const una = conMarca(paginaEn("pt"), PLAT);
    expect(conMarca(una, PLAT)).toBe(una);
  });
});

describe("la 404 pública habla el idioma del VISITANTE", () => {
  const pedir404 = (acceptLanguage?: string) =>
    resolvePublicSite(
      { store: new FakeStore(), storage: new FakeStorage() },
      { host: "nadie.localhost:3000", platformHost: PLAT, pathSegments: [], acceptLanguage }
    );

  it("«esta web no está publicada», en los cinco", async () => {
    for (const idioma of IDIOMAS) {
      const r = await pedir404(idioma);
      expect(r.status).toBe(404);
      expect(r.body.toString(), idioma).toContain(textosPublico(idioma).pagina404.noPublicada);
    }
  });

  it("respeta los pesos: `de;q=0.9, fr;q=0.8` es alemán, que no hablamos, luego francés", async () => {
    const r = await pedir404("de;q=0.9, fr;q=0.8");
    expect(r.body.toString()).toContain(textosPublico("fr").pagina404.noPublicada);
  });

  it("sin cabecera —como Googlebot— sale en español", async () => {
    expect((await pedir404()).body.toString()).toContain(textosPublico("es").pagina404.noPublicada);
  });

  it("el <html lang> dice la verdad, que es lo que usa un lector de pantalla", async () => {
    expect((await pedir404("it")).body.toString()).toContain(`<html lang="it"`);
  });

  it("«no encontrado» (la web SÍ está, la página no) también va traducido", async () => {
    const { storage, store } = preparado("free");
    const r = await resolvePublicSite(
      { store, storage },
      { host: "cafe.localhost:3000", platformHost: PLAT, pathSegments: ["no-existe.html"], acceptLanguage: "pt" }
    );
    expect(r.status).toBe(404);
    expect(r.body.toString()).toContain(textosPublico("pt").pagina404.noEncontrado);
  });

  it("declara Vary: Accept-Language (o un proxy la serviría en el idioma del anterior)", async () => {
    expect((await pedir404("fr")).headers?.vary).toBe("Accept-Language");
  });

  /**
   * La guarda de verdad de todo este montaje. Si alguien «simplifica» pasando el
   * Accept-Language al sello, una web francesa empezaría a enseñar el sello en
   * el idioma de cada visitante que pasa: alemán para uno, italiano para otro.
   * No falla nada y no hay test en rojo — salvo este.
   */
  it("el Accept-Language NO toca el sello de una web publicada", async () => {
    const { storage, store } = preparado("free");
    storage.files.set(PREFIX + "index.html", Buffer.from(`<html lang="fr"><body>Bonjour</body></html>`));
    const r = await resolvePublicSite(
      { store, storage },
      { host: "cafe.localhost:3000", platformHost: PLAT, pathSegments: [], acceptLanguage: "it,de;q=0.9" }
    );
    const html = r.body.toString();
    expect(html).toContain(textosPublico("fr").marca.texto);
    expect(html).not.toContain(textosPublico("it").marca.texto);
  });
});

describe("redirect www → dominio pelado", () => {
  const storeConDominio = (dominio: string) => ({
    async getPublishedSiteByHost(q: { subdominio: string } | { dominio: string }) {
      if ("dominio" in q && q.dominio === dominio)
        return { entryPath: "index.html", storagePrefix: "p/", plan: "personal" };
      return null;
    },
  }) as unknown as import("@/src/repositories/types").ProjectStore;
  const storage = {
    async get() { return { body: Buffer.from("<html>ok</html>"), contentType: "text/html; charset=utf-8" }; },
    async put() {}, async list() { return []; }, async delete() {},
  } as unknown as import("@/src/storage/types").StorageAdapter;

  it("www de un dominio publicado → 301 al pelado conservando la ruta", async () => {
    const r = await resolvePublicSite(
      { store: storeConDominio("cliente.com"), storage },
      { host: "www.cliente.com", platformHost: "app.plataforma.com", sitesBaseDomain: "plataforma.com", pathSegments: ["contacto.html"] }
    );
    expect(r.status).toBe(301);
    expect(r.location).toBe("https://cliente.com/contacto.html");
  });
  it("www sin ruta → 301 a la raíz", async () => {
    const r = await resolvePublicSite(
      { store: storeConDominio("cliente.com"), storage },
      { host: "www.cliente.com", platformHost: "app.plataforma.com", sitesBaseDomain: "plataforma.com", pathSegments: [] }
    );
    expect(r.status).toBe(301);
    expect(r.location).toBe("https://cliente.com/");
  });
  it("www de un dominio NO publicado → 404 normal", async () => {
    const r = await resolvePublicSite(
      { store: storeConDominio("otro.com"), storage },
      { host: "www.cliente.com", platformHost: "app.plataforma.com", sitesBaseDomain: "plataforma.com", pathSegments: [] }
    );
    expect(r.status).toBe(404);
  });
});

// El sitemap guarda direcciones ENTERAS. Al cambiar de subdominio o conectar el
// dominio propio se quedaban viejas, y le decían a Google que las páginas del
// cliente viven en un sitio que ya no existe. Visto el 2026-08-01 en la web de
// pruebas, que seguía anunciando `quantiva.estrenala.com`.
describe("reapuntarSitemap", () => {
  const BD = "estrenala.com";

  it("reapunta el subdominio ANTERIOR, que es el caso que falla", () => {
    const xml = `<url><loc>https://quantiva.estrenala.com/blog/uno.html</loc></url>`;
    expect(reapuntarSitemap(xml, "https://prueba.cliente.com", BD))
      .toBe(`<url><loc>https://prueba.cliente.com/blog/uno.html</loc></url>`);
  });

  it("reapunta también el subdominio actual cuando ya hay dominio propio", () => {
    const xml = `<loc>https://micafe.estrenala.com/</loc><loc>https://micafe.estrenala.com/blog/index.html</loc>`;
    const r = reapuntarSitemap(xml, "https://micafe.com", BD);
    expect(r).toBe(`<loc>https://micafe.com/</loc><loc>https://micafe.com/blog/index.html</loc>`);
  });

  // Reescribir el dominio de otro es peor que dejarlo mal: puede ser un sitio suyo
  // que sí existe. Mismo criterio que en reapuntarMetadatosImportados.
  it("NO toca el dominio para el que se escribió la web original", () => {
    const xml = `<loc>https://quantivatechnology.com/contacto/</loc>`;
    expect(reapuntarSitemap(xml, "https://prueba.quantivatechnology.com", BD)).toBe(xml);
  });

  it("no toca un dominio que solo CONTENGA el nuestro", () => {
    const xml = `<loc>https://noesestrenala.com/x</loc><loc>https://x.estrenala.com.evil.net/y</loc>`;
    expect(reapuntarSitemap(xml, "https://mio.com", BD)).toBe(xml);
  });

  it("sin dominio base configurado se deja tal cual, no se inventa nada", () => {
    const xml = `<loc>https://algo.estrenala.com/</loc>`;
    expect(reapuntarSitemap(xml, "https://mio.com", "")).toBe(xml);
  });

  it("si la dirección ya es la buena, no cambia nada", () => {
    const xml = `<loc>https://micafe.estrenala.com/blog/</loc>`;
    expect(reapuntarSitemap(xml, "https://micafe.estrenala.com", BD)).toBe(xml);
  });
});

// El propio reapuntado destapa duplicados: el índice del blog estaba guardado dos
// veces, una con el subdominio viejo y otra con el dominio nuevo, y al reapuntarlas
// quedan idénticas. Visto en producción el 2026-08-01.
describe("reapuntarSitemap · duplicados", () => {
  const BD = "estrenala.com";

  it("dos entradas que al reapuntar quedan iguales se quedan en una", () => {
    const xml =
      `<urlset>` +
      `<url><loc>https://viejo.estrenala.com/blog/index.html</loc></url>` +
      `<url><loc>https://micafe.com/blog/index.html</loc></url>` +
      `</urlset>`;
    const r = reapuntarSitemap(xml, "https://micafe.com", BD);
    expect([...r.matchAll(/<loc>/g)]).toHaveLength(1);
    expect(r).toContain("https://micafe.com/blog/index.html");
  });

  it("no se lleva por delante entradas que sí son distintas", () => {
    const xml =
      `<urlset>` +
      `<url><loc>https://viejo.estrenala.com/blog/uno.html</loc></url>` +
      `<url><loc>https://viejo.estrenala.com/blog/dos.html</loc></url>` +
      `</urlset>`;
    const r = reapuntarSitemap(xml, "https://micafe.com", BD);
    expect([...r.matchAll(/<loc>/g)]).toHaveLength(2);
  });

  it("un sitemap ya limpio se queda exactamente igual", () => {
    const xml = `<urlset><url><loc>https://micafe.com/</loc></url></urlset>`;
    expect(reapuntarSitemap(xml, "https://micafe.com", BD)).toBe(xml);
  });
});

// La otra mitad de lo mismo: lo que reapuntarSitemap deja a propósito sin tocar
// —el dominio de otro— no puede quedarse callado. Subes una web hecha para
// `suempresa.com` con su sitemap dentro, no conectas el dominio, y ese sitemap
// manda a Google a un sitio que quizá no existe. Se avisa; no se corrige.
describe("dominiosAjenosDelSitemap", () => {
  const BD = "estrenala.com";
  const llamar = (xml: string, dominio: string | null = null) =>
    dominiosAjenosDelSitemap({ xml, sitesBaseDomain: BD, dominio });

  it("caza el dominio para el que se escribió la web, sin dominio conectado", () => {
    const xml = `<url><loc>https://suempresa.com/</loc></url><url><loc>https://suempresa.com/precios</loc></url>`;
    expect(llamar(xml)).toEqual(["suempresa.com"]);
  });

  it("se calla cuando ese dominio YA está conectado", () => {
    const xml = `<loc>https://suempresa.com/</loc>`;
    expect(llamar(xml, "suempresa.com")).toEqual([]);
  });

  // Quien conecta el dominio pelado tiene las dos direcciones (ver connectDomain).
  // Avisar del www teniendo el pelado conectado es un aviso falso, y los avisos
  // falsos enseñan a ignorar los de verdad.
  it("el www del dominio conectado no es ajeno, ni al derecho ni al revés", () => {
    expect(llamar(`<loc>https://www.suempresa.com/x</loc>`, "suempresa.com")).toEqual([]);
    expect(llamar(`<loc>https://suempresa.com/x</loc>`, "www.suempresa.com")).toEqual([]);
  });

  it("nuestros subdominios nunca son ajenos, ni el actual ni el de ayer", () => {
    const xml = `<loc>https://micafe.estrenala.com/</loc><loc>https://viejo.estrenala.com/</loc>`;
    expect(llamar(xml)).toEqual([]);
  });

  it("un dominio que solo CONTIENE el nuestro sí es ajeno", () => {
    expect(llamar(`<loc>https://x.estrenala.com.evil.net/y</loc>`)).toEqual(["x.estrenala.com.evil.net"]);
  });

  it("no repite, ordena, y no le molesta el puerto ni las mayúsculas", () => {
    const xml =
      `<loc>https://Zeta.com/a</loc><loc>https://alfa.com/b</loc>` +
      `<loc>https://zeta.com:8443/c</loc>`;
    expect(llamar(xml)).toEqual(["alfa.com", "zeta.com"]);
  });

  it("una <loc> relativa o vacía no es un dominio del que avisar", () => {
    expect(llamar(`<loc>/precios</loc><loc></loc><loc>   </loc>`)).toEqual([]);
  });

  it("sin sitemap, sin aviso", () => {
    expect(llamar("")).toEqual([]);
  });
});
