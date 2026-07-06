import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { limpiarJson, pedirJson, PlantillasSchema } from "@/src/ia/claude";

describe("limpiarJson", () => {
  it("extrae el JSON de un bloque ```json … ```", () => {
    expect(limpiarJson('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it("acepta un bloque ``` sin etiqueta de lenguaje", () => {
    expect(limpiarJson('```\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it("devuelve el texto tal cual si no hay bloque", () => {
    expect(limpiarJson('{"a":1}')).toBe('{"a":1}');
  });
});

describe("pedirJson", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  const respuesta = (contenido: string) => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: contenido } }],
    }),
  });

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("camino feliz: una llamada exitosa devuelve el objeto parseado", async () => {
    const jsonValido = '```json\n{"plantilla_post":"a","plantilla_index":"b"}\n```';
    mockFetch.mockResolvedValueOnce(respuesta(jsonValido));

    const resultado = await pedirJson("p", PlantillasSchema);

    expect(resultado).toEqual({
      plantilla_post: "a",
      plantilla_index: "b",
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Verificar que el request tiene response_format.type === "json_schema"
    const llamada = mockFetch.mock.calls[0];
    const body = JSON.parse(llamada[1].body);
    expect(body.response_format.type).toBe("json_schema");
  });

  it("reintento exitoso: primer JSON inválido, segundo válido → devuelve objeto", async () => {
    const jsonInvalido = "esto no es json";
    const jsonValido = '```json\n{"plantilla_post":"a","plantilla_index":"b"}\n```';

    mockFetch
      .mockResolvedValueOnce(respuesta(jsonInvalido))
      .mockResolvedValueOnce(respuesta(jsonValido));

    const resultado = await pedirJson("p", PlantillasSchema);

    expect(resultado).toEqual({
      plantilla_post: "a",
      plantilla_index: "b",
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("ambos intentos fallan: JSON inválido en ambos → rechaza con error", async () => {
    const jsonInvalido = "sigue sin ser json";

    mockFetch
      .mockResolvedValueOnce(respuesta(jsonInvalido))
      .mockResolvedValueOnce(respuesta(jsonInvalido));

    await expect(pedirJson("p", PlantillasSchema)).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
