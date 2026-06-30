import { describe, it, expect } from "vitest";
import { resolvePreview } from "@/src/preview/resolve";
import type { StorageAdapter } from "@/src/storage/types";

class MapStorage implements StorageAdapter {
  constructor(private files: Record<string, { body: string; ct: string }>) {}
  async put() {}
  async get(key: string) {
    const f = this.files[key];
    return f ? { body: Buffer.from(f.body), contentType: f.ct } : null;
  }
  async list(prefix: string) { return Object.keys(this.files).filter((k) => k.startsWith(prefix)); }
  async delete() {}
}

const prefix = "projects/p1/snapshots/s1/";

describe("resolvePreview", () => {
  it("sirve el entry cuando el path está vacío y reescribe el HTML", async () => {
    const storage = new MapStorage({
      [prefix + "index.html"]: { body: `<head></head><img src="/img/x.png">`, ct: "text/html; charset=utf-8" },
    });
    const r = await resolvePreview({ storage }, {
      projectId: "p1", storagePrefix: prefix, entryPath: "index.html", pathSegments: [],
    });
    expect(r.status).toBe(200);
    expect(r.body.toString()).toContain(`<base href="/api/projects/p1/preview/">`);
    expect(r.body.toString()).toContain(`src="/api/projects/p1/preview/img/x.png"`);
  });

  it("sirve un asset tal cual", async () => {
    const storage = new MapStorage({
      [prefix + "css/app.css"]: { body: "body{color:red}", ct: "text/css; charset=utf-8" },
    });
    const r = await resolvePreview({ storage }, {
      projectId: "p1", storagePrefix: prefix, entryPath: "index.html", pathSegments: ["css", "app.css"],
    });
    expect(r.status).toBe(200);
    expect(r.contentType).toBe("text/css; charset=utf-8");
    expect(r.body.toString()).toBe("body{color:red}");
  });

  it("404 si el archivo no existe", async () => {
    const storage = new MapStorage({});
    const r = await resolvePreview({ storage }, {
      projectId: "p1", storagePrefix: prefix, entryPath: "index.html", pathSegments: ["no.css"],
    });
    expect(r.status).toBe(404);
  });

  it("rechaza traversal (..) con 400", async () => {
    const storage = new MapStorage({});
    const r = await resolvePreview({ storage }, {
      projectId: "p1", storagePrefix: prefix, entryPath: "index.html", pathSegments: ["..", "secret"],
    });
    expect(r.status).toBe(400);
  });

  it("en modo edición inyecta data-wc-id y el script del editor", async () => {
    const storage = new MapStorage({
      [prefix + "index.html"]: { body: `<body><h1>Hola</h1></body>`, ct: "text/html; charset=utf-8" },
    });
    const r = await resolvePreview({ storage }, {
      projectId: "p1", storagePrefix: prefix, entryPath: "index.html", pathSegments: [], edit: true,
    });
    const html = r.body.toString();
    expect(html).toContain(`data-wc-id="`);
    expect(html).toContain(`<script src="/wc-editor.js" data-project="p1" data-page="index.html"></script>`);
  });

  it("sin modo edición NO inyecta data-wc-id ni el script", async () => {
    const storage = new MapStorage({
      [prefix + "index.html"]: { body: `<body><h1>Hola</h1></body>`, ct: "text/html; charset=utf-8" },
    });
    const r = await resolvePreview({ storage }, {
      projectId: "p1", storagePrefix: prefix, entryPath: "index.html", pathSegments: [],
    });
    const html = r.body.toString();
    expect(html).not.toContain(`data-wc-id`);
    expect(html).not.toContain(`wc-editor.js`);
  });
});
