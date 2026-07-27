// Crea el esquema COMPLETO en una base de datos VACÍA, a partir del SQL que
// genera drizzle-kit desde src/db/schema.ts (la fuente de verdad).
//
// Sirve para estrenar un entorno nuevo (fue lo que se usó al pasar Supabase a la
// cuenta de Estrénala). Para cambios sobre una base que YA existe siguen valiendo
// los scripts sueltos de esta carpeta, que son incrementales e idempotentes.
//
// GUARDA: aborta si la base de destino tiene alguna tabla. Así es imposible
// lanzarlo por error contra una base con datos dentro.
//
// Uso:  node scripts/db/crear-esquema.mjs <NOMBRE_DE_LA_VARIABLE_EN_.env.local>
//   p.ej. node scripts/db/crear-esquema.mjs DATABASE_URL_NUEVA
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(path.join(RAIZ, "package.json"));
const postgres = require("postgres");

const variable = (process.argv[2] ?? "").trim();
if (!variable) {
  console.error("Falta el nombre de la variable. Ej: node scripts/db/crear-esquema.mjs DATABASE_URL_NUEVA");
  process.exit(1);
}

const env = readFileSync(path.join(RAIZ, ".env.local"), "utf8");
const url = env.match(new RegExp(`^${variable}=(.+)$`, "m"))?.[1]?.trim();
if (!url) {
  console.error(`No encuentro ${variable} en .env.local`);
  process.exit(1);
}

// El SQL más reciente que haya generado drizzle-kit.
const dir = path.join(RAIZ, "drizzle");
const archivo = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().pop();
if (!archivo) {
  console.error("No hay ningún .sql en drizzle/. Genera uno: npx drizzle-kit generate");
  process.exit(1);
}
const sentencias = readFileSync(path.join(dir, archivo), "utf8")
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

console.log(`Esquema: drizzle/${archivo} (${sentencias.length} sentencias)`);

const sql = postgres(url, { prepare: false, max: 1 });
try {
  const previas = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  if (previas.length > 0) {
    console.error(`\n✋ ABORTADO: la base de destino ya tiene ${previas.length} tablas.`);
    console.error("   Este script es SOLO para bases vacías. No se ha tocado nada.");
    process.exit(1);
  }
  for (const s of sentencias) await sql.unsafe(s);
  const creadas = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
  console.log(`\n✔ Creadas ${creadas.length} tablas:`);
  console.log("  " + creadas.map((t) => t.tablename).join(", "));
} finally {
  await sql.end({ timeout: 5 });
}
