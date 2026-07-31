import { describe, it, expect, vi, afterEach } from "vitest";
import { claveOpenRouter, claveSerpApi } from "@/src/config/claves";

// En vitest no hay DATABASE_URL, así que el resolutor no puede leer la BD y
// devuelve "". La prioridad de la clave del espacio se cubre en el e2e (BD real).
afterEach(() => vi.unstubAllEnvs());

describe("resolutor de claves: cada espacio paga su IA", () => {
  // Estos dos fijan lo que antes hacía justo lo contrario. Había un respaldo al
  // .env y significaba que cualquier cliente sin clave propia gastaba del saldo
  // de OpenRouter de la plataforma: calderilla con cuatro usuarios, una factura
  // sin control con mil, y creciendo cuanto mejor fuera el negocio.
  it("NO cae a OPENROUTER_API_KEY aunque esté puesta en el entorno", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "sk-de-la-plataforma");
    expect(await claveOpenRouter()).toBe("");
  });

  it("NO cae a SERPAPI_KEY aunque esté puesta en el entorno", async () => {
    vi.stubEnv("SERPAPI_KEY", "serp-de-la-plataforma");
    expect(await claveSerpApi()).toBe("");
  });

  it("sin clave del espacio devuelve cadena vacía, y quien llama corta", async () => {
    // Lo comprueban blog, portadas, asistente, piloto y radar antes de gastar:
    // «Falta la clave de OpenRouter: añádela en Configuración».
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("SERPAPI_KEY", "");
    expect(await claveOpenRouter()).toBe("");
    expect(await claveSerpApi()).toBe("");
  });
});
