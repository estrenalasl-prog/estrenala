// Costura para el destino de despliegue. La impl. autoservida es no-op: el enrutado
// por Host ya sirve el puntero. La impl. Dokploy (producción) registra dominios
// propios en Traefik vía API para que emita sus certificados.
export interface DeployTarget {
  publish(input: { projectId: string; snapshotId: string; storagePrefix: string; subdominio: string }): Promise<{ ok: true }>;
  unpublish(input: { projectId: string; subdominio: string }): Promise<void>;
  connectDomain(input: { dominio: string }): Promise<void>;
  disconnectDomain(input: { dominio: string }): Promise<void>;
}

export const selfHostedDeploy: DeployTarget = {
  async publish() { return { ok: true }; },
  async unpublish() {},
  async connectDomain() {},
  async disconnectDomain() {},
};
