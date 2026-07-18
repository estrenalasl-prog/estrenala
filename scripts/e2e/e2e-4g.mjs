// E2e del incremento 4g (piloto automático) SIN gastar NADA:
// solo superficie de config; JAMÁS se deja piloto_activo=true (hay claves
// reales y el tick del servidor ejecutaría el piloto de verdad).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const RAIZ = "C:/Users/Sebas/Desktop/Carpeta de Proyectos/Wordclicks";
const require = createRequire(RAIZ + "/package.json");
const { zipSync, strToU8 } = require("fflate");
const postgres = require("postgres");

const BASE = "http://localhost:3000";
const env = readFileSync(RAIZ + "/.env.local", "utf8");
const PASSWORD = env.match(/^PANEL_PASSWORD=(.+)$/m)[1].trim();
const DB_URL = env.match(/^DATABASE_URL=(.+)$/m)[1].trim();

let PASS = 0, FAIL = 0;
function check(nombre, cond, extra = "") {
  if (cond) { PASS++; console.log(`  PASS  ${nombre}`); }
  else { FAIL++; console.log(`  FAIL  ${nombre}${extra ? " — " + extra : ""}`); }
}

const sql = postgres(DB_URL, { prepare: false });
async function pilotosActivos() {
  const [r] = await sql`select count(*)::int as n from blog_settings where piloto_activo = true`;
  return r.n;
}

// GUARDA: si ya hubiera algún piloto activo (del usuario), este e2e no debe
// ni llamar al cron (lo ejecutaría de verdad con sus claves).
const activosAntes = await pilotosActivos();
if (activosAntes > 0) {
  console.log(`ABORT: hay ${activosAntes} piloto(s) activo(s) reales; este e2e no debe correr ahora.`);
  await sql.end();
  process.exit(2);
}

const rLogin = await fetch(`${BASE}/api/login`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ password: PASSWORD }),
});
const cookie = (rLogin.headers.get("set-cookie") ?? "").split(";")[0];
check("login devuelve cookie", rLogin.ok && cookie.length > 5);
const H = { cookie };
const HJ = { cookie, "content-type": "application/json" };

const zip = zipSync({ "index.html": strToU8("<!doctype html><html><head><title>E2E 4g</title></head><body>hola</body></html>") });
const fd = new FormData();
fd.append("file", new Blob([zip], { type: "application/zip" }), "sitio.zip");
fd.append("nombre", "E2E 4g");
const rProj = await fetch(`${BASE}/api/projects`, { method: "POST", headers: H, body: fd });
const { projectId } = await rProj.json();
check("crear proyecto", rProj.status === 201 && !!projectId);
const API = `${BASE}/api/projects/${projectId}`;

// --- GET defaults ---
let r = await fetch(`${API}/blog/piloto`, { headers: H });
let d = await r.json();
check("GET piloto → defaults (apagado, cada día, 9:00, diseño)",
  r.ok && d.activo === false && d.cadaDias === 1 && d.hora === 9 && d.portada === "diseno" && d.ultimoMsg === null,
  JSON.stringify(d));

// --- PUT inválidos byte-exactos ---
const put = (body) => fetch(`${API}/blog/piloto`, { method: "PUT", headers: HJ, body: JSON.stringify(body) });
r = await put({ activo: false, cadaDias: 2, hora: 9, portada: "diseno" });
d = await r.json();
check("cadaDias=2 → 400 «Frecuencia no válida»", r.status === 400 && d.error === "Frecuencia no válida", JSON.stringify(d));
r = await put({ activo: false, cadaDias: 3, hora: 24, portada: "diseno" });
d = await r.json();
check("hora=24 → 400 «Hora no válida»", r.status === 400 && d.error === "Hora no válida", JSON.stringify(d));
r = await put({ activo: false, cadaDias: 3, hora: 9, portada: "gif" });
d = await r.json();
check("portada=gif → 400 «Portada no válida»", r.status === 400 && d.error === "Portada no válida", JSON.stringify(d));

// --- PUT válido (SIEMPRE activo:false) y GET refleja ---
r = await put({ activo: false, cadaDias: 7, hora: 22, portada: "ia" });
d = await r.json();
check("PUT válido → ok", r.ok && d.ok === true, JSON.stringify(d));
r = await fetch(`${API}/blog/piloto`, { headers: H });
d = await r.json();
check("GET refleja lo guardado", d.activo === false && d.cadaDias === 7 && d.hora === 22 && d.portada === "ia", JSON.stringify(d));

// --- el PUT del piloto no pisa la config normal del blog (métodos separados) ---
r = await fetch(`${API}/blog/settings`, {
  method: "PUT", headers: HJ, body: JSON.stringify({ nicho: "IA para pymes", keywordsSemilla: "chatgpt" }),
});
check("PUT settings normal → 200", r.ok);
r = await fetch(`${API}/blog/piloto`, { headers: H });
d = await r.json();
check("la config del piloto sobrevive al PUT de settings", d.cadaDias === 7 && d.hora === 22 && d.portada === "ia", JSON.stringify(d));
r = await fetch(`${API}/blog/settings`, { headers: H });
d = await r.json();
check("y el nicho sobrevive al PUT del piloto", d.nicho === "IA para pymes", JSON.stringify(d));

// --- cron público con todos los pilotos apagados: no ejecuta nada ---
r = await fetch(`${BASE}/api/cron/piloto`, { method: "POST" });
d = await r.json();
check("POST /api/cron/piloto (sin cookie) → 200 con 0 ejecutados",
  r.ok && d.ejecutados === 0 && d.publicados === 0, JSON.stringify(d));

// --- seguridad final: NINGÚN piloto queda activo en la BD ---
const activosDespues = await pilotosActivos();
check("ningún piloto queda activo tras el e2e", activosDespues === 0, `activos=${activosDespues}`);
await sql.end();

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
