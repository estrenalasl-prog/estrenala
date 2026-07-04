import { LocalFsStorage } from "./local-fs";
import { crearSupabaseStorageDesdeEnv } from "./supabase";
import type { StorageAdapter } from "./types";

let instancia: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!instancia) {
    instancia = process.env.STORAGE_DRIVER === "supabase"
      ? crearSupabaseStorageDesdeEnv()
      : new LocalFsStorage(process.env.STORAGE_DIR ?? "data/storage");
  }
  return instancia;
}
