// E2e del incremento 4e (publicación programada) SIN gastar IA ni SerpAPI y
// SIN tocar org_settings (claves reales del usuario — guarda del 2026-07-15).
// La plantilla se PUTea a mano (no se genera con IA) y la imagen es un PNG 1x1.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const RAIZ = "C:/Users/Sebas/Desktop/Carpeta de Proyectos/Wordclicks";
const require = createRequire(RAIZ + "/package.json");
const { zipSync, strToU8 } = require("fflate");
const postgres = require("postgres");

const BASE = "http://localhost:3000";
const env = readFileSync(RAIZ + "/.env.local", "utf8");
const PASSWORD = env.match(/^PANEL_PASSWORD=(.+)$/m)[1].trim();
const DB_URL = env.match(/^DATABASE_URL=(.+)$/m)[1].trim();

let PASS = 0, FAIL = 0;
function check(nombre, cond, extra = "") {
  if (cond) { PASS++; console.log(`  PASS  ${nombre}`); }
  else { FAIL++; console.log(`  FAIL  ${nombre}${extra ? " — " + extra : ""}`); }
}

const rLogin = await fetch(`${BASE}/api/login`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ password: PASSWORD }),
});
const cookie = (rLogin.headers.get("set-cookie") ?? "").split(";")[0];
check("login devuelve cookie", rLogin.ok && cookie.length > 5);
const H = { cookie };
const HJ = { cookie, "content-type": "application/json" };

// --- proyecto + plantilla (a mano, sin IA) + portada ---
const zip = zipSync({ "index.html": strToU8("<!doctype html><html><head><title>E2E 4e</title></head><body><h1>Portada</h1></body></html>") });
let fd = new FormData();
fd.append("file", new Blob([zip], { type: "application/zip" }), "sitio.zip");
fd.append("nombre", "E2E 4e");
const rProj = await fetch(`${BASE}/api/projects`, { method: "POST", headers: H, body: fd });
const { projectId } = await rProj.json();
check("crear proyecto", rProj.status === 201 && !!projectId);
const API = `${BASE}/api/projects/${projectId}`;

const TPL_POST =
  '<html><head><title>{{titulo}}</title><meta name="description" content="{{meta_descripcion}}">{{json_ld}}' +
  '<link rel="canonical" href="{{canonical}}"></head><body><img src="{{imagen}}" alt="{{titulo}}">' +
  "<p>{{fecha}}</p><article>{{contenido}}</article></body></html>";
const TPL_INDEX =
  '<html><body><!--POST--><div class="post"><a href="/blog/{{slug}}.html">{{titulo}}</a>' +
  "<p>{{meta_descripcion}}</p><span>{{fecha}}</span><img src=\"{{imagen}}\"></div><!--/POST--></body></html>";
let r = await fetch(`${API}/blog/template`, {
  method: "PUT", headers: HJ, body: JSON.stringify({ tplPost: TPL_POST, tplIndex: TPL_INDEX }),
});
check("PUT plantillas a mano → 200", r.ok, JSON.stringify(await r.json().catch(() => ({}))));

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
fd = new FormData();
fd.append("file", new Blob([PNG], { type: "image/png" }), "portada.png");
r = await fetch(`${API}/assets`, { method: "POST", headers: H, body: fd });
let d = await r.json();
const assetId = d.assetId;
check("subir portada → assetId", r.ok && !!assetId, JSON.stringify(d));

const articulo = (extra = {}) => ({
  titulo: "Articulo Programado E2E",
  slug: "articulo-programado-e2e",
  metaDescripcion: "Meta de prueba del articulo programado.",
  md: "## Hola\n\nEste articulo se publica solo.",
  imagenAssetId: assetId,
  publicarEn: new Date(Date.now() + 3600_000).toISOString(),
  ...extra,
});

// --- validaciones 400 (nada de esto debe crear filas) ---
r = await fetch(`${API}/blog/programados`, { method: "POST", headers: HJ, body: JSON.stringify(articulo({ publicarEn: "" })) });
d = await r.json();
check("sin fecha → 400 mensaje exacto", r.status === 400 && d.error === "Elige fecha y hora para programar", JSON.stringify(d));

