import { describe, it, expect, beforeEach } from "vitest";
import { CacheLRU, CacheConCaducidad } from "@/src/publish/memoria";
import {
  almacenConMemoria, storeConMemoria, olvidarSitio, vaciarCachesServir,
  comprimidoGuardado, guardarComprimido, estadoCaches,
} from "@/src/publish/cache-servir";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

beforeEach(() => vaciarCachesServir());

describe("caché con presupuesto de bytes", () => {
  const nueva = (max: number) => new CacheLRU<Buffer>(max, (b) => b.length, max);

  it("devuelve lo que se guardó", () => {
    const c = nueva(1000);
    c.set("a", Buffer.from("hola"));
    expect(c.get("a")?.toString()).toBe("hola");
    expect(c.get("b")).toBeUndefined();
  });

  /**
   * Contar ENTRADAS no vale: mil páginas de 8 KB y mil fotos de 4 MB son el mismo
   * número y no ocupan lo mismo ni de lejos. Con el tope en bytes, el servidor no
   * se queda sin memoria por muchas webs grandes que entren.
   */
  it("tira las más viejas cuando se pasa del presupuesto", () => {
    const c = nueva(300);
    c.set("a", Buffer.alloc(100));
    c.set("b", Buffer.alloc(100));
    c.set("c", Buffer.alloc(100));
    c.set("d", Buffer.alloc(100)); // ya no cabe: se va la más vieja
    expect(c.get("a")).toBeUndefined();
    expect(c.get("d")).toBeDefined();
    expect(c.estado.bytes).toBeLessThanOrEqual(300);
  });

  it("usar una entrada la salva de la siguiente limpieza", () => {
    const c = nueva(300);
    c.set("a", Buffer.alloc(100));
    c.set("b", Buffer.alloc(100));
    c.set("c", Buffer.alloc(100));
    c.get("a");                    // «a» pasa a ser la más reciente
    c.set("d", Buffer.alloc(100)); // ahora la víctima es «b»
    expect(c.get("a")).toBeDefined();
    expect(c.get("b")).toBeUndefined();
  });

  /**
   * Un vídeo de 40 MB vaciaría la caché entera para quedarse él solo, y una
   * visita no compensa echar a todo lo demás.
   */
  it("lo que no cabe de sobra ni entra", () => {
    const c = new CacheLRU<Buffer>(1000, (b) => b.length, 200);
    c.set("pequeño", Buffer.alloc(100));
    c.set("enorme", Buffer.alloc(900));
    expect(c.get("enorme")).toBeUndefined();
    expect(c.get("pequeño")).toBeDefined(); // no se lo ha llevado por delante
  });

  it("volver a guardar la misma clave no cuenta dos veces", () => {
    const c = nueva(1000);
    c.set("a", Buffer.alloc(100));
    c.set("a", Buffer.alloc(100));
    expect(c.estado).toEqual({ entradas: 1, bytes: 100 });
  });

  it("olvidar devuelve los bytes al presupuesto", () => {
    const c = nueva(1000);
    c.set("a", Buffer.alloc(400));
    c.olvidar("a");
    expect(c.estado).toEqual({ entradas: 0, bytes: 0 });
  });
});

describe("caché con caducidad", () => {
  it("olvida sola al pasar el tiempo", () => {
    const c = new CacheConCaducidad<string>();
    c.set("a", "hola", 1000, 0);
    expect(c.get("a", 999)).toBe("hola");
    expect(c.get("a", 1000)).toBeUndefined();
  });

  it("guarda un null como valor, que no es lo mismo que no tenerlo", () => {
    const c = new CacheConCaducidad<string | null>();
    c.set("a", null, 1000, 0);
    // `null` es «se preguntó y no existe»; `undefined` es «no se ha preguntado».
    expect(c.get("a", 0)).toBeNull();
    expect(c.get("b", 0)).toBeUndefined();
  });
});

function almacenFalso(archivos: Record<string, string>) {
  const lecturas: string[] = [];
  const base = {
    async get(key: string) {
      lecturas.push(key);
      return archivos[key] ? { body: Buffer.from(archivos[key]), contentType: "text/html" } : null;
    },
    async list(prefix: string) {
      lecturas.push(`list:${prefix}`);
      return Object.keys(archivos).filter((k) => k.startsWith(prefix));
    },
    async put() {}, async delete() {},
  } as unknown as StorageAdapter;
  return { base, lecturas };
}

/**
 * Se puede cachear PARA SIEMPRE porque la clave lleva dentro el id de la
 * instantánea, y una instantánea nunca cambia: cada edición copia todo a una
 * nueva, cada actualización crea otra, y las imágenes subidas llevan un UUID
 * propio. Se comprobó una a una que no hay ni una escritura que sobrescriba una
 * clave existente.
 */
