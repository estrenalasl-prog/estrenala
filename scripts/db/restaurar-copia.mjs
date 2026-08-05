// Devuelve una copia de seguridad a una base y un bucket VACÍOS.
//
//   node scripts/db/restaurar-copia.mjs "ruta/copia" --destino "postgres://…" [--bucket sites]
//   … y añade --restaurar para hacerlo de verdad.
//
// POR DEFECTO NO ESCRIBE NADA: enseña qué haría y para.
//
// Tres candados, y ninguno sobra:
//   1. El destino se escribe A MANO. No se hereda de .env.local.
//   2. Si el destino coincide con el DATABASE_URL de .env.local, se niega. Sin
//      esto, un despiste restaura la copia de ayer ENCIMA de producción.
//   3. Si el destino ya tiene filas, se niega. Restaurar es para una base vacía;
//      mezclar dos mundos deja algo que no es ninguno de los dos.
//
// El esquema tiene que existir ya: `node scripts/db/crear-esquema.mjs` contra el
// destino. Esto restaura DATOS, no estructura.
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(path.join(RAIZ, "package.json"));
const postgres = require("postgres");
const { createClient } = require("@supabase/supabase-js");

const args = process.argv.slice(2);
const valor = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const CARPETA = path.resolve(args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--destino"
  && args[args.indexOf(a) - 1] !== "--bucket" && args[args.indexOf(a) - 1] !== "--supabase") ?? "");
const DESTINO = valor("--destino");
const BUCKET = valor("--bucket") ?? "sites";
const SUPABASE = valor("--supabase"); // url|servicekey, opcional: sin esto solo va la base
const HACERLO = args.includes("--restaurar");

if (!existsSync(path.join(CARPETA, "manifiesto.json"))) {
  console.error(`No hay manifiesto.json en ${CARPETA || "(sin ruta)"}`);
  process.exit(1);
}
if (!DESTINO) {
  console.error(`Falta --destino "postgres://…" (se escribe a mano, a propósito)`);
  process.exit(1);
}

const env = existsSync(path.join(RAIZ, ".env.local"))
  ? readFileSync(path.join(RAIZ, ".env.local"), "utf8") : "";
const produccion = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (produccion && DESTINO.trim() === produccion) {
  console.error(`\n⛔ El destino es la base de PRODUCCIÓN (la de .env.local).`);
  console.error(`   Restaurar ahí sobrescribiría lo que hay ahora mismo. No se hace.\n`);
  process.exit(1);
}

const m = JSON.parse(readFileSync(path.join(CARPETA, "manifiesto.json"), "utf8"));
const sql = postgres(DESTINO, { prepare: false, max: 1 });

try {
  console.log(`\n${HACERLO ? "RESTAURANDO" : "SIMULACRO — no se escribe nada"}`);
  console.log(`  copia   ${CARPETA}`);
  console.log(`  hecha   ${m.hecha}\n`);

  // Candado 3: la base tiene que estar vacía.
  const ocupadas = [];
  for (const t of m.orden) {
    const [{ n }] = await sql.unsafe(`SELECT count(*)::int AS n FROM ${t}`);
    if (n > 0) ocupadas.push(`${t} (${n})`);
  }
  if (ocupadas.length > 0) {
    console.error(`⛔ El destino NO está vacío: ${ocupadas.join(", ")}`);
    console.error(`   Restaurar encima mezclaría dos mundos. Vacíalo o usa otro.\n`);
    process.exit(1);
  }
  console.log(`  destino vacío ✓\n`);

  console.log("BASE DE DATOS");
  for (const tabla of m.orden) {
    const filas = JSON.parse(readFileSync(path.join(CARPETA, "base", `${tabla}.json`), "utf8"));
    console.log(`  ${String(filas.length).padStart(5)} filas  ${tabla}`);
    if (!HACERLO || filas.length === 0) continue;
    // De 500 en 500: una sola sentencia con miles de filas revienta por tamaño.
    for (let i = 0; i < filas.length; i += 500) {
      await sql`INSERT INTO ${sql(tabla)} ${sql(filas.slice(i, i + 500))}`;
    }
  }

  const claves = Object.keys(m.archivos);
  console.log(`\nARCHIVOS  ${claves.length} · ${(m.totales.bytes / 1024 / 1024).toFixed(2)} MB`);
  if (!SUPABASE) {
    console.log(`  (sin --supabase "url|servicekey" no se suben; la base sí se restaura)`);
  } else if (HACERLO) {
    const [url, key] = SUPABASE.split("|");
    const bucket = createClient(url, key, { auth: { persistSession: false } }).storage.from(BUCKET);
    for (const [i, clave] of claves.entries()) {
      const cuerpo = readFileSync(path.join(CARPETA, "archivos", clave));
      const { error } = await bucket.upload(clave, new Uint8Array(cuerpo), { upsert: true });
      if (error) throw new Error(`subiendo ${clave}: ${error.message}`);
      if ((i + 1) % 50 === 0 || i === claves.length - 1) {
        process.stdout.write(`\r  ${i + 1}/${claves.length}`);
      }
    }
    console.log();
  }

  console.log(`\n${HACERLO ? "✔ RESTAURADO" : "Simulacro terminado. Añade --restaurar para hacerlo."}`);
  if (HACERLO) {
    console.log(`\nQueda por tu parte, y sin esto la plataforma arranca a medias:`);
    console.log(`  · SECRETS_KEY  — la MISMA de antes, o las claves de IA guardadas no se descifran`);
    console.log(`  · SESSION_SECRET, STRIPE_*, RESEND_*, DOKPLOY_* — ver docs/DESPLIEGUE.md`);
    console.log(`  · Volver a dar de alta los dominios en Traefik: se hace solo al republicar cada web`);
  }
} finally {
  await sql.end();
}
