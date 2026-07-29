// E2e del incremento 9 (Zona de peligro): borrar proyecto y borrar cuenta.
// Usa un usuario DESECHABLE con email único (NUNCA el e2e@wordclicks.local
// compartido, que otros e2e reutilizan) y su propia organización aislada, así que
// jamás toca la org de dev ni sus claves.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const RAIZ = "C:/Users/Sebas/Desktop/Carpeta de Proyectos/Wordclicks";
const require = createRequire(RAIZ + "/package.json");
const { zipSync, strToU8 } = require("fflate");
const BASE = "http://localhost:3000";
readFileSync(RAIZ + "/.env.local", "utf8"); // guarda: existe (no se lee ninguna clave)

let PASS = 0, FAIL = 0;
function check(n, c, e = "") {
  if (c) { PASS++; console.log(`  PASS  ${n}`); }
  else { FAIL++; console.log(`  FAIL  ${n}${e ? " — " + e : ""}`); }
}

const J = { "content-type": "application/json" };
const email = `e2e-borrar-${Date.now()}@wordclicks.local`;
const password = "e2e-clave-fija-para-pruebas-123";

let r = await fetch(`${BASE}/api/registro`, {
  method: "POST", headers: J, body: JSON.stringify({ nombre: "E2E Borrar", email, password }),
});
const cookie = (r.headers.get("set-cookie") ?? "").split(";")[0];
check("registro de usuario desechable → sesión", r.ok && cookie.startsWith("__Host-wc_session="), String(r.status));
const H = { cookie };

function zipDe(t) {
  return zipSync({ "index.html": strToU8(`<!doctype html><html><head><title>${t}</title></head><body><h1>${t}</h1></body></html>`) });
}
async function crearProyecto(nombre) {
  const fd = new FormData();
  fd.append("file", new Blob([zipDe(nombre)], { type: "application/zip" }), "s.zip");
  fd.append("nombre", nombre);
  const rp = await fetch(`${BASE}/api/projects`, { method: "POST", headers: H, body: fd });
  return (await rp.json()).projectId;
}

// --- 1) Borrar un proyecto ---
const p1 = await crearProyecto("E2E Borrar Web");
check("crear proyecto 1", !!p1);
r = await fetch(`${BASE}/api/projects/${p1}`, { method: "DELETE", headers: H });
check("DELETE proyecto → 200", r.status === 200, String(r.status));
r = await fetch(`${BASE}/api/projects/${p1}`, { headers: H });
check("el proyecto ya no existe → 404", r.status === 404, String(r.status));

// --- 2) Borrar la cuenta (con un proyecto dentro, para ejercitar la cascada) ---
const p2 = await crearProyecto("E2E Borrar Cuenta");
check("crear proyecto 2 (para la cascada de la cuenta)", !!p2);
r = await fetch(`${BASE}/api/cuenta`, { method: "DELETE", headers: H });
check("DELETE cuenta → 200", r.status === 200, String(r.status));

// --- 3) La cuenta ya no existe: no se puede iniciar sesión ---
r = await fetch(`${BASE}/api/login`, { method: "POST", headers: J, body: JSON.stringify({ email, password }) });
check("login tras borrar la cuenta → 401", r.status === 401, String(r.status));

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
