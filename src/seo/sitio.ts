import type { StorageAdapter } from "@/src/storage/types";
import { examinarSitio, type ExamenSitio } from "@/src/seo/examen";

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
    .filter((rel) => !rel.split("/").some((t) => t.startsWith("_")));

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
  for (const rel of todas.slice(0, MAX_PAGINAS)) {
    const f = await storage.get(input.storagePrefix + rel);
    // Un archivo que está en la lista pero no se puede leer no es motivo para
    // dejar sin examen las otras veinticuatro páginas.
    if (f) paginas.push({ ruta: rel, html: f.body.toString("utf-8") });
  }

  const examen = examinarSitio({ paginas, totales: todas.length, portada: input.entryPath });
  cache.set(input.snapshotId, examen);
  return examen;
}
