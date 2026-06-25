import { unzipSync } from "fflate";

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

export function unzipSafe(zip: Buffer): ZipFile[] {
  const entries = unzipSync(new Uint8Array(zip));
  const files: ZipFile[] = [];
  let total = 0;
  for (const [nombre, data] of Object.entries(entries)) {
    if (nombre.endsWith("/")) continue; // carpeta
    const posix = nombre.split("\\").join("/");
    if (esRutaInsegura(posix)) {
      throw new ImportError(`Ruta no permitida en el ZIP: "${nombre}"`);
    }
    total += data.length;
    if (files.length + 1 > MAX_ARCHIVOS) {
      throw new ImportError(`El ZIP supera el máximo de ${MAX_ARCHIVOS} archivos`);
    }
    if (total > MAX_BYTES) {
      throw new ImportError("El ZIP descomprimido supera 50 MB");
    }
    files.push({ path: posix, bytes: Buffer.from(data) });
  }
  if (files.length === 0) throw new ImportError("El ZIP está vacío");
  return normalizarRaiz(files);
}
