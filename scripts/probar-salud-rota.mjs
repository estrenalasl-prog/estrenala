// Comprueba que la ruta de salud SE PONE EN ROJO de verdad. Es lo unico que no
// prueban los tests unitarios: que el `select 1` real contra Postgres falle y
// que la respuesta salga 503.
//
// Se arranca un Next aparte con un DATABASE_URL que no existe; NO se toca el
// .env.local ni la base de datos real.
//
// EN EL PUERTO 3000 Y NO EN OTRO: `PLATFORM_HOST` vale localhost:3000, asi que
// en cualquier otro puerto el middleware toma la peticion por el dominio de un
// cliente, la manda a /sites/... y lo que falla entonces es la busqueda de la
// web, no la salud — un falso negativo que ya mordio una vez. Hay que parar el
// `npm run dev` antes: Next 16 no deja dos servidores en la misma carpeta.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const RAIZ = "C:/Users/Sebas/Desktop/Carpeta de Proyectos/Wordclicks";
const env = readFileSync(RAIZ + "/.env.local", "utf8");
const conservar = {};
for (const linea of env.split(/\r?\n/)) {
  const m = linea.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && m[1] !== "DATABASE_URL") conservar[m[1]] = m[2];
}

const hijo = spawn(process.execPath, [RAIZ + "/node_modules/next/dist/bin/next", "dev", "-p", "3000"], {
  cwd: RAIZ, shell: false,
  env: { ...process.env, ...conservar,
    // Puerto 1 = nada escuchando ahí. Ni se toca la base real ni se imprime nada.
    DATABASE_URL: "postgresql://nadie:nada@127.0.0.1:1/nodb" },
});
hijo.stdout.on("data", (d) => process.stdout.write("[hijo] " + d));
hijo.stderr.on("data", (d) => process.stderr.write("[err] " + d));

const esperar = async (ms) => new Promise((r) => setTimeout(r, ms));
let listo = false;
for (let i = 0; i < 60 && !listo; i++) {
  await esperar(1000);
  try { const r = await fetch("http://localhost:3000/api/health"); listo = r.ok; } catch {}
}
if (!listo) { console.error("no arrancó"); hijo.kill(); process.exit(1); }

const health = await fetch("http://localhost:3000/api/health");
const salud = await fetch("http://localhost:3000/api/salud");
const saludHead = await fetch("http://localhost:3000/api/salud", { method: "HEAD" });
const cuerpo = await salud.json().catch(() => ({}));

console.log(`  /api/health → HTTP ${health.status}  (el proceso vive: NO debe caerse por esto)`);
console.log(`  /api/salud  → HTTP ${salud.status}  ${JSON.stringify(cuerpo)}`);

let fallos = 0;
const check = (n, c) => { console.log(`  ${c ? "✔" : "✘"}  ${n}`); if (!c) fallos++; };
check("/api/health sigue en 200 con la base caída", health.status === 200);
check("/api/salud pasa a 503", salud.status === 503);
check("y dice ok:false", cuerpo.ok === false);
check("sin filtrar nada del error", JSON.stringify(cuerpo) === '{"ok":false}');
// UptimeRobot pregunta con HEAD por defecto, no con GET. Next fabrica el HEAD a
// partir del GET; si por el camino se perdiera el codigo, el vigilante estaria
// preguntando de una forma que SIEMPRE dice que si.
console.log(`  /api/salud (HEAD) → HTTP ${saludHead.status}`);
check("y por HEAD tambien da 503, que es como pregunta el vigilante", saludHead.status === 503);

hijo.kill();
console.log(`\n${fallos === 0 ? "TODO BIEN" : fallos + " MAL"}\n`);
process.exit(fallos ? 1 : 0);
