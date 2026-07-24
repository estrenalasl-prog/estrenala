// E2e del incremento 4d (Configuración: claves API desde la UI).
// No gasta créditos: la clave falsa de SerpAPI provoca su 401 real (llamada gratuita)
// y las claves se LIMPIAN al final (estado restaurado).
import { readFileSync } from "node:fs";
import { iniciarSesionE2e } from "./lib/sesion.mjs";
import { createRequire } from "node:module";

const RAIZ = "C:/Users/Sebas/Desktop/Carpeta de Proyectos/Wordclicks";
const require = createRequire(RAIZ + "/package.json");
const { zipSync, strToU8 } = require("fflate");

const BASE = "http://localhost:3000";
const env = readFileSync(RAIZ + "/.env.local", "utf8");
const HAY_OPENROUTER_ENV = /^OPENROUTER_API_KEY=.+$/m.test(env);

let PASS = 0, FAIL = 0;
function check(nombre, cond, extra = "") {
  if (cond) { PASS++; console.log(`  PASS  ${nombre}`); }
  else { FAIL++; console.log(`  FAIL  ${nombre}${extra ? " — " + extra : ""}`); }
}

const cookie = await iniciarSesionE2e(BASE);
const H = { cookie };
const HJ = { cookie, "content-type": "application/json" };

// --- GUARDA: jamás tocar claves reales del usuario (no se pueden restaurar) ---
let r = await fetch(`${BASE}/api/settings`, { headers: H });
let d = await r.json();
if (d.openrouter.origen === "ui" || d.serpapi.origen === "ui") {
  console.log("ABORTADO: hay claves reales guardadas en Configuración. Este e2e las sobrescribiría y NO son recuperables. Quítalas a mano antes de correrlo.");
  process.exit(2);
}

// --- estados iniciales ---
r = await fetch(`${BASE}/api/settings`, { headers: H });
d = await r.json();
check("GET settings inicial: openrouter desde env, serpapi sin configurar",
  r.ok && d.openrouter.origen === (HAY_OPENROUTER_ENV ? "env" : null) && d.serpapi.origen === null,
  JSON.stringify(d));
check("GET nunca devuelve claves completas (solo sufijo ≤ 4)",
  (d.openrouter.sufijo ?? "").length <= 4 && (d.serpapi.sufijo ?? "").length <= 4, JSON.stringify(d));

// --- guardar clave falsa de SerpAPI ---
r = await fetch(`${BASE}/api/settings`, { method: "PUT", headers: HJ, body: JSON.stringify({ serpapiKey: "clave-falsa-e2e" }) });
check("PUT serpapiKey → 200", r.ok);
r = await fetch(`${BASE}/api/settings`, { headers: H });
d = await r.json();
check("GET → serpapi origen ui con sufijo correcto",
  d.serpapi.origen === "ui" && d.serpapi.sufijo === "-e2e", JSON.stringify(d.serpapi));

// --- el radar ya no dice «falta la clave»: falla con el error real de SerpAPI ---
const zip = zipSync({ "index.html": strToU8("<!doctype html><html><head><title>E2E 4d</title></head><body>x</body></html>") });
const fd = new FormData();
fd.append("file", new Blob([zip], { type: "application/zip" }), "sitio.zip");
fd.append("nombre", "E2E 4d");
r = await fetch(`${BASE}/api/projects`, { method: "POST", headers: H, body: fd });
const { projectId } = await r.json();
check("crear proyecto", r.status === 201 && !!projectId);
const API = `${BASE}/api/projects/${projectId}`;
await fetch(`${API}/blog/settings`, { method: "PUT", headers: HJ, body: JSON.stringify({ nicho: "IA para pymes" }) });

r = await fetch(`${API}/blog/keywords/radar`, { method: "POST", headers: HJ, body: "{}" });
d = await r.json();
check("radar con clave falsa → 502 de SerpAPI (no «falta la clave»)",
  r.status === 502 && String(d.error).startsWith("SerpAPI no devolvió ninguna keyword"), JSON.stringify(d));

// --- quitar la clave → vuelve el mensaje de Configuración ---
r = await fetch(`${BASE}/api/settings`, { method: "PUT", headers: HJ, body: JSON.stringify({ serpapiKey: "" }) });
check("PUT serpapiKey vacía (quitar) → 200", r.ok);
r = await fetch(`${BASE}/api/settings`, { headers: H });
d = await r.json();
check("GET → serpapi vuelve a sin configurar", d.serpapi.origen === null, JSON.stringify(d.serpapi));
r = await fetch(`${API}/blog/keywords/radar`, { method: "POST", headers: HJ, body: "{}" });
d = await r.json();
check("radar sin clave → 500 mensaje exacto de Configuración",
  r.status === 500 && d.error === "Falta la clave de SerpAPI: añádela en Configuración", JSON.stringify(d));

// --- límites y validaciones ---
r = await fetch(`${BASE}/api/settings`, { method: "PUT", headers: HJ, body: JSON.stringify({ serpapiKey: "x".repeat(201) }) });
d = await r.json();
check("PUT clave de 201 chars → 400 mensaje exacto",
  r.status === 400 && d.error === "La clave es demasiado larga (máx. 200 caracteres)", JSON.stringify(d));

r = await fetch(`${BASE}/api/settings/probar`, { method: "POST", headers: HJ, body: JSON.stringify({ cual: "x" }) });
d = await r.json();
check("probar servicio desconocido → 400", r.status === 400 && d.error === "Servicio desconocido", JSON.stringify(d));

// --- openrouter: UI gana al env y al quitar vuelve al env (sin llamadas IA por medio) ---
r = await fetch(`${BASE}/api/settings`, { method: "PUT", headers: HJ, body: JSON.stringify({ openrouterKey: "sk-falsa-e2e" }) });
check("PUT openrouterKey falsa → 200", r.ok);
r = await fetch(`${BASE}/api/settings`, { headers: H });
d = await r.json();
check("GET → openrouter origen ui", d.openrouter.origen === "ui" && d.openrouter.sufijo === "-e2e", JSON.stringify(d.openrouter));
r = await fetch(`${BASE}/api/settings`, { method: "PUT", headers: HJ, body: JSON.stringify({ openrouterKey: "" }) });
check("PUT openrouterKey vacía → 200", r.ok);
r = await fetch(`${BASE}/api/settings`, { headers: H });
d = await r.json();
check("GET → openrouter vuelve al respaldo del servidor",
  d.openrouter.origen === (HAY_OPENROUTER_ENV ? "env" : null), JSON.stringify(d.openrouter));

// --- limpieza final (por si algún check falló a medias) ---
await fetch(`${BASE}/api/settings`, { method: "PUT", headers: HJ, body: JSON.stringify({ openrouterKey: "", serpapiKey: "" }) });
r = await fetch(`${BASE}/api/settings`, { headers: H });
d = await r.json();
check("estado final restaurado (sin claves de UI)",
  d.openrouter.origen !== "ui" && d.serpapi.origen !== "ui", JSON.stringify(d));

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