describe("el almacén con memoria", () => {
  it("la segunda vez no vuelve a leer", async () => {
    const { base, lecturas } = almacenFalso({ "sites/p/s1/index.html": "<h1>hola</h1>" });
    const a = almacenConMemoria(base);
    expect((await a.get("sites/p/s1/index.html"))?.body.toString()).toBe("<h1>hola</h1>");
    expect((await a.get("sites/p/s1/index.html"))?.body.toString()).toBe("<h1>hola</h1>");
    expect(lecturas).toHaveLength(1);
  });

  it("otra instantánea es otra clave, y se lee de nuevo", async () => {
    const { base, lecturas } = almacenFalso({
      "sites/p/s1/index.html": "viejo", "sites/p/s2/index.html": "nuevo",
    });
    const a = almacenConMemoria(base);
    expect((await a.get("sites/p/s1/index.html"))?.body.toString()).toBe("viejo");
    expect((await a.get("sites/p/s2/index.html"))?.body.toString()).toBe("nuevo");
    expect(lecturas).toHaveLength(2);
  });

  /** Un «no existe» no se guarda: el archivo puede aparecer en cualquier momento. */
  it("lo que no está no se cachea", async () => {
    const { base, lecturas } = almacenFalso({});
    const a = almacenConMemoria(base);
    await a.get("sites/p/s1/no.html");
    await a.get("sites/p/s1/no.html");
    expect(lecturas).toHaveLength(2);
  });

  it("los listados también se recuerdan", async () => {
    const { base, lecturas } = almacenFalso({ "sites/p/s1/a.html": "a", "sites/p/s1/b.html": "b" });
    const a = almacenConMemoria(base);
    expect(await a.list("sites/p/s1/")).toHaveLength(2);
    await a.list("sites/p/s1/");
    expect(lecturas.filter((l) => l.startsWith("list:"))).toHaveLength(1);
  });

  it("escribir una clave la borra de la memoria", async () => {
    const { base, lecturas } = almacenFalso({ "k": "uno" });
    const a = almacenConMemoria(base);
    await a.get("k");
    await a.put("k", Buffer.from("dos"));
    await a.get("k");
    expect(lecturas.filter((l) => l === "k")).toHaveLength(2);
  });
});

function storeFalso(sitios: Record<string, unknown>) {
  const consultas: string[] = [];
  const base = {
    async getPublishedSiteByHost(q: { subdominio?: string; dominio?: string }) {
      const clave = q.subdominio ? `s:${q.subdominio}` : `d:${q.dominio}`;
      consultas.push(clave);
      return (sitios[clave] ?? null) as never;
    },
    async getProject() { return null; },
  } as unknown as ProjectStore;
  return { base, consultas };
}

describe("el store con memoria", () => {
  it("la segunda visita no consulta la base de datos", async () => {
    const { base, consultas } = storeFalso({ "s:cafe": { subdominio: "cafe" } });
    const s = storeConMemoria(base);
    await s.getPublishedSiteByHost({ subdominio: "cafe" });
    await s.getPublishedSiteByHost({ subdominio: "cafe" });
    expect(consultas).toEqual(["s:cafe"]);
  });

  it("el subdominio y el dominio propio son claves distintas", async () => {
    const { base, consultas } = storeFalso({ "s:cafe": { x: 1 }, "d:micafe.com": { x: 2 } });
    const s = storeConMemoria(base);
    await s.getPublishedSiteByHost({ subdominio: "cafe" });
    await s.getPublishedSiteByHost({ dominio: "micafe.com" });
    expect(consultas).toEqual(["s:cafe", "d:micafe.com"]);
  });

  /**
   * ES EL MOTIVO DE QUE HAYA INVALIDACIÓN. Sin esto, alguien publica su web y se
   * pasa hasta un minuto viendo el «esta web todavía no está publicada» — justo
   * en el momento que más ilusión le hace.
   */
  it("al publicar se olvida al instante, no al minuto", async () => {
    const sitios: Record<string, unknown> = {};
    const { base, consultas } = storeFalso(sitios);
    const s = storeConMemoria(base);

    expect(await s.getPublishedSiteByHost({ subdominio: "cafe" })).toBeNull();
    sitios["s:cafe"] = { subdominio: "cafe" };       // acaba de publicar
    olvidarSitio({ subdominio: "cafe" });
    expect(await s.getPublishedSiteByHost({ subdominio: "cafe" })).not.toBeNull();
    expect(consultas).toHaveLength(2);
  });

  it("olvidar un dominio olvida también su www", async () => {
    const { base, consultas } = storeFalso({ "d:micafe.com": { x: 1 }, "d:www.micafe.com": { x: 1 } });
    const s = storeConMemoria(base);
    await s.getPublishedSiteByHost({ dominio: "micafe.com" });
    await s.getPublishedSiteByHost({ dominio: "www.micafe.com" });
    olvidarSitio({ dominio: "micafe.com" });
    await s.getPublishedSiteByHost({ dominio: "micafe.com" });
    await s.getPublishedSiteByHost({ dominio: "www.micafe.com" });
    expect(consultas).toHaveLength(4);
  });

  it("los demás métodos del store siguen funcionando", async () => {
    const { base } = storeFalso({});
    expect(await storeConMemoria(base).getProject("o", "p")).toBeNull();
  });
});

describe("lo ya comprimido", () => {
  it("se guarda por ETag y codificación, que son cosas distintas", () => {
    guardarComprimido('W/"abc"', "br", Buffer.from("comprimido-br"));
    expect(comprimidoGuardado('W/"abc"', "br")?.toString()).toBe("comprimido-br");
    // Otra codificación del mismo contenido NO es lo mismo.
    expect(comprimidoGuardado('W/"abc"', "gzip")).toBeUndefined();
    // Y otro contenido tampoco.
    expect(comprimidoGuardado('W/"otro"', "br")).toBeUndefined();
  });

  it("vaciar las cachés las deja a cero", () => {
    guardarComprimido('W/"abc"', "br", Buffer.from("x"));
    vaciarCachesServir();
    expect(estadoCaches().comprimido.entradas).toBe(0);
  });
});
