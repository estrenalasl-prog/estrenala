// E2e del incremento 18: control de indexación.
//   1) interruptor por web «Que Google no la encuentre todavía» (X-Robots-Tag)
//   2) canónico del subdominio hacia el dominio propio
//   3) robots.txt de la plataforma
//
// Usuario DESECHABLE (@wordclicks.local); se borra al final. NO gasta IA ni
// SerpAPI: aquí no se llama a ninguna ruta que use modelos.
import { readFileSync } from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import { ponerPlan, marcarVerificado } from "./lib/plan.mjs";

const RAIZ = "C:/Users/Sebas/Desktop/Carpeta de Proyectos/Wordclicks";
const require = createRequire(RAIZ + "/package.json");
const { zipSync, strToU8 } = require("fflate");
const BASE = "http://localhost:3000";
const ENV = readFileSync(RAIZ + "/.env.local", "utf8"); // guarda: existe
// El candado de pre-lanzamiento cambia el robots.txt esperado.
const OCULTA = /^PLATAFORMA_NOINDEX=\s*(1|true|si|sí)\s*$/im.test(ENV);

let PASS = 0, FAIL = 0;
function check(n, c, e = "") {
  if (c) { PASS++; console.log(`  PASS  ${n}`); }
  else { FAIL++; console.log(`  FAIL  ${n}${e ? " — " + e : ""}`); }
}

const J = { "content-type": "application/json" };
const marcaTiempo = Date.now();
const email = `e2e-noindex-${marcaTiempo}@wordclicks.local`;
const sub = `e2e-noindex-${marcaTiempo}`;
const dominioPropio = `e2e-noindex-${marcaTiempo}.com`;

// Se pide como lo pediría un visitante: con la cabecera Host de la web. `fetch`
// no deja tocar Host (la fija desde la URL), así que se usa http directamente —
// así el camino real pasa por el middleware y su rewrite.
function pedir(host, path = "/") {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port: 3000, path, method: "GET", headers: { host } },
      (res) => {
        let t = "";
        res.setEncoding("utf8");
        res.on("data", (c) => { t += c; });
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: t }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

let r = await fetch(`${BASE}/api/registro`, {
  method: "POST", headers: J,
  body: JSON.stringify({ nombre: "E2E NoIndex", email, password: "e2e-clave-fija-para-pruebas-123" }),
});
const cookie = (r.headers.get("set-cookie") ?? "").split(";")[0];
check("registro desechable → sesión", r.ok && cookie.startsWith("__Host-wc_session="), String(r.status));
const H = { cookie };
const HJ = { cookie, "content-type": "application/json" };

const zip = zipSync({
  "index.html": strToU8("<!doctype html><html><body><h1>Mi web</h1></body></html>"),
  "css/app.css": strToU8("body{color:#000}"),
});
let fd = new FormData();
fd.append("file", new Blob([zip], { type: "application/zip" }), "sitio.zip");
fd.append("nombre", "Web sin indexar");
r = await fetch(`${BASE}/api/projects`, { method: "POST", headers: H, body: fd });
const { projectId } = await r.json();
check("crear la web → 201", r.status === 201 && !!projectId, String(r.status));
const API = `${BASE}/api/projects/${projectId}`;

await marcarVerificado(email); // publicar exige correo confirmado
r = await fetch(API, { method: "PATCH", headers: HJ, body: JSON.stringify({ subdominio: sub }) });
check("asignar subdominio → 200", r.ok, `${r.status} ${JSON.stringify(await r.json().catch(() => ({})))}`);
r = await fetch(`${API}/publish`, { method: "POST", headers: H });
check("publicar → 200", r.ok, `${r.status} ${JSON.stringify(await r.json().catch(() => ({})))}`);

const HOST = `${sub}.localhost:3000`;

// ------------------------------------------- por defecto, la web SÍ se indexa
let web = await pedir(HOST);
check("la web publicada se sirve", web.status === 200 && web.body.includes("<h1>Mi web</h1>"), String(web.status));
check("por defecto NO lleva X-Robots-Tag", web.headers["x-robots-tag"] === undefined, String(web.headers["x-robots-tag"]));

