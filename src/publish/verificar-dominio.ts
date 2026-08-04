// ¿Este dominio es de quien dice conectarlo?
//
// Antes no se comprobaba nada: bastaba escribir "elcorteingles.es" para que
// quedara reservado dentro de Estrénala —nadie más podía conectarlo— y para que
// se pidiera su certificado, gastando del cupo semanal de Let's Encrypt, que es
// COMPARTIDO por todos los clientes.
//
// Se acepta cualquiera de las dos pruebas:
//
//   1. El dominio ya apunta a nuestra IP (registro A). Es la normal: son los
//      mismos registros que la pantalla le pide poner ANTES de conectar, así
//      que no le añade ni un paso.
//   2. Un TXT en `_estrenala.<dominio>` con su token. Es la salida para quien
//      tenga el dominio detrás de un proxy (Cloudflare en naranja, por
//      ejemplo): ahí el registro A resuelve al proxy y nunca a nosotros, y sin
//      esta segunda vía le estaríamos bloqueando un dominio que sí es suyo.
//
// El token se DERIVA, no se guarda: sale de la clave maestra y del dominio, así
// que es siempre el mismo para ese dominio y no hace falta ninguna tabla.
import { createHmac } from "node:crypto";
import { esDominioRaiz } from "./domain";

export const SUBDOMINIO_TXT = "_estrenala";
export const PREFIJO_TXT = "estrenala-verificacion=";

/**
 * Lo mínimo de node:dns, inyectable para poder probarlo sin red.
 *
 * `resolve6` y `resolveNs` son opcionales a propósito: solo alimentan el
 * diagnóstico —lo que se le CUENTA al usuario—, nunca el permiso para conectar.
 * Un resolutor que no los traiga da un diagnóstico más pobre, no un error.
 */
export type Resolutor = {
  resolve4(host: string): Promise<string[]>;
  resolveTxt(host: string): Promise<string[][]>;
  resolve6?(host: string): Promise<string[]>;
  resolveNs?(host: string): Promise<string[]>;
};

/**
 * Algo que está mal en el DNS y que hay que contarle al usuario, aunque la
 * comprobación de propiedad haya salido bien.
 *
 * `ipv6` — registros AAAA que llevan a otro sitio. Es el fallo más silencioso de
 *   toda la mudanza de un dominio: con el registro A puesto bien, la web «va»
 *   desde el móvil del dueño y sigue enseñando la antigua desde su casa, porque
 *   casi todos los navegadores PREFIEREN IPv6 cuando existe. Peor aún: Let's
 *   Encrypt también lo prefiere, así que el certificado ni siquiera llega a
 *   emitirse. Por eso este estorbo BLOQUEA en vez de solo avisar — dejar pasar
 *   sería gastar cupo en un certificado que va a fallar.
 *
 * `www` — el dominio pelado apunta bien pero su `www` no. No bloquea: hay quien
 *   no lo quiere. Pero se avisa porque Traefik se queda pidiendo un certificado
 *   imposible cada pocos minutos, para siempre (pasó el 2026-08-01).
 */
export type Estorbo =
  | { tipo: "ipv6"; valores: string[] }
  | { tipo: "www"; apuntaA: string[] };

export type Veredicto =
  | { ok: true; via: "a" | "txt"; apuntaA: string[]; estorbos: Estorbo[]; proveedor: string | null }
  | { ok: false; motivo: "no-apunta" | "ipv6"; apuntaA: string[]; estorbos: Estorbo[]; proveedor: string | null };

/**
 * De quién son los servidores de nombres. Sirve para poder decirle «tus DNS
 * están en Hostinger» en vez de soltarle una lista de registros y que se busque
 * la vida: es la diferencia entre una pantalla que ayuda y una que acusa.
 *
 * Se mira el sufijo del nombre, que es lo estable. Ante la duda, `null` — es
 * mejor no decir nada que mandar a alguien al panel equivocado.
 */
const PROVEEDORES: [RegExp, string][] = [
  [/(^|\.)dns-parking\.com$/, "Hostinger"],
  [/(^|\.)hostinger\.com$/, "Hostinger"],
  [/(^|\.)cloudflare\.com$/, "Cloudflare"],
  [/(^|\.)domaincontrol\.com$/, "GoDaddy"],
  [/(^|\.)registrar-servers\.com$/, "Namecheap"],
  [/(^|\.)dondominio\.com$/, "DonDominio"],
  [/(^|\.)ui-dns\.(com|org|de|biz)$/, "IONOS"],
  [/(^|\.)ovh\.net$/, "OVH"],
  [/(^|\.)awsdns-\d+\.(com|net|org|co\.uk)$/, "AWS Route 53"],
  [/(^|\.)azure-dns\.(com|net|org|info)$/, "Azure"],
  [/(^|\.)googledomains\.com$/, "Google Domains"],
  [/(^|\.)squarespacedns\.com$/, "Squarespace"],
  [/(^|\.)wixdns\.net$/, "Wix"],
  [/(^|\.)vercel-dns\.com$/, "Vercel"],
  [/(^|\.)nsone\.net$/, "Netlify"],
  [/(^|\.)nominalia\.com$/, "Nominalia"],
  [/(^|\.)arsys\.(es|net)$/, "Arsys"],
  [/(^|\.)1and1\.(com|es)$/, "IONOS"],
];

