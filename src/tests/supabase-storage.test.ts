import { describe, it, expect } from "vitest";
import { SupabaseStorage, type SupabaseLikeClient } from "@/src/storage/supabase";

// Fake del cliente de Supabase Storage: archivos planos clave→bytes, con list()
// por carpeta (una sola profundidad, paginado, carpetas con id=null) como el real.
function fakeClient() {
  const archivos = new Map<string, Buffer>();
  /** Cuántas claves llevaba cada llamada a remove(). Es lo que se mide abajo. */
  const removes: number[] = [];
  const client: SupabaseLikeClient = {
    storage: {
      from(_bucket: string) {
        return {
          async upload(key, body, _opts) {
            archivos.set(key, Buffer.from(body));
            return { error: null };
          },
          async download(key) {
            const b = archivos.get(key);
            if (!b) return { data: null, error: { message: "Object not found" } };
            return { data: new Blob([Buffer.from(b)]), error: null };
          },
          async list(carpeta, { limit, offset }) {
            const pfx = carpeta ? carpeta + "/" : "";
            const hijos = new Map<string, { name: string; id: string | null }>();
            for (const k of archivos.keys()) {
              if (!k.startsWith(pfx)) continue;
              const resto = k.slice(pfx.length);
              const i = resto.indexOf("/");
              if (i === -1) hijos.set(resto, { name: resto, id: "file-" + k });
              else if (!hijos.has(resto.slice(0, i))) hijos.set(resto.slice(0, i), { name: resto.slice(0, i), id: null });
            }
            const orden = [...hijos.values()].sort((a, b) => a.name.localeCompare(b.name));
            return { data: orden.slice(offset, offset + limit), error: null };
          },
          async remove(keys) {
            removes.push(keys.length);
            for (const k of keys) archivos.delete(k);
            return { error: null };
          },
        };
      },
    },
  };
  return { client, archivos, removes };
}

describe("SupabaseStorage", () => {
  it("put/get roundtrip con contentType por extensión", async () => {
    const { client } = fakeClient();
    const s = new SupabaseStorage(client, "sites");
    await s.put("p/1/index.html", Buffer.from("<h1>hola</h1>"));
    const r = await s.get("p/1/index.html");
    expect(r?.body.toString()).toBe("<h1>hola</h1>");
    expect(r?.contentType).toBe("text/html; charset=utf-8");
  });
  it("get inexistente → null", async () => {
    const { client } = fakeClient();
    expect(await new SupabaseStorage(client, "sites").get("no/existe.txt")).toBeNull();
  });
  it("put acepta string", async () => {
    const { client } = fakeClient();
    const s = new SupabaseStorage(client, "sites");
    await s.put("a/x.css", "body{}");
    expect((await s.get("a/x.css"))?.contentType).toBe("text/css; charset=utf-8");
  });
  it("list recursivo bajo un prefijo, con subcarpetas y paginación", async () => {
    const { client } = fakeClient();
    const s = new SupabaseStorage(client, "sites");
    for (let i = 0; i < 120; i++) await s.put(`p/1/f${String(i).padStart(3, "0")}.txt`, "x");
    await s.put("p/1/wc-uploads/logo.png", "png");
    await s.put("p/1/css/main.css", "css");
    await s.put("p/2/otro.txt", "no debe salir");
    const claves = await s.list("p/1/");
    expect(claves).toHaveLength(122);
    expect(claves).toContain("p/1/wc-uploads/logo.png");
    expect(claves).toContain("p/1/css/main.css");
    expect(claves.every((k) => k.startsWith("p/1/"))).toBe(true);
  });
  it("delete borra", async () => {
    const { client } = fakeClient();
    const s = new SupabaseStorage(client, "sites");
    await s.put("p/1/x.txt", "x");
    await s.delete("p/1/x.txt");
    expect(await s.get("p/1/x.txt")).toBeNull();
  });

  /**
   * Lo que se mide aquí no es que borre —eso ya lo hacía—, sino CUÁNTAS
   * peticiones cuesta. El 08/08 borrar una web de 1.100 archivos eran 1.100
   * viajes: unos 100 segundos, justo el tope de Cloudflare. La respuesta moría
   * y en pantalla ponía «No se pudo borrar» sobre una web ya borrada.
   */
  describe("deleteMany", () => {
    it("1.100 archivos son 11 peticiones, no 1.100", async () => {
      const { client, archivos, removes } = fakeClient();
      const s = new SupabaseStorage(client, "sites");
      const claves = Array.from({ length: 1100 }, (_, i) => `p/1/f${i}.txt`);
      for (const k of claves) archivos.set(k, Buffer.from("x"));

      await s.deleteMany(claves);

      expect(archivos.size).toBe(0);
      expect(removes).toHaveLength(11);
      expect(Math.max(...removes), "ningún lote pasa de 100").toBeLessThanOrEqual(100);
    });

    it("no manda una petición vacía cuando no hay nada que borrar", async () => {
      const { client, removes } = fakeClient();
      await new SupabaseStorage(client, "sites").deleteMany([]);
      expect(removes).toEqual([]);
    });

    it("un lote que falla se cuenta y no se traga", async () => {
      const { client } = fakeClient();
      const roto: SupabaseLikeClient = {
        storage: { from: (b) => ({ ...client.storage.from(b), async remove() { return { error: { message: "403" } }; } }) },
      };
      await expect(new SupabaseStorage(roto, "sites").deleteMany(["a", "b"]))
        .rejects.toThrow("Supabase remove(2 archivos): 403");
    });
  });
});
