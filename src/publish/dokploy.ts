import type { DeployTarget } from "./deploy-target";

type DokployConfig = {
  url: string;             // p. ej. "https://dok.example" (sin barra final)
  apiKey: string;
  applicationId: string;   // id de la app Wordclicks dentro de Dokploy
  sitesBaseDomain: string; // base de los subdominios publicados, p. ej. "estrenala.com"
  appPort?: number;        // puerto interno de la app (default 3000)
  fetchImpl?: typeof fetch;
};

type DokployDomain = { domainId: string; host: string };

// Registra en el Traefik del VPS, vía la API REST de Dokploy, TODOS los hosts que
// tiene que atender la plataforma: el subdominio de cada web publicada y los
// dominios propios de los clientes. Traefik crea la ruta y emite el certificado
// de Let's Encrypt (reto HTTP-01).
//
// Por qué también los subdominios: sin una ruta que case con el Host, Traefik ni
// siquiera entrega la petición a la aplicación. No es solo el certificado, es el
// enrutado. La alternativa era un certificado comodín, que exige el reto DNS-01 y
// mover el DNS a un proveedor con API; se descartó el 2026-07-27 para no tocar el
// Traefik donde ya corre producción de Quantiva (el CRM y los agentes).
//
// Coste a tener presente: Let's Encrypt limita a 50 certificados NUEVOS por semana
// y dominio registrado, o sea 50 webs nuevas por semana. Las renovaciones no
// cuentan. El día que se quede corto, toca migrar al comodín.
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

  private async listar(): Promise<DokployDomain[]> {
    const res = await this.f(
      `${this.cfg.url}/api/domain.byApplicationId?applicationId=${encodeURIComponent(this.cfg.applicationId)}`,
      { headers: { "x-api-key": this.cfg.apiKey } }
    );
    if (!res.ok) throw new Error(`Dokploy domain.byApplicationId → ${res.status}`);
    return (await res.json()) as DokployDomain[];
  }

  // Alta IDEMPOTENTE: publicar dos veces es de lo más normal (cada vez que el
  // usuario pulsa «Publicar»), y dar de alta un host repetido dejaría rutas
  // duplicadas en Traefik.
  private async alta(hosts: string[]): Promise<void> {
    const ya = new Set((await this.listar()).map((d) => d.host));
    for (const host of hosts.filter((h) => !ya.has(h))) {
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

  private async baja(hosts: string[]): Promise<void> {
    const objetivo = new Set(hosts);
    for (const d of (await this.listar()).filter((x) => objetivo.has(x.host))) {
      await this.post("domain.delete", { domainId: d.domainId });
    }
  }

  private hostDe(subdominio: string): string {
    return `${subdominio}.${this.cfg.sitesBaseDomain}`;
  }

  async publish(input: { projectId: string; subdominio: string }) {
    await this.alta([this.hostDe(input.subdominio)]);
    return { ok: true } as const;
  }

  async unpublish(input: { projectId: string; subdominio: string }): Promise<void> {
    await this.baja([this.hostDe(input.subdominio)]);
  }

  async connectDomain({ dominio }: { dominio: string }): Promise<void> {
    await this.alta([dominio, `www.${dominio}`]);
  }

  async disconnectDomain({ dominio }: { dominio: string }): Promise<void> {
    await this.baja([dominio, `www.${dominio}`]);
  }
}