export function proveedorDeNs(servidores: string[]): string | null {
  for (const ns of servidores) {
    const limpio = ns.trim().toLowerCase().replace(/\.$/, "");
    for (const [patron, nombre] of PROVEEDORES) if (patron.test(limpio)) return nombre;
  }
  return null;
}

/**
 * Token de verificación del dominio. Se deriva de la clave maestra con un
 * prefijo de contexto propio, para que no pueda confundirse con ningún otro uso
 * de esa clave. Sale en hexadecimal (los TXT viajan mejor sin símbolos raros).
 */
export function tokenDominio(dominio: string, secreto: string): string {
  return createHmac("sha256", secreto)
    .update(`verificacion-dominio:${dominio.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}

export function registroTxtEsperado(dominio: string, secreto: string): { nombre: string; valor: string } {
  return { nombre: `${SUBDOMINIO_TXT}.${dominio}`, valor: PREFIJO_TXT + tokenDominio(dominio, secreto) };
}

// Un fallo de DNS (NXDOMAIN, sin registros, timeout) NO es un error del
// programa: es la respuesta «todavía no». Se trata como lista vacía.
//
// Recibe una FUNCIÓN, no una promesa ya empezada, por dos razones: así también
// se traga un resolutor que reviente en el acto en vez de devolver una promesa
// rechazada, y así `resolve6?.()` puede no existir sin tener que preguntarlo
// fuera. Una consulta de DNS no puede tumbar la pantalla de conectar el dominio.
async function sinRuido<T>(f: () => Promise<T[]> | undefined): Promise<T[]> {
  try {
    return (await f()) ?? [];
  } catch {
    return [];
  }
}

export async function verificarDominio(
  resolutor: Resolutor,
  input: { dominio: string; ipDestino: string; secreto: string; ipv6Destino?: string }
): Promise<Veredicto> {
  const dominio = input.dominio.trim().toLowerCase();

  // Las tres preguntas van a la vez: son independientes y esto corre mientras
  // alguien espera mirando un botón.
  const [ips, ipv6, ns] = await Promise.all([
    sinRuido(() => resolutor.resolve4(dominio)),
    sinRuido(() => resolutor.resolve6?.(dominio)),
    sinRuido(() => resolutor.resolveNs?.(dominio)),
  ]);
  const proveedor = proveedorDeNs(ns);

  // IPv6 que no es nuestro. Si algún día servimos por IPv6, DNS_TARGET_IPV6 lo
  // declara y deja de contarse como estorbo.
  const ipv6Ajeno = ipv6.filter((v) => v !== (input.ipv6Destino ?? ""));

  if (ips.includes(input.ipDestino)) {
    if (ipv6Ajeno.length > 0) {
      return { ok: false, motivo: "ipv6", apuntaA: ips, estorbos: [{ tipo: "ipv6", valores: ipv6Ajeno }], proveedor };
    }
    // El `www` solo se mira en dominios pelados: en `blog.suempresa.com` no
    // existe `www.blog.suempresa.com` ni tiene por qué, y avisar de que falta
    // sería mandarle a crear un registro que no necesita.
    const estorbos: Estorbo[] = [];
    if (esDominioRaiz(dominio)) {
      const www = await sinRuido(() => resolutor.resolve4(`www.${dominio}`));
      if (!www.includes(input.ipDestino)) estorbos.push({ tipo: "www", apuntaA: www });
    }
    return { ok: true, via: "a", apuntaA: ips, estorbos, proveedor };
  }

  const esperado = PREFIJO_TXT + tokenDominio(dominio, input.secreto);
  const txt = await sinRuido(() => resolutor.resolveTxt(`${SUBDOMINIO_TXT}.${dominio}`));
  // Un TXT largo llega troceado en varias cadenas: hay que volver a juntarlas.
  if (txt.some((trozos) => trozos.join("").trim() === esperado)) {
    // Por aquí llega quien tiene el dominio detrás de un proxy. Sus AAAA son del
    // proxy y son legítimos: avisar de ellos sería mandarle a romper su propia
    // configuración.
    return { ok: true, via: "txt", apuntaA: ips, estorbos: [], proveedor };
  }

  return {
    ok: false, motivo: "no-apunta", apuntaA: ips, proveedor,
    estorbos: ipv6Ajeno.length > 0 ? [{ tipo: "ipv6", valores: ipv6Ajeno }] : [],
  };
}
