// E2e del incremento 4c (radar de keywords) SIN gastar créditos:
// sin SERPAPI_KEY el radar debe cortar con el mensaje exacto; las keywords se siembran por SQL.
import { readFileSync } from "node:fs";
import { iniciarSesionE2e } from "./lib/sesion.mjs";
import { createRequire } from "node:module";

const RAIZ = "C:/Users/Sebas/Desktop/Carpeta de Proyectos/Wordclicks";
const require = createRequire(RAIZ + "/package.json");
const { zipSync, strToU8 } = require("fflate");
const postgres = require("postgres");

const BASE = "http://localhost:3000";
const env = readFileSync(RAIZ + "/.env.local", "utf8");
const DB_URL = env.match(/^DATABASE_URL=(.+)$/m)[1].trim();
if (/^SERPAPI_KEY=.+$/m.test(env)) {
  console.log("AVISO: hay SERPAPI_KEY en .env.local; el check del radar sin clave no aplica.");
}

let PASS = 0, FAIL = 0;
function check(nombre, cond, extra = "") {
  if (cond) { PASS++; console.log(`  PASS  ${nombre}`); }
  else { FAIL++; console.log(`  FAIL  ${nombre}${extra ? " — " + extra : ""}`); }
}

const cookie = await iniciarSesionE2e(BASE);
const H = { cookie };
const HJ = { cookie, "content-type": "application/json" };

const zip = zipSync({ "index.html": strToU8("<!doctype html><html><head><title>E2E 4c</title></head><body><h1>Portada</h1></body></html>") });
const fd = new FormData();
fd.append("file", new Blob([zip], { type: "application/zip" }), "sitio.zip");
fd.append("nombre", "E2E 4c");
const rProj = await fetch(`${BASE}/api/projects`, { method: "POST", headers: H, body: fd });
const { projectId } = await rProj.json();
check("crear proyecto", rProj.status === 201 && !!projectId);
const API = `${BASE}/api/projects/${projectId}`;

// --- settings con semillas ---
let r = await fetch(`${API}/blog/settings`, { headers: H });
let d = await r.json();
check("GET settings → keywordsSemilla vacía por defecto", r.ok && d.keywordsSemilla === "", JSON.stringify(d));

r = await fetch(`${API}/blog/keywords/radar`, { method: "POST", headers: HJ, body: "{}" });
d = await r.json();
check("radar sin nicho → 400 mensaje exacto",
  r.status === 400 && d.error === "Configura primero de qué va tu blog (campo Nicho)", JSON.stringify(d));

r = await fetch(`${API}/blog/settings`, {
  method: "PUT", headers: HJ,
  body: JSON.stringify({ nicho: "IA para pymes", keywordsSemilla: "agentes ia, chatbots" }),
});
check("PUT settings con semillas → 200", r.ok);
r = await fetch(`${API}/blog/settings`, { headers: H });
d = await r.json();
check("GET settings devuelve las semillas", d.keywordsSemilla === "agentes ia, chatbots", JSON.stringify(d));

r = await fetch(`${API}/blog/settings`, {
  method: "PUT", headers: HJ,
  body: JSON.stringify({ nicho: "IA para pymes", keywordsSemilla: "x".repeat(501) }),
});
d = await r.json();
check("PUT semillas de 501 chars → 400 mensaje exacto",
  r.status === 400 && d.error === "Las keywords semilla son demasiado largas (máx. 500 caracteres)", JSON.stringify(d));

// --- radar sin clave (SOLO si de verdad no hay clave: si la hay, gastaría créditos reales) ---
const rClaves = await fetch(`${BASE}/api/settings`, { headers: H });
const claves = await rClaves.json();
if (claves.serpapi.origen === null) {
  r = await fetch(`${API}/blog/keywords/radar`, { method: "POST", headers: HJ, body: "{}" });
  d = await r.json();
  check("radar sin clave de SerpAPI → 500 mensaje exacto (4d)",
    r.status === 500 && d.error === "Falta la clave de SerpAPI: añádela en Configuración", JSON.stringify(d));
} else {
  console.log("  SKIP  radar sin clave (hay una clave SerpAPI real configurada; no se gasta)");
}

// --- sembrar keywords en BD ---
const sql = postgres(DB_URL, { prepare: false });
await sql`insert into blog_keywords (project_id, keyword, fuente, crecimiento_pct, volumen_aprox, relevancia, estado) values
  (${projectId}, 'agentes ia para pymes', 'related', 850, null, 95, 'nueva'),
  (${projectId}, 'ia generativa', 'trends', 900, 50000, 40, 'nueva'),
  (${projectId}, 'resultado futbol', 'trends', 2000, 100000, 80, 'descartada')`;
await sql.end();
console.log("  (keywords sembradas en BD)");

r = await fetch(`${API}/blog/keywords`, { headers: H });
d = await r.json();
check("GET keywords → sin descartadas y ordenado por relevancia",
  r.ok && d.length === 2 && d[0].keyword === "agentes ia para pymes" && d[0].relevancia === 95 && d[1].relevancia === 40,
  JSON.stringify(d));
const kw95 = d[0], kw40 = d[1];

// --- estados ---
r = await fetch(`${API}/blog/keywords/${kw40.id}`, { method: "PUT", headers: HJ, body: JSON.stringify({ estado: "rara" }) });
d = await r.json();
check("PUT estado inválido → 400", r.status === 400 && d.error === "Estado desconocido", JSON.stringify(d));

r = await fetch(`${API}/blog/keywords/00000000-0000-4000-8000-00000000dead`, { method: "PUT", headers: HJ, body: JSON.stringify({ estado: "descartada" }) });
d = await r.json();
check("PUT keyword inexistente → 404", r.status === 404 && d.error === "Keyword no encontrada", JSON.stringify(d));

r = await fetch(`${API}/blog/keywords/${kw40.id}`, { method: "PUT", headers: HJ, body: JSON.stringify({ estado: "descartada" }) });
check("descartar la de 40 → 200", r.ok);
r = await fetch(`${API}/blog/keywords`, { headers: H });
d = await r.json();
check("GET keywords → solo queda la de 95", d.length === 1 && d[0].id === kw95.id, JSON.stringify(d));

// --- flujo keyword → borrador (lo que hace el botón «Escribir artículo») ---
r = await fetch(`${API}/blog/drafts`, { method: "POST", headers: HJ, body: JSON.stringify({ keyword: kw95.keyword }) });
d = await r.json();
check("POST draft con la keyword del radar → 201", r.status === 201 && !!d.draftId, JSON.stringify(d));
r = await fetch(`${API}/blog/keywords/${kw95.id}`, { method: "PUT", headers: HJ, body: JSON.stringify({ estado: "usada" }) });
check("marcar usada → 200", r.ok);
r = await fetch(`${API}/blog/keywords`, { headers: H });
d = await r.json();
check("GET keywords → la 95 figura como usada", d.length === 1 && d[0].estado === "usada", JSON.stringify(d));

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
