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

/**
 * La bomba zip: un archivo diminuto que al abrirlo ocupa cientos de megas.
 *
 * El límite de 50 MB existía desde el principio, pero llegaba TARDE: `unzipSync`
 * descomprimía el ZIP entero en memoria y solo después se contaban los bytes. El
 * 2026-09-03, preparando el lanzamiento, se midió: un ZIP de 250 KB hacía pasar
 * el proceso de 329 MB a 828 MB de RSS antes de rechazarlo. Seis a la vez tumban
 * un VPS de 4 GB, y no hacía falta ni una cuenta con nada dentro.
 *
 * Lo que se mide aquí NO es el mensaje —ese era el mismo antes y después— sino
 * la MEMORIA. Es el único sitio donde se nota la diferencia, y por eso el test
 * mira eso aunque sea raro ver un umbral de megas en una aserción.
 */
describe("bomba zip", () => {
  const MB = 1024 * 1024;

  /** El ZIP se arma aparte para que el buffer gordo de origen no siga vivo al medir. */
  function bomba(megas: number): Buffer {
    return Buffer.from(
      zipSync({ "index.html": strToU8("<h1>x</h1>"), "relleno.bin": new Uint8Array(megas * MB) }, { level: 9 })
    );
  }

  it("un ZIP pequeño que declara 300 MB se rechaza SIN descomprimirlo", () => {
    const zip = bomba(300);
    // Que de verdad sea una bomba: si esto deja de ser cierto, el test ya no
    // prueba lo que dice.
    expect(zip.length, "el ZIP de prueba no está comprimido").toBeLessThan(2 * MB);

    const antes = process.memoryUsage().rss;
    expect(() => unzipSafe(zip)).toThrow("Lo que has subido supera 50 MB");
    const gastado = (process.memoryUsage().rss - antes) / MB;

    // Sin el portero hay que reservar los 300 MB para poder decir que no.
    // Con él no se reserva nada; el margen es enorme a propósito, para que la
    // basura del recolector no haga fallar el test por ruido.
    expect(gastado, `se gastaron ${gastado.toFixed(0)} MB descomprimiendo lo que se iba a rechazar`)
      .toBeLessThan(100);
  });

  it("un ZIP honesto y pequeño sigue entrando igual", () => {
    const files = unzipSafe(makeZip({ "index.html": "<h1>hola</h1>", "e.css": "body{}" }));
    expect(files.map((f) => f.path).sort()).toEqual(["e.css", "index.html"]);
  });
});
