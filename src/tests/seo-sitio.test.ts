import { describe, it, expect, beforeEach } from "vitest";
import { examinarProyecto, paginasAExaminar, olvidarExamenes, MAX_PAGINAS } from "@/src/seo/sitio";
import type { StorageAdapter } from "@/src/storage/types";

const PREFIJO = "sites/p1/s1/";

const PAGINA = (titulo: string) => `<!doctype html>
<html lang="es"><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
<meta name="description" content="Descripción de ${titulo}, bastante razonable y con su longitud normal.">
<link rel="icon" href="/favicon.ico">
<meta property="og:image" content="https://x.com/a.jpg">
<script type="application/ld+json">{}</script>
</head><body><h1>${titulo}</h1></body></html>`;

function almacenFalso(archivos: Record<string, string>) {
  const lecturas: string[] = [];
  const storage = {
    async list(prefix: string) {
      return Object.keys(archivos).filter((k) => k.startsWith(prefix));
    },
    async get(key: string) {
      lecturas.push(key);
      return archivos[key] ? { body: Buffer.from(archivos[key], "utf-8"), contentType: "text/html" } : null;
    },
    async put() {},
    async delete() {},
  } as unknown as StorageAdapter;
  return { storage, lecturas };
}

beforeEach(() => olvidarExamenes());

describe("qué páginas se miran", () => {
  it("solo html, y la portada la primera", () => {
    const claves = [
      PREFIJO + "estilo.css", PREFIJO + "blog/uno.html", PREFIJO + "contacto.html",
      PREFIJO + "index.html", PREFIJO + "foto.jpg",
    ];
    expect(paginasAExaminar(claves, PREFIJO, "index.html")).toEqual([
      "index.html", "contacto.html", "blog/uno.html",
    ]);
  });

  /**
   * El orden solo decide cuando hay más páginas que el tope, y ahí es todo lo
   * que importa: un blog de doscientos artículos no puede dejar fuera del examen
   * la página de contacto.
   */
  it("las de menos profundidad van antes que las del blog", () => {
    const claves = [
      ...Array.from({ length: 40 }, (_, i) => `${PREFIJO}blog/a${i}.html`),
      PREFIJO + "contacto.html", PREFIJO + "index.html",
    ];
    const orden = paginasAExaminar(claves, PREFIJO, "index.html");
    expect(orden.slice(0, 2)).toEqual(["index.html", "contacto.html"]);
  });

  it("los trozos de plantilla que empiezan por _ no son páginas", () => {
    const claves = [PREFIJO + "index.html", PREFIJO + "_cabecera.html", PREFIJO + "parts/_pie.html"];
    expect(paginasAExaminar(claves, PREFIJO, "index.html")).toEqual(["index.html"]);
  });
});

describe("examinar el proyecto", () => {
  it("lee las páginas y devuelve el examen", async () => {
    const { storage } = almacenFalso({
      [PREFIJO + "index.html"]: PAGINA("Inicio"),
      [PREFIJO + "contacto.html"]: PAGINA("Contacto"),
      [PREFIJO + "estilo.css"]: "body{}",
    });
    const r = await examinarProyecto(storage, { snapshotId: "s1", storagePrefix: PREFIJO, entryPath: "index.html" });
    expect(r.nota).toBe(100);
    expect(r.examinadas).toBe(2);
    expect(r.paginas.map((p) => p.ruta)).toEqual(["index.html", "contacto.html"]);
  });

  it("no mira más de las del tope, pero dice cuántas hay", async () => {
    const archivos: Record<string, string> = { [PREFIJO + "index.html"]: PAGINA("Inicio") };
    for (let i = 0; i < 40; i++) archivos[`${PREFIJO}blog/a${i}.html`] = PAGINA(`Artículo ${i}`);

    const { storage, lecturas } = almacenFalso(archivos);
    const r = await examinarProyecto(storage, { snapshotId: "s1", storagePrefix: PREFIJO, entryPath: "index.html" });
    expect(r.examinadas).toBe(MAX_PAGINAS);
    expect(r.totales).toBe(41);
    expect(lecturas).toHaveLength(MAX_PAGINAS);
  });

  /**
   * La caché es por instantánea y no puede quedarse rancia: el editor NO
   * modifica una instantánea, cada guardado copia todo a una nueva. Si algún día
   * eso cambiara, este test seguiría pasando y la caché empezaría a mentir — por
   * eso está escrito el porqué aquí y en sitio.ts.
   */
  it("no vuelve a leer la misma instantánea dos veces", async () => {
    const { storage, lecturas } = almacenFalso({ [PREFIJO + "index.html"]: PAGINA("Inicio") });
    const args = { snapshotId: "s1", storagePrefix: PREFIJO, entryPath: "index.html" };
    await examinarProyecto(storage, args);
    await examinarProyecto(storage, args);
    expect(lecturas).toHaveLength(1);
  });

  it("otra instantánea se examina de nuevo", async () => {
    const { storage, lecturas } = almacenFalso({ [PREFIJO + "index.html"]: PAGINA("Inicio") });
    await examinarProyecto(storage, { snapshotId: "s1", storagePrefix: PREFIJO, entryPath: "index.html" });
    await examinarProyecto(storage, { snapshotId: "s2", storagePrefix: PREFIJO, entryPath: "index.html" });
    expect(lecturas).toHaveLength(2);
  });

  it("un archivo ilegible no deja sin examen a los demás", async () => {
    const { storage } = almacenFalso({ [PREFIJO + "index.html"]: PAGINA("Inicio") });
    // `list` lo anuncia pero `get` devuelve null: es el caso de una carrera con
    // un borrado, y no puede tumbar el examen entero.
    const roto = {
      ...storage,
      async list() { return [PREFIJO + "index.html", PREFIJO + "fantasma.html"]; },
    } as unknown as StorageAdapter;
    const r = await examinarProyecto(roto, { snapshotId: "s9", storagePrefix: PREFIJO, entryPath: "index.html" });
    expect(r.examinadas).toBe(1);
    expect(r.totales).toBe(2);
  });

  it("una web sin ninguna página no revienta", async () => {
    const { storage } = almacenFalso({ [PREFIJO + "estilo.css"]: "body{}" });
    const r = await examinarProyecto(storage, { snapshotId: "s3", storagePrefix: PREFIJO, entryPath: "index.html" });
    expect(r).toMatchObject({ nota: 0, examinadas: 0, fallos: [] });
  });
});
