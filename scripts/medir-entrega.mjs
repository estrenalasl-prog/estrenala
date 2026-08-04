// Medir de verdad lo que sale por el cable: compresión, ETag y las tres cachés.
//
// Los tests unitarios prueban `prepararEntrega` y `cache-servir` por separado con
// dobles. Aquí interesa el camino ENTERO y sobre la compilación de producción:
// middleware → rewrite → resolvePublicSite → sello e insignia → entrega. Es la
// única forma de saber que lo que llega al navegador está comprimido, porque
// entre nuestro código y la red hay un Next que a veces comprime y a veces no.
//
// Se levanta la web de un usuario DESECHABLE (@wordclicks.local) y se borra al
// final. NO toca org_settings, NO gasta IA ni SerpAPI, NO publica en Traefik
// (la guarda de lib/plan.mjs aborta si el .env.local apunta a Dokploy).
//
//   node scripts/medir-entrega.mjs [puerto]     (por defecto 3100)
import http from "node:http";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { marcarVerificado } from "./e2e/lib/plan.mjs";

const RAIZ = "C:/Users/Sebas/Desktop/Carpeta de Proyectos/Wordclicks";
const require = createRequire(RAIZ + "/package.json");
const { zipSync, strToU8 } = require("fflate");

const PUERTO = Number(process.argv[2] || 3100);
const BASE = `http://localhost:${PUERTO}`;

let PASS = 0, FAIL = 0;
const check = (n, c, e = "") => {
  if (c) { PASS++; console.log(`  ✔  ${n}`); }
  else { FAIL++; console.log(`  ✘  ${n}${e ? " — " + e : ""}`); }
};

// `fetch` descomprime solo y no deja fijar Host: con http a pelo se ven los
// bytes que viajan de verdad, que es justamente lo que se quiere medir.
function pedir(host, ruta, cabeceras = {}) {
  return new Promise((resolve, reject) => {
    const t0 = process.hrtime.bigint();
    const req = http.request(
      { host: "127.0.0.1", port: PUERTO, path: ruta, method: "GET", headers: { host, ...cabeceras } },
      (res) => {
        const trozos = [];
        res.on("data", (c) => trozos.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            bytes: Buffer.concat(trozos).length,
            ms: Number(process.hrtime.bigint() - t0) / 1e6,
          })
        );
      }
    );
    req.on("error", reject);
    req.end();
  });
}

const J = { "content-type": "application/json" };
const marca = Date.now();
const email = `medir-${marca}@wordclicks.local`;
const sub = `medir-${marca}`;

// Un sitio del tamaño de uno real: la medición del 4 de agosto encontró 37 KB de
// HTML y 41 de CSS en una web de cliente. Con 500 bytes no se ve nada, porque
// por debajo de 1 KB no se comprime a propósito.
//
// El texto tiene que ser VARIADO o la medición miente. Un párrafo repetido 240
// veces se comprime al 98% y ese número no se parece en nada al de una web de
// verdad; con frases distintas sale el 75-80% que es lo que se ve fuera.
const FRASES = [
  "Trabajamos la cerámica a mano, pieza a pieza, en un taller pequeño del barrio.",
  "Los esmaltes los preparamos nosotros y ninguno sale igual que el anterior.",
  "El horno tarda dos días en subir y otros dos en enfriarse del todo.",
  "Damos clases los martes por la tarde para grupos de seis personas como mucho.",
  "Cada plato lleva la marca del pulgar de quien lo levantó del torno.",
  "Vendemos también en el mercado de artesanía del primer domingo de mes.",
  "Si quieres una vajilla completa, cuenta con unas ocho semanas de espera.",
  "El barro viene de una cantera de Teruel con la que trabajamos desde el principio.",
  "Reparamos piezas rotas con laca y oro cuando el dueño quiere conservarlas.",
  "Los envíos salen los jueves y llegan a península en dos o tres días.",
];
let cuerpo = "";
for (let i = 0; cuerpo.length < 34_000; i++) {
  cuerpo += `<p class="p${i}">${FRASES[(i * 7) % FRASES.length]} ${FRASES[(i * 3 + 5) % FRASES.length]}</p>\n`;
}
const COLORES = ["#3a3a3a", "#8a5a2b", "#204c4a", "#6b1d2e", "#1f3a5f", "#4a4a2b"];
let css = "";
for (let i = 0; css.length < 40_000; i++) {
  css +=
    `.pieza-${i}{color:${COLORES[i % COLORES.length]};padding:${8 + (i % 17)}px ${6 + (i % 23)}px;` +
    `border-radius:${i % 13}px;margin-bottom:${4 + (i % 19)}px;font-size:${13 + (i % 9)}px}\n`;
}

