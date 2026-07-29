// E2e del incremento 11 (Actualizar proyecto desde ZIP): subir una versión nueva,
// ver el cambio en la web, que quede en el Historial y poder revertir. Usuario
// DESECHABLE (org propia); se borra al final. Nunca toca la org de dev.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

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
const email = `e2e-actualizar-${Date.now()}@wordclicks.local`;
const password = "e2e-clave-fija-para-pruebas-123";

let r = await fetch(`${BASE}/api/registro`, {
  method: "POST", headers: J, body: JSON.stringify({ nombre: "E2E Act", email, password }),
});
const cookie = (r.headers.get("set-cookie") ?? "").split(";")[0];
check("registro desechable → sesión", r.ok && cookie.startsWith("__Host-wc_session="), String(r.status));
const H = { cookie };

const zipHtml = (t) => zipSync({ "index.html": strToU8(`<!doctype html><html><head><title>${t}</title></head><body><h1>${t}</h1></body></html>`) });

// Crear con versión 1
let fd = new FormData();
fd.append("file", new Blob([zipHtml("Version 1")], { type: "application/zip" }), "s.zip");
fd.append("nombre", "E2E Actualizar");
r = await fetch(`${BASE}/api/projects`, { method: "POST", headers: H, body: fd });
const { projectId } = await r.json();
check("crear proyecto (v1)", r.status === 201 && !!projectId);
const API = `${BASE}/api/projects/${projectId}`;

let prev = await (await fetch(`${API}/preview/`, { headers: H })).text();
check("preview muestra v1", prev.includes("Version 1"), prev.slice(0, 120));

// Actualizar a versión 2
fd = new FormData();
fd.append("file", new Blob([zipHtml("Version 2")], { type: "application/zip" }), "s.zip");
r = await fetch(`${API}/actualizar`, { method: "POST", headers: H, body: fd });
const dAct = await r.json();
check("actualizar (v2) → 201 con snapshotId", r.status === 201 && !!dAct.snapshotId, JSON.stringify(dAct));

prev = await (await fetch(`${API}/preview/`, { headers: H })).text();
check("preview ahora muestra v2 y no v1", prev.includes("Version 2") && !prev.includes("Version 1"), prev.slice(0, 140));

// El Historial registra la actualización y hay un snapshot import (v1) para revertir
const hist = (await (await fetch(`${API}/snapshots`, { headers: H })).json()).snapshots ?? [];
check("el Historial tiene un snapshot 'actualizacion'", hist.some((s) => s.tipo === "actualizacion"), JSON.stringify(hist.map((s) => s.tipo)));
const importSnap = hist.find((s) => s.tipo === "import");
check("existe el snapshot inicial (v1) para revertir", !!importSnap);

// Revertir a v1
if (importSnap) {
  r = await fetch(`${API}/snapshots/${importSnap.id}/restore`, { method: "POST", headers: H });
  check("restaurar v1 → ok", r.ok, String(r.status));
  prev = await (await fetch(`${API}/preview/`, { headers: H })).text();
  check("tras revertir, preview vuelve a v1", prev.includes("Version 1"), prev.slice(0, 140));
}

// ZIP inválido → 400
r = await fetch(`${API}/actualizar`, {
  method: "POST", headers: H,
  body: (() => { const f = new FormData(); f.append("file", new Blob([Buffer.from("no soy un zip")], { type: "application/zip" }), "malo.zip"); return f; })(),
});
const dMal = await r.json();
check("ZIP inválido → 400 mensaje exacto", r.status === 400 && dMal.error === "El archivo no es un ZIP válido", JSON.stringify(dMal));

// limpieza
await fetch(`${BASE}/api/cuenta`, { method: "DELETE", headers: H });

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
