export interface StorageAdapter {
  put(key: string, body: Buffer | string, contentType?: string): Promise<void>;
  get(key: string): Promise<{ body: Buffer; contentType: string } | null>;
  list(prefix: string): Promise<string[]>;
  delete(key: string): Promise<void>;
}
