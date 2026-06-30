import { describe, it, expect } from "vitest";
import { isValidOp, isSafeHref, isUuid } from "@/src/editor/validate-op";

const UUID = "11111111-2222-4333-8444-555555555555";

describe("isUuid", () => {
  it("acepta un uuid y rechaza basura", () => {
    expect(isUuid(UUID)).toBe(true);
    expect(isUuid("nope")).toBe(false);
  });
});

describe("isSafeHref", () => {
  it("acepta relativas, ancla, http(s), mailto, tel", () => {
    for (const h of ["/x", "x", "#a", "http://a.com", "https://a.com", "mailto:a@b.com", "tel:+1"]) {
      expect(isSafeHref(h)).toBe(true);
    }
  });
  it("rechaza javascript:, data: y esquemas desconocidos", () => {
    for (const h of ["javascript:alert(1)", " JavaScript:x", "data:text/html,x", "ftp://a"]) {
      expect(isSafeHref(h)).toBe(false);
    }
  });
  it("rechaza vacío", () => {
    expect(isSafeHref("   ")).toBe(false);
  });
});

describe("isValidOp", () => {
  it("text: válido si value es string", () => {
    expect(isValidOp({ page: "i", nodeId: 0, kind: "text", value: "x" })).toBe(true);
  });
  it("href: depende de isSafeHref", () => {
    expect(isValidOp({ page: "i", nodeId: 0, kind: "href", value: "/ok" })).toBe(true);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "href", value: "javascript:x" })).toBe(false);
  });
  it("src: exige patrón /wc-uploads/<uuid>.<ext> y assetId que coincide", () => {
    expect(isValidOp({ page: "i", nodeId: 0, kind: "src", value: `/wc-uploads/${UUID}.png`, assetId: UUID })).toBe(true);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "src", value: `/wc-uploads/${UUID}.exe`, assetId: UUID })).toBe(false);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "src", value: `/otro/${UUID}.png`, assetId: UUID })).toBe(false);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "src", value: `/wc-uploads/${UUID}.png`, assetId: "otro" })).toBe(false);
  });
  it("style: solo color con valor seguro", () => {
    expect(isValidOp({ page: "i", nodeId: 0, kind: "style", property: "color", value: "#ff0000" })).toBe(true);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "style", property: "color", value: "rgb(1,2,3)" })).toBe(true);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "style", property: "color", value: "red" })).toBe(true);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "style", property: "color", value: "red; x: y" })).toBe(false);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "style", property: "color", value: "url(x)" })).toBe(false);
  });
  it("rechaza kind desconocido", () => {
    expect(isValidOp({ kind: "otro" } as unknown as Parameters<typeof isValidOp>[0])).toBe(false);
  });
});