r = await fetch(`${API}/blog/programados`, { method: "POST", headers: HJ, body: JSON.stringify(articulo({ publicarEn: new Date(Date.now() - 60_000).toISOString() })) });
d = await r.json();
check("fecha pasada → 400 mensaje exacto", r.status === 400 && d.error === "La fecha de publicación debe ser futura", JSON.stringify(d));

r = await fetch(`${API}/blog/programados`, { method: "POST", headers: HJ, body: JSON.stringify(articulo({ titulo: "" })) });
d = await r.json();
check("sin título → 400 con «Falta el título»", r.status === 400 && String(d.error).includes("Falta el título"), JSON.stringify(d));

r = await fetch(`${API}/blog/programados`, { headers: H });
d = await r.json();
check("GET programados → aún vacío", r.ok && d.length === 0, JSON.stringify(d));

// --- programar de verdad ---
r = await fetch(`${API}/blog/programados`, { method: "POST", headers: HJ, body: JSON.stringify(articulo()) });
d = await r.json();
const programadoId = d.programadoId;
check("programar → 201 con programadoId", r.status === 201 && !!programadoId, JSON.stringify(d));

r = await fetch(`${API}/blog/programados`, { headers: H });
d = await r.json();
check("GET programados → 1 fila pendiente con el contenido",
  r.ok && d.length === 1 && d[0].estado === "pendiente" && d[0].slug === "articulo-programado-e2e" && d[0].md.includes("se publica solo"),
  JSON.stringify(d));

r = await fetch(`${API}/blog/programados`, { method: "POST", headers: HJ, body: JSON.stringify(articulo()) });
d = await r.json();
check("mismo slug otra vez → 400 «ya existe»", r.status === 400 && String(d.error).includes("ya existe en este sitio"), JSON.stringify(d));

// --- vencerla por SQL y publicar vía cron ---
const sql = postgres(DB_URL, { prepare: false });
await sql`update scheduled_posts set publicar_en = now() - interval '1 minute' where id = ${programadoId}`;
console.log("  (publicar_en forzado al pasado por SQL)");

r = await fetch(`${BASE}/api/cron/publicar`, { method: "POST" });
d = await r.json();
// El tick del servidor (cada 60 s) puede habérsela llevado antes: lo que importa es el estado final.
check("POST /api/cron/publicar → 200", r.ok, JSON.stringify(d));
console.log(`  (cron: ${JSON.stringify(d)})`);

r = await fetch(`${API}/blog/programados`, { headers: H });
d = await r.json();
check("la fila quedó publicada con postId", d.length === 1 && d[0].estado === "publicado" && !!d[0].postId, JSON.stringify(d));

r = await fetch(`${API}/blog`, { headers: H });
d = await r.json();
check("el artículo existe en el blog", r.ok && d.posts.some((p) => p.slug === "articulo-programado-e2e"), JSON.stringify(d));

const [proj] = await sql`select published_snapshot_id, subdominio from projects where id = ${projectId}`;
check("el sitio quedó publicado (published_snapshot_id)", !!proj.published_snapshot_id, JSON.stringify(proj));
await sql.end();

// --- borrar programaciones ---
r = await fetch(`${API}/blog/programados`, { method: "POST", headers: HJ, body: JSON.stringify(articulo({ slug: "otro-articulo-e2e", titulo: "Otro" })) });
d = await r.json();
const pendiente2 = d.programadoId;
check("segunda programación → 201", r.status === 201 && !!pendiente2, JSON.stringify(d));
r = await fetch(`${API}/blog/programados/${pendiente2}`, { method: "DELETE", headers: H });
d = await r.json();
check("DELETE pendiente → ok", r.ok && d.ok === true, JSON.stringify(d));
r = await fetch(`${API}/blog/programados/${pendiente2}`, { method: "DELETE", headers: H });
d = await r.json();
check("DELETE repetido → 404 mensaje exacto", r.status === 404 && d.error === "Programación no encontrada", JSON.stringify(d));
r = await fetch(`${API}/blog/programados/${programadoId}`, { method: "DELETE", headers: H });
d = await r.json();
check("DELETE de la publicada (Ocultar) → ok", r.ok && d.ok === true, JSON.stringify(d));

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
