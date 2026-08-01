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

// Sufijos públicos de dos etiquetas. NO es la lista completa (son miles y cambia
// cada mes): es la de los dominios que se compran de verdad. Errar aquí no rompe
// nada visible — solo decide si se registra además el `www.`.
const SUFIJOS_DOBLES = new Set([
  "co.uk", "org.uk", "me.uk", "net.uk", "ac.uk", "gov.uk",
  "com.es", "org.es", "nom.es", "gob.es", "edu.es",
  "com.ar", "com.mx", "com.br", "com.co", "com.pe", "com.cl", "com.uy",
  "com.ve", "com.ec", "com.py", "com.bo", "com.do", "com.gt", "com.pa",
  "com.au", "net.au", "org.au", "co.nz", "co.za",
  "co.jp", "co.kr", "co.in", "co.il", "com.cn", "com.hk", "com.sg",
  "com.tr", "com.pl", "com.ua", "com.pt", "com.my", "com.tw",
]);

// ¿Es el dominio pelado del cliente (`suempresa.com`) o algo colgado de él
// (`web.suempresa.com`)? Solo al pelado le pone la gente un `www.` delante.
//
// `suempresa.co.uk` tiene tres etiquetas y sigue siendo pelado: por eso hace
// falta la lista, y no vale con contar puntos.
export function esDominioRaiz(d: string): boolean {
  const partes = d.split(".");
  if (partes.length <= 2) return true;
  return partes.length === 3 && SUFIJOS_DOBLES.has(partes.slice(-2).join("."));
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
