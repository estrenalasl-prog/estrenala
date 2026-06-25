import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { processZip } from "@/src/import/process-zip";
import { ImportError } from "@/src/import/unzip";

function makeZip(files: Record<string, string>): Buffer {
  const data: Record<string, Uint8Array> = {};
  for (const [k, v] of Object.entries(files)) data[k] = strToU8(v);
  return Buffer.from(zipSync(data));
}

describe("processZip", () => {
  it("devuelve archivos seguros, entrada e ignorados", () => {
    const zip = makeZip({
      "mi-web/index.html": "<h1>Hola</h1>",
      "mi-web/css/app.css": "body{}",
      "mi-web/notas.exe": "x",
    });
    const r = processZip(zip);
    expect(r.entryPath).toBe("index.html");
    expect(r.files.map((f) => f.path).sort()).toEqual(["css/app.css", "index.html"]);
    expect(r.ignorados).toEqual(["notas.exe"]);
  });

  it("lanza si no hay html", () => {
    const zip = makeZip({ "css/app.css": "body{}" });
    expect(() => processZip(zip)).toThrow(ImportError);
  });
});
