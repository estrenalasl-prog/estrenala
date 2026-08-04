import { zipSync } from "fflate";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

/**
 * «Descargar mi web»: la instantánea actual, entera, en un ZIP.
 *
 * Es la otra mitad de la promesa «Estrénala no te encierra». La primera mitad
 * ya existía —subir un ZIP nuevo desde tu propia herramienta—, pero sin esta el
 * camino era de ida: tras meses editando aquí (páginas, imágenes, artículos del
 * blog), la versión al día solo vivía en nuestro servidor. Un candado con buenas
 * intenciones sigue siendo un candado.
 *
 * Se empaqueta la instantánea ACTUAL y basta, porque es autocontenida: al
 * guardar una edición las imágenes subidas se copian dentro (wc-uploads/, ver
 * preview/rewrite.ts) y los artículos del blog se materializan como archivos
 * (blog/apply.ts pasa por crearSnapshotEditado). Lo que se descarga es lo mismo
 * que se serviría publicado — sin el sello ni la ficha, que se añaden al servir
 * y no son suyos, son nuestros.
 */
export async function empaquetarWeb(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string }
): Promise<{ zip: Buffer; nombreArchivo: string } | null> {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) return null;
  const snap = await deps.store.getCurrentSnapshot(input.orgId, input.projectId);
  if (!snap) return null;

  const claves = (await deps.storage.list(snap.storagePrefix)).sort();
  const archivos: Record<string, Uint8Array> = {};
  for (const clave of claves) {
    const f = await deps.storage.get(clave);
    if (!f) continue; // desapareció entre el listado y la lectura: no tumba la descarga
    archivos[clave.slice(snap.storagePrefix.length)] = new Uint8Array(f.body);
  }
  if (Object.keys(archivos).length === 0) return null;

  return {
    zip: Buffer.from(zipSync(archivos)),
    nombreArchivo: `${nombreParaArchivo(project.nombre)}.zip`,
  };
}

/**
 * Del nombre del proyecto al nombre del archivo.
 *
 * Solo ascii y guiones, porque va dentro de la cabecera Content-Disposition
 * entre comillas: un acento o unas comillas ahí dentro es, según el navegador,
 * un nombre roto o una cabecera malformada. «Café Miró» → «cafe-miro.zip».
 */
export function nombreParaArchivo(nombre: string): string {
  const limpio = nombre
    .normalize("NFD")
    // El rango son los acentos combinantes (U+0300–U+036F), que NFD acaba de
    // separar de sus letras: se quitan ellos y la letra base se queda.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return limpio || "mi-web";
}
