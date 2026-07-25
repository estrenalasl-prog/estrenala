import { unzipSafe, sanearArchivos, type ZipFile } from "./unzip";
import { filtrarSeguros } from "./validate";
import { detectarEntrada } from "./entry";

type Procesado = { files: ZipFile[]; entryPath: string; ignorados: string[] };

// Segunda mitad común: filtrar extensiones y elegir la página de entrada. La
// entrada ya viene saneada (rutas, límites, raíz envolvente) — OJO: sanear dos
// veces se comería dos niveles de carpeta, por eso cada vía sanea UNA sola vez.
function completar(todos: ZipFile[]): Procesado {
  const { seguros, ignorados } = filtrarSeguros(todos);
  const entryPath = detectarEntrada(seguros.map((f) => f.path));
  return { files: seguros, entryPath, ignorados };
}

// Archivos ya listos (carpeta arrastrada, .html suelto): mismo saneado y reglas
// que un ZIP.
export function processFiles(entrada: ZipFile[]): Procesado {
  return completar(sanearArchivos(entrada));
}

export function processZip(zip: Buffer): Procesado {
  return completar(unzipSafe(zip)); // unzipSafe ya sanea
}
