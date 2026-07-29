// Migración 19 (aditiva): contador diario de direcciones estrenadas por espacio.
// Uso:  node scripts/db/2026-07-29-19-cupo-direcciones.mjs
// Lee DATABASE_URL de .env.local (nunca la imprime). Idempotente.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(path.join(RAIZ, "package.json"));
const postgres = require("postgres");

const url = readFileSync(path.join(RAIZ, ".env.local"), "utf8").match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!url) { console.error("Falta DATABASE_URL en .env.local"); process.exit(1); }
const sql = postgres(url, { prepare: false, max: 1 });

const pasos = [
  ["organizations.cambios_direccion",
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS cambios_direccion integer NOT NULL DEFAULT 0`],
  ["organizations.cambios_direccion_dia",
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS cambios_direccion_dia text NOT NULL DEFAULT ''`],
];

try {
  for (const [nombre, ddl] of pasos) {
    await sql.unsafe(ddl);
    console.log(`✓ ${nombre}`);
  }
  const [{ n }] = await sql`
    SELECT count(*)::int AS n FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name IN ('cambios_direccion', 'cambios_direccion_dia')`;
  console.log(n === 2 ? "\nMigración 19 aplicada." : `\n⚠ Solo aparecen ${n}/2 columnas: revísalo.`);
} finally {
  await sql.end({ timeout: 5 });
}
