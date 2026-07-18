// E2e del incremento 4b (redacción IA) SIN gastar IA: siembra los artefactos en BD.
// Requiere: dev server en :3000 y Supabase real (.env.local del proyecto).
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

// --- login ---
const rLogin = await fetch(`${BASE}/api/login`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ password: PASSWORD }),
});
const cookie = (rLogin.headers.get("set-cookie") ?? "").split(";")[0];
check("login devuelve cookie", rLogin.ok && cookie.length > 5);
const H = { cookie };
const HJ = { cookie, "content-type": "application/json" };

// --- crear proyecto (ZIP mínimo) ---
const zip = zipSync({ "index.html": strToU8("<!doctype html><html><head><title>E2E 4b</title></head><body><h1>Portada</h1></body></html>") });
const fd = new FormData();
fd.append("file", new Blob([zip], { type: "application/zip" }), "sitio.zip");
fd.append("nombre", "E2E 4b");
const rProj = await fetch(`${BASE}/api/projects`, { method: "POST", headers: H, body: fd });
const { projectId } = await rProj.json();
check("crear proyecto", rProj.status === 201 && !!projectId, JSON.stringify(projectId));
const API = `${BASE}/api/projects/${projectId}`;

// --- settings: defaults y validaciones ---
let r = await fetch(`${API}/blog/settings`, { headers: H });
let d = await r.json();
check("GET settings sin fila → defaults", r.ok && d.nicho === "" && d.idioma === "es", JSON.stringify(d));

r = await fetch(`${API}/blog/drafts`, { method: "POST", headers: HJ, body: JSON.stringify({ keyword: "agentes ia para pymes" }) });
d = await r.json();
check("POST draft sin nicho → 400 mensaje exacto", r.status === 400 && d.error === "Configura primero de qué va tu blog (campo Nicho)", JSON.stringify(d));

r = await fetch(`${API}/blog/settings`, { method: "PUT", headers: HJ, body: JSON.stringify({ nicho: "IA para pymes" }) });
check("PUT settings nicho → 200", r.ok);
r = await fetch(`${API}/blog/settings`, { headers: H });
d = await r.json();
check("GET settings devuelve lo guardado", d.nicho === "IA para pymes" && d.idioma === "es", JSON.stringify(d));

// --- modelo de IA en Configuración (movido en 4d; se restaura al final) ---
r = await fetch(`${BASE}/api/settings`, { headers: H });
d = await r.json();
const modeloPrevio = d.modeloIa ?? "";
r = await fetch(`${BASE}/api/settings`, { method: "PUT", headers: HJ, body: JSON.stringify({ modeloIa: "anthropic/claude-haiku-4.5" }) });
check("PUT modeloIa en Configuración → 200", r.ok);
r = await fetch(`${BASE}/api/settings`, { headers: H });
d = await r.json();
check("GET /api/settings devuelve el modelo", d.modeloIa === "anthropic/claude-haiku-4.5", JSON.stringify(d.modeloIa));

r = await fetch(`${BASE}/api/settings`, { method: "PUT", headers: HJ, body: JSON.stringify({ modeloIa: "x".repeat(101) }) });
d = await r.json();
check("PUT modelo de 101 chars → 400 mensaje exacto",
  r.status === 400 && d.error === "El nombre del modelo es demasiado largo (máx. 100 caracteres)", JSON.stringify(d));

r = await fetch(`${BASE}/api/settings`, { method: "PUT", headers: HJ, body: JSON.stringify({ modeloIa: modeloPrevio }) });
check("restaurar el modelo previo → 200", r.ok);

// --- crear borrador ---
r = await fetch(`${API}/blog/drafts`, { method: "POST", headers: HJ, body: JSON.stringify({ keyword: "   " }) });
d = await r.json();
check("POST draft keyword vacía → 400 mensaje exacto", r.status === 400 && d.error === "Escribe una keyword o tema para el artículo", JSON.stringify(d));

r = await fetch(`${API}/blog/drafts`, { method: "POST", headers: HJ, body: JSON.stringify({ keyword: "agentes ia para pymes" }) });
d = await r.json();
const draftId = d.draftId;
check("POST draft → 201 draftId", r.status === 201 && !!draftId, JSON.stringify(d));

r = await fetch(`${API}/blog/drafts`, { headers: H });
d = await r.json();
check("GET drafts lo lista en pipeline", r.ok && d.length === 1 && d[0].keyword === "agentes ia para pymes" && d[0].estado === "pipeline", JSON.stringify(d));

r = await fetch(`${API}/blog/drafts/${draftId}`, { headers: H });
d = await r.json();
check("GET draft → 6 etapas incompletas, siguiente analisis",
  r.ok && d.etapas?.length === 6 && d.etapas.every((e) => !e.completada) && d.siguiente === "analisis" && d.draft.estado === "pipeline",
  JSON.stringify(d.etapas));

// --- prerrequisitos y etapa desconocida ---
r = await fetch(`${API}/blog/drafts/${draftId}/stage`, { method: "POST", headers: HJ, body: JSON.stringify({ etapa: "redaccion" }) });
d = await r.json();
check("POST stage redaccion sin analisis → 400 prerrequisito exacto",
  r.status === 400 && d.error === 'Antes hay que completar la etapa "analisis"', JSON.stringify(d));