// --------------------------------------------------- se activa el interruptor
r = await fetch(API, { method: "PATCH", headers: HJ, body: JSON.stringify({ noIndexar: true }) });
const j = await r.json().catch(() => ({}));
check("activar «que no la encuentren» → 200", r.ok && j.noIndexar === true, `${r.status} ${JSON.stringify(j)}`);

web = await pedir(HOST);
check("la web sale con noindex SIN republicar", web.headers["x-robots-tag"] === "noindex, nofollow", String(web.headers["x-robots-tag"]));
check("y el HTML no se ha tocado", web.body.includes("<h1>Mi web</h1>") && !web.body.includes("robots"));

const css = await pedir(HOST, "/css/app.css");
check("también protege lo que no es HTML", css.status === 200 && css.headers["x-robots-tag"] === "noindex, nofollow", String(css.headers["x-robots-tag"]));

// ------------------------------------------------------------- y se desactiva
r = await fetch(API, { method: "PATCH", headers: HJ, body: JSON.stringify({ noIndexar: false }) });
check("desactivarlo → 200", r.ok, String(r.status));
web = await pedir(HOST);
check("la cabecera desaparece al momento", web.headers["x-robots-tag"] === undefined, String(web.headers["x-robots-tag"]));

// ------------------------------------------- canónico hacia el dominio propio
await ponerPlan(email, "personal"); // conectar dominio propio es de plan de pago
r = await fetch(API, { method: "PATCH", headers: HJ, body: JSON.stringify({ dominio: dominioPropio }) });
check("conectar dominio propio → 200", r.ok, `${r.status} ${JSON.stringify(await r.json().catch(() => ({})))}`);

web = await pedir(HOST);
check("la web sigue viva en el subdominio (NO se redirige)", web.status === 200 && !web.headers.location, String(web.status));
check("el subdominio anuncia el canónico del dominio propio",
  web.headers.link === `<https://${dominioPropio}/>; rel="canonical"`, String(web.headers.link));

const porDominio = await pedir(dominioPropio);
check("entrando por el dominio propio se sirve la misma web", porDominio.status === 200 && porDominio.body.includes("<h1>Mi web</h1>"), String(porDominio.status));
check("y ahí no se anuncia canónico (ya es el bueno)", porDominio.headers.link === undefined, String(porDominio.headers.link));

const cssSub = await pedir(HOST, "/css/app.css");
check("los assets no llevan canónico", cssSub.headers.link === undefined, String(cssSub.headers.link));

// noindex y canónico son excluyentes: manda el noindex.
await fetch(API, { method: "PATCH", headers: HJ, body: JSON.stringify({ noIndexar: true }) });
web = await pedir(HOST);
check("con noindex puesto, manda el noindex y no hay canónico",
  web.headers["x-robots-tag"] === "noindex, nofollow" && web.headers.link === undefined,
  `${web.headers["x-robots-tag"]} / ${web.headers.link}`);

