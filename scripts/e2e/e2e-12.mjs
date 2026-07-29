// E2e del incremento 12: subir la web como .html suelto o como carpeta (además
// del .zip de siempre). Usuario DESECHABLE; se borra al final.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { planAgencia } from "./lib/plan.mjs";

const RAIZ = "C:/Users/Sebas/Desktop/Carpeta de Proyectos/Wordclicks";
const require = createRequire(RAIZ + "/package.json");
const { zipSync, strToU8 } = require("fflate");
const BASE = "http://localhost:3000";
readFileSync(RAIZ + "/.env.local", "utf8"); // guarda: existe

let PASS = 0, FAIL = 0;
function check(n, c, e = "") {
  if (c) { PASS++; console.log(`  PASS  ${n}`); }
  else { FAIL++; console.log(`  FAIL  ${n}${e ? " — " + e : ""}`); }
}

const J = { "content-type": "application/json" };
const email = `e2e-subida-${Date.now()}@wordclicks.local`;
const password = "e2e-clave-fija-para-pruebas-123";

let r = await fetch(`${BASE}/api/registro`, {
  method: "POST", headers: J, body: JSON.stringify({ nombre: "E2E Subida", email, password }),
});
const cookie = (r.headers.get("set-cookie") ?? "").split(";")[0];
check("registro desechable → sesión", r.ok && cookie.startsWith("__Host-wc_session="), String(r.status));
await planAgencia(email); // este e2e sube 3 webs: el plan gratuito solo deja 1
const H = { cookie };

// Sube una lista de {ruta, contenido} como archivos sueltos con sus rutas relativas.
async function subir(archivos, nombre) {
  const fd = new FormData();
  for (const a of archivos) fd.append("file", new Blob([a.contenido], { type: "text/html" }), a.ruta.split("/").pop());
  fd.append("rutas", JSON.stringify(archivos.map((a) => a.ruta)));
  if (nombre) fd.append("nombre", nombre);
  const res = await fetch(`${BASE}/api/projects`, { method: "POST", headers: H, body: fd });
  return { status: res.status, body: await res.json() };
}

// --- 1) Un .html suelto ---
let d = await subir([{ ruta: "index.html", contenido: "<!doctype html><html><body><h1>Suelto</h1></body></html>" }], "Web suelta");
check("subir un .html suelto → 201", d.status === 201 && !!d.body.projectId, JSON.stringify(d.body));
if (d.body.projectId) {
  const prev = await (await fetch(`${BASE}/api/projects/${d.body.projectId}/preview/`, { headers: H })).text();
  check("el .html suelto se sirve como web", prev.includes("Suelto"), prev.slice(0, 120));
}

// --- 2) Una carpeta entera (con raíz envolvente) ---
d = await subir([
  { ruta: "mi-web/index.html", contenido: '<!doctype html><html><head><link rel="stylesheet" href="css/app.css"></head><body><h1>Carpeta</h1></body></html>' },
  { ruta: "mi-web/css/app.css", contenido: "h1{color:red}" },
], "mi-web");
check("subir una carpeta → 201", d.status === 201 && !!d.body.projectId, JSON.stringify(d.body));
if (d.body.projectId) {
  const API = `${BASE}/api/projects/${d.body.projectId}`;
  const prev = await (await fetch(`${API}/preview/`, { headers: H })).text();
  check("la carpeta se sirve con su index (raíz envolvente quitada)", prev.includes("Carpeta"), prev.slice(0, 140));
  const css = await fetch(`${API}/preview/css/app.css`, { headers: H });
  check("los archivos internos conservan su ruta (css/app.css)", css.ok, String(css.status));
}

// --- 3) El .zip de siempre sigue funcionando ---
let fd = new FormData();
fd.append("file", new Blob([zipSync({ "index.html": strToU8("<!doctype html><html><body><h1>Zip</h1></body></html>") })], { type: "application/zip" }), "sitio.zip");
fd.append("nombre", "Web zip");
r = await fetch(`${BASE}/api/projects`, { method: "POST", headers: H, body: fd });
const dz = await r.json();
check("subir un .zip sigue funcionando → 201", r.status === 201 && !!dz.projectId, JSON.stringify(dz));

// --- 4) Sin ninguna página HTML → 400 con mensaje claro ---
d = await subir([{ ruta: "estilos.css", contenido: "body{}" }]);
check("sin HTML → 400 mensaje exacto",
  d.status === 400 && d.body.error === "No encontramos ninguna página HTML (.html) en lo que has subido", JSON.stringify(d.body));

// limpieza
await fetch(`${BASE}/api/cuenta`, { method: "DELETE", headers: H });

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
