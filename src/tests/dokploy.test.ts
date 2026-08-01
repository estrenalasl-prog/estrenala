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

const cfg = {
  url: "https://dok.example", apiKey: "k123", applicationId: "app-1",
  sitesBaseDomain: "estrenala.com",
};
// El alta consulta primero los dominios que ya hay (para no duplicar rutas), así
// que casi toda llamada empieza por esa respuesta.
const yaHay = (hosts: string[] = []) => ({
  ok: true, json: hosts.map((h, i) => ({ domainId: `d${i}`, host: h })),
});

describe("DokployDeploy.connectDomain", () => {
  it("crea el dominio pelado y el www con letsencrypt", async () => {
    const { f, llamadas } = fetchMock([yaHay([]), { ok: true }, { ok: true }]);
    await new DokployDeploy({ ...cfg, fetchImpl: f }).connectDomain({ dominio: "cliente.com" });
    expect(llamadas).toHaveLength(3); // consulta + 2 altas
    expect(llamadas[1].url).toBe("https://dok.example/api/domain.create");
    const b0 = JSON.parse(String(llamadas[1].init?.body));
    expect(b0).toEqual({
      applicationId: "app-1", host: "cliente.com", port: 3000,
      https: true, certificateType: "letsencrypt", domainType: "application",
    });
    const b1 = JSON.parse(String(llamadas[2].init?.body));
    expect(b1.host).toBe("www.cliente.com");
    const headers = llamadas[1].init?.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("k123");
  });
  it("no repite los que ya estaban dados de alta", async () => {
    const { f, llamadas } = fetchMock([yaHay(["cliente.com"]), { ok: true }]);
    await new DokployDeploy({ ...cfg, fetchImpl: f }).connectDomain({ dominio: "cliente.com" });
    expect(llamadas).toHaveLength(2); // consulta + solo el www
    expect(JSON.parse(String(llamadas[1].init?.body)).host).toBe("www.cliente.com");
  });
  it("respuesta no-ok → lanza", async () => {
    const { f } = fetchMock([yaHay([]), { ok: false, status: 500 }]);
    await expect(new DokployDeploy({ ...cfg, fetchImpl: f }).connectDomain({ dominio: "cliente.com" }))
      .rejects.toThrow(/domain\.create/);
  });
});

describe("DokployDeploy.publish / unpublish (subdominios de las webs)", () => {
  it("publicar da de alta <sub>.<base> con su certificado", async () => {
    const { f, llamadas } = fetchMock([yaHay([]), { ok: true }]);
    const r = await new DokployDeploy({ ...cfg, fetchImpl: f }).publish({ projectId: "p1", subdominio: "micafe" });
    expect(r).toEqual({ ok: true });
    expect(llamadas).toHaveLength(2);
    expect(JSON.parse(String(llamadas[1].init?.body))).toEqual({
      applicationId: "app-1", host: "micafe.estrenala.com", port: 3000,
      https: true, certificateType: "letsencrypt", domainType: "application",
    });
  });

  it("publicar dos veces NO duplica la ruta en Traefik", async () => {
    const { f, llamadas } = fetchMock([yaHay(["micafe.estrenala.com"])]);
    await new DokployDeploy({ ...cfg, fetchImpl: f }).publish({ projectId: "p1", subdominio: "micafe" });
    expect(llamadas).toHaveLength(1); // solo la consulta: no da de alta nada
  });

  it("despublicar retira SOLO ese host", async () => {
    const { f, llamadas } = fetchMock([
      yaHay(["micafe.estrenala.com", "otra.estrenala.com", "cliente.com"]),
      { ok: true },
    ]);
    await new DokployDeploy({ ...cfg, fetchImpl: f }).unpublish({ projectId: "p1", subdominio: "micafe" });
    expect(llamadas).toHaveLength(2);
    expect(JSON.parse(String(llamadas[1].init?.body))).toEqual({ domainId: "d0" });
  });

  it("el subdominio se compone con la base configurada, no con otra", async () => {
    const { f, llamadas } = fetchMock([yaHay([]), { ok: true }]);
    await new DokployDeploy({ ...cfg, sitesBaseDomain: "otrodominio.com", fetchImpl: f })
      .publish({ projectId: "p1", subdominio: "micafe" });
    expect(JSON.parse(String(llamadas[1].init?.body)).host).toBe("micafe.otrodominio.com");
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

// Con el comodín montado, registrar cada subdominio seguiría pidiendo un
// certificado por web: el cupo de 50/semana se gastaría igual y el comodín no
// ahorraría nada. Ver docs/COMODIN-CLOUDFLARE.md.
describe("DokployDeploy con el comodín encendido", () => {
  it("publicar ya NO da de alta el subdominio: no llama a Dokploy", async () => {
    const { f, llamadas } = fetchMock([]);
    const d = new DokployDeploy({ ...cfg, comodinSubdominios: true, fetchImpl: f });
    await expect(d.publish({ projectId: "p1", subdominio: "cafe" })).resolves.toEqual({ ok: true });
    expect(llamadas).toHaveLength(0);
  });

  it("pero los dominios propios de clientes se siguen registrando", async () => {
    const { f, llamadas } = fetchMock([yaHay([]), { ok: true }, { ok: true }]);
    const d = new DokployDeploy({ ...cfg, comodinSubdominios: true, fetchImpl: f });
    await d.connectDomain({ dominio: "cliente.com" });
    const creados = llamadas.filter((l) => l.url.includes("domain.create"));
    expect(creados).toHaveLength(2); // el pelado y su www
  });

  // Las webs publicadas ANTES de encender el comodín sí tienen su ruta dada de
  // alta; dejarla ahí renovaría para siempre el certificado de un sitio muerto.
  it("despublicar sigue limpiando la ruta que quedara de antes", async () => {
    const { f, llamadas } = fetchMock([yaHay(["cafe.estrenala.com"]), { ok: true }]);
    const d = new DokployDeploy({ ...cfg, comodinSubdominios: true, fetchImpl: f });
    await d.unpublish({ projectId: "p1", subdominio: "cafe" });
    expect(llamadas.some((l) => l.url.includes("domain.delete"))).toBe(true);
  });

  it("apagado, se comporta exactamente como siempre", async () => {
    const { f, llamadas } = fetchMock([yaHay([]), { ok: true }]);
    const d = new DokployDeploy({ ...cfg, fetchImpl: f });
    await d.publish({ projectId: "p1", subdominio: "cafe" });
    expect(llamadas.some((l) => l.url.includes("domain.create"))).toBe(true);
  });
});

describe("getDeploy", () => {
  it("default self-hosted; dokploy exige sus envs", async () => {
    const { getDeploy } = await import("@/src/publish/deploy-factory");
    expect(getDeploy().connectDomain).toBeTypeOf("function"); // no lanza sin envs (self)
  });
});
