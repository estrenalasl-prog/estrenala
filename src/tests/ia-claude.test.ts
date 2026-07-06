import { describe, it, expect } from "vitest";
import { limpiarJson } from "@/src/ia/claude";

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
