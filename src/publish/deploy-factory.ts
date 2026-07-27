import { selfHostedDeploy, type DeployTarget } from "./deploy-target";
import { DokployDeploy } from "./dokploy";

let instancia: DeployTarget | null = null;

export function getDeploy(): DeployTarget {
  if (!instancia) {
    if (process.env.DEPLOY_TARGET === "dokploy") {
      const url = process.env.DOKPLOY_URL;
      const apiKey = process.env.DOKPLOY_API_KEY;
      const applicationId = process.env.DOKPLOY_APPLICATION_ID;
      // La base de los subdominios es la MISMA que usa el enrutado público, para
      // que el host que se registra en Traefik y el que resuelve la petición no
      // puedan discrepar.
      const sitesBaseDomain = process.env.SITES_BASE_DOMAIN ?? process.env.PLATFORM_HOST;
      if (!url || !apiKey || !applicationId || !sitesBaseDomain) {
        throw new Error(
          "DEPLOY_TARGET=dokploy requiere DOKPLOY_URL, DOKPLOY_API_KEY, DOKPLOY_APPLICATION_ID y SITES_BASE_DOMAIN"
        );
      }
      instancia = new DokployDeploy({ url: url.replace(/\/$/, ""), apiKey, applicationId, sitesBaseDomain });
    } else {
      instancia = selfHostedDeploy;
    }
  }
  return instancia;
}
