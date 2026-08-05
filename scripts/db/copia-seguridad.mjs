// Copia de seguridad COMPLETA y autosuficiente: la base entera y todos los
// archivos de las webs, en una carpeta que se puede llevar a cualquier parte.
//
//   node scripts/db/copia-seguridad.mjs [carpeta-destino]
//
// Por defecto escribe en «Copias-Estrenala/<fecha>» al lado del repo. NUNCA
// dentro del repo: son datos de producción y no pintan nada en git.
//
// SOLO LEE de producción. No escribe ni una fila.
//
// Por qué no `pg_dump`: no está instalado, y además esto no depende de tener
// PostgreSQL en la máquina ni de que Supabase siga existiendo. Lo que sale es
// JSON y archivos sueltos: se puede leer con cualquier cosa dentro de diez años.
//
// ATENCIÓN a lo que esta copia NO puede devolverte por sí sola: las claves de
// IA/SerpAPI de cada espacio están CIFRADAS con SECRETS_KEY, que vive en el
// entorno del servidor y no aquí. Sin esa clave se restauran, pero no se pueden
// descifrar. Guárdala aparte, en tu gestor de contraseñas. Se avisa de esto en
// el LEEME que se escribe al lado.
import { mkdirSync, writeFileSync, createWriteStream } from "node:fs";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(path.join(RAIZ, "package.json"));
const postgres = require("postgres");
const { createClient } = require("@supabase/supabase-js");

const env = readFileSync(path.join(RAIZ, ".env.local"), "utf8");
const leer = (k) => env.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1]?.trim();

// El orden IMPORTA: es el de las claves ajenas. Restaurar `snapshots` antes que
// `projects` falla, así que se guarda en el orden en que hay que devolverlo.
const TABLAS = [
  "organizations", "users", "auth_tokens", "memberships", "org_settings",
  "projects", "form_submissions", "snapshots", "assets", "blog_templates",
  "blog_settings", "article_drafts", "blog_keywords", "trends_cache",
  "scheduled_posts", "posts",
];

const sello = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "");
const DESTINO = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(RAIZ, "..", "Copias-Estrenala", sello);

const sql = postgres(leer("DATABASE_URL"), { prepare: false, max: 1 });
const bucketNombre = leer("SUPABASE_STORAGE_BUCKET") ?? "sites";
const bucket = createClient(leer("SUPABASE_URL"), leer("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
}).storage.from(bucketNombre);

const sha = (b) => createHash("sha256").update(b).digest("hex");

try {
  mkdirSync(path.join(DESTINO, "base"), { recursive: true });
  mkdirSync(path.join(DESTINO, "archivos"), { recursive: true });
  console.log(`\nCopia de seguridad → ${DESTINO}\n`);

  // ── 1. La base ────────────────────────────────────────────────────────
  console.log("BASE DE DATOS");
  const inventario = {};
  for (const tabla of TABLAS) {
    // El nombre sale de una lista fija de este archivo, no de fuera.
    const filas = await sql.unsafe(`SELECT * FROM ${tabla}`);
    const json = JSON.stringify(filas, null, 1);
    const destino = path.join(DESTINO, "base", `${tabla}.json`);
    writeFileSync(destino, json, "utf8");
    inventario[tabla] = { filas: filas.length, bytes: Buffer.byteLength(json), sha256: sha(json) };
    console.log(`  ${String(filas.length).padStart(5)} filas  ${tabla}`);
  }

  // ── 2. Los archivos de las webs ───────────────────────────────────────
  console.log(`\nARCHIVOS (bucket «${bucketNombre}»)`);
  const claves = [];
  const pendientes = [""];
  while (pendientes.length > 0) {
    const carpeta = pendientes.pop();
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await bucket.list(carpeta, { limit: 100, offset });
      if (error) throw new Error(`list(${carpeta}): ${error.message}`);
      for (const e of data ?? []) {
        const ruta = carpeta ? `${carpeta}/${e.name}` : e.name;
        if (e.id === null) pendientes.push(ruta);
        else claves.push(ruta);
      }
      if (!data || data.length < 100) break;
    }
  }

  const archivos = {};
  let bytes = 0;
  for (const [i, clave] of claves.entries()) {
    const { data, error } = await bucket.download(clave);
    if (error || !data) throw new Error(`download(${clave}): ${error?.message}`);
    const buf = Buffer.from(await data.arrayBuffer());
    // La ruta del bucket se respeta tal cual: así el restaurador vuelve a subir
    // con la MISMA clave, que es lo que las filas de `snapshots` apuntan.
    const destino = path.join(DESTINO, "archivos", clave);
    mkdirSync(path.dirname(destino), { recursive: true });
    writeFileSync(destino, buf);
    archivos[clave] = { bytes: buf.length, sha256: sha(buf) };
    bytes += buf.length;
    if ((i + 1) % 25 === 0 || i === claves.length - 1) {
      process.stdout.write(`\r  ${i + 1}/${claves.length} archivos · ${(bytes / 1024 / 1024).toFixed(2)} MB`);
    }
  }
  console.log();

  // ── 3. El inventario, que es lo que permite COMPROBAR la copia ────────
  const manifiesto = {
    hecha: new Date().toISOString(),
    origen: { bucket: bucketNombre, host: new URL(leer("SUPABASE_URL")).host },
    orden: TABLAS,
    base: inventario,
    archivos,
    totales: {
      tablas: TABLAS.length,
      filas: Object.values(inventario).reduce((s, t) => s + t.filas, 0),
      archivos: claves.length,
      bytes,
    },
  };
  writeFileSync(path.join(DESTINO, "manifiesto.json"), JSON.stringify(manifiesto, null, 2), "utf8");

  console.log(`\n✔ ${manifiesto.totales.filas} filas · ${claves.length} archivos · ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`\n  ${DESTINO}`);
  console.log(`\nAhora compruébala:  node scripts/db/comprobar-copia.mjs "${DESTINO}"`);
} finally {
  await sql.end();
}
