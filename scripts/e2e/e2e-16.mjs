// E2e de pagos (Stripe en modo PRUEBA): crea una sesión de Checkout real contra
// la API de Stripe con los precios configurados. Crear sesiones no cuesta dinero
// y no cobra a nadie: solo valida clave + price IDs + nuestro código.
// Usuario DESECHABLE; se borra al final.
import { readFileSync } from "node:fs";

const RAIZ = "C:/Users/Sebas/Desktop/Carpeta de Proyectos/Wordclicks";
const BASE = "http://localhost:3000";
const env = readFileSync(RAIZ + "/.env.local", "utf8");
const enModoPrueba = /^STRIPE_SECRET_KEY=sk_test_/m.test(env);

let PASS = 0, FAIL = 0;
function check(n, c, e = "") {
  if (c) { PASS++; console.log(`  PASS  ${n}`); }
  else { FAIL++; console.log(`  FAIL  ${n}${e ? " — " + e : ""}`); }
}

// GUARDA: si la clave no es de prueba, no se toca Stripe.
if (!enModoPrueba) {
  console.log("  SKIP  la clave de Stripe no es sk_test_: no se crean sesiones");
  process.exit(0);
}

const J = { "content-type": "application/json" };
const email = `e2e-pagos-${Date.now()}@wordclicks.local`;

let r = await fetch(`${BASE}/api/registro`, {
  method: "POST", headers: J,
  body: JSON.stringify({ nombre: "E2E Pagos", email, password: "e2e-clave-fija-para-pruebas-123" }),
});
const cookie = (r.headers.get("set-cookie") ?? "").split(";")[0];
check("registro desechable → sesión", r.ok && cookie.startsWith("__Host-wc_session="), String(r.status));
const H = { cookie };
const HJ = { cookie, "content-type": "application/json" };

// --- La plataforma se declara lista para cobrar ---
let d = await (await fetch(`${BASE}/api/plan`, { headers: H })).json();
check("la API declara los pagos configurados", d.pagos === true, JSON.stringify(d.pagos));
check("empieza en gratuito y sin suscripción", d.plan === "free" && d.suscrito === false, JSON.stringify(d));

// --- Checkout real contra Stripe (los 4 precios) ---
for (const [plan, periodo] of [["personal", "mes"], ["personal", "anual"], ["agencia", "mes"], ["agencia", "anual"]]) {
  r = await fetch(`${BASE}/api/plan/checkout`, { method: "POST", headers: HJ, body: JSON.stringify({ plan, periodo }) });
  const j = await r.json();
  check(`checkout ${plan}/${periodo} → URL de pago de Stripe`,
    r.status === 200 && typeof j.url === "string" && j.url.startsWith("https://checkout.stripe.com"),
    `${r.status} ${JSON.stringify(j).slice(0, 160)}`);
}

// --- Validaciones ---
r = await fetch(`${BASE}/api/plan/checkout`, { method: "POST", headers: HJ, body: JSON.stringify({ plan: "free" }) });
d = await r.json();
check("no se puede 'contratar' el plan gratuito → 400", r.status === 400 && d.error === "Elige un plan de pago", JSON.stringify(d));

r = await fetch(`${BASE}/api/plan/portal`, { method: "POST", headers: HJ, body: "{}" });
d = await r.json();
check("portal sin suscripción → 400 mensaje exacto",
  r.status === 400 && d.error === "Este espacio todavía no tiene ninguna suscripción", `${r.status} ${JSON.stringify(d)}`);

// --- Seguridad del webhook: sin firma válida NUNCA se aplica nada ---
r = await fetch(`${BASE}/api/stripe/webhook`, {
  method: "POST", headers: J,
  body: JSON.stringify({
    type: "customer.subscription.updated",
    data: { object: { id: "sub_falsa", customer: "cus_falso", status: "active", metadata: { orgId: "cualquiera" }, items: { data: [{ price: { id: "price_x" } }] } } },
  }),
});
check("webhook sin firma NO se aplica (400 o 503, nunca 200)", r.status !== 200, String(r.status));

// El plan sigue intacto tras el intento
d = await (await fetch(`${BASE}/api/plan`, { headers: H })).json();
check("el plan sigue siendo gratuito tras el webhook falso", d.plan === "free", JSON.stringify(d.plan));

// limpieza
await fetch(`${BASE}/api/cuenta`, { method: "DELETE", headers: H });

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
