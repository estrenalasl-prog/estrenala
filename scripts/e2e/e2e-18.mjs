// E2e del incremento 17: el blog es de los planes de pago y las webs del plan
// gratuito llevan la marca «Hecho con Estrénala».
//
// Usuario DESECHABLE (@wordclicks.local); se borra al final. NO gasta IA ni
// SerpAPI: en el plan gratuito el 402 salta ANTES de llamar a nada, y una vez
// con plan solo se tocan rutas de lectura y de guardado.
import { readFileSync } from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import { ponerPlan, marcarVerificado } from "./lib/plan.mjs";

const RAIZ = "C:/Users/Sebas/Desktop/Carpeta de Proyectos/Wordclicks";
const require = createRequire(RAIZ + "/package.json");
const { zipSync, strToU8 } = require("fflate");
const BASE = "http://localhost:3000";
readFileSync(RAIZ + "/.env.local", "utf8"); // guarda: existe

const MSG_BLOG = "El blog automático está disponible en los planes de pago";

let PASS = 0, FAIL = 0;
function check(n, c, e = "") {
  if (c) { PASS++; console.log(`  PASS  ${n}`); }
  else { FAIL++; console.log(`  FAIL  ${n}${e ? " — " + e : ""}`); }
}

const J = { "content-type": "application/json" };
const marcaTiempo = Date.now();
const email = `e2e-blog-marca-${marcaTiempo}@wordclicks.local`;
const sub = `e2e-marca-${marcaTiempo}`;

let r = await fetch(`${BASE}/api/registro`, {
  method: "POST", headers: J,
  body: JSON.stringify({ nombre: "E2E Marca", email, password: "e2e-clave-fija-para-pruebas-123" }),
});
const cookie = (r.headers.get("set-cookie") ?? "").split(";")[0];
check("registro desechable → sesión", r.ok && cookie.startsWith("wc_session="), String(r.status));
const H = { cookie };
const HJ = { cookie, "content-type": "application/json" };

const zip = zipSync({ "index.html": strToU8("<!doctype html><html><body><h1>Mi web</h1></body></html>") });
let fd = new FormData();
fd.append("file", new Blob([zip], { type: "application/zip" }), "sitio.zip");
fd.append("nombre", "Web con marca");
r = await fetch(`${BASE}/api/projects`, { method: "POST", headers: H, body: fd });
const { projectId } = await r.json();
check("crear la web → 201", r.status === 201 && !!projectId, String(r.status));
const API = `${BASE}/api/projects/${projectId}`;

// ---------------------------------------------------------------- blog cerrado
// Se prueban TODAS las puertas del blog, no una de muestra: es la superficie
// entera la que tiene que estar cerrada.
const puertas = [
  ["GET", "/blog"],
  ["GET", "/blog/settings"],
  ["PUT", "/blog/settings", { nicho: "cafeterías", idioma: "es", keywordsSemilla: "café" }],
  ["GET", "/blog/template"],
  ["POST", "/blog/template"],
  ["PUT", "/blog/template", { tplPost: "<html></html>", tplIndex: "<html></html>" }],
  ["GET", "/blog/posts/inventado"],
  ["POST", "/blog/posts", { titulo: "t", slug: "s", metaDescripcion: "m", md: "# hola", imagenAssetId: "" }],
  ["PUT", "/blog/posts/inventado", { titulo: "t", slug: "s", metaDescripcion: "m", md: "# hola", imagenAssetId: "" }],
  ["DELETE", "/blog/posts/inventado"],
  ["GET", "/blog/keywords"],
  ["PUT", "/blog/keywords/inventada", { estado: "usada" }],
  ["POST", "/blog/keywords/radar"],
  ["GET", "/blog/drafts"],
  ["POST", "/blog/drafts", { keyword: "café de especialidad" }],
  ["GET", "/blog/drafts/inventado"],
  ["DELETE", "/blog/drafts/inventado"],
  ["POST", "/blog/drafts/inventado/stage"],
  ["POST", "/blog/preview", { titulo: "t", md: "# hola" }],
  ["POST", "/blog/portada", { titulo: "t", modo: "auto" }],
  ["GET", "/blog/piloto"],
  ["PUT", "/blog/piloto", { activo: true, cadaDias: 3, hora: 9, portada: "auto" }],
  ["GET", "/blog/programados"],
  ["POST", "/blog/programados", { titulo: "t", slug: "s", metaDescripcion: "m", md: "x", imagenAssetId: "", publicarEn: "2030-01-01T10:00:00Z" }],
  ["DELETE", "/blog/programados/inventado"],
];