const zip = zipSync({
  // El título con separador es lo que da nombre al sitio, y sin nombre no hay
  // ficha para buscadores (a propósito: ver src/seo/ficha.ts). Una web real lo
  // trae; una de pruebas con `<title>Taller</title>` a secas, no.
  "index.html": strToU8(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Inicio — Taller de Cerámica Nogal</title><meta name="description" content="Cerámica hecha a mano en un taller pequeño: vajillas, clases y reparaciones."></head><body><h1>Taller de Cerámica Nogal</h1>${cuerpo}</body></html>`),
  "css/app.css": strToU8(css),
  // Bytes al azar con extensión de imagen: un JPEG ya está comprimido y pasarlo
  // por brotli gasta CPU para dejarlo igual o peor. Debe salir tal cual.
  "img/foto.jpg": randomBytes(60 * 1024),
  // Por debajo del mínimo: comprimir esto dejaría el archivo MÁS grande.
  "robots.txt": strToU8("User-agent: *\nAllow: /\n"),
  // Reservadas para medir las cachés en frío: nada más las pide.
  "medida/a.html": strToU8(`<!doctype html><html lang="es"><head><title>A — Nogal</title></head><body><h1>A</h1>${cuerpo}</body></html>`),
  "medida/b.html": strToU8(`<!doctype html><html lang="es"><head><title>B — Nogal</title></head><body><h1>B</h1>${cuerpo}</body></html>`),
  "medida/c.html": strToU8(`<!doctype html><html lang="es"><head><title>C — Nogal</title></head><body><h1>C</h1>${cuerpo}</body></html>`),
});

let r = await fetch(`${BASE}/api/registro`, {
  method: "POST", headers: J,
  body: JSON.stringify({ nombre: "Medir Entrega", email, password: "e2e-clave-fija-para-pruebas-123" }),
});
const cookie = (r.headers.get("set-cookie") ?? "").split(";")[0];
if (!r.ok || !cookie.startsWith("__Host-wc_session=")) {
  console.error(`No se pudo crear el usuario de pruebas (${r.status}). ¿Está el servidor en ${BASE}?`);
  process.exit(1);
}
const H = { cookie };

const fd = new FormData();
fd.append("file", new Blob([zip], { type: "application/zip" }), "sitio.zip");
fd.append("nombre", "Taller de medición");
r = await fetch(`${BASE}/api/projects`, { method: "POST", headers: H, body: fd });
const { projectId } = await r.json();

await marcarVerificado(email);
await fetch(`${BASE}/api/projects/${projectId}`, {
  method: "PATCH", headers: { ...H, ...J }, body: JSON.stringify({ subdominio: sub }),
});
r = await fetch(`${BASE}/api/projects/${projectId}/publish`, { method: "POST", headers: H });
if (!r.ok) { console.error(`No se pudo publicar (${r.status})`); process.exit(1); }

const HOST = `${sub}.localhost:${PUERTO}`;
const SIN = {};                                   // sin Accept-Encoding
const BR = { "accept-encoding": "br, gzip" };
const GZ = { "accept-encoding": "gzip" };

const pct = (de, a) => `${(100 - (a / de) * 100).toFixed(0)}%`;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

console.log(`\n── COMPRIMIR ──────────────────────────────────────────────`);
for (const [nombre, ruta] of [["HTML", "/"], ["CSS", "/css/app.css"]]) {
  const sin = await pedir(HOST, ruta, SIN);
  const br = await pedir(HOST, ruta, BR);
  const gz = await pedir(HOST, ruta, GZ);
  console.log(
    `  ${nombre.padEnd(5)} ${kb(sin.bytes).padStart(8)} → br ${kb(br.bytes).padStart(8)} (${pct(sin.bytes, br.bytes)})` +
    ` · gzip ${kb(gz.bytes).padStart(8)} (${pct(sin.bytes, gz.bytes)})`
  );
  check(`${nombre}: sale en brotli`, br.headers["content-encoding"] === "br", String(br.headers["content-encoding"]));
  check(`${nombre}: sale en gzip para quien no acepta brotli`, gz.headers["content-encoding"] === "gzip");
  check(`${nombre}: brotli ocupa menos que gzip`, br.bytes < gz.bytes, `${br.bytes} vs ${gz.bytes}`);
  check(`${nombre}: avisa con Vary: Accept-Encoding`, /accept-encoding/i.test(br.headers.vary ?? ""), String(br.headers.vary));
}

const foto = await pedir(HOST, "/img/foto.jpg", BR);
check("una foto NO se comprime (ya lo está)", !foto.headers["content-encoding"], String(foto.headers["content-encoding"]));
const chico = await pedir(HOST, "/robots.txt", BR);
check("un archivo diminuto NO se comprime (saldría más grande)", !chico.headers["content-encoding"]);

console.log(`\n── ETAG: LA SEGUNDA VISITA ────────────────────────────────`);
const primera = await pedir(HOST, "/", BR);
const etag = primera.headers.etag;
check("la respuesta lleva ETag", !!etag, "no viene");
check("y es débil (W/), porque va antes de comprimir", (etag ?? "").startsWith('W/"'), String(etag));
const segunda = await pedir(HOST, "/", { ...BR, "if-none-match": etag });
check("volver a pedirla da 304", segunda.status === 304, String(segunda.status));
check("y no manda ni un byte de cuerpo", segunda.bytes === 0, `${segunda.bytes} B`);
console.log(`  visita 1: ${kb(primera.bytes)}  ·  visita 2: ${segunda.bytes} B  (304 Not Modified)`);

const conEtagViejo = await pedir(HOST, "/", { ...BR, "if-none-match": 'W/"loquesea"' });
check("con un ETag que no es el suyo, se manda la página entera", conEtagViejo.status === 200 && conEtagViejo.bytes > 0);

console.log(`\n── LAS TRES CACHÉS ────────────────────────────────────────`);
// Estas tres páginas no las ha tocado nadie todavía, así que la primera visita
// es de verdad EN FRÍO: consulta a la base + descarga del almacén. Medir con la
// portada no valdría, que ya lleva quince peticiones encima y está caliente.
//
// Aquí el almacén es el disco de al lado. En producción esos dos viajes van a
// Postgres y a Supabase Storage por internet, así que la diferencia de allí es
// mucho mayor que la de aquí — esto solo demuestra que la caché ENTRA.
for (const ruta of ["/medida/a.html", "/medida/b.html", "/medida/c.html"]) {
  const frio = await pedir(HOST, ruta, BR);
  const calientes = [];
  for (let i = 0; i < 8; i++) calientes.push((await pedir(HOST, ruta, BR)).ms);
  const media = calientes.reduce((a, b) => a + b, 0) / calientes.length;
  console.log(
    `  ${ruta.padEnd(16)} en frío ${frio.ms.toFixed(1).padStart(6)} ms  →  en caliente ${media.toFixed(1).padStart(6)} ms`
  );
  check(`${ruta}: la caché no la rompe (sigue dando 200)`, frio.status === 200, String(frio.status));
}

console.log(`\n── LO QUE NO PUEDE ROMPERSE ───────────────────────────────`);
const portada = await pedir(HOST, "/", GZ);
check("la portada sigue dando 200", portada.status === 200, String(portada.status));
const texto = await fetch(`http://${HOST.replace(/:\d+$/, "")}:${PUERTO}/`, { headers: { host: HOST } })
  .then((x) => x.text()).catch(() => "");
check("el sello del plan gratuito sigue puesto", texto.includes("Hecho con") || texto.includes("estrenala"), "no aparece");
check("y la ficha para buscadores también", texto.includes("application/ld+json"), "no hay JSON-LD");

await fetch(`${BASE}/api/cuenta`, { method: "DELETE", headers: H });
console.log(`\nRESULTADO: ${PASS} bien, ${FAIL} mal\n`);
process.exit(FAIL ? 1 : 0);
