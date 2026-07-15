import { describe, it, expect, vi, afterEach } from "vitest";
import { claveOpenRouter, claveSerpApi } from "@/src/config/claves";

// En vitest no hay DATABASE_URL: el resolutor no puede leer la BD y debe caer
// al .env sin lanzar. La prioridad UI-primero se cubre en el e2e (BD real).
afterEach(() => vi.unstubAllEnvs());

describe("resolutor de claves (sin BD → respaldo en .env)", () => {
  it("claveOpenRouter cae a OPENROUTER_API_KEY", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "sk-env");
    expect(await claveOpenRouter()).toBe("sk-env");
  });

  it("claveSerpApi cae a SERPAPI_KEY", async () => {
    vi.stubEnv("SERPAPI_KEY", "serp-env");
    expect(await claveSerpApi()).toBe("serp-env");
  });

  it("sin clave en ningún sitio devuelve cadena vacía", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("SERPAPI_KEY", "");
    expect(await claveOpenRouter()).toBe("");
    expect(await claveSerpApi()).toBe("");
  });
});
