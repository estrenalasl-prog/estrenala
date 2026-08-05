import { describe, it, expect } from "vitest";
import { config } from "@/middleware";

/**
 * El `matcher` decide qué peticiones VEN el middleware. Lo que no entra ahí no
 * se reescribe a `/sites/<host>/…`, así que para una web de cliente es como si
 * no existiera: cae en la plataforma y da 404.
 *
 * Es la clase de fallo que no se nota nunca. No falla ningún test, no aparece
 * en ningún registro, y en el navegador solo se ve un icono de pestaña en
 * blanco. `favicon.ico` estuvo excluido —viene así de serie en Next— hasta que
 * se pidió desde fuera la web de Quantiva el 2026-08-05.
 */
const patron = () => new RegExp(`^${config.matcher[0]}$`);

describe("el matcher del middleware", () => {
  it("deja pasar favicon.ico: es de la web del cliente, no nuestro", () => {
    expect(patron().test("/favicon.ico")).toBe(true);
  });

  it("no toca los archivos internos de Next", () => {
    expect(patron().test("/_next/static/chunks/main.js")).toBe(false);
  });

  it.each([
    "/", "/login", "/api/registro", "/blog/", "/contacto",
    "/robots.txt", "/sitemap.xml", "/apple-touch-icon.png",
    "/assets/logos/quantiva-negro.png", "/blog/img/kling-ai-generacion-de-videos.webp",
  ])("ve %s", (ruta) => {
    expect(patron().test(ruta)).toBe(true);
  });
});
