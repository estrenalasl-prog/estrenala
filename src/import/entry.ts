import { ImportError } from "./unzip";

const profundidad = (p: string) => p.split("/").length;

export function detectarEntrada(paths: string[]): string {
  const htmls = paths.filter((p) => /\.html?$/i.test(p));
  if (htmls.length === 0) {
    throw new ImportError("No encontramos ninguna página HTML (.html) en lo que has subido");
  }
  const ordenar = (lista: string[]) =>
    [...lista].sort((a, b) => profundidad(a) - profundidad(b) || a.localeCompare(b));

  const indexes = ordenar(htmls.filter((p) => /(^|\/)index\.html?$/i.test(p)));
  if (indexes.length > 0) return indexes[0];
  return ordenar(htmls)[0];
}
