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

export const SUBDOMINIO_TXT = "_estrenala";
export const PREFIJO_TXT = "estrenala-verificacion=";

/** Lo mínimo de node:dns, inyectable para poder probarlo sin red. */
export type Resolutor = {
  resolve4(host: string): Promise<string[]>;
  resolveTxt(host: string): Promise<string[][]>;
};

export type Veredicto =
  | { ok: true; via: "a" | "txt" }
  | { ok: false; motivo: "no-apunta"; apuntaA: string[] };

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
async function sinRuido<T>(p: Promise<T[]>): Promise<T[]> {
  try {
    return await p;
  } catch {
    return [];
  }
}

export async function verificarDominio(
  resolutor: Resolutor,
  input: { dominio: string; ipDestino: string; secreto: string }
): Promise<Veredicto> {
  const dominio = input.dominio.trim().toLowerCase();

  const ips = await sinRuido(resolutor.resolve4(dominio));
  if (ips.includes(input.ipDestino)) return { ok: true, via: "a" };

  const esperado = PREFIJO_TXT + tokenDominio(dominio, input.secreto);
  const txt = await sinRuido(resolutor.resolveTxt(`${SUBDOMINIO_TXT}.${dominio}`));
  // Un TXT largo llega troceado en varias cadenas: hay que volver a juntarlas.
  if (txt.some((trozos) => trozos.join("").trim() === esperado)) return { ok: true, via: "txt" };

  return { ok: false, motivo: "no-apunta", apuntaA: ips };
}
