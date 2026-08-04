// Prueba de «Descargar mi web» de punta a punta: se crea una web con imágenes y
// blog, se descarga por HTTP y se comprueba que el ZIP se puede volver a subir.
import { createRequire } from "node:module";
import { marcarVerificado } from "./lib/plan.mjs";
const RAIZ = "C:/Users/Sebas/Desktop/Carpeta de Proyectos/Wordclicks";
const require = createRequire(RAIZ + "/package.json");
const { zipSync, unzipSync, strToU8 } = require("fflate");
const BASE = "http://localhost:3000";
let PASS = 0, FAIL = 0;
const check = (n, c, e = "") => { if (c) { PASS++; console.log(`  ✔  ${n}`); } else { FAIL++; console.log(`  ✘  ${n}${e ? " — " + e : ""}`); } };

const email = `descarga-${Date.now()}@wordclicks.local`;
let r = await fetch(`${BASE}/api/registro`, { method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ nombre: "Descarga", email, password: "e2e-clave-fija-para-pruebas-123" }) });
const cookie = (r.headers.get("set-cookie") ?? "").split(";")[0];
if (!r.ok) { console.error("no se pudo registrar", r.status); process.exit(1); }
const H = { cookie };

const zip = zipSync({
  "index.html": strToU8('<!doctype html><html lang="es"><head><title>Inicio — Café Miró</title></head><body><h1>Café Miró</h1></body></html>'),
  "css/app.css": strToU8("body{color:#222}"),
  "img/local.png": new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]),
});
const fd = new FormData();
fd.append("file", new Blob([zip], { type: "application/zip" }), "s.zip");
fd.append("nombre", "Café Miró");
r = await fetch(`${BASE}/api/projects`, { method: "POST", headers: H, body: fd });
const { projectId } = await r.json();
check("web creada", !!projectId, String(r.status));
await marcarVerificado(email);

const res = await fetch(`${BASE}/api/projects/${projectId}/descargar`, { headers: H });
check("la descarga responde 200", res.status === 200, String(res.status));
check("es un ZIP", res.headers.get("content-type") === "application/zip", String(res.headers.get("content-type")));
const cd = res.headers.get("content-disposition") ?? "";
check("se descarga con nombre limpio, sin acentos", cd === 'attachment; filename="cafe-miro.zip"', cd);
check("no se cachea", (res.headers.get("cache-control") ?? "").includes("no-store"));

const bytes = Buffer.from(await res.arrayBuffer());
const dentro = unzipSync(new Uint8Array(bytes));
console.log(`  [dato] ${bytes.length} bytes · ${Object.keys(dentro).length} archivos: ${Object.keys(dentro).sort().join(", ")}`);
check("lleva los tres archivos, con sus rutas", 
  ["css/app.css", "img/local.png", "index.html"].every((k) => k in dentro), Object.keys(dentro).join(","));
check("el HTML es el ORIGINAL, sin el sello ni la ficha",
  Buffer.from(dentro["index.html"]).toString().includes("Café Miró") &&
  !Buffer.from(dentro["index.html"]).toString().includes("ld+json"));
check("la imagen sale byte a byte igual",
  Buffer.from(dentro["img/local.png"]).equals(Buffer.from([137,80,78,71,13,10,26,10,1,2,3])));

// Lo que descarga tiene que poder volver a subirse: si no, la puerta es de salida a ninguna parte.
const fd2 = new FormData();
fd2.append("file", new Blob([bytes], { type: "application/zip" }), "vuelta.zip");
const r2 = await fetch(`${BASE}/api/projects/${projectId}/actualizar`, { method: "POST", headers: H, body: fd2 });
check("el ZIP descargado se puede volver a subir", r2.ok, String(r2.status));

// Sin sesión no se descarga la web de nadie.
const sinSesion = await fetch(`${BASE}/api/projects/${projectId}/descargar`);
check("sin sesión NO se descarga", sinSesion.status === 401 || sinSesion.status === 307, String(sinSesion.status));

await fetch(`${BASE}/api/cuenta`, { method: "DELETE", headers: H });
console.log(`\nRESULTADO: ${PASS} bien, ${FAIL} mal\n`);
process.exit(FAIL ? 1 : 0);
