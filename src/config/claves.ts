// Ajustes de la organización (claves de API y modelo de IA): primero lo
// guardado en Configuración (org_settings en BD) y, para las claves, la del
// .env.local como respaldo. El import de la BD es dinámico y tolerante: en
// tests unitarios (sin DATABASE_URL) falla el import y se cae al entorno.
async function desdeBd(campo: "openrouterKey" | "serpapiKey" | "modeloIa"): Promise<string> {
  try {
    const { getDevContext } = await import("@/src/auth/dev-stub");
    const { orgSettingsStore } = await import("@/src/repositories/org-settings");
    const { orgId } = await getDevContext();
    return (await orgSettingsStore.getSettings(orgId))?.[campo] ?? "";
  } catch {
    return "";
  }
}

export async function claveOpenRouter(): Promise<string> {
  return (await desdeBd("openrouterKey")) || process.env.OPENROUTER_API_KEY || "";
}

export async function claveSerpApi(): Promise<string> {
  return (await desdeBd("serpapiKey")) || process.env.SERPAPI_KEY || "";
}

// Modelo elegido en Configuración; "" = el default de la plataforma
// (OPENROUTER_MODEL del .env o el hardcodeado en src/ia/claude.ts).
export async function modeloOrganizacion(): Promise<string> {
  return desdeBd("modeloIa");
}
