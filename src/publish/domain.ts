// Reglas del dominio propio de un proyecto. Se guarda siempre "pelado" (sin www.):
// el serving redirige www → pelado (resolve-site).
const RE_DOMINIO = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

export function normalizarDominio(input: string): string {
  let d = input.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "");
  d = d.replace(/[/?#].*$/, ""); // quita ruta, query o fragmento
  d = d.replace(/\.$/, "");      // punto final DNS
  if (d.startsWith("www.")) d = d.slice(4);
  return d;
}

export function formatoDominioValido(d: string): boolean {
  return RE_DOMINIO.test(d);
}

// Un proyecto no puede reclamar el dominio de la propia plataforma ni nada bajo él
// (secuestraría el panel o los subdominios de otros proyectos).
export function dominioProhibido(d: string, platformHost: string, sitesBaseDomain: string): boolean {
  const plat = platformHost.trim().toLowerCase().replace(/:\d+$/, "");
  const base = sitesBaseDomain.trim().toLowerCase().replace(/:\d+$/, "");
  for (const raiz of [plat, base]) {
    if (!raiz) continue;
    if (d === raiz || d.endsWith("." + raiz)) return true;
  }
  return false;
}
