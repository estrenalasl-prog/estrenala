// E2e del incremento 4f (portada automática) SIN gastar IA y SIN tocar
// org_settings. La vía «ia» se SKIPea si hay clave real (gastaría céntimos).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const RAIZ = "C:/Users/Sebas/Desktop/Carpeta de Proyectos/Wordclicks";
const require = createRequire(RAIZ + "/package.json");
const { zipSync, strToU8 } = require("fflate");

const BASE = "http://localhost:3000";
const env = readFileSync(RAIZ + "/.env.local", "utf8");
const PASSWORD = env.match(/^PANEL_PASSWORD=(.+)$/m)[1].trim();

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

// Proyecto con colores de marca claros en su CSS (rosa #e11d48 dominante, azul #0ea5e9).
const zip = zipSync({
  "index.html": strToU8('<!doctype html><html><head><title>E2E 4f</title><link rel="stylesheet" href="styles.css"></head><body><h1>Portada</h1></body></html>'),
  "styles.css": strToU8("h1{color:#e11d48}.btn{background:#e11d48;border-color:#e11d48}.link{color:#0ea5e9}.link:hover{color:#0ea5e9}body{background:#ffffff;color:#111827}"),
});
let fd = new FormData();
fd.append("file", new Blob([zip], { type: "application/zip" }), "sitio.zip");
fd.append("nombre", "E2E 4f");
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
check("PUT plantillas a mano → 200", r.ok);

// --- validaciones ---
r = await fetch(`${API}/blog/portada`, { method: "POST", headers: HJ, body: JSON.stringify({ titulo: "  ", modo: "diseno" }) });
let d = await r.json();
check("sin título → 400 mensaje exacto", r.status === 400 && d.error === "Escribe primero el título del artículo", JSON.stringify(d));

r = await fetch(`${API}/blog/portada`, { method: "POST", headers: HJ, body: JSON.stringify({ titulo: "Hola", modo: "magia" }) });
d = await r.json();
check("modo raro → 400 mensaje exacto", r.status === 400 && d.error === "Modo desconocido", JSON.stringify(d));

// --- diseño gratis con los colores del sitio ---
const TITULO = "Automatiza tu pyme con IA & <ahorra>";
r = await fetch(`${API}/blog/portada`, { method: "POST", headers: HJ, body: JSON.stringify({ titulo: TITULO, modo: "diseno" }) });
d = await r.json();
check("portada diseno → 201 con assetId y url", r.status === 201 && !!d.assetId && String(d.url).endsWith(".svg"), JSON.stringify(d));
const asset = d;

r = await fetch(`${BASE}${asset.url}`, { headers: H });
const ct = r.headers.get("content-type") ?? "";
const svg = await r.text();
check("el asset servido es SVG", r.ok && ct.includes("image/svg+xml"), ct);
check("el SVG lleva el color dominante del css del sitio (#e11d48)", svg.includes("#e11d48"));
check("el SVG lleva el segundo color (#0ea5e9)", svg.includes("#0ea5e9"));
check("el SVG lleva el título escapado", svg.includes("&amp; &lt;ahorra&gt;") && !svg.includes("<ahorra>"));
check("el SVG lleva el nombre del sitio", svg.includes("E2E 4f"));
check("medidas og:image 1200×630", svg.includes('width="1200"') && svg.includes('height="630"'));

// --- la portada generada sirve para publicar un post de verdad (circuito 4a) ---
r = await fetch(`${API}/blog/posts`, {
  method: "POST", headers: HJ,
  body: JSON.stringify({
    titulo: "Post con portada generada",
    slug: "post-con-portada-generada",
    metaDescripcion: "Probando la portada automatica.",
    md: "## Hola\n\nPortada sin subir nada.",
    imagenAssetId: asset.assetId,
  }),
});
d = await r.json();
check("POST blog/posts con la portada generada → 201", r.status === 201 && !!d.postId, JSON.stringify(d));

r = await fetch(`${API}/preview/blog/img/post-con-portada-generada.svg`, { headers: H });
check("la portada quedó materializada en el blog (preview la sirve)", r.ok, String(r.status));

// --- vía IA: solo sin clave real (si la hay, gastaría céntimos) ---
const rClaves = await fetch(`${BASE}/api/settings`, { headers: H });
const claves = await rClaves.json();
if (claves.openrouter.origen === null) {
  r = await fetch(`${API}/blog/portada`, { method: "POST", headers: HJ, body: JSON.stringify({ titulo: "Hola", modo: "ia" }) });
  d = await r.json();
  check("portada ia sin clave → 500 mensaje exacto",
    r.status === 500 && d.error === "Falta la clave de OpenRouter: añádela en Configuración", JSON.stringify(d));
} else {
  console.log("  SKIP  portada ia (hay clave OpenRouter real configurada; no se gasta)");
}

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
