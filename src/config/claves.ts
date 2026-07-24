// Ajustes de la organización (claves de API y modelo de IA): primero lo
// guardado en Configuración (org_settings en BD) y, para las claves, la del
// .env.local como respaldo. La organización activa se toma del contexto
// ambiental (org-context); sin contexto (o sin BD en tests unitarios) devuelve
// "" y quien llama cae al entorno.
async function desdeBd(campo: "openrouterKey" | "serpapiKey" | "modeloIa"): Promise<string> {
  try {
    const { orgActual } = await import("@/src/auth/org-context");
    const orgId = orgActual();
    if (!orgId) return "";
    const { orgSettingsStore } = await import("@/src/repositories/org-settings");
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
