// Migración 19: cifra las claves de IA que ya estaban guardadas EN CLARO en
// org_settings (openrouter_key, serpapi_key).
//
//   node scripts/db/2026-07-29-19-cifrar-claves.mjs            → dice qué haría
//   node scripts/db/2026-07-29-19-cifrar-claves.mjs --aplicar  → lo hace
//
// No cambia el esquema: solo el contenido. Es idempotente (lo que ya está
// cifrado se salta) y NUNCA imprime material de claves: solo cuántas hay.
// Lee DATABASE_URL y SECRETS_KEY de .env.local.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createCipheriv, randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(path.join(RAIZ, "package.json"));
const postgres = require("postgres");

const APLICAR = process.argv.includes("--aplicar");
const env = readFileSync(path.join(RAIZ, ".env.local"), "utf8");
const leer = (k) => env.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1]?.trim();

const url = leer("DATABASE_URL");
if (!url) { console.error("Falta DATABASE_URL en .env.local"); process.exit(1); }
const claveB64 = leer("SECRETS_KEY");
if (!claveB64) {
  console.error("Falta SECRETS_KEY en .env.local. Genérala con: openssl rand -base64 32");
  process.exit(1);
}
const CLAVE = Buffer.from(claveB64, "base64");
if (CLAVE.length !== 32) { console.error(`SECRETS_KEY mide ${CLAVE.length} bytes y debe medir 32.`); process.exit(1); }

// Misma implementación que src/config/secretos.ts (aquí no se puede importar TS).
const FORMATO = /^s1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;
function cifrar(texto) {
  if (texto === "") return "";
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", CLAVE, iv);
  const cuerpo = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return ["s1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), cuerpo.toString("base64url")].join(".");
}

const sql = postgres(url, { prepare: false, max: 1 });
try {
  const filas = await sql`SELECT org_id, openrouter_key, serpapi_key FROM org_settings`;
  let enClaro = 0, yaCifradas = 0, vacias = 0;
  const pendientes = [];

  for (const f of filas) {
    const parche = {};
    for (const [col, valor] of [["openrouter_key", f.openrouter_key], ["serpapi_key", f.serpapi_key]]) {
      if (!valor) { vacias++; continue; }
      if (FORMATO.test(valor)) { yaCifradas++; continue; }
      enClaro++;
      parche[col] = cifrar(valor);
    }
    if (Object.keys(parche).length > 0) pendientes.push({ orgId: f.org_id, parche });
  }

  console.log(`Filas en org_settings: ${filas.length}`);
  console.log(`  claves en claro:  ${enClaro}   ← lo que hay que cifrar`);
  console.log(`  ya cifradas:      ${yaCifradas}`);
  console.log(`  sin clave (''):   ${vacias}`);

  if (pendientes.length === 0) {
    console.log("\nNada que hacer.");
  } else if (!APLICAR) {
    console.log(`\nEn seco: NO se ha escrito nada. Vuelve a lanzarlo con --aplicar.`);
  } else {
    for (const { orgId, parche } of pendientes) {
      if (parche.openrouter_key) {
        await sql`UPDATE org_settings SET openrouter_key = ${parche.openrouter_key} WHERE org_id = ${orgId}`;
      }
      if (parche.serpapi_key) {
        await sql`UPDATE org_settings SET serpapi_key = ${parche.serpapi_key} WHERE org_id = ${orgId}`;
      }
    }
    // Comprobación: no puede quedar nada que no cumpla el formato o esté vacío.
    const [{ n }] = await sql`
      SELECT count(*)::int AS n FROM org_settings
      WHERE (openrouter_key <> '' AND openrouter_key NOT LIKE 's1.%')
         OR (serpapi_key   <> '' AND serpapi_key   NOT LIKE 's1.%')`;
    console.log(n === 0
      ? `\n✔ Migración 19 aplicada: ${enClaro} clave(s) cifradas. No queda ninguna en claro.`
      : `\n⚠ Quedan ${n} fila(s) con claves en claro: revísalo.`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
