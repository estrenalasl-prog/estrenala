import { promises as dns } from "node:dns";
import { verificarDominio, type Resolutor } from "./verificar-dominio";
import type { VerificarDominio } from "./publish-site";

// Arma el verificador con el DNS de verdad.
//
// Devuelve `undefined` —o sea, «no verifiques»— cuando no hay DNS_TARGET_IP.
// Eso es exactamente el caso del desarrollo local y del destino autoservido: no
// hay ninguna IP pública a la que apuntar, así que ninguna comprobación podría
// pasar jamás y nadie podría conectar un dominio ni para probar. En producción
// la variable está puesta (es la IP que la propia pantalla enseña al cliente),
// y entonces la comprobación es obligatoria.
export function getVerificarDominio(env: NodeJS.ProcessEnv = process.env): VerificarDominio | undefined {
  const ipDestino = (env.DNS_TARGET_IP ?? "").trim();
  const secreto = (env.SECRETS_KEY ?? "").trim();
  // Vacía mientras la plataforma solo se sirva por IPv4. En cuanto se declare,
  // los AAAA que apunten ahí dejan de contarse como estorbo.
  const ipv6Destino = (env.DNS_TARGET_IPV6 ?? "").trim() || undefined;
  if (!ipDestino) return undefined;
  return (dominio: string) => verificarDominio(dns as Resolutor, { dominio, ipDestino, secreto, ipv6Destino });
}
