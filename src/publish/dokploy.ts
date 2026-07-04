import type { DeployTarget } from "./deploy-target";

type DokployConfig = {
  url: string;           // p. ej. "https://dok.example" (sin barra final)
  apiKey: string;
  applicationId: string; // id de la app Wordclicks dentro de Dokploy
  appPort?: number;      // puerto interno de la app (default 3000)
  fetchImpl?: typeof fetch;
};

type DokployDomain = { domainId: string; host: string };

// Registra dominios propios de clientes en el Traefik del VPS vía la API REST de
// Dokploy: Traefik crea la ruta y emite el certificado Let's Encrypt (HTTP-01).
// Los subdominios *.PLATAFORMA.com NO pasan por aquí: los cubre el certificado
// wildcard configurado una vez en Traefik.
export class DokployDeploy implements DeployTarget {
  private f: typeof fetch;
  constructor(private cfg: DokployConfig) {
    this.f = cfg.fetchImpl ?? fetch;
  }

  private async post(ruta: string, body: unknown): Promise<void> {
    const res = await this.f(`${this.cfg.url}/api/${ruta}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": this.cfg.apiKey },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Dokploy ${ruta} → ${res.status}`);
  }

  async publish() { return { ok: true } as const; }
  async unpublish() {}

  async connectDomain({ dominio }: { dominio: string }): Promise<void> {
    for (const host of [dominio, `www.${dominio}`]) {
      await this.post("domain.create", {
        applicationId: this.cfg.applicationId,
        host,
        port: this.cfg.appPort ?? 3000,
        https: true,
        certificateType: "letsencrypt",
        domainType: "application",
      });
    }
  }

  async disconnectDomain({ dominio }: { dominio: string }): Promise<void> {
    const res = await this.f(
      `${this.cfg.url}/api/domain.byApplicationId?applicationId=${encodeURIComponent(this.cfg.applicationId)}`,
      { headers: { "x-api-key": this.cfg.apiKey } }
    );
    if (!res.ok) throw new Error(`Dokploy domain.byApplicationId → ${res.status}`);
    const dominios = (await res.json()) as DokployDomain[];
    const objetivo = new Set([dominio, `www.${dominio}`]);
    for (const d of dominios.filter((x) => objetivo.has(x.host))) {
      await this.post("domain.delete", { domainId: d.domainId });
    }
  }
}
