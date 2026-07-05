import { describe, it, expect } from "vitest";
import {
  aplicarHerramienta, quitarHerramienta, estadoHerramientas,
  normalizarVerificacion, normalizarMedicion, rutaDeAssetValida, HeadToolsError,
} from "@/src/editor/head-tools";

const BASE = `<!doctype html><html><head><title>t</title></head><body><p>x</p></body></html>`;
const RUTA = "/wc-uploads/01234567-89ab-4cde-8f01-23456789abcd.png";

describe("normalizadores", () => {
  it("verificación: token pelado y etiqueta completa", () => {
    expect(normalizarVerificacion("  Abc123_-Abc123_-XYZ  ")).toBe("Abc123_-Abc123_-XYZ");
    expect(normalizarVerificacion(`<meta name="google-site-verification" content="Abc123_-Abc123_-XYZ" />`))
      .toBe("Abc123_-Abc123_-XYZ");
    expect(normalizarVerificacion("corto")).toBeNull();
    expect(normalizarVerificacion("con espacios no vale 12345678")).toBeNull();
  });
  it("analytics: mayúsculas y formato G-", () => {
    expect(normalizarMedicion("  g-abc1de23fg ")).toBe("G-ABC1DE23FG");
    expect(normalizarMedicion("UA-12345")).toBeNull();
    expect(normalizarMedicion("G-!!")).toBeNull();
  });
  it("ruta de asset", () => {
    expect(rutaDeAssetValida(RUTA)).toBe(true);
    expect(rutaDeAssetValida("/otra/cosa.png")).toBe(false);
    expect(rutaDeAssetValida("/wc-uploads/x.png")).toBe(false);
  });
});

describe("aplicarHerramienta", () => {
  it("inserta la meta de verificación antes de </head>", () => {
    const out = aplicarHerramienta(BASE, { tipo: "google-verification", codigo: "Abc123_-Abc123_-XYZ" });
    expect(out).toContain(`<meta name="google-site-verification" content="Abc123_-Abc123_-XYZ"></head>`);
  });
  it("reemplaza la verificación existente sin duplicar", () => {
    const con = aplicarHerramienta(BASE, { tipo: "google-verification", codigo: "Abc123_-Abc123_-XYZ" });
    const out = aplicarHerramienta(con, { tipo: "google-verification", codigo: "Nuevo456_-Nuevo456_-Q" });
    expect(out.match(/google-site-verification/g)).toHaveLength(1);
    expect(out).toContain(`content="Nuevo456_-Nuevo456_-Q"`);
  });
  it("analytics: dos scripts marcados con data-wc-tool", () => {
    const out = aplicarHerramienta(BASE, { tipo: "analytics", medicion: "G-ABC1DE23FG" });
    expect(out.match(/data-wc-tool="analytics"/g)).toHaveLength(2);
    expect(out).toContain(`https://www.googletagmanager.com/gtag/js?id=G-ABC1DE23FG`);
    expect(out).toContain(`gtag('config','G-ABC1DE23FG')`);
  });
  it("re-aplicar analytics reemplaza ambos scripts", () => {
    const con = aplicarHerramienta(BASE, { tipo: "analytics", medicion: "G-ABC1DE23FG" });
    const out = aplicarHerramienta(con, { tipo: "analytics", medicion: "G-ZZZ9YYY8XX" });
    expect(out.match(/data-wc-tool="analytics"/g)).toHaveLength(2);
    expect(out).not.toContain("G-ABC1DE23FG");
  });
  it("favicon: elimina los icon existentes (incl. shortcut icon) y respeta apple-touch-icon", () => {
    const conIconos = `<!doctype html><html><head><link rel="shortcut icon" href="/a.ico">` +
      `<link rel="ICON" href="/b.png"><link rel="apple-touch-icon" href="/c.png"><title>t</title></head><body></body></html>`;
    const out = aplicarHerramienta(conIconos, { tipo: "favicon", ruta: RUTA });
    expect(out).not.toContain("/a.ico");
    expect(out).not.toContain("/b.png");
    expect(out).toContain("apple-touch-icon");
    expect(out).toContain(`<link rel="icon" href="${RUTA}">`);
  });
  it("og-image: inserta y reemplaza", () => {
    const con = aplicarHerramienta(BASE, { tipo: "og-image", ruta: RUTA });
    expect(con).toContain(`<meta property="og:image" content="${RUTA}">`);
    const out = aplicarHerramienta(con, { tipo: "og-image", ruta: RUTA.replace(".png", ".webp") });
    expect(out.match(/og:image/g)).toHaveLength(1);
  });
  it("sin </head> con posición: inserta antes de <body>; sin body → error 400", () => {
    const sinHead = `<body><p>x</p></body>`;
    const out = aplicarHerramienta(sinHead, { tipo: "og-image", ruta: RUTA });
    expect(out.indexOf("og:image")).toBeLessThan(out.indexOf("<p>"));
    expect(() => aplicarHerramienta(`<p>solo</p>`, { tipo: "og-image", ruta: RUTA }))
      .toThrowError(HeadToolsError);
  });
});

describe("quitarHerramienta y estadoHerramientas", () => {
  it("quitar elimina; estado refleja lo aplicado", () => {
    let html = aplicarHerramienta(BASE, { tipo: "google-verification", codigo: "Abc123_-Abc123_-XYZ" });
    html = aplicarHerramienta(html, { tipo: "analytics", medicion: "G-ABC1DE23FG" });
    html = aplicarHerramienta(html, { tipo: "favicon", ruta: RUTA });
    const estado = estadoHerramientas(html);
    expect(estado).toEqual({
      googleVerification: "Abc123_-Abc123_-XYZ",
      analytics: "G-ABC1DE23FG",
      favicon: RUTA,
      ogImage: null,
    });
    const sinAna = quitarHerramienta(html, "analytics");
    expect(sinAna).not.toContain("data-wc-tool");
    expect(estadoHerramientas(sinAna).analytics).toBeNull();
    expect(quitarHerramienta(BASE, "favicon")).toBe(BASE); // sin objetivo → intacto
  });
  it("no toca etiquetas parecidas dentro del <body>", () => {
    const conBody = `<!doctype html><html><head><title>t</title></head>` +
      `<body><link rel="icon" href="/decorativo.ico"><meta property="og:image" content="/en-body.png"><p>x</p></body></html>`;
    const out = aplicarHerramienta(conBody, { tipo: "favicon", ruta: RUTA });
    expect(out).toContain(`/decorativo.ico`);
    expect(quitarHerramienta(conBody, "og-image")).toBe(conBody);
    expect(estadoHerramientas(conBody).ogImage).toBeNull();
  });
  it("normalizarVerificacion no se confunde con atributos tipo data-content", () => {
    expect(normalizarVerificacion(
      `<meta data-content="deadbeefdeadbeef1234" name="google-site-verification" content="realtoken1234567890">`
    )).toBe("realtoken1234567890");
  });
});
