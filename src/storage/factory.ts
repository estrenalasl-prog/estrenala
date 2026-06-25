import { LocalFsStorage } from "./local-fs";
import type { StorageAdapter } from "./types";

let instancia: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!instancia) {
    instancia = new LocalFsStorage(process.env.STORAGE_DIR ?? "data/storage");
  }
  return instancia;
}
