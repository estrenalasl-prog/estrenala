import { eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { orgSettings } from "@/src/db/schema";
import { cifrar, descifrar } from "@/src/config/secretos";

export type OrgSettings = { openrouterKey: string; serpapiKey: string; modeloIa: string };

export interface OrgSettingsStore {
  getSettings(orgId: string): Promise<OrgSettings | null>;
  setSettings(orgId: string, patch: Partial<OrgSettings>): Promise<void>; // upsert parcial
}

export class DrizzleOrgSettingsStore implements OrgSettingsStore {
  // Las claves salen de aquí ya descifradas: quien las use no se entera de nada
  // (ver src/config/secretos.ts). Lo legado en claro pasa tal cual.
  async getSettings(orgId: string): Promise<OrgSettings | null> {
    const r = await this.crudo(orgId);
    if (!r) return null;
    return {
      openrouterKey: descifrar(r.openrouterKey),
      serpapiKey: descifrar(r.serpapiKey),
      modeloIa: r.modeloIa,
    };
  }

  /** La fila TAL CUAL está en la base, sin descifrar. */
  private async crudo(orgId: string) {
    const r = await db.select().from(orgSettings).where(eq(orgSettings.orgId, orgId)).limit(1);
    return r[0] ?? null;
  }

  async setSettings(orgId: string, patch: Partial<OrgSettings>): Promise<void> {
    // Los campos que NO se tocan se reescriben con sus bytes de la base, sin
    // descifrar ni recifrar: así cambiar el modelo de IA —que no es secreto— no
    // exige tener SECRETS_KEY, y no se recifra por gusto lo que ya estaba bien.
    const previo = await this.crudo(orgId);
    const valores = {
      openrouterKey: patch.openrouterKey !== undefined ? cifrar(patch.openrouterKey) : previo?.openrouterKey ?? "",
      serpapiKey: patch.serpapiKey !== undefined ? cifrar(patch.serpapiKey) : previo?.serpapiKey ?? "",
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
