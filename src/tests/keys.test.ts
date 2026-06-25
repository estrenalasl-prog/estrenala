import { describe, it, expect } from "vitest";
import { snapshotPrefix, assetKey } from "@/src/storage/keys";

describe("keys", () => {
  it("snapshotPrefix termina en barra", () => {
    expect(snapshotPrefix("p1", "s1")).toBe("projects/p1/snapshots/s1/");
  });
  it("assetKey usa la extensión", () => {
    expect(assetKey("p1", "a1", "webp")).toBe("projects/p1/assets/a1.webp");
  });
});
