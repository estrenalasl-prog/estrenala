export interface StorageAdapter {
  put(key: string, body: Buffer | string, contentType?: string): Promise<void>;
  get(key: string): Promise<{ body: Buffer; contentType: string } | null>;
  list(prefix: string): Promise<string[]>;
  delete(key: string): Promise<void>;
  /**
   * Cuánto ocupa cada archivo, sin bajárselo.
   *
   * Hace falta para decirle al dueño cuánto pesa su web, y `get` no vale: mediría
   * una foto de 5 MB bajándose los 5 MB. Los dos drivers lo saben ya —el disco
   * por el `stat`, Supabase porque el listado trae el tamaño—, así que es solo
   * cuestión de no tirarlo.
   *
   * Opcional a propósito: así los dobles de los tests que solo necesitan
   * `get`/`put` siguen valiendo, y quien lo use tiene que estar preparado para
   * que no esté (ver seo/sitio.ts).
   */
  tamanos?(prefix: string): Promise<Map<string, number>>;
  /**
   * Borrar muchos de una vez.
   *
   * Existe porque borrar una web con 19 snapshots son más de mil archivos, y de
   * uno en uno eso son mil viajes de ida y vuelta: unos 100 segundos, que es
   * exactamente el tope de Cloudflare. El 08/08 el borrado funcionó pero la
   * respuesta murió por el camino, y en pantalla puso «No se pudo borrar» sobre
   * una web que ya no existía.
   *
   * Opcional como `tamanos`: quien lo use tiene que saber caer al `delete` de uno
   * en uno si el driver no lo trae.
   */
  deleteMany?(keys: string[]): Promise<void>;
}
