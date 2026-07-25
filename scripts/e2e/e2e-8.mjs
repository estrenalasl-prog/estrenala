// E2e del incremento 8 (asistente de IA) SIN gastar IA y SIN tocar org_settings.
// La vía que llamaría al modelo se SKIPea si hay clave real (gastaría céntimos):
// solo se comprueba el error "falta la clave" cuando NO hay ninguna configurada.
// Además prueba el circuito de APLICAR (que es de lo que depende el asistente:
// las ops propuestas se aplican por la ruta /edits ya existente).
import { readFileSync } from "node:fs";
import { iniciarSesionE2e } from "./lib/sesion.mjs";
import { createRequire } from "node:module";

const RAIZ = "C:/Users/Sebas/Desktop/Carpeta de Proyectos/Wordclicks";
const require = createRequire(RAIZ + "/package.json");
const { zipSync, strToU8 } = require("fflate");

const BASE = "http://localhost:3000";
// Comprobación de guarda: existe .env.local (no se lee ninguna clave).
readFileSync(RAIZ + "/.env.local", "utf8");

let PASS = 0, FAIL = 0;
function check(nombre, cond, extra = "") {
  if (cond) { PASS++; console.log(`  PASS  ${nombre}`); }
  else { FAIL++; console.log(`  FAIL  ${nombre}${extra ? " — " + extra : ""}`); }
}

const cookie = await iniciarSesionE2e(BASE);
const H = { cookie };
const HJ = { cookie, "content-type": "application/json" };

// Proyecto mínimo con dos hojas de texto editables.
const zip = zipSync({
  "index.html": strToU8(
    '<!doctype html><html><head><title>E2E 8</title></head><body><h1>Hola</h1><p>Mundo</p></body></html>'
  ),
});
const fd = new FormData();
fd.append("file", new Blob([zip], { type: "application/zip" }), "sitio.zip");
fd.append("nombre", "E2E 8 Asistente");
const rProj = await fetch(`${BASE}/api/projects`, { method: "POST", headers: H, body: fd });
const { projectId } = await rProj.json();
check("crear proyecto", rProj.status === 201 && !!projectId);
const API = `${BASE}/api/projects/${projectId}`;

// --- validaciones (no gastan IA: el error salta antes de llamar al modelo) ---
let r = await fetch(`${API}/asistente`, { method: "POST", headers: HJ, body: JSON.stringify({ instruccion: "   " }) });
let d = await r.json();
check("instrucción vacía → 400 mensaje exacto", r.status === 400 && d.error === "Escribe qué quieres cambiar", JSON.stringify(d));

r = await fetch(`${API}/asistente`, { method: "POST", headers: HJ, body: JSON.stringify({ instruccion: "x".repeat(2001) }) });
d = await r.json();
check("instrucción larguísima → 400 mensaje exacto", r.status === 400 && d.error === "La instrucción es demasiado larga", JSON.stringify(d));

// --- vía modelo: solo sin clave real (si la hay, gastaría céntimos) ---
const claves = await (await fetch(`${BASE}/api/settings`, { headers: H })).json();
if (claves.openrouter.origen === null) {
  r = await fetch(`${API}/asistente`, { method: "POST", headers: HJ, body: JSON.stringify({ instruccion: "haz el titular más directo" }) });
  d = await r.json();
  check("asistente sin clave → 400 mensaje exacto",
    r.status === 400 && d.error === "Falta la clave de OpenRouter: añádela en Configuración", JSON.stringify(d));
} else {
  console.log("  SKIP  propuesta del asistente (hay clave OpenRouter real; no se gasta)");
}

// --- circuito de APLICAR: lo que hace el asistente al confirmar los cambios ---
// 1) leemos el preview anotado para descubrir el id del <h1> (como haría el editor).
const anotado = await (await fetch(`${API}/preview/?edit=1`, { headers: H })).text();
const m = anotado.match(/<h1[^>]*data-wc-id="(\d+)"/);
check("el preview anota el <h1> con data-wc-id", !!m, anotado.slice(0, 120));
if (m) {
  const nodeId = Number(m[1]);
  // 2) aplicamos una op text (exactamente lo que devolvería interpretarPropuesta).
  r = await fetch(`${API}/edits`, {
    method: "POST", headers: HJ,
    body: JSON.stringify({ ops: [{ page: "index.html", nodeId, kind: "text", value: "Titular nuevo" }] }),
  });
  check("aplicar op propuesta → 201", r.status === 201, String(r.status));
  // 3) el preview (snapshot actual) ya muestra el texto nuevo.
  const tras = await (await fetch(`${API}/preview/`, { headers: H })).text();
  check("el cambio se refleja en la web", tras.includes("Titular nuevo") && !tras.includes("<h1>Hola</h1>"), tras.slice(0, 160));
}

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
