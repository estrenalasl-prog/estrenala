import { eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { orgSettings } from "@/src/db/schema";

export type OrgSettings = { openrouterKey: string; serpapiKey: string; modeloIa: string };

export interface OrgSettingsStore {
  getSettings(orgId: string): Promise<OrgSettings | null>;
  setSettings(orgId: string, patch: Partial<OrgSettings>): Promise<void>; // upsert parcial
}

export class DrizzleOrgSettingsStore implements OrgSettingsStore {
  async getSettings(orgId: string): Promise<OrgSettings | null> {
    const r = await db.select().from(orgSettings).where(eq(orgSettings.orgId, orgId)).limit(1);
    if (!r[0]) return null;
    return { openrouterKey: r[0].openrouterKey, serpapiKey: r[0].serpapiKey, modeloIa: r[0].modeloIa };
  }

  async setSettings(orgId: string, patch: Partial<OrgSettings>): Promise<void> {
    const previo = await this.getSettings(orgId);
    const valores = {
      openrouterKey: patch.openrouterKey ?? previo?.openrouterKey ?? "",
      serpapiKey: patch.serpapiKey ?? previo?.serpapiKey ?? "",
      modeloIa: patch.modeloIa ?? previo?.modeloIa ?? "",
    };
    await db.insert(orgSettings)
      .values({ orgId, ...valores })
      .onConflictDoUpdate({
        target: orgSettings.orgId,
        set: { ...valores, updatedAt: new Date() },
      });
  }
}

export const orgSettingsStore: OrgSettingsStore = new DrizzleOrgSettingsStore();
