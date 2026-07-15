// Claves de API de la plataforma: primero la guardada en Configuración
// (org_settings en BD), y si está vacía, la del .env.local como respaldo.
// El import de la BD es dinámico y tolerante: en tests unitarios (sin
// DATABASE_URL) falla el import y se cae al entorno sin ruido.
async function desdeBd(campo: "openrouterKey" | "serpapiKey"): Promise<string> {
  try {
    const { getDevContext } = await import("@/src/auth/dev-stub");
    const { orgSettingsStore } = await import("@/src/repositories/org-settings");
    const { orgId } = await getDevContext();
    return (await orgSettingsStore.getClaves(orgId))?.[campo] ?? "";
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
