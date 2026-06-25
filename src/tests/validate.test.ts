import { describe, it, expect } from "vitest";
import { filtrarSeguros } from "@/src/import/validate";

describe("filtrarSeguros", () => {
  it("conserva extensiones web y reporta las ignoradas", () => {
    const files = [
      { path: "index.html", bytes: Buffer.from("a") },
      { path: "css/app.css", bytes: Buffer.from("b") },
      { path: "img/x.png", bytes: Buffer.from("c") },
      { path: "raro.exe", bytes: Buffer.from("d") },
      { path: "notas.docx", bytes: Buffer.from("e") },
    ];
    const { seguros, ignorados } = filtrarSeguros(files);
    expect(seguros.map((f) => f.path).sort()).toEqual([
      "css/app.css", "img/x.png", "index.html",
    ]);
    expect(ignorados.sort()).toEqual(["notas.docx", "raro.exe"]);
  });
});
