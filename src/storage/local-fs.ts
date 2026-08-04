import fs from "node:fs/promises";
import path from "node:path";
import { contentTypeFor } from "./content-type";
import type { StorageAdapter } from "./types";

export class LocalFsStorage implements StorageAdapter {
  constructor(private rootDir: string) {}

  private full(key: string): string {
    return path.join(this.rootDir, key);
  }

  async put(key: string, body: Buffer | string, _contentType?: string): Promise<void> {
    const full = this.full(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
    // LocalFs no guarda metadata aparte: get() infiere el content-type por la
    // extensión de la clave. El parámetro se acepta por compatibilidad con la
    // interfaz (una impl. con sidecar podría persistirlo en el futuro).
  }

  async get(key: string): Promise<{ body: Buffer; contentType: string } | null> {
    try {
      const body = await fs.readFile(this.full(key));
      return { body, contentType: contentTypeFor(key) };
    } catch {
      return null;
    }
  }

  async list(prefix: string): Promise<string[]> {
    const out: string[] = [];
    const walk = async (dir: string) => {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const abs = path.join(dir, e.name);
        if (e.isDirectory()) await walk(abs);
        else {
          const key = path.relative(this.rootDir, abs).split(path.sep).join("/");
          if (key.startsWith(prefix)) out.push(key);
        }
      }
    };
    await walk(this.rootDir);
    return out;
  }

  async tamanos(prefix: string): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    for (const key of await this.list(prefix)) {
      try {
        out.set(key, (await fs.stat(path.join(this.rootDir, key))).size);
      } catch {
        // Un archivo que desaparece entre el listado y el `stat` no es motivo
        // para dejar sin medir a los demás.
      }
    }
    return out;
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.full(key), { force: true });
  }
}

export async function listHtmlPages(
  storage: StorageAdapter,
  prefix: string
): Promise<string[]> {
  const claves = await storage.list(prefix);
  return claves
    .map((k) => k.slice(prefix.length))
    .filter((rel) => /\.html?$/i.test(rel));
}
