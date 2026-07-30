// E2e del incremento 21: servir carpetas y URLs limpias, con su barra final.
//
// Los tests unitarios ya cubren resolvePublicSite, pero aquí interesa el camino
// COMPLETO: qué hace Next con la barra final ANTES de llegar a nuestro código.
// Eso no se puede saber con un doble de storage, solo pidiéndolo por HTTP — y es
// crítico: si Next se comiera la barra, la redirección de resolve-site sería un
// BUCLE INFINITO en la web de todos los clientes a la vez.
//
// Usuario DESECHABLE (@wordclicks.local); se borra al final. NO gasta IA ni SerpAPI.
import http from "node:http";
import { createRequire } from "node:module";
import { marcarVerificado } from "./lib/plan.mjs";

const RAIZ = "C:/Users/Sebas/Desktop/Carpeta de Proyectos/Wordclicks";
const require = createRequire(RAIZ + "/package.json");
const { zipSync, strToU8 } = require("fflate");
const BASE = "http://localhost:3000";

let PASS = 0, FAIL = 0;
function check(n, c, e = "") {
  if (c) { PASS++; console.log(`  PASS  ${n}`); }
  else { FAIL++; console.log(`  FAIL  ${n}${e ? " — " + e : ""}`); }
}

const J = { "content-type": "application/json" };
const marcaTiempo = Date.now();
const email = `e2e-rutas-${marcaTiempo}@wordclicks.local`;
const sub = `e2e-rutas-${marcaTiempo}`;

// `fetch` no deja fijar Host; con http directo se recorre el camino real
// (middleware → rewrite a /sites/...). Sin seguir redirecciones, que es
// justamente lo que se quiere observar.
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
  body: JSON.stringify({ nombre: "E2E Rutas", email, password: "e2e-clave-fija-para-pruebas-123" }),
});
const cookie = (r.headers.get("set-cookie") ?? "").split(";")[0];
check("registro desechable → sesión", r.ok && cookie.startsWith("__Host-wc_session="), String(r.status));
const H = { cookie };
const HJ = { cookie, "content-type": "application/json" };

// Una web como la de Quantiva: blog en carpeta, artículos enlazados sin .html, y
// enlaces RELATIVOS dentro de cada página, que es lo que obliga a acertar con la
// barra final.
const zip = zipSync({
  "index.html": strToU8('<!doctype html><html><body><h1>Portada</h1><a href="/blog/">Blog</a></body></html>'),
  "contacto.html": strToU8('<!doctype html><html><body><h1>CONTACTO</h1><a href="equipo.html">equipo</a></body></html>'),
  "equipo.html": strToU8("<!doctype html><html><body><h1>EQUIPO</h1></body></html>"),
  "blog/index.html": strToU8('<!doctype html><html><body><h1>INDICE BLOG</h1><a href="mi-articulo">art</a><img src="foto.html"></body></html>'),
  "blog/mi-articulo.html": strToU8("<!doctype html><html><body><h1>EL ARTICULO</h1></body></html>"),
  "blog/foto.html": strToU8("<!doctype html><html><body><h1>FOTO DEL BLOG</h1></body></html>"),
  "css/app.css": strToU8("body{color:#000}"),
});
let fd = new FormData();
fd.append("file", new Blob([zip], { type: "application/zip" }), "sitio.zip");
fd.append("nombre", "Web con blog");
r = await fetch(`${BASE}/api/projects`, { method: "POST", headers: H, body: fd });
const { projectId } = await r.json();
check("crear la web → 201", r.status === 201 && !!projectId, String(r.status));

await marcarVerificado(email);
r = await fetch(`${BASE}/api/projects/${projectId}`, { method: "PATCH", headers: HJ, body: JSON.stringify({ subdominio: sub }) });
check("asignar subdominio → 200", r.ok, String(r.status));
r = await fetch(`${BASE}/api/projects/${projectId}/publish`, { method: "POST", headers: H });
check("publicar → 200", r.ok, String(r.status));

const HOST = `${sub}.localhost:3000`;

// ------------------------------------------------------- lo que ya funcionaba
check("la portada sigue sirviéndose", (await pedir(HOST)).body.includes("<h1>Portada</h1>"));
check("un asset sigue sirviéndose", (await pedir(HOST, "/css/app.css")).status === 200);
check("una página con .html sigue sirviéndose", (await pedir(HOST, "/contacto.html")).body.includes("CONTACTO"));

// --------------------------------------------- lo que daba 404 hasta el 21
const blogBarra = await pedir(HOST, "/blog/");
check("/blog/ → 200 con el índice del blog", blogBarra.status === 200 && blogBarra.body.includes("INDICE BLOG"), `${blogBarra.status}`);

