import type { StorageAdapter } from "@/src/storage/types";
import { examinarSitio, type ExamenSitio } from "@/src/seo/examen";
import { esVerificacion, pareceUnaPagina } from "@/src/seo/paginas";

/**
 * Examina la web de un proyecto leyendo sus páginas del almacenamiento.
 *
 * Aquí está la única parte cara del examen —leer archivos—, y por eso está
 * separada del motor, que es puro.
 */

/**
 * Cuántas páginas se miran como mucho.
 *
 * Un blog con doscientos artículos serían doscientas lecturas cada vez que
 * alguien abre su panel. Y no hace falta: los fallos de una web hecha con IA
 * vienen de la plantilla, así que se repiten. Con veinticinco páginas la foto ya
 * es la misma, y se le dice claramente cuántas se han mirado de cuántas hay para
 * no dar por examinado lo que no se ha examinado.
 */
export const MAX_PAGINAS = 25;

/**
 * Lo examinado, por instantánea.
 *
 * Se puede cachear sin miedo porque el editor NO modifica una instantánea: cada
 * guardado copia todo a una nueva (ver crearSnapshotEditado). Así que un id de
 * instantánea identifica un contenido concreto para siempre, y esta caché no
 * puede quedarse rancia — solo vacía cuando se reinicia el servidor.
 */
const cache = new Map<string, ExamenSitio>();

/** Para los tests, y por si algún día hace falta forzar el recálculo. */
export function olvidarExamenes(): void {
  cache.clear();
}

/**
 * Qué páginas se miran, y en qué orden.
 *
 * El orden importa SOLO cuando hay más de `MAX_PAGINAS`: entonces decide cuáles
 * se quedan fuera. Primero la portada, y luego las de menos profundidad, que son
 * las que el visitante ve antes y las que Google mira primero. Un blog de
 * doscientos artículos no puede empujar fuera del examen a la página de contacto.
 */
export function paginasAExaminar(claves: string[], prefijo: string, entryPath: string): string[] {
  const rels = claves
    .map((k) => (k.startsWith(prefijo) ? k.slice(prefijo.length) : k))
    .filter((rel) => /\.html?$/i.test(rel))
    // Los que empiezan por "_" son trozos de plantilla, no páginas que nadie
    // visite sueltas. Mismo criterio que el sitemap.
    .filter((rel) => !rel.split("/").some((t) => t.startsWith("_")))
    // Y los archivos de verificación de los buscadores, que tampoco son páginas.
    .filter((rel) => !esVerificacion(rel));

  return rels.sort((a, b) => {
    if (a === entryPath) return -1;
    if (b === entryPath) return 1;
    const pa = a.split("/").length, pb = b.split("/").length;
    return pa !== pb ? pa - pb : a.localeCompare(b);
  });
}

export async function examinarProyecto(
  storage: StorageAdapter,
  input: { snapshotId: string; storagePrefix: string; entryPath: string }
): Promise<ExamenSitio> {
  const guardado = cache.get(input.snapshotId);
  if (guardado) return guardado;

  const claves = await storage.list(input.storagePrefix);
  const todas = paginasAExaminar(claves, input.storagePrefix, input.entryPath);

  const paginas: { ruta: string; html: string }[] = [];
  // Los que se descartan al abrirlos no cuentan como páginas del sitio: si
  // contaran, diría «1 de 6 páginas» de una web que tiene cinco.
  let noEranPaginas = 0;
  for (const rel of todas.slice(0, MAX_PAGINAS)) {
    const f = await storage.get(input.storagePrefix + rel);
    // Un archivo que está en la lista pero no se puede leer no es motivo para
    // dejar sin examen las otras veinticuatro páginas.
    if (!f) continue;
    const html = f.body.toString("utf-8");
    if (!pareceUnaPagina(html)) { noEranPaginas++; continue; }
    paginas.push({ ruta: rel, html });
  }

  // Cuánto ocupa cada archivo, para poder decirle lo que pesa su web. Va en
  // rutas RELATIVAS al snapshot, que es como las escribe él dentro del HTML.
  //
  // Es opcional en el adaptador (ver storage/types.ts): si el driver no sabe
  // medir, el examen sencillamente no habla del peso. Mejor callar que estimar.
  let bytes: Map<string, number> | undefined;
  if (storage.tamanos) {
    try {
      const crudos = await storage.tamanos(input.storagePrefix);
      bytes = new Map([...crudos].map(([k, n]) => [k.slice(input.storagePrefix.length), n]));
    } catch {
      // Medir es un extra. Que falle no puede dejar sin examen todo lo demás.
    }
  }

  const examen = examinarSitio({
    paginas, totales: todas.length - noEranPaginas, portada: input.entryPath, bytes,
  });
  cache.set(input.snapshotId, examen);
  return examen;
}
