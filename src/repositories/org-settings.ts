import { eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { orgSettings } from "@/src/db/schema";

export type ClavesOrg = { openrouterKey: string; serpapiKey: string };

export interface OrgSettingsStore {
  getClaves(orgId: string): Promise<ClavesOrg | null>;
  setClaves(orgId: string, patch: Partial<ClavesOrg>): Promise<void>; // upsert parcial
}

export class DrizzleOrgSettingsStore implements OrgSettingsStore {
  async getClaves(orgId: string): Promise<ClavesOrg | null> {
    const r = await db.select().from(orgSettings).where(eq(orgSettings.orgId, orgId)).limit(1);
    if (!r[0]) return null;
    return { openrouterKey: r[0].openrouterKey, serpapiKey: r[0].serpapiKey };
  }

  async setClaves(orgId: string, patch: Partial<ClavesOrg>): Promise<void> {
    const previo = await this.getClaves(orgId);
    const claves = {
      openrouterKey: patch.openrouterKey ?? previo?.openrouterKey ?? "",
      serpapiKey: patch.serpapiKey ?? previo?.serpapiKey ?? "",
    };
    await db.insert(orgSettings)
      .values({ orgId, ...claves })
      .onConflictDoUpdate({
        target: orgSettings.orgId,
        set: { ...claves, updatedAt: new Date() },
      });
  }
}

export const orgSettingsStore: OrgSettingsStore = new DrizzleOrgSettingsStore();