let cerradas = 0, mensajesOk = 0;
for (const [metodo, ruta, cuerpo] of puertas) {
  const res = await fetch(API + ruta, {
    method: metodo, headers: cuerpo ? HJ : H, body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (res.status === 402) cerradas++; else console.log(`        ↳ ${metodo} ${ruta} devolvió ${res.status} ${JSON.stringify(j)}`);
  if (j.error === MSG_BLOG) mensajesOk++;
}
check(`las ${puertas.length} rutas del blog responden 402 en el plan gratuito`, cerradas === puertas.length, `${cerradas}/${puertas.length}`);
check("todas dan el mensaje exacto del plan", mensajesOk === puertas.length, `${mensajesOk}/${puertas.length}`);

// --------------------------------------------------------- marca al publicar
await marcarVerificado(email); // publicar exige correo confirmado

r = await fetch(API, { method: "PATCH", headers: HJ, body: JSON.stringify({ subdominio: sub }) });
check("asignar subdominio → 200", r.ok, `${r.status} ${JSON.stringify(await r.json().catch(() => ({})))}`);
r = await fetch(`${API}/publish`, { method: "POST", headers: H });
check("publicar → 200", r.ok, `${r.status} ${JSON.stringify(await r.json().catch(() => ({})))}`);

// La web se pide como la pediría un visitante: con la cabecera Host del
// subdominio. `fetch` no deja tocar Host (la fija desde la URL), así que se usa
// http directamente — así el camino real pasa por el middleware y su rewrite.
function verWeb() {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port: 3000, path: "/", method: "GET", headers: { host: `${sub}.localhost:3000` } },
      (res) => { let t = ""; res.setEncoding("utf8"); res.on("data", (c) => { t += c; }); res.on("end", () => resolve(t)); }
    );
    req.on("error", reject);
    req.end();
  });
}

let html = await verWeb();
check("la web del plan gratuito sale con la marca", html.includes('id="estrenala-marca"'), html.slice(-200));
check("la marca dice «Hecho con Estrénala»", html.includes("Hecho con Estrénala"));
check("la marca va justo antes de </body>", html.indexOf("estrenala-marca") < html.indexOf("</body>"));
check("el contenido original sigue intacto", html.includes("<h1>Mi web</h1>"));

// ------------------------------------------------- con plan: sin marca, con blog
await ponerPlan(email, "personal");

html = await verWeb();
check("al pasar a Personal la marca desaparece SIN republicar", !html.includes("estrenala-marca"), html.slice(-200));
check("y la web sigue sirviéndose igual", html.includes("<h1>Mi web</h1>"));

r = await fetch(`${API}/blog`, { headers: H });
check("con plan, el blog ya responde", r.status === 200, String(r.status));
r = await fetch(`${API}/blog/settings`, {
  method: "PUT", headers: HJ, body: JSON.stringify({ nicho: "cafeterías", idioma: "es", keywordsSemilla: "café" }),
});
check("con plan, se pueden guardar los ajustes del blog", r.status === 200, String(r.status));

// ------------------------------------------------------- al bajar, todo vuelve
await ponerPlan(email, "free");

html = await verWeb();
check("si se cancela, la marca vuelve sola", html.includes("estrenala-marca"));
r = await fetch(`${API}/blog`, { headers: H });
check("y el blog se cierra otra vez (402)", r.status === 402, String(r.status));

// limpieza
await fetch(`${BASE}/api/cuenta`, { method: "DELETE", headers: H });

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
