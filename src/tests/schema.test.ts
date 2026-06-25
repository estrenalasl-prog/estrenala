import { describe, it, expect } from "vitest";
import * as schema from "@/src/db/schema";
import { getTableConfig } from "drizzle-orm/pg-core";

describe("schema", () => {
  it("define las 6 tablas con sus nombres", () => {
    expect(getTableConfig(schema.organizations).name).toBe("organizations");
    expect(getTableConfig(schema.users).name).toBe("users");
    expect(getTableConfig(schema.memberships).name).toBe("memberships");
    expect(getTableConfig(schema.projects).name).toBe("projects");
    expect(getTableConfig(schema.snapshots).name).toBe("snapshots");
    expect(getTableConfig(schema.assets).name).toBe("assets");
  });

  it("projects tiene columna entry_path y current_snapshot_id", () => {
    const cols = getTableConfig(schema.projects).columns.map((c) => c.name);
    expect(cols).toContain("entry_path");
    expect(cols).toContain("current_snapshot_id");
  });
});
