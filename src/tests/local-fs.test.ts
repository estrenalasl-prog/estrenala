import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { LocalFsStorage, listHtmlPages } from "@/src/storage/local-fs";

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wc-store-"));
}

describe("LocalFsStorage", () => {
  let root: string;
  let s: LocalFsStorage;
  beforeEach(() => {
    root = tmpDir();
    s = new LocalFsStorage(root);
  });

  it("put/get round-trip con content-type inferido", async () => {
    await s.put("projects/p/snapshots/s/index.html", Buffer.from("<h1>Hola</h1>"));
    const got = await s.get("projects/p/snapshots/s/index.html");
    expect(got?.body.toString()).toBe("<h1>Hola</h1>");
    expect(got?.contentType).toBe("text/html; charset=utf-8");
  });

  it("get de clave inexistente devuelve null", async () => {
    expect(await s.get("no/existe.css")).toBeNull();
  });

  it("list devuelve claves bajo el prefijo", async () => {
    await s.put("projects/p/snapshots/s/index.html", "a");
    await s.put("projects/p/snapshots/s/css/app.css", "b");
    await s.put("projects/p/snapshots/OTRO/x.html", "c");
    const claves = await s.list("projects/p/snapshots/s/");
    expect(claves.sort()).toEqual([
      "projects/p/snapshots/s/css/app.css",
      "projects/p/snapshots/s/index.html",
    ]);
  });

  it("listHtmlPages filtra html y devuelve rutas relativas", async () => {
    const prefix = "projects/p/snapshots/s/";
    await s.put(prefix + "index.html", "a");
    await s.put(prefix + "about/team.html", "b");
    await s.put(prefix + "css/app.css", "c");
    const pages = await listHtmlPages(s, prefix);
    expect(pages.sort()).toEqual(["about/team.html", "index.html"]);
  });

  it("put acepta un contentType explícito (interfaz) y el round-trip funciona", async () => {
    await s.put("a/b.html", Buffer.from("<p>x</p>"), "text/html; charset=utf-8");
    const got = await s.get("a/b.html");
    expect(got?.body.toString()).toBe("<p>x</p>");
    expect(got?.contentType).toBe("text/html; charset=utf-8");
  });

  it("delete borra la clave", async () => {
    await s.put("a/b.txt", "x");
    await s.delete("a/b.txt");
    expect(await s.get("a/b.txt")).toBeNull();
  });
});