r = await fetch(`${API}/blog/drafts/${draftId}/stage`, { method: "POST", headers: HJ, body: JSON.stringify({ etapa: "nada" }) });
d = await r.json();
check("POST stage etapa desconocida → 400", r.status === 400 && d.error === "Etapa desconocida", JSON.stringify(d));

r = await fetch(`${API}/blog/drafts/00000000-0000-4000-8000-00000000dead/stage`, { method: "POST", headers: HJ, body: JSON.stringify({ etapa: "analisis" }) });
d = await r.json();
check("POST stage con draft inexistente → 404", r.status === 404 && d.error === "Borrador no encontrado", JSON.stringify(d));

// --- sembrar artefactos en BD (sin IA) ---
const MD = "# Agentes IA para pymes\n\n## Qué son\n\nContenido sembrado por el e2e con [una fuente](https://ejemplo.com).\n\n## Conclusión\n\nFin.\n\n## FAQ\n\n**¿Sí?** Sí.";
const sql = postgres(DB_URL, { prepare: false });
await sql`update article_drafts set
  analisis_json = ${JSON.stringify({ keyword_principal: "agentes ia para pymes", keywords_secundarias: ["automatización"], intencion_busqueda: "informativa" })},
  plan_md = ${"- H1 y secciones"},
  investigacion_md = ${"- Dato (Fuente: https://ejemplo.com)"},
  articulo_md = ${MD},
  links_hechos = 1,
  titulo = ${"Agentes IA para pymes: guía práctica"},
  slug = ${"agentes-ia-para-pymes"},
  meta_descripcion = ${"Descubre cómo los agentes de IA ayudan a tu pyme: casos, costes y pasos para empezar hoy."},
  estado = 'revision'
  where id = ${draftId}`;
await sql.end();
console.log("  (artefactos sembrados en BD)");

r = await fetch(`${API}/blog/drafts/${draftId}`, { headers: H });
d = await r.json();
check("GET draft sembrado → todo completado y revision",
  r.ok && d.etapas.every((e) => e.completada) && d.siguiente === null && d.draft.estado === "revision",
  JSON.stringify({ siguiente: d.siguiente, estado: d.draft?.estado }));
const draft = d.draft;

// --- handoff: plantilla fixture + portada + guardar artículo (flujo 4a) ---
const TPL_POST = `<html><head><title>{{titulo}}</title><meta name="description" content="{{meta_descripcion}}"><link rel="canonical" href="{{canonical}}">{{json_ld}}</head><body><img src="{{imagen}}"><time>{{fecha}}</time><article>{{contenido}}</article></body></html>`;
const TPL_INDEX = `<html><head><title>Blog</title></head><body><ul><!--POST--><li><a href="/blog/{{slug}}.html">{{titulo}}</a> {{fecha}} {{meta_descripcion}} <img src="{{imagen}}"></li><!--/POST--></ul></body></html>`;
r = await fetch(`${API}/blog/template`, { method: "PUT", headers: HJ, body: JSON.stringify({ tplPost: TPL_POST, tplIndex: TPL_INDEX }) });
d = await r.json();
check("PUT plantillas fixture → 200", r.ok, JSON.stringify(d));

const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const fdImg = new FormData();
fdImg.append("file", new Blob([PNG_1PX], { type: "image/png" }), "portada.png");
r = await fetch(`${API}/assets`, { method: "POST", headers: H, body: fdImg });
d = await r.json();
const assetId = d.assetId;
check("subir portada → assetId", r.ok && !!assetId, JSON.stringify(d));

r = await fetch(`${API}/blog/posts`, {
  method: "POST", headers: HJ,
  body: JSON.stringify({
    titulo: draft.titulo, slug: draft.slug, metaDescripcion: draft.metaDescripcion,
    md: draft.articuloMd, imagenAssetId: assetId,
  }),
});
d = await r.json();
check("POST blog/posts con el borrador → 201", r.status === 201 && !!d.postId, JSON.stringify(d));

r = await fetch(`${API}/preview/blog/agentes-ia-para-pymes.html`, { headers: H });
const html = await r.text();
check("preview sirve el html del artículo", r.ok && html.includes("<h2>Qué son</h2>") && html.includes("Agentes IA para pymes: guía práctica"), html.slice(0, 200));

// --- borrar borrador (lo que haría el cliente tras guardar) ---
r = await fetch(`${API}/blog/drafts/${draftId}`, { method: "DELETE", headers: H });
check("DELETE draft → 200", r.ok);
r = await fetch(`${API}/blog/drafts`, { headers: H });
d = await r.json();
check("GET drafts → vacío", r.ok && d.length === 0, JSON.stringify(d));
r = await fetch(`${API}/blog/drafts/${draftId}`, { method: "DELETE", headers: H });
d = await r.json();
check("2º DELETE → 404 mensaje exacto", r.status === 404 && d.error === "Borrador no encontrado", JSON.stringify(d));

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
