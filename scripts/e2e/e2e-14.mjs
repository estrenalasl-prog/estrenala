// E2e de las páginas legales: son PÚBLICAS (sin sesión), llevan los datos del
// titular, avisan si falta el NIF y están enlazadas desde la landing.
import { readFileSync } from "node:fs";

const RAIZ = "C:/Users/Sebas/Desktop/Carpeta de Proyectos/Wordclicks";
const BASE = "http://localhost:3000";
readFileSync(RAIZ + "/.env.local", "utf8"); // guarda: existe

let PASS = 0, FAIL = 0;
function check(n, c, e = "") {
  if (c) { PASS++; console.log(`  PASS  ${n}`); }
  else { FAIL++; console.log(`  FAIL  ${n}${e ? " — " + e : ""}`); }
}

const DOCS = {
  "aviso-legal": "Aviso legal",
  "privacidad": "Política de privacidad",
  "cookies": "Política de cookies",
  "terminos": "Términos y condiciones",
};

for (const [ruta, titulo] of Object.entries(DOCS)) {
  const r = await fetch(`${BASE}/legal/${ruta}`, { redirect: "manual" });
  const html = await r.text();
  check(`/legal/${ruta} es pública → 200`, r.status === 200, String(r.status));
  check(`/legal/${ruta} tiene su título`, html.includes(titulo), html.slice(0, 120));
}

// Datos del titular presentes donde deben (aviso legal y privacidad)
for (const ruta of ["aviso-legal", "privacidad"]) {
  const html = await (await fetch(`${BASE}/legal/${ruta}`)).text();
  check(`/legal/${ruta} identifica al titular`, html.includes("Mart") && html.includes("Fuengirola"));
}

// Mientras el NIF esté vacío, debe avisar (es obligatorio por LSSI)
const avisoNif = await (await fetch(`${BASE}/legal/aviso-legal`)).text();
check("avisa de que falta el NIF (hasta que se rellene)", avisoNif.includes("falta el NIF"));

// Cookies: refleja las reales de la plataforma
const ck = await (await fetch(`${BASE}/legal/cookies`)).text();
for (const c of ["__Host-wc_session", "__Host-wc_org", "g_state"]) {
  check(`la política de cookies documenta ${c}`, ck.includes(c));
}
check("declara que no hay cookies de seguimiento", ck.includes("No usamos cookies de analítica"));

// La landing enlaza las cuatro
const home = await (await fetch(`${BASE}/`)).text();
for (const ruta of Object.keys(DOCS)) {
  check(`la landing enlaza /legal/${ruta}`, home.includes(`/legal/${ruta}`));
}

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
