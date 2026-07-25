import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { processFiles, processZip } from "@/src/import/process-zip";
import { ImportError } from "@/src/import/unzip";

const f = (path: string, txt = "x") => ({ path, bytes: Buffer.from(txt) });

describe("processFiles — subir archivos sueltos o una carpeta", () => {
  it("un solo .html suelto vale como web", () => {
    const r = processFiles([f("index.html", "<h1>Hola</h1>")]);
    expect(r.entryPath).toBe("index.html");
    expect(r.files.map((x) => x.path)).toEqual(["index.html"]);
  });

  it("un .html con otro nombre también (se elige como entrada)", () => {
    expect(processFiles([f("mi-web.html")]).entryPath).toBe("mi-web.html");
  });

  it("carpeta entera: quita la raíz envolvente y conserva la estructura", () => {
    const r = processFiles([
      f("mi-web/index.html"),
      f("mi-web/css/app.css"),
      f("mi-web/img/logo.png"),
    ]);
    expect(r.entryPath).toBe("index.html");
    expect(r.files.map((x) => x.path).sort()).toEqual(["css/app.css", "img/logo.png", "index.html"]);
  });

  it("NO se come dos niveles cuando todo cuelga de una subcarpeta común", () => {
    // Tras quitar "mi-web/", todo comparte "assets/": no debe quitarse también.
    const r = processFiles([f("mi-web/assets/a.css"), f("mi-web/assets/index.html")]);
    expect(r.files.map((x) => x.path).sort()).toEqual(["assets/a.css", "assets/index.html"]);
    expect(r.entryPath).toBe("assets/index.html");
  });

  it("ignora archivos de extensión no permitida (p. ej. .DS_Store o .exe)", () => {
    const r = processFiles([f("index.html"), f(".DS_Store"), f("virus.exe")]);
    expect(r.files.map((x) => x.path)).toEqual(["index.html"]);
    expect(r.ignorados.sort()).toEqual([".DS_Store", "virus.exe"]);
  });

  it("sin ninguna página HTML → ImportError", () => {
    expect(() => processFiles([f("css/app.css"), f("img/a.png")])).toThrow(ImportError);
  });

  it("lista vacía → ImportError", () => {
    expect(() => processFiles([])).toThrow(ImportError);
  });

  it("rutas con .. o absolutas se rechazan (zip-slip también aquí)", () => {
    expect(() => processFiles([f("../fuera.html")])).toThrow(ImportError);
    expect(() => processFiles([f("/etc/passwd.html")])).toThrow(ImportError);
  });

  it("normaliza separadores de Windows", () => {
    const r = processFiles([f("mi-web\\css\\app.css"), f("mi-web\\index.html")]);
    expect(r.files.map((x) => x.path).sort()).toEqual(["css/app.css", "index.html"]);
  });
});

describe("processZip sigue funcionando igual (una sola normalización de raíz)", () => {
  it("ZIP con carpeta envolvente: quita solo ese nivel", () => {
    const zip = Buffer.from(zipSync({
      "sitio/index.html": strToU8("<h1>x</h1>"),
      "sitio/css/app.css": strToU8("body{}"),
    }));
    const r = processZip(zip);
    expect(r.entryPath).toBe("index.html");
    expect(r.files.map((x) => x.path).sort()).toEqual(["css/app.css", "index.html"]);
  });

  it("ZIP donde todo cuelga de dos niveles comunes: solo se quita el primero", () => {
    const zip = Buffer.from(zipSync({
      "sitio/dist/index.html": strToU8("<h1>x</h1>"),
      "sitio/dist/app.css": strToU8("body{}"),
    }));
    const r = processZip(zip);
    expect(r.files.map((x) => x.path).sort()).toEqual(["dist/app.css", "dist/index.html"]);
  });
});
