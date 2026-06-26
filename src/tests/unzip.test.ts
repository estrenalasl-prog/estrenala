import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { unzipSafe, ImportError } from "@/src/import/unzip";

function makeZip(files: Record<string, string>): Buffer {
  const data: Record<string, Uint8Array> = {};
  for (const [k, v] of Object.entries(files)) data[k] = strToU8(v);
  return Buffer.from(zipSync(data));
}

describe("unzipSafe", () => {
  it("descomprime rutas y contenidos", () => {
    const zip = makeZip({ "index.html": "<h1>x</h1>", "css/app.css": "body{}" });
    const files = unzipSafe(zip);
    const map = Object.fromEntries(files.map((f) => [f.path, f.bytes.toString()]));
    expect(map["index.html"]).toBe("<h1>x</h1>");
    expect(map["css/app.css"]).toBe("body{}");
  });

  it("quita la carpeta raíz envolvente común", () => {
    const zip = makeZip({ "mi-web/index.html": "a", "mi-web/css/app.css": "b" });
    const paths = unzipSafe(zip).map((f) => f.path).sort();
    expect(paths).toEqual(["css/app.css", "index.html"]);
  });

  it("no quita prefijo si no es común a todo", () => {
    const zip = makeZip({ "a/index.html": "x", "b/style.css": "y" });
    const paths = unzipSafe(zip).map((f) => f.path).sort();
    expect(paths).toEqual(["a/index.html", "b/style.css"]);
  });

  it("rechaza zip-slip (..)", () => {
    const zip = makeZip({ "../evil.html": "x" });
    expect(() => unzipSafe(zip)).toThrow(ImportError);
  });

  it("rechaza ruta absoluta", () => {
    expect(() => unzipSafe(makeZip({ "/etc/passwd": "x" }))).toThrow(ImportError);
  });

  it("rechaza ruta con unidad de Windows", () => {
    expect(() => unzipSafe(makeZip({ "C:/Windows/evil.html": "x" }))).toThrow(ImportError);
  });

  it("rechaza si supera el máximo de archivos", () => {
    const many: Record<string, string> = {};
    for (let i = 0; i < 2001; i++) many[`f${i}.txt`] = "x";
    expect(() => unzipSafe(makeZip(many))).toThrow(ImportError);
  });

  it("rechaza si el contenido descomprimido supera 50 MB", () => {
    const big = "a".repeat(51 * 1024 * 1024);
    expect(() => unzipSafe(makeZip({ "big.txt": big }))).toThrow(ImportError);
  });
});
