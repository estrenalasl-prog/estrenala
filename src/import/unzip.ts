import { unzipSync, type UnzipFileInfo } from "fflate";

export type ZipFile = { path: string; bytes: Buffer };

export class ImportError extends Error {}

const MAX_ARCHIVOS = 2000;
const MAX_BYTES = 50 * 1024 * 1024;

function esRutaInsegura(p: string): boolean {
  if (p.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(p)) return true;
  return p.split(/[\\/]/).includes("..");
}

function normalizarRaiz(files: ZipFile[]): ZipFile[] {
  if (files.length === 0) return files;
  const primerSeg = (p: string) => p.split("/")[0];
  const comun = primerSeg(files[0].path);
  const todosComparten =
    comun !== "" &&
    files.every((f) => f.path.startsWith(comun + "/"));
  if (!todosComparten) return files;
  return files.map((f) => ({ ...f, path: f.path.slice(comun.length + 1) }));
}

// Valida y normaliza una lista de archivos venga de donde venga: de un ZIP o de
// una carpeta / archivos sueltos que el usuario arrastra. Mismas reglas para
// todos (zip-slip, límites, raíz envolvente) → una sola frontera de seguridad.
export function sanearArchivos(entrada: ZipFile[]): ZipFile[] {
  const files: ZipFile[] = [];
  let total = 0;
  for (const f of entrada) {
    const posix = f.path.split("\\").join("/");
    if (posix.endsWith("/")) continue; // carpeta
    if (esRutaInsegura(posix)) {
      throw new ImportError(`Ruta no permitida: "${f.path}"`);
    }
    total += f.bytes.length;
    if (files.length + 1 > MAX_ARCHIVOS) {
      throw new ImportError(`Son demasiados archivos (máximo ${MAX_ARCHIVOS})`);
    }
    if (total > MAX_BYTES) {
      throw new ImportError("Lo que has subido supera 50 MB");
    }
    files.push({ path: posix, bytes: f.bytes });
  }
  if (files.length === 0) throw new ImportError("No hay ningún archivo que subir");
  return normalizarRaiz(files);
}

/**
 * El portero: mira lo que un archivo DICE que va a ocupar antes de descomprimirlo.
 *
 * Sin esto, el límite de 50 MB llegaba tarde. `unzipSync` descomprime el ZIP
 * entero en memoria y solo DESPUÉS contaba `sanearArchivos`, así que un ZIP
 * pequeño con mucho aire dentro —250 KB de ceros comprimidos son 250 MB al
 * abrirlos— ya se había gastado la memoria cuando se le decía que no. Medido el
 * 2026-09-03: 250 KB de subida hacían pasar el proceso de 329 MB a 828 MB de RSS
 * antes de rechazarlo. En un VPS de 4 GB, con seis a la vez el servidor se cae.
 *
 * El tamaño lo declara el propio ZIP, así que se puede consultar sin descomprimir
 * nada. Rechazando en cuanto la SUMA declarada pasa del límite, lo que se llega a
 * descomprimir nunca supera el presupuesto que ya teníamos.
 *
 * Y si el ZIP miente o no declara nada (`originalSize` a cero, que pasa con los
 * que traen descriptor de datos), esto deja pasar y el conteo de bytes REALES de
 * `sanearArchivos` sigue detrás como estaba. Son dos redes, no una sustitución.
 */
function portero(): (f: UnzipFileInfo) => boolean {
  let declarado = 0;
  let cuantos = 0;
  return (f) => {
    if (f.name.endsWith("/")) return false; // carpeta: no hay nada que descomprimir
    cuantos++;
    if (cuantos > MAX_ARCHIVOS) {
      throw new ImportError(`Son demasiados archivos (máximo ${MAX_ARCHIVOS})`);
    }
    declarado += f.originalSize;
    if (declarado > MAX_BYTES) {
      throw new ImportError("Lo que has subido supera 50 MB");
    }
    return true;
  };
}

export function unzipSafe(zip: Buffer): ZipFile[] {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(zip), { filter: portero() });
  } catch (e) {
    // Lo que lanza el portero ya explica qué pasa: no se puede convertir en «no
    // es un ZIP válido», porque sí lo era — es que no cabe.
    if (e instanceof ImportError) throw e;
    // fflate lanza un Error crudo ("invalid zip data") ante bytes que no son un
    // ZIP; lo convertimos en ImportError para que las rutas respondan 400 y no 500.
    throw new ImportError("El archivo no es un ZIP válido");
  }
  return sanearArchivos(
    Object.entries(entries)
      .filter(([nombre]) => !nombre.endsWith("/"))
      .map(([nombre, data]) => ({ path: nombre, bytes: Buffer.from(data) }))
  );
}
