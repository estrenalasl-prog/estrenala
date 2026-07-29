import { describe, it, expect } from "vitest";
import { urlPlataforma } from "@/src/config/sitio";

describe("urlPlataforma", () => {
  it("usa PLATFORM_HOST cuando está, con https", () => {
    expect(urlPlataforma({ PLATFORM_HOST: "estrenala.com" })).toBe("https://estrenala.com");
  });

  it("en local no inventa TLS", () => {
    expect(urlPlataforma({ PLATFORM_HOST: "localhost:3000" })).toBe("http://localhost:3000");
    expect(urlPlataforma({ PLATFORM_HOST: "127.0.0.1:3000" })).toBe("http://127.0.0.1:3000");
  });

  it("sin variable y en producción cae a estrenala.com, NO a localhost", () => {
    // Es el caso real: al construir la imagen Docker no hay PLATFORM_HOST, y sin
    // esto la landing saldría anunciando og:image en http://localhost:3000.
    expect(urlPlataforma({ NODE_ENV: "production" })).toBe("https://estrenala.com");
  });

  it("sin variable y en desarrollo, localhost", () => {
    expect(urlPlataforma({ NODE_ENV: "development" })).toBe("http://localhost:3000");
    expect(urlPlataforma({})).toBe("http://localhost:3000");
  });

  it("no se lía con mayúsculas ni espacios", () => {
    expect(urlPlataforma({ PLATFORM_HOST: "  Estrenala.COM " })).toBe("https://estrenala.com");
  });

  it("un host que empieza por «local» pero no es local sí lleva https", () => {
    expect(urlPlataforma({ PLATFORM_HOST: "localhost.midominio.com" })).toBe("https://localhost.midominio.com");
  });
});
