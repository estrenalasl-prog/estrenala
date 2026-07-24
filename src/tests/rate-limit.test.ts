import { describe, it, expect, beforeEach } from "vitest";
import { permitirIntento, _resetRateLimit } from "@/src/auth/rate-limit";

beforeEach(() => _resetRateLimit());

describe("permitirIntento", () => {
  it("permite hasta 10 intentos y bloquea el 11º", () => {
    const t = 1_000_000;
    for (let i = 0; i < 10; i++) expect(permitirIntento("ip|a@b.com", t)).toBe(true);
    expect(permitirIntento("ip|a@b.com", t)).toBe(false);
  });

  it("claves distintas no se estorban", () => {
    const t = 1_000_000;
    for (let i = 0; i < 10; i++) permitirIntento("ip1", t);
    expect(permitirIntento("ip1", t)).toBe(false);
    expect(permitirIntento("ip2", t)).toBe(true);
  });

  it("la ventana se reinicia pasados 15 min", () => {
    const t = 1_000_000;
    for (let i = 0; i < 10; i++) permitirIntento("k", t);
    expect(permitirIntento("k", t)).toBe(false);
    expect(permitirIntento("k", t + 15 * 60 * 1000 + 1)).toBe(true);
  });
});
