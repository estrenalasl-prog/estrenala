import { describe, it, expect } from "vitest";
import { analitica } from "@/src/config/analitica";

const ID = "3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const SRC = "https://analitica.estrenala.com/script.js";

describe("analitica", () => {
  it("con las dos variables puestas, devuelve el script a pintar", () => {
    expect(analitica({ UMAMI_SRC: SRC, UMAMI_WEBSITE_ID: ID })).toEqual({ src: SRC, websiteId: ID });
  });

  it("sin configurar no se pinta nada (es el caso de desarrollo)", () => {
    expect(analitica({})).toBeNull();
    expect(analitica({ UMAMI_SRC: SRC })).toBeNull();
    expect(analitica({ UMAMI_WEBSITE_ID: ID })).toBeNull();
    expect(analitica({ UMAMI_SRC: "  ", UMAMI_WEBSITE_ID: ID })).toBeNull();
  });

  it("solo acepta https: esto acaba en un <script src>", () => {
    expect(analitica({ UMAMI_SRC: "http://analitica.estrenala.com/script.js", UMAMI_WEBSITE_ID: ID })).toBeNull();
    expect(analitica({ UMAMI_SRC: "/script.js", UMAMI_WEBSITE_ID: ID })).toBeNull();
  });

  it("rechaza una URL con comillas o espacios (no se cuela nada en el HTML)", () => {
    for (const src of [`https://x.com/a.js" onload="alert(1)`, "https://x.com/a b.js", "https://x.com/<script>"]) {
      expect(analitica({ UMAMI_SRC: src, UMAMI_WEBSITE_ID: ID })).toBeNull();
    }
  });

  it("el identificador tiene que ser un UUID, que es lo que da Umami", () => {
    expect(analitica({ UMAMI_SRC: SRC, UMAMI_WEBSITE_ID: "no-soy-un-uuid" })).toBeNull();
    expect(analitica({ UMAMI_SRC: SRC, UMAMI_WEBSITE_ID: ID.toUpperCase() })).not.toBeNull();
  });
});
