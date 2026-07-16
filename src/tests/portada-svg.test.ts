import { describe, it, expect } from "vitest";
import { extraerColores, paletaPara, PALETAS } from "@/src/blog/portada/colores";
import { generarSvgPortada } from "@/src/blog/portada/svg";

describe("extraerColores", () => {
  it("devuelve los colores con saturación ordenados por frecuencia", () => {
    const css = ".a{color:#e11d48}.b{background:#e11d48}.c{border-color:#e11d48}" +
      ".d{color:#0ea5e9}.e{background:#0ea5e9}";
    expect(extraerColores([css])).toEqual(["#e11d48", "#0ea5e9"]);
  });

  it("ignora grises, casi-blancos y casi-negros (los colores 'de fondo' no son marca)", () => {
    const css = ".x{color:#808080;background:#fff;border:#000 1px;box-shadow:0 0 #111827}" +
      ".y{color:#f9fafb}.z{color:#7c3aed}";
    expect(extraerColores([css])).toEqual(["#7c3aed"]);
  });

  it("suma hex de 3, de 6 y rgb() del mismo color, y mira en varios textos", () => {
    const css = ".a{color:#0ea5e9}";
    const html = '<div style="color: rgb(14, 165, 233)"><span style="color:rgb(14,165,233)">x</span></div>' +
      '<p style="color:#e11d48">y</p><p style="color:#e11d48">z</p>';
    // #0ea5e9 aparece 3 veces (1 hex + 2 rgb) y #e11d48 solo 2.
    expect(extraerColores([css, html])).toEqual(["#0ea5e9", "#e11d48"]);
  });

  it("hex de 3 dígitos se normaliza (#e11 no es gris)", () => {
    expect(extraerColores([".a{color:#e11}"])).toEqual(["#ee1111"]);
  });

  it("sin colores útiles devuelve lista vacía", () => {
    expect(extraerColores([".a{color:#fff;background:#333}"])).toEqual([]);
  });
});

describe("paletaPara", () => {
  it("es determinista y devuelve una pareja de la lista curada", () => {
    const p1 = paletaPara("Quantiva");
    const p2 = paletaPara("Quantiva");
    expect(p1).toEqual(p2);
    expect(PALETAS).toContainEqual(p1);
  });

  it("semillas distintas pueden dar paletas distintas", () => {
    const distintas = new Set(["a", "b", "c", "d", "e", "f", "g", "h"].map((s) => paletaPara(s).join()));
    expect(distintas.size).toBeGreaterThan(1);
  });
});

describe("generarSvgPortada", () => {
  const base = { titulo: "Automatiza tu pyme con IA", sitio: "Quantiva", colores: ["#4f46e5", "#0ea5e9"] as [string, string] };

  it("es un SVG 1200×630 con el degradado de los dos colores y el nombre del sitio", () => {
    const svg = generarSvgPortada(base);
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="630"');
    expect(svg).toContain("#4f46e5");
    expect(svg).toContain("#0ea5e9");
    expect(svg).toContain("Quantiva");
  });

  it("escapa XML en título y sitio (nunca inyecta marcado)", () => {
    const svg = generarSvgPortada({ ...base, titulo: 'Ahorra <tiempo> & dinero "ya"', sitio: "A&B <Web>" });
    expect(svg).toContain("&lt;tiempo&gt;");
    expect(svg).toContain("&amp; dinero");
    expect(svg).toContain("A&amp;B &lt;Web&gt;");
    expect(svg).not.toContain("<tiempo>");
  });

  it("título corto: una línea grande", () => {
    const svg = generarSvgPortada({ ...base, titulo: "Hola mundo" });
    expect(svg.match(/<tspan/g)).toHaveLength(1);
    expect(svg).toContain('font-size="72"');
  });

  it("título largo: máximo 4 líneas, la última con elipsis, tamaño reducido", () => {
    const svg = generarSvgPortada({
      ...base,
      titulo: "Una guía completísima y muy detallada para automatizar absolutamente todos los procesos repetitivos de tu pequeña empresa este año",
    });
    expect(svg.match(/<tspan/g)).toHaveLength(4);
    expect(svg).toContain("…");
    expect(svg).toContain('font-size="50"');
  });

  it("colores oscuros → texto blanco; claros → texto casi negro", () => {
    const oscuro = generarSvgPortada(base); // índigo/azul: oscuros
    expect(oscuro).toContain('fill="#ffffff"');
    const claro = generarSvgPortada({ ...base, colores: ["#fde047", "#fca5a5"] });
    expect(claro).toContain('fill="#111827"');
  });

  it("es determinista para el mismo título y sitio", () => {
    expect(generarSvgPortada(base)).toBe(generarSvgPortada(base));
  });
});
