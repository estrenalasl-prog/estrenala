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
}
