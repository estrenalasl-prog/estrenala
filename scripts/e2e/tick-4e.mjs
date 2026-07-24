// Prueba en vivo del tick de instrumentation.ts (4e): programa un artículo en
// el proyecto E2E ya existente, vence la fila por SQL y espera a que el
// SERVIDOR la publique solo (sin llamar al cron). No gasta IA ni SerpAPI.
import { readFileSync } from "node:fs";
import { iniciarSesionE2e } from "./lib/sesion.mjs";
import { createRequire } from "node:module";

const RAIZ = "C:/Users/Sebas/Desktop/Carpeta de Proyectos/Wordclicks";
const require = createRequire(RAIZ + "/package.json");
const postgres = require("postgres");

const BASE = "http://localhost:3000";
const env = readFileSync(RAIZ + "/.env.local", "utf8");
const DB_URL = env.match(/^DATABASE_URL=(.+)$/m)[1].trim();

const PROJECT_ID = process.argv[2];
if (!PROJECT_ID) { console.error("uso: node tick-4e.mjs <projectId>"); process.exit(2); }

const cookie = await iniciarSesionE2e(BASE);
const H = { cookie };
const HJ = { cookie, "content-type": "application/json" };
const API = `${BASE}/api/projects/${PROJECT_ID}`;

// El asset de portada del e2e sigue en el proyecto: lo buscamos por SQL.
const sql = postgres(DB_URL, { prepare: false });
const [asset] = await sql`select id from assets where project_id = ${PROJECT_ID} limit 1`;
if (!asset) { console.error("el proyecto no tiene assets"); await sql.end(); process.exit(2); }

let r = await fetch(`${API}/blog/programados`, {
  method: "POST", headers: HJ,
  body: JSON.stringify({
    titulo: "Articulo Del Tick E2E",
    slug: "articulo-del-tick-e2e",
    metaDescripcion: "Prueba del tick de instrumentation.",
    md: "## Tick\n\nPublicado por el tick del servidor, sin cron externo.",
    imagenAssetId: asset.id,
    publicarEn: new Date(Date.now() + 3600_000).toISOString(),
  }),
});
const d = await r.json();
if (!r.ok) { console.error("no se pudo programar:", JSON.stringify(d)); await sql.end(); process.exit(1); }
console.log("programado:", d.programadoId);

await sql`update scheduled_posts set publicar_en = now() - interval '1 minute' where id = ${d.programadoId}`;
console.log("vencido por SQL; esperando al tick del servidor (hasta 90 s)…");

let publicado = false;
for (let i = 0; i < 30; i++) {
  await new Promise((res) => setTimeout(res, 3000));
  const rr = await fetch(`${API}/blog/programados`, { headers: H });
  const filas = await rr.json();
  const fila = filas.find((f) => f.id === d.programadoId);
  if (fila?.estado === "publicado") {
    console.log(`PASS: el tick lo publicó solo tras ~${(i + 1) * 3} s (postId ${fila.postId})`);
    publicado = true;
    break;
  }
  if (fila?.estado === "error") {
    console.log(`FAIL: el tick lo dejó en error: ${fila.errorMsg}`);
    break;
  }
}
if (!publicado) console.log("FAIL: el tick no lo publicó en 90 s");

// Limpieza: quitar la fila (el post de prueba se queda en el proyecto E2E, borrable a mano).
const rr = await fetch(`${API}/blog/programados`, { headers: H });
const filas = await rr.json();
const fila = filas.find((f) => f.id === d.programadoId);
if (fila) await fetch(`${API}/blog/programados/${fila.id}`, { method: "DELETE", headers: H });
await sql.end();
process.exit(publicado ? 0 : 1);
