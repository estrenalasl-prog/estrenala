// Migración 6a (aditiva): columnas de cuenta en users + tabla auth_tokens.
// drizzle-kit push casca introspectando esta BD (bug con CHECKs), así que el
// DDL se aplica aquí a mano, idempotente. Uso:
//   node scripts/db/2026-07-24-6a-users-auth-tokens.mjs
// Lee DATABASE_URL de .env.local (nunca la imprime).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(path.join(RAIZ, "package.json"));
const postgres = require("postgres");

const env = readFileSync(path.join(RAIZ, ".env.local"), "utf8");
const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!url) { console.error("Falta DATABASE_URL en .env.local"); process.exit(1); }

const sql = postgres(url, { prepare: false, max: 1 });

const pasos = [
  ["users.password_hash", `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text NOT NULL DEFAULT ''`],
  ["users.google_sub", `ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub text`],
  ["users.google_sub unique", `CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique ON users (google_sub)`],
  ["users.email_verificado_at", `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verificado_at timestamp with time zone`],
  ["tabla auth_tokens", `CREATE TABLE IF NOT EXISTS auth_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    user_id uuid REFERENCES users(id),
    tipo text NOT NULL,
    token_hash text NOT NULL UNIQUE,
    payload_json jsonb,
    expira_at timestamp with time zone NOT NULL,
    usado_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
  )`],
];

try {
  for (const [nombre, ddl] of pasos) {
    await sql.unsafe(ddl);
    console.log(`  OK  ${nombre}`);
  }
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`;
  console.log("users:", cols.map((c) => c.column_name).join(", "));
  const t = await sql`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_name = 'auth_tokens'`;
  console.log(`auth_tokens existe: ${t[0].n === 1}`);
} finally {
  await sql.end();
}
