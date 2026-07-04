import { selfHostedDeploy, type DeployTarget } from "./deploy-target";
import { DokployDeploy } from "./dokploy";

let instancia: DeployTarget | null = null;

export function getDeploy(): DeployTarget {
  if (!instancia) {
    if (process.env.DEPLOY_TARGET === "dokploy") {
      const url = process.env.DOKPLOY_URL;
      const apiKey = process.env.DOKPLOY_API_KEY;
      const applicationId = process.env.DOKPLOY_APPLICATION_ID;
      if (!url || !apiKey || !applicationId) {
        throw new Error("DEPLOY_TARGET=dokploy requiere DOKPLOY_URL, DOKPLOY_API_KEY y DOKPLOY_APPLICATION_ID");
      }
      instancia = new DokployDeploy({ url: url.replace(/\/$/, ""), apiKey, applicationId });
    } else {
      instancia = selfHostedDeploy;
    }
  }
  return instancia;
}
