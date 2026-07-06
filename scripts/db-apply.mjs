import { readFileSync } from "node:fs";
import postgres from "postgres";
const archivo = process.argv[2];
if (!archivo) { console.error("Uso: node scripts/db-apply.mjs <archivo.sql>"); process.exit(1); }
const env = readFileSync(".env.local", "utf8");
const url = env.match(/^DATABASE_URL=(.+)$/m)[1].trim();
const sql = postgres(url, { prepare: false });
await sql.unsafe(readFileSync(archivo, "utf8"));
console.log("Aplicado:", archivo);
await sql.end();
