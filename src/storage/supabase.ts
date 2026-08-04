import { createClient } from "@supabase/supabase-js";
import { contentTypeFor } from "./content-type";
import type { StorageAdapter } from "./types";

// `metadata` es opcional porque Supabase no lo manda para las carpetas virtuales
// (las que vienen con `id: null`), y porque un doble de test que solo pruebe
// `list` no tiene por qué inventárselo.
type ListEntry = { name: string; id: string | null; metadata?: { size?: number } | null };

// Subconjunto del cliente de supabase-js que usamos (inyectable en tests).
export type SupabaseLikeClient = {
  storage: {
    from(bucket: string): {
      upload(key: string, body: Uint8Array, opts: { contentType: string; upsert: boolean }): Promise<{ error: { message: string } | null }>;
      download(key: string): Promise<{ data: Blob | null; error: { message: string } | null }>;
      list(folder: string, opts: { limit: number; offset: number }): Promise<{ data: ListEntry[] | null; error: { message: string } | null }>;
      remove(keys: string[]): Promise<{ error: { message: string } | null }>;
    };
  };
};

const PAGINA = 100;

// StorageAdapter sobre un bucket privado de Supabase Storage. Los prefijos que usa
// la app son "carpetas" completas terminadas en "/" (storagePrefix de snapshots);
// list() recorre recursivamente esa carpeta (el list de Supabase es por nivel).
export class SupabaseStorage implements StorageAdapter {
  constructor(private client: SupabaseLikeClient, private bucket: string) {}

  private from() {
    return this.client.storage.from(this.bucket);
  }

  async put(key: string, body: Buffer | string, contentType?: string): Promise<void> {
    const bytes = typeof body === "string" ? Buffer.from(body, "utf-8") : body;
    const { error } = await this.from().upload(key, new Uint8Array(bytes), {
      contentType: contentType ?? contentTypeFor(key),
      upsert: true,
    });
    if (error) throw new Error(`Supabase upload(${key}): ${error.message}`);
  }

  async get(key: string): Promise<{ body: Buffer; contentType: string } | null> {
    const { data, error } = await this.from().download(key);
    if (error || !data) return null;
    return { body: Buffer.from(await data.arrayBuffer()), contentType: contentTypeFor(key) };
  }

  async list(prefix: string): Promise<string[]> {
    const out: string[] = [];
    const pendientes = [prefix.replace(/\/+$/, "")];
    while (pendientes.length > 0) {
      const carpeta = pendientes.pop()!;
      for (let offset = 0; ; offset += PAGINA) {
        const { data, error } = await this.from().list(carpeta, { limit: PAGINA, offset });
        if (error) throw new Error(`Supabase list(${carpeta}): ${error.message}`);
        for (const e of data ?? []) {
          const ruta = carpeta ? `${carpeta}/${e.name}` : e.name;
          if (e.id === null) pendientes.push(ruta); // carpeta virtual
          else if (ruta.startsWith(prefix)) out.push(ruta);
        }
        if (!data || data.length < PAGINA) break;
      }
    }
    return out;
  }

  /**
   * Igual que `list`, pero quedándose con el tamaño que ya viene en la respuesta.
   * Recorrer dos veces sería pagar dos veces por lo mismo.
   */
  async tamanos(prefix: string): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    const pendientes = [prefix.replace(/\/+$/, "")];
    while (pendientes.length > 0) {
      const carpeta = pendientes.pop()!;
      for (let offset = 0; ; offset += PAGINA) {
        const { data, error } = await this.from().list(carpeta, { limit: PAGINA, offset });
        if (error) throw new Error(`Supabase list(${carpeta}): ${error.message}`);
        for (const e of data ?? []) {
          const ruta = carpeta ? `${carpeta}/${e.name}` : e.name;
          if (e.id === null) { pendientes.push(ruta); continue; } // carpeta virtual
          if (!ruta.startsWith(prefix)) continue;
          if (typeof e.metadata?.size === "number") out.set(ruta, e.metadata.size);
        }
        if (!data || data.length < PAGINA) break;
      }
    }
    return out;
  }

  async delete(key: string): Promise<void> {
    const { error } = await this.from().remove([key]);
    if (error) throw new Error(`Supabase remove(${key}): ${error.message}`);
  }
}

export function crearSupabaseStorageDesdeEnv(): StorageAdapter {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "sites";
  if (!url || !key) {
    throw new Error("STORAGE_DRIVER=supabase requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY");
  }
  const client = createClient(url, key, { auth: { persistSession: false } });
  return new SupabaseStorage(client as unknown as SupabaseLikeClient, bucket);
}
