// E2e del incremento 19: las claves de IA de cada espacio se guardan CIFRADAS.
//
// GUARDAS (el 2026-07-15 una regresión de e2e borró claves BYOK reales):
//   · usuario DESECHABLE @wordclicks.local, con su propio espacio recién creado;
//   · antes de escribir, se comprueba que ese espacio NO tiene ninguna clave
//     puesta a mano (origen !== "ui"). Si la tuviera, aborta sin tocar nada;
//   · la lectura directa a la base va filtrada por el correo desechable;
//   · la clave usada es de mentira y JAMÁS se imprime, ni entera ni a trozos.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(path.join(RAIZ, "package.json"));
const postgres = require("postgres");
const BASE = "http://localhost:3000";

const env = readFileSync(path.join(RAIZ, ".env.local"), "utf8");
const DB = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!DB) { console.error("Falta DATABASE_URL en .env.local"); process.exit(1); }
if (!/^SECRETS_KEY=.+$/m.test(env)) {
  console.error("Falta SECRETS_KEY en .env.local: sin ella no se pueden guardar claves.");
  process.exit(1);
}

let PASS = 0, FAIL = 0;
function check(n, c, e = "") {
  if (c) { PASS++; console.log(`  PASS  ${n}`); }
  else { FAIL++; console.log(`  FAIL  ${n}${e ? " — " + e : ""}`); }
}

const J = { "content-type": "application/json" };
const email = `e2e-secretos-${Date.now()}@wordclicks.local`;
// De mentira a propósito: ni es una clave válida ni sirve para gastar nada.
const CLAVE_FALSA = `sk-or-v1-e2e-de-mentira-${"0".repeat(20)}beef`;

let r = await fetch(`${BASE}/api/registro`, {
  method: "POST", headers: J,
  body: JSON.stringify({ nombre: "E2E Secretos", email, password: "e2e-clave-fija-para-pruebas-123" }),
});
const cookie = (r.headers.get("set-cookie") ?? "").split(";")[0];
check("registro desechable → sesión", r.ok && cookie.startsWith("wc_session="), String(r.status));
const H = { cookie };
const HJ = { cookie, "content-type": "application/json" };

// GUARDA: este espacio acaba de nacer y no puede tener claves puestas a mano.
r = await fetch(`${BASE}/api/settings`, { headers: H });
const antes = await r.json();
if (antes.openrouter?.origen === "ui" || antes.serpapi?.origen === "ui") {
  console.error("\n✋ ABORTADO: el espacio del usuario desechable ya tiene claves propias.");
  console.error("   Eso no debería pasar nunca. No se ha escrito nada.");
  process.exit(1);
}
check("el espacio nuevo no trae claves propias", true);

// ------------------------------------------------------------ guardar y leer
r = await fetch(`${BASE}/api/settings`, {
  method: "PUT", headers: HJ, body: JSON.stringify({ openrouterKey: CLAVE_FALSA }),
});
check("guardar una clave → 200", r.ok, String(r.status));

r = await fetch(`${BASE}/api/settings`, { headers: H });
const despues = await r.json();
check("la API dice que ahora la clave viene de la interfaz", despues.openrouter?.origen === "ui", String(despues.openrouter?.origen));
check("y enseña los 4 últimos correctos (o sea: se descifra bien)",
  despues.openrouter?.sufijo === CLAVE_FALSA.slice(-4), String(despues.openrouter?.sufijo));
check("la API NUNCA devuelve la clave entera", !JSON.stringify(despues).includes(CLAVE_FALSA));

// --------------------------------------------- lo que hay REALMENTE en la base
const sql = postgres(DB, { prepare: false, max: 1 });
try {
  const filas = await sql`
    SELECT s.openrouter_key AS k FROM org_settings s
    JOIN memberships m ON m.org_id = s.org_id
    JOIN users u ON u.id = m.user_id
    WHERE u.email = ${email}`;
  const guardado = filas[0]?.k ?? "";
  check("hay fila guardada para el espacio de pruebas", !!guardado);
  // Lo único que se imprime del valor guardado es su prefijo y su longitud.
  check("en la base NO está la clave en claro", !guardado.includes(CLAVE_FALSA), `prefijo=${guardado.slice(0, 3)} largo=${guardado.length}`);
  check("está en formato cifrado s1.<iv>.<etiqueta>.<cifrado>",
    /^s1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(guardado), `prefijo=${guardado.slice(0, 3)}`);
  check("y no se parece en nada al original", guardado.length !== CLAVE_FALSA.length);
} finally {
  await sql.end({ timeout: 5 });
}

// ------------------------------------------------------- cambiar y luego quitar
r = await fetch(`${BASE}/api/settings`, {
  method: "PUT", headers: HJ, body: JSON.stringify({ modeloIa: "anthropic/claude-sonnet-4.6" }),
});
check("cambiar solo el modelo → 200 (no toca las claves)", r.ok, String(r.status));
r = await fetch(`${BASE}/api/settings`, { headers: H });
const tras = await r.json();
check("la clave sigue intacta tras cambiar el modelo", tras.openrouter?.sufijo === CLAVE_FALSA.slice(-4), String(tras.openrouter?.sufijo));

r = await fetch(`${BASE}/api/settings`, {
  method: "PUT", headers: HJ, body: JSON.stringify({ openrouterKey: "" }),
});
check("borrar la clave → 200", r.ok, String(r.status));
r = await fetch(`${BASE}/api/settings`, { headers: H });
const final = await r.json();
check("y deja de venir de la interfaz", final.openrouter?.origen !== "ui", String(final.openrouter?.origen));

// limpieza: borra la cuenta y con ella su org_settings
await fetch(`${BASE}/api/cuenta`, { method: "DELETE", headers: H });

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
