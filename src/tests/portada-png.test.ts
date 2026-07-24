import { describe, it, expect } from "vitest";
import { generarSvgPortada } from "@/src/blog/portada/svg";
import { rasterizarPortadaPng } from "@/src/blog/portada/png";

const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Ancho y alto del IHDR (siempre el primer chunk, offsets fijos del formato).
function dimensiones(png: Buffer): { ancho: number; alto: number } {
  return { ancho: png.readUInt32BE(16), alto: png.readUInt32BE(20) };
}

const base = {
  titulo: "Automatiza tu pyme con IA",
  sitio: "Quantiva",
  colores: ["#4f46e5", "#0ea5e9"] as [string, string],
};

describe("rasterizarPortadaPng", () => {
  it("produce un PNG válido de 1200×630 (el tamaño og:image)", async () => {
    const png = await rasterizarPortadaPng(generarSvgPortada(base));
    expect(png.subarray(0, 8).equals(FIRMA_PNG)).toBe(true);
    expect(dimensiones(png)).toEqual({ ancho: 1200, alto: 630 });
  });

  it("dibuja el texto de verdad (con las fuentes del repo, sin depender del sistema)", async () => {
    // El mismo SVG sin sus <text>: si los glifos no se pintaran (fuentes
    // ausentes), ambos PNG serían idénticos.
    const svg = generarSvgPortada(base);
    const sinTexto = svg.replace(/<text[\s\S]*?<\/text>/g, "");
    expect(sinTexto).not.toBe(svg);
    const con = await rasterizarPortadaPng(svg);
    const sin = await rasterizarPortadaPng(sinTexto);
    expect(con.equals(sin)).toBe(false);
  });

  it("es determinista: el mismo SVG da los mismos bytes", async () => {
    const a = await rasterizarPortadaPng(generarSvgPortada(base));
    const b = await rasterizarPortadaPng(generarSvgPortada(base));
    expect(a.equals(b)).toBe(true);
  });

  it("acentos, eñes y comillas no lo rompen", async () => {
    const png = await rasterizarPortadaPng(generarSvgPortada({
      ...base,
      titulo: "Añade «diseño» & más tráfico — ¿ya?",
      sitio: "Peña & Asociados",
    }));
    expect(png.subarray(0, 8).equals(FIRMA_PNG)).toBe(true);
    expect(dimensiones(png)).toEqual({ ancho: 1200, alto: 630 });
  });
});
