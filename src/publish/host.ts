export type HostInfo =
  | { tipo: "plataforma" }
  | { tipo: "raiz" }
  | { tipo: "subdominio"; valor: string }
  | { tipo: "dominio"; valor: string }
  | { tipo: "desconocido" };

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
