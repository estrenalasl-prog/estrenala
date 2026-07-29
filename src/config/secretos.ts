// Cifrado de los secretos que la plataforma guarda POR CUENTA AJENA: las claves
// de OpenRouter y SerpAPI que cada espacio pega en Configuración.
//
// No son datos nuestros: son credenciales de terceros con dinero detrás. Antes se
// guardaban en claro en `org_settings`, así que un volcado de la base las
// entregaba todas. Ahora van cifradas con AES-256-GCM (autenticado: si alguien
// toca el texto cifrado, descifrar falla en vez de devolver basura).
//
// Formato guardado, mismo estilo versionado que las contraseñas:
//   s1.<iv>.<etiqueta>.<cifrado>     (las tres partes en base64url)
//
// COMPATIBILIDAD: lo que no tenga ese formato se considera LEGADO EN CLARO y se
// devuelve tal cual. Así la migración puede ir por detrás sin romper a nadie.
//
// La clave maestra vive en SECRETS_KEY (32 bytes en base64). NUNCA se registra
// ni se devuelve por la API: aquí solo entran y salen valores, jamás se imprimen.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PREFIJO = "s1";
const IV_BYTES = 12; // el tamaño que recomienda GCM
const CLAVE_BYTES = 32; // AES-256

export class SecretoError extends Error {
  constructor(message: string) { super(message); }
}

export type Entorno = Record<string, string | undefined>;

const FORMATO = /^s1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;

/** ¿Este valor guardado ya está cifrado, o es legado en claro? */
export function estaCifrado(guardado: string): boolean {
  return FORMATO.test(guardado);
}

function claveMaestra(env: Entorno): Buffer {
  const b64 = (env.SECRETS_KEY ?? "").trim();
  if (!b64) {
    throw new SecretoError(
      "Falta SECRETS_KEY en el entorno: sin ella no se pueden guardar las claves de IA. " +
      "Genera una con: openssl rand -base64 32"
    );
  }
  const clave = Buffer.from(b64, "base64");
  if (clave.length !== CLAVE_BYTES) {
    throw new SecretoError(
      `SECRETS_KEY tiene ${clave.length} bytes y debe tener ${CLAVE_BYTES}. ` +
      "Genérala con: openssl rand -base64 32"
    );
  }
  return clave;
}

/** '' (sin clave configurada) se guarda como '' : no es un secreto que cifrar. */
export function cifrar(texto: string, env: Entorno = process.env): string {
  if (texto === "") return "";
  const iv = randomBytes(IV_BYTES);
  const cifrador = createCipheriv("aes-256-gcm", claveMaestra(env), iv);
  const cuerpo = Buffer.concat([cifrador.update(texto, "utf8"), cifrador.final()]);
  return [
    PREFIJO,
    iv.toString("base64url"),
    cifrador.getAuthTag().toString("base64url"),
    cuerpo.toString("base64url"),
  ].join(".");
}

export function descifrar(guardado: string, env: Entorno = process.env): string {
  if (guardado === "") return "";
  if (!estaCifrado(guardado)) return guardado; // legado en claro, aún sin migrar
  const [, iv, etiqueta, cuerpo] = guardado.split(".");
  try {
    const descifrador = createDecipheriv("aes-256-gcm", claveMaestra(env), Buffer.from(iv, "base64url"));
    descifrador.setAuthTag(Buffer.from(etiqueta, "base64url"));
    return Buffer.concat([
      descifrador.update(Buffer.from(cuerpo, "base64url")),
      descifrador.final(),
    ]).toString("utf8");
  } catch (e) {
    if (e instanceof SecretoError) throw e; // falta la clave: el mensaje ya es claro
    // Etiqueta que no cuadra: o el dato está corrupto, o SECRETS_KEY no es la
    // que cifró esto. Lo segundo pasa si se rota la clave sin recifrar.
    throw new SecretoError(
      "No se pudo descifrar una clave guardada. Si has cambiado SECRETS_KEY, " +
      "hay que volver a pegar las claves en Configuración."
    );
  }
}
