// E2e del incremento 21: servir carpetas y URLs limpias.
//
// Los tests unitarios ya cubren resolvePublicSite, pero aquí interesa el camino
// COMPLETO: qué hace Next con la barra final ANTES de llegar a nuestro código.
// Eso no se puede saber con un doble de storage, solo pidiéndolo por HTTP.
//
// Usuario DESECHABLE (@wordclicks.local); se borra al final. NO gasta IA ni SerpAPI.
import { readFileSync } from "node:fs";
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

// Una web como la de Quantiva: blog en carpeta, artículos enlazados sin .html,
// y páginas sueltas con canónico con barra final.
const zip = zipSync({
  "index.html": strToU8('<!doctype html><html><body><h1>Portada</h1><a href="/blog/">Blog</a></body></html>'),
  "contacto.html": strToU8("<!doctype html><html><body><h1>CONTACTO</h1></body></html>"),
  "blog/index.html": strToU8('<!doctype html><html><body><h1>INDICE BLOG</h1><a href="/blog/mi-articulo">art</a></body></html>'),
  "blog/mi-articulo.html": strToU8("<!doctype html><html><body><h1>EL ARTICULO</h1></body></html>"),
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
const blog = await pedir(HOST, "/blog");
check("/blog → 200 con el índice del blog", blog.status === 200 && blog.body.includes("INDICE BLOG"), `${blog.status}`);

const art = await pedir(HOST, "/blog/mi-articulo");
check("/blog/mi-articulo (URL limpia) → 200", art.status === 200 && art.body.includes("EL ARTICULO"), `${art.status}`);

const cont = await pedir(HOST, "/contacto");
check("/contacto (sin .html) → 200", cont.status === 200 && cont.body.includes("CONTACTO"), `${cont.status}`);

// ------------------------------------ LA BARRA FINAL: qué hace Next con ella
// Esto es lo que no se puede saber con tests unitarios. Se documenta lo que
// realmente pasa para no decidir el 301 a ciegas.
const conBarra = await pedir(HOST, "/blog/");
console.log(`\n  [dato] GET /blog/ → ${conBarra.status}${conBarra.headers.location ? ` → ${conBarra.headers.location}` : ""}`);
const contBarra = await pedir(HOST, "/contacto/");
console.log(`  [dato] GET /contacto/ → ${contBarra.status}${contBarra.headers.location ? ` → ${contBarra.headers.location}` : ""}\n`);

// Sea sirviendo directo (200) o normalizando (redirección a la misma sin barra),
// lo que NO puede pasar es un 404: la web enlaza a /blog/ desde su propio menú.
check("/blog/ no se pierde: o sirve o redirige, pero nunca 404",
  conBarra.status !== 404, String(conBarra.status));
if (conBarra.status >= 300 && conBarra.status < 400) {
  const destino = await pedir(HOST, new URL(conBarra.headers.location, `http://${HOST}`).pathname);
  check("y siguiendo esa redirección se llega al blog", destino.status === 200 && destino.body.includes("INDICE BLOG"),
    `${destino.status}`);
}
check("/contacto/ tampoco se pierde", contBarra.status !== 404, String(contBarra.status));

// ------------------------------------------------------- lo que NO debe cambiar
const noExiste = await pedir(HOST, "/no-existe");
check("una ruta inventada sigue dando la 404 de plataforma",
  noExiste.status === 404 && noExiste.body.includes("No encontrado"), String(noExiste.status));

const sitemap = await pedir(HOST, "/sitemap.xml");
check("el sitemap de emergencia sigue generándose",
  sitemap.status === 200 && sitemap.headers["content-type"].includes("xml"), String(sitemap.status));

const marca = await pedir(HOST, "/blog");
check("el plan gratuito sigue llevando su insignia en lo servido por carpeta",
  marca.body.includes("Hecho con"), "no aparece la insignia");

// limpieza
await fetch(`${BASE}/api/cuenta`, { method: "DELETE", headers: H });

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
