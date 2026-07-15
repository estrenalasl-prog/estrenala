import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  limpiarJson, limpiarMd, pedirJson, pedirTexto, pedirConBusquedaWeb,
  PlantillasSchema, AnalisisSchema, MetadatosSchema, RelevanciaSchema,
} from "@/src/ia/claude";

describe("RelevanciaSchema", () => {
  it("acepta puntuaciones válidas", () => {
    expect(RelevanciaSchema.parse({ puntuaciones: [{ keyword: "x", relevancia: 80 }] }).puntuaciones).toHaveLength(1);
  });
  it("rechaza una relevancia no numérica", () => {
    expect(() => RelevanciaSchema.parse({ puntuaciones: [{ keyword: "x", relevancia: "alta" }] })).toThrow();
  });
});

describe("limpiarMd", () => {
  it("quita la envoltura ```markdown de todo el texto", () => {
    expect(limpiarMd("```markdown\n# Hola\n\nTexto\n```")).toBe("# Hola\n\nTexto");
  });
  it("quita la envoltura ``` sin etiqueta", () => {
    expect(limpiarMd("```\n# Hola\n```")).toBe("# Hola");
  });
  it("conserva los bloques de código INTERNOS al quitar la envoltura", () => {
    expect(limpiarMd("```markdown\n# T\n\n```js\ncode\n```\n\nfin\n```"))
      .toBe("# T\n\n```js\ncode\n```\n\nfin");
  });
  it("no toca un texto sin envoltura", () => {
    expect(limpiarMd("# Hola\n\nTexto normal")).toBe("# Hola\n\nTexto normal");
  });
  it("no toca un texto con fences internos que no lo envuelven", () => {
    const t = "Intro\n\n```js\ncode\n```\n\nfin";
    expect(limpiarMd(t)).toBe(t);
  });
  it("no toca un texto que abre fence pero no lo cierra al final", () => {
    const t = "```markdown\n# Hola sin cierre";
    expect(limpiarMd(t)).toBe(t);
  });
});

describe("schemas", () => {
  it("AnalisisSchema acepta un análisis válido", () => {
    expect(AnalisisSchema.parse({
      keyword_principal: "agentes ia",
      keywords_secundarias: ["asistentes virtuales", "automatización"],
      intencion_busqueda: "informativa",
    }).keyword_principal).toBe("agentes ia");
  });
  it("MetadatosSchema rechaza campos ausentes", () => {
    expect(() => MetadatosSchema.parse({ titulo: "x" })).toThrow();
  });
});

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

describe("pedirTexto", () => {
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

  it("devuelve el contenido y no envía response_format ni plugins", async () => {
    mockFetch.mockResolvedValueOnce(respuesta("texto generado"));

    const resultado = await pedirTexto("p");

    expect(resultado).toBe("texto generado");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.response_format).toBeUndefined();
    expect(body.plugins).toBeUndefined();
    expect(body.max_tokens).toBe(8000);
    expect(body.messages).toEqual([{ role: "user", content: "p" }]);
  });

  it("respeta maxTokens explícito", async () => {
    mockFetch.mockResolvedValueOnce(respuesta("x"));
    await pedirTexto("p", 3000);
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).max_tokens).toBe(3000);
  });
});

describe("pedirConBusquedaWeb", () => {
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

  it("envía el plugin web con max_results 6 por defecto", async () => {
    mockFetch.mockResolvedValueOnce(respuesta("investigación"));

    const resultado = await pedirConBusquedaWeb("p");

    expect(resultado).toBe("investigación");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.plugins).toEqual([{ id: "web", max_results: 6 }]);
    expect(body.max_tokens).toBe(8000);
  });

  it("respeta maxBusquedas explícito", async () => {
    mockFetch.mockResolvedValueOnce(respuesta("x"));
    await pedirConBusquedaWeb("p", 4000, 3);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.plugins).toEqual([{ id: "web", max_results: 3 }]);
    expect(body.max_tokens).toBe(4000);
  });
});

describe("modelo opcional (4b2)", () => {
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

  const modeloEnviado = () => JSON.parse(mockFetch.mock.calls[0][1].body).model as string;

  it("pedirTexto con modelo explícito lo manda en el body", async () => {
    mockFetch.mockResolvedValueOnce(respuesta("x"));
    await pedirTexto("p", 8000, "x/y");
    expect(modeloEnviado()).toBe("x/y");
  });

  it("pedirTexto sin modelo usa el default de la plataforma", async () => {
    mockFetch.mockResolvedValueOnce(respuesta("x"));
    await pedirTexto("p");
    expect(modeloEnviado()).not.toBe("x/y");
    expect(typeof modeloEnviado()).toBe("string");
    expect(modeloEnviado().length).toBeGreaterThan(0);
  });

  it("pedirConBusquedaWeb con modelo explícito lo manda en el body", async () => {
    mockFetch.mockResolvedValueOnce(respuesta("x"));
    await pedirConBusquedaWeb("p", 4000, 3, "x/y");
    expect(modeloEnviado()).toBe("x/y");
  });

  it("pedirJson con modelo explícito lo manda en el body", async () => {
    mockFetch.mockResolvedValueOnce(respuesta('{"plantilla_post":"a","plantilla_index":"b"}'));
    await pedirJson("p", PlantillasSchema, 4000, "x/y");
    expect(modeloEnviado()).toBe("x/y");
  });
});
