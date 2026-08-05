// Comprueba una copia de seguridad SIN tocar producción y sin necesitar ninguna
// base de datos: se lee la carpeta y punto.
//
//   node scripts/db/comprobar-copia.mjs "ruta/de/la/copia"
//
// Una copia que nadie ha comprobado es una hipótesis. Esto responde a las tres
// preguntas que importan:
//
//   1. ¿Están todos los bytes, y son los mismos? (sha256 contra el manifiesto)
//   2. ¿Se puede volver a montar la base? (las claves ajenas resuelven entre sí)
//   3. ¿Sale de aquí una WEB QUE FUNCIONA? (cada sitio publicado tiene su
//      página de entrada y sus archivos, y el HTML no está truncado)
//
// La 3 es la que de verdad se echa de menos el día malo: una copia con todas
// las filas pero sin los archivos restaura una plataforma con webs en blanco.
import { readFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const CARPETA = path.resolve(process.argv[2] ?? "");
if (!existsSync(path.join(CARPETA, "manifiesto.json"))) {
  console.error(`No hay ningún manifiesto.json en ${CARPETA || "(sin ruta)"}`);
  console.error(`Uso: node scripts/db/comprobar-copia.mjs "ruta/de/la/copia"`);
  process.exit(1);
}

const m = JSON.parse(readFileSync(path.join(CARPETA, "manifiesto.json"), "utf8"));
const tabla = (n) => JSON.parse(readFileSync(path.join(CARPETA, "base", `${n}.json`), "utf8"));
const sha = (b) => createHash("sha256").update(b).digest("hex");

let bien = 0, mal = 0;
const fallos = [];
// Devuelve el veredicto a propósito: hay sitios que encadenan («si no está la
// versión, no sigas mirando sus archivos»). Sin `return`, ese `if` se cumplía
// siempre y el apartado 3 entero se saltaba EN SILENCIO — con el resumen
// diciendo «todas en verde». Un verificador que miente es peor que ninguno.
const comprobar = (ok, que) => {
  if (ok) bien++;
  else { mal++; fallos.push(que); }
  return ok;
};

console.log(`\nComprobando ${CARPETA}`);
console.log(`Hecha el ${m.hecha}\n${"─".repeat(64)}\n`);

// ── 1. Los bytes ────────────────────────────────────────────────────────
console.log("1 · ¿Están todos los bytes y son los mismos?\n");
for (const [nombre, info] of Object.entries(m.base)) {
  const ruta = path.join(CARPETA, "base", `${nombre}.json`);
  comprobar(existsSync(ruta) && sha(readFileSync(ruta)) === info.sha256, `tabla ${nombre}`);
}
console.log(`  ${Object.keys(m.base).length} tablas comprobadas por sha256`);

let archivosMal = 0;
for (const [clave, info] of Object.entries(m.archivos)) {
  const ruta = path.join(CARPETA, "archivos", clave);
  if (!existsSync(ruta) || statSync(ruta).size !== info.bytes || sha(readFileSync(ruta)) !== info.sha256) {
    archivosMal++;
    if (archivosMal <= 3) fallos.push(`archivo ${clave}`);
  }
}
comprobar(archivosMal === 0, `${archivosMal} archivo(s) con el sha256 cambiado`);
console.log(`  ${Object.keys(m.archivos).length} archivos comprobados por sha256${archivosMal ? ` — ${archivosMal} MAL` : ""}`);

// ── 2. ¿Se puede volver a montar la base? ───────────────────────────────
console.log(`\n2 · ¿Encaja la base consigo misma?\n`);
const orgs = tabla("organizations"), users = tabla("users"), proyectos = tabla("projects");
const snaps = tabla("snapshots"), miembros = tabla("memberships");

const idsOrg = new Set(orgs.map((o) => o.id));
const idsUser = new Set(users.map((u) => u.id));
const idsProy = new Set(proyectos.map((p) => p.id));

comprobar(miembros.every((x) => idsOrg.has(x.org_id) && idsUser.has(x.user_id)), "membresías huérfanas");
comprobar(proyectos.every((p) => idsOrg.has(p.org_id)), "proyectos sin espacio");
comprobar(snaps.every((s) => idsProy.has(s.project_id)), "versiones sin proyecto");
for (const t of ["assets", "posts", "blog_settings", "blog_templates", "blog_keywords", "form_submissions"]) {
  comprobar(tabla(t).every((f) => !f.project_id || idsProy.has(f.project_id)), `${t} sin proyecto`);
}
// Un espacio sin dueño no lo ve nadie: se restauraría invisible.
const conDuenyo = new Set(miembros.filter((x) => x.rol === "owner").map((x) => x.org_id));
comprobar(orgs.every((o) => conDuenyo.has(o.id)), "espacios que quedarían sin propietario");
console.log(`  ${orgs.length} espacios · ${users.length} cuentas · ${proyectos.length} webs · ${snaps.length} versiones`);

// ── 3. ¿Sale de aquí una web que funciona? ──────────────────────────────
console.log(`\n3 · ¿Sale de aquí una web que funciona?\n`);
const claves = Object.keys(m.archivos);
for (const p of proyectos) {
  const publicada = p.published_snapshot_id;
  const dir = p.dominio ?? p.subdominio ?? "(sin dirección)";
  if (!publicada) { console.log(`  ─ «${p.nombre}» ${dir} — sin publicar, nada que servir`); continue; }

  const snap = snaps.find((s) => s.id === publicada);
  if (!comprobar(!!snap, `«${p.nombre}»: la versión publicada no está en la copia`)) continue;

  const suyos = claves.filter((k) => k.startsWith(snap.storage_prefix));
  const entrada = `${snap.storage_prefix}${p.entry_path}`;
  const hayEntrada = claves.includes(entrada);
  comprobar(suyos.length > 0, `«${p.nombre}»: la versión publicada no tiene archivos`);
  comprobar(hayEntrada, `«${p.nombre}»: falta la página de inicio (${p.entry_path})`);

  // Que el HTML no esté cortado: es el fallo silencioso de una copia a medias.
  let htmlOk = true;
  const htmls = suyos.filter((k) => /\.html?$/i.test(k));
  for (const k of htmls) {
    const cuerpo = readFileSync(path.join(CARPETA, "archivos", k), "utf8");
    if (!/<\/html\s*>/i.test(cuerpo)) { htmlOk = false; fallos.push(`HTML truncado: ${k}`); break; }
  }
  comprobar(htmlOk, `«${p.nombre}»: algún HTML está cortado`);

  const mb = suyos.reduce((s, k) => s + m.archivos[k].bytes, 0) / 1024 / 1024;
  console.log(`  ${hayEntrada && htmlOk ? "✓" : "✗"} «${p.nombre}» ${dir} — ${suyos.length} archivos · ${htmls.length} páginas · ${mb.toFixed(2)} MB`);
}

// ── Lo que esta copia NO puede devolver sola ────────────────────────────
const ajustes = tabla("org_settings");
const conClaves = ajustes.filter((a) => (a.openrouter_key ?? "") !== "" || (a.serpapi_key ?? "") !== "").length;

console.log(`\n${"─".repeat(64)}`);
console.log(mal === 0 ? `✔ ${bien} comprobaciones, TODAS en verde` : `✗ ${bien} bien · ${mal} MAL`);
for (const f of fallos.slice(0, 10)) console.log(`   · ${f}`);

if (conClaves > 0) {
  console.log(`\n⚠  ${conClaves} espacio(s) guardan claves de IA/SerpAPI CIFRADAS.`);
  console.log(`   Se restauran, pero solo se pueden descifrar con SECRETS_KEY, que NO`);
  console.log(`   está en esta carpeta a propósito. Guárdala en tu gestor de contraseñas:`);
  console.log(`   sin ella, esos espacios restauran sin poder usar sus claves.`);
}
process.exit(mal === 0 ? 0 : 1);
