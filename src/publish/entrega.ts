import { createHash } from "node:crypto";
import { brotliCompressSync, gzipSync, constants } from "node:zlib";

/**
 * Lo último que le pasa a la respuesta antes de salir por el cable: comprimirla
 * y ponerle su ETag.
 *
 * Por qué existe: medido en producción el 4 de agosto de 2026, una web de
 * cliente salía con 37 KB de HTML, 41 de CSS y 27 de JS **sin comprimir**,
 * mientras nuestra propia landing sí iba con gzip. La diferencia es que la
 * landing la pinta Next —y Next comprime lo que pinta él— y la web del cliente
 * sale de un manejador de ruta devolviendo un Buffer, que Next no toca. Son
 * ~105 KB de texto que se quedan en unos 25.
 *
 * Y sin ETag, con `max-age=300`, a los cinco minutos el navegador se vuelve a
 * bajar el archivo ENTERO en vez de recibir un «no ha cambiado» sin cuerpo.
 *
 * Se hace aquí y no en el proxy a propósito: así vale igual esté detrás de lo
 * que esté, y se puede probar.
 */

/**
 * Qué se comprime.
 *
 * Un JPEG, un PNG o un woff2 YA están comprimidos: pasarlos por gzip gasta CPU
 * para dejarlos igual o un poco más grandes. Se mira el tipo, que es lo que
 * nosotros mismos hemos puesto (ver storage/content-type.ts), y no la extensión.
 */
const COMPRIMIBLE = /^(?:text\/|application\/(?:json|xml|javascript|manifest\+json)|image\/svg\+xml)/i;

/**
 * Por debajo de esto no merece la pena.
 *
 * Comprimir un archivo diminuto puede dejarlo MÁS grande (la cabecera del
 * formato ocupa), y en el mejor caso ahorra unos bytes a cambio de CPU en cada
 * visita. Mil bytes es el corte que usa medio mundo, incluido nginx.
 */
const MINIMO = 1024;

/**
 * Calidad 5 de brotli, no la 11 por defecto.
 *
 * La 11 comprime un poco más y tarda un orden de magnitud más: está pensada para
 * comprimir UNA vez y guardar el resultado, no para hacerlo en cada visita.
 * La 5 se acerca a gzip en tiempo y comprime bastante mejor.
 */
const CALIDAD_BROTLI = 5;

export type Codificacion = "br" | "gzip" | null;

/**
 * Qué acepta el cliente, por orden de preferencia NUESTRA.
 *
 * Se ignora el `q=` del cliente a propósito: casi nadie lo usa para esto, y
 * cuando lo usa es para desempatar entre dos que nos dan igual. Lo que no se
 * puede ignorar es `identity;q=0` o un `br;q=0`, que significan «esto NO».
 */
export function codificacionParaEl(accept: string | null): Codificacion {
  const cabecera = (accept ?? "").toLowerCase();
  const rechazado = (nombre: string) =>
    new RegExp(`(?:^|,)\\s*${nombre}\\s*;\\s*q=0(?:\\.0+)?\\s*(?:,|$)`).test(cabecera);
  const acepta = (nombre: string) => new RegExp(`(?:^|,)\\s*${nombre}\\b`).test(cabecera);

  if (acepta("br") && !rechazado("br")) return "br";
  if (acepta("gzip") && !rechazado("gzip")) return "gzip";
  return null;
}

export function sePuedeComprimir(contentType: string, tamano: number): boolean {
  return tamano >= MINIMO && COMPRIMIBLE.test(contentType.trim());
}

/**
 * El ETag de un cuerpo.
 *
 * Se calcula sobre los bytes que se van a servir DE VERDAD —ya con el sello, la
 * ficha y los formularios metidos—, no sobre lo guardado: dos webs con el mismo
 * archivo original pueden salir distintas según su plan o su dominio, y darles
 * el mismo ETag sería servirle a una lo de la otra desde una caché intermedia.
 *
 * Débil (`W/`) porque va antes de comprimir: la versión en gzip y la versión sin
 * comprimir son el mismo contenido pero no los mismos bytes, y `W/` es
 * exactamente lo que significa «el mismo contenido, quizá no byte a byte».
 */
export function etagDe(body: Buffer): string {
  return `W/"${createHash("sha1").update(body).digest("base64url")}"`;
}

/**
 * ¿El navegador ya tiene esta versión?
 *
 * `If-None-Match` puede traer varios ETags separados por comas, y `*` significa
 * «cualquiera que tengas». El `W/` se ignora al comparar, que es lo que manda la
 * norma para la comparación débil.
 */
export function yaLaTiene(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  const limpio = (s: string) => s.trim().replace(/^W\//, "");
  const tengo = limpio(etag);
  return ifNoneMatch.split(",").some((t) => t.trim() === "*" || limpio(t) === tengo);
}

export type Entregable = {
  body: Buffer | null; // null en un 304: no se manda cuerpo
  status: number;
  headers: Record<string, string>;
};

/**
 * Prepara la respuesta: ETag, 304 si procede, y compresión si toca.
 *
 * `vary` acumula lo que ya trajera la respuesta (la 404 pública manda
 * `Vary: Accept-Language`, y perderlo serviría la 404 en el idioma equivocado a
 * quien pillara la caché).
 */
export function prepararEntrega(input: {
  body: Buffer;
  status: number;
  contentType: string;
  headers: Record<string, string>;
  acceptEncoding: string | null;
  ifNoneMatch: string | null;
}): Entregable {
  const headers = { ...input.headers };

  // Solo se pone ETag en respuestas con contenido servible. En una redirección o
  // un error no significa nada, y en un 304 el ETag ya viaja aparte.
  const conCuerpo = input.status === 200;
  const etag = conCuerpo ? etagDe(input.body) : null;

  if (etag) {
    headers.etag = etag;
    if (yaLaTiene(input.ifNoneMatch, etag)) {
      // 304: sin cuerpo y sin cabeceras de cuerpo. El navegador se queda con lo
      // que ya tiene guardado.
      const { "content-type": _ct, ...resto } = headers;
      void _ct;
      return { body: null, status: 304, headers: resto };
    }
  }

  if (!conCuerpo || !sePuedeComprimir(input.contentType, input.body.length)) {
    return { body: input.body, status: input.status, headers };
  }

  const como = codificacionParaEl(input.acceptEncoding);
  if (!como) return { body: input.body, status: input.status, headers };

  const comprimido =
    como === "br"
      ? brotliCompressSync(input.body, {
          params: {
            [constants.BROTLI_PARAM_QUALITY]: CALIDAD_BROTLI,
            // Decirle cuánto mide de antemano le ahorra trabajo y comprime algo mejor.
            [constants.BROTLI_PARAM_SIZE_HINT]: input.body.length,
          },
        })
      : gzipSync(input.body, { level: 6 });

  // Si comprimir no ha servido de nada —pasa con texto ya muy denso—, se manda
  // el original: no tiene sentido gastarle al navegador una descompresión para
  // ahorrarle cero bytes.
  if (comprimido.length >= input.body.length) {
    return { body: input.body, status: input.status, headers };
  }

  headers["content-encoding"] = como;
  headers.vary = [headers.vary, "Accept-Encoding"].filter(Boolean).join(", ");
  return { body: comprimido, status: input.status, headers };
}
