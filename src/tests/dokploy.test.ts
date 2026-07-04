import { describe, it, expect } from "vitest";
import { DokployDeploy } from "@/src/publish/dokploy";

type Llamada = { url: string; init?: RequestInit };

function fetchMock(respuestas: Array<{ ok: boolean; status?: number; json?: unknown }>) {
  const llamadas: Llamada[] = [];
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    llamadas.push({ url: String(url), init });
    const r = respuestas.shift() ?? { ok: true };
    return {
      ok: r.ok, status: r.status ?? (r.ok ? 200 : 500),
      json: async () => r.json ?? {},
    } as Response;
  }) as typeof fetch;
  return { f, llamadas };
}

const cfg = { url: "https://dok.example", apiKey: "k123", applicationId: "app-1" };

describe("DokployDeploy.connectDomain", () => {
  it("crea el dominio pelado y el www con letsencrypt", async () => {
    const { f, llamadas } = fetchMock([{ ok: true }, { ok: true }]);
    await new DokployDeploy({ ...cfg, fetchImpl: f }).connectDomain({ dominio: "cliente.com" });
    expect(llamadas).toHaveLength(2);
    expect(llamadas[0].url).toBe("https://dok.example/api/domain.create");
    const b0 = JSON.parse(String(llamadas[0].init?.body));
    expect(b0).toEqual({
      applicationId: "app-1", host: "cliente.com", port: 3000,
      https: true, certificateType: "letsencrypt", domainType: "application",
    });
    const b1 = JSON.parse(String(llamadas[1].init?.body));
    expect(b1.host).toBe("www.cliente.com");
    const headers = llamadas[0].init?.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("k123");
  });
  it("respuesta no-ok → lanza", async () => {
    const { f } = fetchMock([{ ok: false, status: 500 }]);
    await expect(new DokployDeploy({ ...cfg, fetchImpl: f }).connectDomain({ dominio: "cliente.com" }))
      .rejects.toThrow(/domain\.create/);
  });
});

describe("DokployDeploy.disconnectDomain", () => {
  it("busca los domainId y borra pelado + www", async () => {
    const { f, llamadas } = fetchMock([
      { ok: true, json: [
        { domainId: "d1", host: "cliente.com" },
        { domainId: "d2", host: "www.cliente.com" },
        { domainId: "d3", host: "otro.com" },
      ]},
      { ok: true }, { ok: true },
    ]);
    await new DokployDeploy({ ...cfg, fetchImpl: f }).disconnectDomain({ dominio: "cliente.com" });
    expect(llamadas[0].url).toBe("https://dok.example/api/domain.byApplicationId?applicationId=app-1");
    expect(llamadas).toHaveLength(3);
    expect(JSON.parse(String(llamadas[1].init?.body))).toEqual({ domainId: "d1" });
    expect(JSON.parse(String(llamadas[2].init?.body))).toEqual({ domainId: "d2" });
  });
  it("si el lookup falla → lanza", async () => {
    const { f } = fetchMock([{ ok: false, status: 401 }]);
    await expect(new DokployDeploy({ ...cfg, fetchImpl: f }).disconnectDomain({ dominio: "cliente.com" }))
      .rejects.toThrow(/byApplicationId/);
  });
});

describe("getDeploy", () => {
  it("default self-hosted; dokploy exige sus envs", async () => {
    const { getDeploy } = await import("@/src/publish/deploy-factory");
    expect(getDeploy().connectDomain).toBeTypeOf("function"); // no lanza sin envs (self)
  });
});
