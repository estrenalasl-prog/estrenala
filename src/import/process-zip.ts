import { unzipSafe, type ZipFile } from "./unzip";
import { filtrarSeguros } from "./validate";
import { detectarEntrada } from "./entry";

export function processZip(zip: Buffer): {
  files: ZipFile[];
  entryPath: string;
  ignorados: string[];
} {
  const todos = unzipSafe(zip);
  const { seguros, ignorados } = filtrarSeguros(todos);
  const entryPath = detectarEntrada(seguros.map((f) => f.path));
  return { files: seguros, entryPath, ignorados };
}
