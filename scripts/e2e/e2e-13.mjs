// E2e de la landing pública: la raíz es pública (landing sin sesión, panel con
// sesión) y el resto del panel SIGUE protegido (que abrir "/" no abra la app).
import { readFileSync } from "node:fs";

const RAIZ = "C:/Users/Sebas/Desktop/Carpeta de Proyectos/Wordclicks";
const BASE = "http://localhost:3000";
readFileSync(RAIZ + "/.env.local", "utf8"); // guarda: existe

let PASS = 0, FAIL = 0;
function check(n, c, e = "") {
  if (c) { PASS++; console.log(`  PASS  ${n}`); }
  else { FAIL++; console.log(`  FAIL  ${n}${e ? " — " + e : ""}`); }
}

// --- 1) Raíz SIN sesión → landing (200, no redirección a /login) ---
let r = await fetch(`${BASE}/`, { redirect: "manual" });
const html = await r.text();
check("GET / sin sesión → 200 (no redirige)", r.status === 200, String(r.status));
check("sirve la landing (hero del dolor)", html.includes("lleva semanas muerta en una carpeta"), html.slice(0, 200));
check("el CTA apunta al registro real", html.includes('href="/registro"'));
check("no quedan anclas #registro sueltas", !html.includes('href="#registro"'));
check("mock del blog sin la analítica inventada", !html.includes("640 lecturas"));
check("equipos sin el rol inexistente «Invitado»", !html.includes("Invitado"));
check("el pie enlaza las páginas legales reales (no anclas vacías)",
  html.includes('href="/legal/aviso-legal"') && !/<a href="#">/.test(html));
check("usa el logo real (no base64)", html.includes("/brand/logo-tinta.png") && !html.includes("data:image/png;base64"));

// --- 2) Los logos que usa la landing existen de verdad ---
for (const logo of ["/brand/logo-tinta.png", "/brand/logo-blanco.png"]) {
  const res = await fetch(BASE + logo);
  check(`el logo ${logo} se sirve`, res.ok, String(res.status));
}

// --- 3) El panel SIGUE protegido (no se ha abierto nada) ---
r = await fetch(`${BASE}/settings`, { redirect: "manual" });
check("/settings sin sesión → redirige a /login", r.status === 307 && (r.headers.get("location") ?? "").includes("/login"), `${r.status} ${r.headers.get("location")}`);
r = await fetch(`${BASE}/api/projects`, { redirect: "manual" });
check("/api/projects sin sesión → 401", r.status === 401, String(r.status));

// --- 4) Con sesión, la raíz da el PANEL (no la landing) ---
const email = `e2e-landing-${Date.now()}@wordclicks.local`;
r = await fetch(`${BASE}/api/registro`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ nombre: "E2E Landing", email, password: "e2e-clave-fija-para-pruebas-123" }),
});
const cookie = (r.headers.get("set-cookie") ?? "").split(";")[0];
check("registro desechable → sesión", r.ok && cookie.startsWith("wc_session="), String(r.status));
const conSesion = await (await fetch(`${BASE}/`, { headers: { cookie } })).text();
check("GET / con sesión → panel, no landing",
  !conSesion.includes("lleva semanas muerta en una carpeta") && conSesion.includes("Arrastra tu web aquí"),
  conSesion.slice(0, 160));

// limpieza
await fetch(`${BASE}/api/cuenta`, { method: "DELETE", headers: { cookie } });

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
