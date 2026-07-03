// Costura para hosts externos (Cloudflare Pages, Vercel…): otra impl. copiaría los
// archivos fuera. La autoservida es no-op: el enrutado por Host ya sirve el puntero.
export interface DeployTarget {
  publish(input: { projectId: string; snapshotId: string; storagePrefix: string; subdominio: string }): Promise<{ ok: true }>;
  unpublish(input: { projectId: string; subdominio: string }): Promise<void>;
}

export const selfHostedDeploy: DeployTarget = {
  async publish() { return { ok: true }; },
  async unpublish() {},
};
