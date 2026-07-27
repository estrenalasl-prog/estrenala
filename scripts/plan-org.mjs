// Cambia el plan del espacio de un usuario, a mano. Sirve mientras no haya
// pagos automáticos (Stripe) y para dar plan a alguien puntualmente.
//
// Uso:  node scripts/plan-org.mjs correo@ejemplo.com agencia
//       node scripts/plan-org.mjs correo@ejemplo.com            (solo consulta)
//
// Planes: free | personal | agencia. NO lee ni imprime ninguna clave.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(RAIZ, "package.json"));
const postgres = require("postgres");

const PLANES = ["free", "personal", "agencia"];
const email = (process.argv[2] ?? "").trim().toLowerCase();
const plan = (process.argv[3] ?? "").trim().toLowerCase();

if (!email) {
  console.error("Uso: node scripts/plan-org.mjs correo@ejemplo.com [free|personal|agencia]");
  process.exit(1);
}
if (plan && !PLANES.includes(plan)) {
  console.error(`Plan desconocido: "${plan}". Usa uno de: ${PLANES.join(", ")}`);
  process.exit(1);
}

const url = readFileSync(path.join(RAIZ, ".env.local"), "utf8").match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!url) { console.error("Falta DATABASE_URL en .env.local"); process.exit(1); }
const sql = postgres(url, { prepare: false, max: 1 });

try {
  const [user] = await sql`SELECT id, nombre FROM users WHERE email = ${email}`;
  if (!user) { console.error(`No hay ninguna cuenta con el correo ${email}`); process.exit(1); }

  const espacios = await sql`
    SELECT o.id, o.nombre, o.plan, m.rol
    FROM memberships m JOIN organizations o ON o.id = m.org_id
    WHERE m.user_id = ${user.id}
    ORDER BY o.created_at`;
  if (espacios.length === 0) { console.error("Ese usuario no pertenece a ningún espacio"); process.exit(1); }

  if (!plan) {
    console.log(`Espacios de ${user.nombre} (${email}):`);
    for (const e of espacios) console.log(`  · ${e.nombre} — plan ${e.plan} (${e.rol})`);
    process.exit(0);
  }

  // Se cambia el plan de los espacios donde es PROPIETARIO (los suyos).
  const propios = espacios.filter((e) => e.rol === "owner");
  if (propios.length === 0) { console.error("No es propietario de ningún espacio"); process.exit(1); }

  for (const e of propios) {
    await sql`UPDATE organizations SET plan = ${plan} WHERE id = ${e.id}`;
    console.log(`✓ «${e.nombre}»: ${e.plan} → ${plan}`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
