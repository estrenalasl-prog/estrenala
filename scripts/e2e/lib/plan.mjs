// Pone en plan «agencia» los espacios de un usuario DE PRUEBAS, para que los
// límites de plan (1 web en el gratuito) no estorben a los e2e.
//
// GUARDA: solo actúa sobre correos @wordclicks.local (los que fabrican los e2e).
// Así es imposible tocar por error el espacio real de desarrollo. NO lee ni
// escribe org_settings: solo la columna `plan` de organizations.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const require = createRequire(path.join(RAIZ, "package.json"));
const postgres = require("postgres");

export async function planAgencia(email) {
  const limpio = String(email ?? "").trim().toLowerCase();
  if (!limpio.endsWith("@wordclicks.local")) {
    throw new Error(`plan.mjs: solo para usuarios de prueba (@wordclicks.local), no "${limpio}"`);
  }
  const url = readFileSync(path.join(RAIZ, ".env.local"), "utf8").match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
  if (!url) throw new Error("Falta DATABASE_URL en .env.local");
  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    await sql`
      UPDATE organizations SET plan = 'agencia'
      WHERE id IN (
        SELECT m.org_id FROM memberships m
        JOIN users u ON u.id = m.user_id
        WHERE u.email = ${limpio} AND m.rol = 'owner'
      )`;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
