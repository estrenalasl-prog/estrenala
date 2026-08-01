export type HostInfo =
  | { tipo: "plataforma" }
  | { tipo: "raiz" }
  | { tipo: "subdominio"; valor: string }
  | { tipo: "dominio"; valor: string }
  | { tipo: "desconocido" };

/**
 * ¿Es este Host otro dominio NUESTRO que debe llevar al principal?
 *
 * Estrénala también tiene `estrenala.es`, y en España es lo que teclea media
 * España al oír el nombre. Su DNS ya apunta al VPS, así que sin esto la petición
 * llega, `parseHost` la toma por el dominio propio de un cliente y acaba en la
 * 404 pública — peor que no tener el dominio.
 *
 * Va por variable de entorno y no a fuego para que valga para el siguiente que
 * se compre, y para que en desarrollo no exista ninguno.
 *
 * `www.` se reconoce solo: listar `estrenala.es` cubre también
 * `www.estrenala.es`, que es justo el que a uno se le olvida.
 *
 * OJO: esto solo redirige lo que YA llega. Para que llegue, el dominio tiene que
 * estar dado de alta en Dokploy (ruta + certificado en Traefik); si no, el
 * navegador ni siquiera completa el handshake TLS.
 */
export function esAliasDePlataforma(hostRaw: string, listaRaw: string | undefined): boolean {
  const host = (hostRaw ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (!host) return false;
  const alias = new Set(
    (listaRaw ?? "")
      .split(",")
      .map((h) => h.trim().toLowerCase().replace(/\.$/, ""))
      .filter(Boolean)
  );
  if (alias.size === 0) return false;
  if (alias.has(host)) return true;
  return host.startsWith("www.") && alias.has(host.slice(4));
}

// Clasifica el Host de una petición.
// - `platformHost`: autoridad completa del PANEL (con puerto en dev, p. ej.
//   "localhost:3000"; en producción "app.PLATAFORMA.com").
// - `sitesBaseDomain`: base de los subdominios de sitios publicados. En dev no se
//   define y coincide con platformHost; en producción es "PLATAFORMA.com".
export function parseHost(
  hostRaw: string,
  platformHost: string,
  sitesBaseDomain: string = platformHost
): HostInfo {
  const host = (hostRaw ?? "").trim().toLowerCase();
  const plat = platformHost.trim().toLowerCase();
  const base = sitesBaseDomain.trim().toLowerCase();
  if (!host) return { tipo: "desconocido" };
  if (host === plat) return { tipo: "plataforma" };

  const sinPuerto = host.replace(/:\d+$/, "");
  // Loopback directo (127.0.0.1, ::1) = la plataforma en dev.
  if (sinPuerto === "127.0.0.1" || sinPuerto === "::1" || sinPuerto === "[::1]") {
    return { tipo: "plataforma" };
  }

  // La raíz del dominio madre (solo existe como caso distinto en producción).
  if (host === base) return { tipo: "raiz" };

  if (host.endsWith("." + base)) {
    const sub = host.slice(0, host.length - base.length - 1);
    if (!sub || sub.includes(".") || !/^[a-z0-9-]+$/.test(sub)) return { tipo: "desconocido" };
    return { tipo: "subdominio", valor: sub };
  }

  if (!/^[a-z0-9.-]+$/.test(sinPuerto) || sinPuerto.includes("..")) return { tipo: "desconocido" };
  return { tipo: "dominio", valor: sinPuerto };
}