// --------------------------------------------------- robots.txt de la plataforma
const robots = await pedir("localhost:3000", "/robots.txt");
check("/robots.txt es público (no pide sesión)", robots.status === 200, String(robots.status));
if (OCULTA) {
  check("con PLATAFORMA_NOINDEX, se prohíbe todo", /Disallow:\s*\/\s*$/m.test(robots.body), robots.body);
} else {
  check("la plataforma se rastrea", /Allow:\s*\//.test(robots.body), robots.body);
  check("pero el panel y la API quedan fuera",
    robots.body.includes("Disallow: /api/") && robots.body.includes("Disallow: /projects/"), robots.body);
}

// ------------------------------------- la tarjeta al compartir y los iconos
// Todo esto lo piden navegador y buscadores SIN sesión. Iban al 307 de /login
// hasta el 2026-07-29: el icono no se veía en la landing.
for (const ruta of ["/icon.png", "/apple-icon.png", "/brand/og.png"]) {
  const a = await pedir("localhost:3000", ruta);
  check(`${ruta} se sirve sin sesión`, a.status === 200, String(a.status));
}

const landing = await pedir("localhost:3000", "/");
const meta = (p) => landing.body.match(new RegExp(`<meta property="${p}" content="([^"]*)"`))?.[1];
check("la landing anuncia og:image", !!meta("og:image"), String(meta("og:image")));
check("y la anuncia ABSOLUTA (si es relativa, WhatsApp no la pinta)",
  (meta("og:image") ?? "").startsWith("http"), String(meta("og:image")));
check("con su tamaño declarado 1200×630", meta("og:image:width") === "1200" && meta("og:image:height") === "630");
check("y tarjeta grande en X", landing.body.includes('name="twitter:card" content="summary_large_image"'));

// ------------------------- lo que depende del entorno EN CADA PETICIÓN
// Guarda de una clase de fallo que ya ha mordido dos veces: si una página se
// prerenderiza al construir, `process.env` se evalúa en el build —donde Dokploy
// todavía no ha inyectado nada— y el valor se queda congelado. Así desapareció
// el botón «Continuar con Google» de producción el 2026-07-29, con el OAuth
// perfectamente configurado. Se arregla con force-dynamic en el layout.
if (/^GOOGLE_CLIENT_ID=.+$/m.test(ENV) && /^GOOGLE_CLIENT_SECRET=.+$/m.test(ENV)) {
  // «Continuar con Google» en el login y «Regístrate con Google» en el registro:
  // se busca lo que tienen en común para no atarse a la redacción.
  for (const ruta of ["/registro", "/login"]) {
    const p = await pedir("localhost:3000", ruta);
    check(`${ruta} enseña el botón de Google cuando está configurado`,
      p.body.includes("con Google"), `${p.status}, ${p.body.length} bytes`);
  }
} else {
  console.log("  SKIP  el botón de Google (no hay credenciales en .env.local)");
}

// ------------------------------------------------- cabeceras de seguridad
const panel = await pedir("localhost:3000", "/login");
check("la plataforma manda HSTS", (panel.headers["strict-transport-security"] ?? "").includes("max-age=31536000"), String(panel.headers["strict-transport-security"]));
check("y nosniff, referrer-policy y antisecuestro de clics",
  panel.headers["x-content-type-options"] === "nosniff" &&
  panel.headers["referrer-policy"] === "strict-origin-when-cross-origin" &&
  panel.headers["content-security-policy"] === "frame-ancestors 'none'");

// LO IMPORTANTE: esas cabeceras NO pueden salpicar a las webs de los clientes.
// Un HSTS con includeSubDomains sobre el dominio de un cliente le impondría
// HTTPS en TODO su dominio, incluidos subdominios que no servimos nosotros.
const deCliente = await pedir(HOST);
check("una web de cliente NO recibe HSTS", deCliente.headers["strict-transport-security"] === undefined, String(deCliente.headers["strict-transport-security"]));
check("ni frame-ancestors (romperia a quien incruste su propia web)", deCliente.headers["content-security-policy"] === undefined, String(deCliente.headers["content-security-policy"]));

// El panel enseña la web dentro de un <iframe> del MISMO origen. Con
// `frame-ancestors 'none'` se bloqueaba a sí mismo y el preview salía en blanco
// con «estrenala.com ha rechazado la conexión» (2026-07-30). Un test sobre la
// constante no lo habría cazado: el fallo estaba en el cableado del middleware,
// así que se pide la ruta de verdad.
const vista = await fetch(`${BASE}/api/projects/${projectId}/preview/index.html`, { headers: H });
const cspVista = vista.headers.get("content-security-policy");
check("el preview se sirve", vista.ok, String(vista.status));
check("y el panel PUEDE incrustarlo (si no, sale en blanco)",
  cspVista === "frame-ancestors 'self'", String(cspVista));
check("pero nadie más: sigue habiendo frame-ancestors",
  (cspVista ?? "").includes("frame-ancestors") && !(cspVista ?? "").includes("*"), String(cspVista));
check("y conserva el resto de cabeceras de seguridad",
  vista.headers.get("x-content-type-options") === "nosniff" &&
  (vista.headers.get("strict-transport-security") ?? "").includes("max-age=31536000"));

// limpieza
await fetch(`${BASE}/api/cuenta`, { method: "DELETE", headers: H });

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
