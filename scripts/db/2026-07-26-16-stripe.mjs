// Migración 16 (aditiva): columnas de suscripción de Stripe en organizations.
// drizzle-kit push casca introspectando esta BD (bug con CHECKs), así que el DDL
// se aplica aquí a mano, idempotente. Uso:
//   node scripts/db/2026-07-26-16-stripe.mjs
// Lee DATABASE_URL de .env.local (nunca la imprime).
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
  ["organizations.stripe_customer_id",
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id text`],
  ["organizations.stripe_customer_id unique",
    `CREATE UNIQUE INDEX IF NOT EXISTS organizations_stripe_customer_unique ON organizations (stripe_customer_id)`],
  ["organizations.stripe_subscription_id",
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id text`],
  // active | trialing | past_due | canceled | "" (sin suscripción, plan gratuito)
  ["organizations.plan_estado",
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_estado text NOT NULL DEFAULT ''`],
  // Hasta cuándo está pagado el periodo en curso (para no cortar antes de tiempo).
  ["organizations.plan_hasta",
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_hasta timestamp with time zone`],
];

try {
  for (const [nombre, ddl] of pasos) {
    await sql.unsafe(ddl);
    console.log(`✓ ${nombre}`);
  }
  console.log("\nMigración 16 aplicada.");
} finally {
  await sql.end({ timeout: 5 });
}
