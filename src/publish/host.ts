export type HostInfo =
  | { tipo: "plataforma" }
  | { tipo: "subdominio"; valor: string }
  | { tipo: "dominio"; valor: string }
  | { tipo: "desconocido" };

// Clasifica el Host de una petición. `platformHost` es la autoridad completa de la
// plataforma (con puerto en dev, p. ej. "localhost:3000").
export function parseHost(hostRaw: string, platformHost: string): HostInfo {
  const host = (hostRaw ?? "").trim().toLowerCase();
  const plat = platformHost.trim().toLowerCase();
  if (!host) return { tipo: "desconocido" };
  if (host === plat) return { tipo: "plataforma" };

  const sinPuerto = host.replace(/:\d+$/, "");
  // Loopback directo (127.0.0.1, ::1) = la plataforma en dev.
  if (sinPuerto === "127.0.0.1" || sinPuerto === "::1" || sinPuerto === "[::1]") {
    return { tipo: "plataforma" };
  }

  if (host.endsWith("." + plat)) {
    const sub = host.slice(0, host.length - plat.length - 1);
    if (!sub || sub.includes(".") || !/^[a-z0-9-]+$/.test(sub)) return { tipo: "desconocido" };
    return { tipo: "subdominio", valor: sub };
  }

  if (!/^[a-z0-9.-]+$/.test(sinPuerto) || sinPuerto.includes("..")) return { tipo: "desconocido" };
  return { tipo: "dominio", valor: sinPuerto };
}
