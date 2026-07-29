// E2e de planes y límites: el plan gratuito deja 1 web y no da dominio propio ni
// equipo; al subir de plan, se desbloquean. Usuario DESECHABLE; se borra al final.
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
const email = `e2e-planes-${Date.now()}@wordclicks.local`;

let r = await fetch(`${BASE}/api/registro`, {
  method: "POST", headers: J,
  body: JSON.stringify({ nombre: "E2E Planes", email, password: "e2e-clave-fija-para-pruebas-123" }),
});
const cookie = (r.headers.get("set-cookie") ?? "").split(";")[0];
check("registro desechable → sesión", r.ok && cookie.startsWith("__Host-wc_session="), String(r.status));
const H = { cookie };
const HJ = { cookie, "content-type": "application/json" };

const zip = () => zipSync({ "index.html": strToU8("<!doctype html><html><body><h1>x</h1></body></html>") });
async function crearWeb(nombre) {
  const fd = new FormData();
  fd.append("file", new Blob([zip()], { type: "application/zip" }), "s.zip");
  fd.append("nombre", nombre);
  const res = await fetch(`${BASE}/api/projects`, { method: "POST", headers: H, body: fd });
  return { status: res.status, body: await res.json() };
}

// --- Plan gratuito por defecto ---
let d = await (await fetch(`${BASE}/api/plan`, { headers: H })).json();
check("una cuenta nueva empieza en el plan gratuito", d.plan === "free", JSON.stringify(d.plan));
check("el plan gratuito declara 1 web", d.limites.webs === 1, JSON.stringify(d.limites));

// --- Límite de webs ---
let c1 = await crearWeb("Web 1");
check("la primera web se crea", c1.status === 201, JSON.stringify(c1.body));
const proyecto1 = c1.body.projectId;
let c2 = await crearWeb("Web 2");
check("la segunda web se corta con 402 y mensaje exacto",
  c2.status === 402 && c2.body.error === "Tu plan incluye 1 web. Mejora de plan para publicar más.",
  `${c2.status} ${JSON.stringify(c2.body)}`);

// --- Dominio propio: bloqueado en gratis ---
r = await fetch(`${BASE}/api/projects/${proyecto1}`, {
  method: "PATCH", headers: HJ, body: JSON.stringify({ dominio: "mi-dominio-e2e.com" }),
});
d = await r.json();
check("conectar dominio propio en gratis → 402 mensaje exacto",
  r.status === 402 && d.error === "Conectar tu propio dominio está disponible en los planes de pago",
  `${r.status} ${JSON.stringify(d)}`);

// --- Equipo: bloqueado en gratis ---
r = await fetch(`${BASE}/api/equipo/invitar`, {
  method: "POST", headers: HJ, body: JSON.stringify({ email: "alguien@ejemplo.com", rol: "editor" }),
});
d = await r.json();
check("invitar al equipo en gratis → 402 mensaje exacto",
  r.status === 402 && d.error === "Invitar a tu equipo está disponible en el plan Agencia",
  `${r.status} ${JSON.stringify(d)}`);

// --- Al subir de plan se desbloquea ---
await planAgencia(email);
d = await (await fetch(`${BASE}/api/plan`, { headers: H })).json();
check("tras subir, el plan es agencia con 25 webs", d.plan === "agencia" && d.limites.webs === 25, JSON.stringify(d.plan));
check("el uso refleja la web creada", d.uso.webs === 1, JSON.stringify(d.uso));

c2 = await crearWeb("Web 2 (ya con plan)");
check("ahora sí se puede crear la segunda web", c2.status === 201, JSON.stringify(c2.body));

// limpieza
await fetch(`${BASE}/api/cuenta`, { method: "DELETE", headers: H });

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
