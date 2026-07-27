// Costura para el destino de despliegue. La impl. autoservida es no-op: el enrutado
// por Host ya sirve el puntero. La impl. Dokploy (producción) registra en Traefik
// vía API el subdominio de cada web y los dominios propios, para que emita sus
// certificados y sepa a dónde enrutar.
//
// `snapshotId` y `storagePrefix` son opcionales porque ninguna implementación los
// usa: los archivos ya están en el almacenamiento y la app los sirve. Se dejan
// declarados para un futuro destino que sí tenga que copiarlos, pero opcionales
// para que se pueda pedir «registra este subdominio» sin inventarse valores.
export interface DeployTarget {
  publish(input: { projectId: string; subdominio: string; snapshotId?: string; storagePrefix?: string }): Promise<{ ok: true }>;
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