const art = await pedir(HOST, "/blog/mi-articulo");
check("/blog/mi-articulo (URL limpia) → 200", art.status === 200 && art.body.includes("EL ARTICULO"), `${art.status}`);

const cont = await pedir(HOST, "/contacto");
check("/contacto (sin .html) → 200", cont.status === 200 && cont.body.includes("CONTACTO"), `${cont.status}`);

// ---------------------------- LA BARRA FINAL, que decide los enlaces relativos
// Si Next se comiera la barra antes de llegarnos, resolve-site redirigiría a una
// dirección que vuelve a llegar sin ella: bucle infinito. Por eso se sigue la
// cadena entera en vez de mirar solo el primer salto.
const sigue = async (ruta, saltos = 5) => {
  const visitadas = [];
  for (let i = 0; i < saltos; i++) {
    const res = await pedir(HOST, ruta);
    visitadas.push(`${ruta} → ${res.status}`);
    if (res.status < 300 || res.status >= 400 || !res.headers.location) return { res, visitadas };
    const sig = new URL(res.headers.location, `http://${HOST}`);
    ruta = sig.pathname + sig.search;
  }
  return { res: null, visitadas }; // se agotaron los saltos = bucle
};

const aBlog = await sigue("/blog");
console.log(`\n  [dato] ${aBlog.visitadas.join("  |  ")}`);
check("/blog acaba en el blog y NO entra en bucle",
  aBlog.res !== null && aBlog.res.status === 200 && aBlog.res.body.includes("INDICE BLOG"),
  aBlog.visitadas.join(" | "));

const aContacto = await sigue("/contacto/");
console.log(`  [dato] ${aContacto.visitadas.join("  |  ")}\n`);
check("/contacto/ acaba en contacto y NO entra en bucle",
  aContacto.res !== null && aContacto.res.status === 200 && aContacto.res.body.includes("CONTACTO"),
  aContacto.visitadas.join(" | "));

// El motivo de todo lo anterior: que los enlaces RELATIVOS caigan donde su autor
// esperaba. Se resuelven igual que haría el navegador y se piden de verdad.
const relBlog = new URL("foto.html", `http://${HOST}/blog/`).pathname;
check("un enlace relativo del índice del blog apunta dentro de /blog/", relBlog === "/blog/foto.html", relBlog);
const foto = await pedir(HOST, relBlog);
check("y ahí está de verdad", foto.status === 200 && foto.body.includes("FOTO DEL BLOG"), `${foto.status}`);

const relCont = new URL("equipo.html", `http://${HOST}/contacto`).pathname;
check("y uno de /contacto apunta a la raíz, NO a /contacto/", relCont === "/equipo.html", relCont);
const equipo = await pedir(HOST, relCont);
check("y ahí está la página de equipo", equipo.status === 200 && equipo.body.includes("EQUIPO"), `${equipo.status}`);

// La query no se puede perder: es de donde viene la gente en una campaña.
const conUtm = await pedir(HOST, "/blog?utm_source=instagram");
check("la redirección conserva el ?utm_source",
  conUtm.headers.location === "/blog/?utm_source=instagram", String(conUtm.headers.location));

// ------------------------------- la plataforma se queda como estaba: sin barra
const loginBarra = await pedir("localhost:3000", "/login/");
check("la plataforma sigue normalizando: /login/ redirige a /login",
  loginBarra.status === 308 && (loginBarra.headers.location ?? "").endsWith("/login"),
  `${loginBarra.status} ${loginBarra.headers.location}`);
check("y /login sigue sirviéndose sin redirigir", (await pedir("localhost:3000", "/login")).status === 200);

// ------------------------------------------------------- lo que NO debe cambiar
const noExiste = await pedir(HOST, "/no-existe");
check("una ruta inventada sigue dando la 404 de plataforma",
  noExiste.status === 404 && noExiste.body.includes("No encontrado"), String(noExiste.status));

const sitemap = await pedir(HOST, "/sitemap.xml");
check("el sitemap de emergencia sigue generándose",
  sitemap.status === 200 && sitemap.headers["content-type"].includes("xml"), String(sitemap.status));
check("y anuncia el blog con su barra, no su index.html",
  sitemap.body.includes("/blog/</loc>") && !sitemap.body.includes("blog/index.html"), sitemap.body);

check("el plan gratuito sigue llevando su insignia en lo servido por carpeta",
  (await pedir(HOST, "/blog/")).body.includes("Hecho con"), "no aparece la insignia");

// limpieza
await fetch(`${BASE}/api/cuenta`, { method: "DELETE", headers: H });

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
