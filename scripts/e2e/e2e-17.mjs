// E2e del webhook de Stripe de punta a punta: firma eventos con el secreto real
// y comprueba que el plan se activa y se retira SOLO. No cobra a nadie (no toca
// la pasarela: emula lo que Stripe enviaría). Usuario DESECHABLE.
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(path.join(RAIZ, "package.json"));
const postgres = require("postgres");
const BASE = "http://localhost:3000";

const env = readFileSync(path.join(RAIZ, ".env.local"), "utf8");
const whsec = env.match(/^STRIPE_WEBHOOK_SECRET=(.+)$/m)?.[1]?.trim();
const dbUrl = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
const pricePersonal = env.match(/^STRIPE_PRICE_PERSONAL_MES=(.+)$/m)?.[1]?.trim();
const priceAgencia = env.match(/^STRIPE_PRICE_AGENCIA_ANUAL=(.+)$/m)?.[1]?.trim();

let PASS = 0, FAIL = 0;
function check(n, c, e = "") {
  if (c) { PASS++; console.log(`  PASS  ${n}`); }
  else { FAIL++; console.log(`  FAIL  ${n}${e ? " — " + e : ""}`); }
}

if (!whsec) { console.log("  SKIP  falta STRIPE_WEBHOOK_SECRET (arranca `stripe listen`)"); process.exit(0); }

const J = { "content-type": "application/json" };
const email = `e2e-webhook-${Date.now()}@wordclicks.local`;

let r = await fetch(`${BASE}/api/registro`, {
  method: "POST", headers: J,
  body: JSON.stringify({ nombre: "E2E Webhook", email, password: "e2e-clave-fija-para-pruebas-123" }),
});
const cookie = (r.headers.get("set-cookie") ?? "").split(";")[0];
check("registro desechable → sesión", r.ok && cookie.startsWith("__Host-wc_session="), String(r.status));
const H = { cookie };

// orgId del usuario (lo necesita el evento, igual que lo lleva la suscripción real)
const sql = postgres(dbUrl, { prepare: false, max: 1 });
const [fila] = await sql`
  SELECT m.org_id FROM memberships m JOIN users u ON u.id = m.user_id WHERE u.email = ${email}`;
const orgId = fila?.org_id;
check("se obtiene el espacio del usuario", !!orgId);

function enviarEvento(evento) {
  const payload = JSON.stringify(evento);
  const t = Math.floor(Date.now() / 1000);
  const firma = createHmac("sha256", whsec).update(`${t}.${payload}`).digest("hex");
  return fetch(`${BASE}/api/stripe/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=${firma}` },
    body: payload,
  });
}
const suscripcion = (estado, priceId) => ({
  type: "customer.subscription.updated",
  data: {
    object: {
      id: "sub_e2e", customer: "cus_e2e", status: estado,
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
      metadata: { orgId },
      items: { data: [{ price: { id: priceId } }] },
    },
  },
});
const plan = async () => (await (await fetch(`${BASE}/api/plan`, { headers: H })).json());

// --- 1) Suscripción activa → plan personal ---
r = await enviarEvento(suscripcion("active", pricePersonal));
check("webhook firmado → 200 aplicado", r.status === 200 && (await r.json()).aplicado === true, String(r.status));
let d = await plan();
check("el plan sube a Personal solo", d.plan === "personal", JSON.stringify(d.plan));
check("queda marcado como suscrito", d.suscrito === true && d.estado === "active", JSON.stringify(d.estado));

// --- 2) Cambio a agencia anual ---
await enviarEvento(suscripcion("active", priceAgencia));
d = await plan();
check("cambiar de precio cambia el plan a Agencia", d.plan === "agencia", JSON.stringify(d.plan));

// --- 3) Impago: se MANTIENE el plan (Stripe reintenta) ---
await enviarEvento(suscripcion("past_due", priceAgencia));
d = await plan();
check("con un pago fallido NO se pierde el plan", d.plan === "agencia" && d.estado === "past_due", JSON.stringify(d));

// --- 4) Cancelación → vuelve a gratuito ---
r = await enviarEvento({ ...suscripcion("active", priceAgencia), type: "customer.subscription.deleted" });
check("evento de cancelación → 200", r.status === 200, String(r.status));
d = await plan();
check("al cancelar vuelve a Gratis", d.plan === "free", JSON.stringify(d.plan));

// --- 5) Un evento manipulado (firma de otro secreto) no aplica nada ---
const payload = JSON.stringify(suscripcion("active", priceAgencia));
const t = Math.floor(Date.now() / 1000);
const mala = createHmac("sha256", "whsec_falso").update(`${t}.${payload}`).digest("hex");
r = await fetch(`${BASE}/api/stripe/webhook`, {
  method: "POST",
  headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=${mala}` },
  body: payload,
});
check("firma de otro secreto → 400", r.status === 400, String(r.status));
d = await plan();
check("sigue en Gratis tras el intento falso", d.plan === "free", JSON.stringify(d.plan));

await sql.end({ timeout: 5 });
await fetch(`${BASE}/api/cuenta`, { method: "DELETE", headers: H });

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
