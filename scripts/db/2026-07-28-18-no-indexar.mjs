// Migración 18 (aditiva): interruptor «Que Google no la encuentre todavía» por web.
// Uso:  node scripts/db/2026-07-28-18-no-indexar.mjs
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
  // false por defecto: publicar es querer que te vean. Las webs que ya estén
  // publicadas siguen exactamente igual que antes de esta migración.
  ["projects.no_indexar",
    `ALTER TABLE projects ADD COLUMN IF NOT EXISTS no_indexar boolean NOT NULL DEFAULT false`],
];

try {
  for (const [nombre, ddl] of pasos) {
    await sql.unsafe(ddl);
    console.log(`✓ ${nombre}`);
  }
  const [{ n }] = await sql`
    SELECT count(*)::int AS n FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'no_indexar'`;
  console.log(n === 1 ? "\nMigración 18 aplicada." : "\n⚠ La columna no aparece: revisa a mano.");
} finally {
  await sql.end({ timeout: 5 });
}
