// Ajustes de la organización: claves de API y modelo de IA, tal cual los guardó
// su dueño en Configuración (org_settings). La organización activa se toma del
// contexto ambiental (org-context); sin contexto devuelve "".
//
// CADA ESPACIO PAGA SU IA. No hay respaldo a la clave del .env: la había, y
// significaba que cualquier cliente sin clave propia gastaba del saldo de
// OpenRouter de la plataforma. Con un puñado de usuarios es calderilla; con mil
// es una factura que no controla nadie y que crece cuanto mejor va el negocio.
//
// Sin clave no se llama a la IA: todos los caminos (blog, portadas, asistente,
// piloto, radar) lo comprueban y responden «Falta la clave de OpenRouter:
// añádela en Configuración». Es el modelo BYOK que sostiene el margen — ver
// docs y el aviso de coste de cada pantalla.
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
  return desdeBd("openrouterKey");
}

export async function claveSerpApi(): Promise<string> {
  return desdeBd("serpapiKey");
}

// Modelo elegido en Configuración; "" = el default de la plataforma
// (OPENROUTER_MODEL del .env o el hardcodeado en src/ia/claude.ts).
export async function modeloOrganizacion(): Promise<string> {
  return desdeBd("modeloIa");
}
