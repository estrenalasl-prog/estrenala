import { describe, it, expect } from "vitest";
import { contentTypeFor } from "@/src/storage/content-type";

describe("contentTypeFor", () => {
  it("html", () => expect(contentTypeFor("index.html")).toBe("text/html; charset=utf-8"));
  it("css", () => expect(contentTypeFor("a/b/style.css")).toBe("text/css; charset=utf-8"));
  it("js", () => expect(contentTypeFor("app.js")).toBe("text/javascript; charset=utf-8"));
  it("png", () => expect(contentTypeFor("img/x.PNG")).toBe("image/png"));
  it("woff2", () => expect(contentTypeFor("f.woff2")).toBe("font/woff2"));
  it("mp4", () => expect(contentTypeFor("media/fondo.mp4")).toBe("video/mp4"));
  it("webm", () => expect(contentTypeFor("clip.WEBM")).toBe("video/webm"));
  it("mov", () => expect(contentTypeFor("old.mov")).toBe("video/quicktime"));
  it("mp3", () => expect(contentTypeFor("son.mp3")).toBe("audio/mpeg"));
  it("desconocido", () => expect(contentTypeFor("x.bin")).toBe("application/octet-stream"));
});
