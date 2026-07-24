// Migra la cuenta real (creada en /registro) a la organización de desarrollo,
// donde ya viven los proyectos Y las claves guardadas (org_settings). Sin esto,
// al registrarte verías un espacio vacío. Idempotente y transaccional.
//
// Uso:  node scripts/migrar-org-dev.mjs tu@correo.com
//
// Qué hace: repunta tu membership a la org de dev (como propietario), la
// renombra a «Espacio de <tu nombre>», y limpia el usuario/espacio de dev
// sobrantes. NO lee ni imprime NINGUNA clave (solo mueve el orgId).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEV_ORG_ID = "00000000-0000-4000-8000-000000000001";
const DEV_USER_ID = "00000000-0000-4000-8000-000000000002";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(RAIZ, "package.json"));
const postgres = require("postgres");

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email) { console.error("Uso: node scripts/migrar-org-dev.mjs tu@correo.com"); process.exit(1); }

const url = readFileSync(path.join(RAIZ, ".env.local"), "utf8").match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!url) { console.error("Falta DATABASE_URL en .env.local"); process.exit(1); }
const sql = postgres(url, { prepare: false, max: 1 });

try {
  const [user] = await sql`SELECT id, nombre FROM users WHERE email = ${email}`;
  if (!user) { console.error(`No existe ninguna cuenta con el correo ${email}. Regístrate primero en /registro.`); process.exit(1); }
  if (user.id === DEV_USER_ID) { console.error("Ese es el usuario de desarrollo, no una cuenta real."); process.exit(1); }

  const [mem] = await sql`SELECT id, org_id FROM memberships WHERE user_id = ${user.id} LIMIT 1`;
  if (!mem) { console.error("Esa cuenta no tiene organización (membership). Algo raro pasó en el registro."); process.exit(1); }
  if (mem.org_id === DEV_ORG_ID) { console.log("Ya estaba migrada: tu cuenta ya es dueña del espacio de desarrollo. Nada que hacer."); process.exit(0); }

  const [devOrg] = await sql`SELECT id FROM organizations WHERE id = ${DEV_ORG_ID}`;
  if (!devOrg) { console.error("No existe la organización de desarrollo; no hay nada que migrar (¿BD nueva?)."); process.exit(1); }

  const orgVacia = mem.org_id; // la org auto-creada al registrarte (a eliminar)
  const [{ n: proyectosEnVacia }] = await sql`SELECT count(*)::int AS n FROM projects WHERE org_id = ${orgVacia}`;

  await sql.begin(async (tx) => {
    // 1) Tu cuenta pasa a ser propietaria de la org de desarrollo.
    await tx`UPDATE memberships SET org_id = ${DEV_ORG_ID}, rol = 'owner' WHERE id = ${mem.id}`;
    await tx`UPDATE organizations SET nombre = ${"Espacio de " + user.nombre} WHERE id = ${DEV_ORG_ID}`;
    // 2) Fuera el usuario de desarrollo y su membership.
    await tx`DELETE FROM memberships WHERE user_id = ${DEV_USER_ID}`;
    await tx`DELETE FROM users WHERE id = ${DEV_USER_ID}`;
    // 3) Fuera la org vacía auto-creada (solo si de verdad está vacía).
    if (proyectosEnVacia === 0) {
      await tx`DELETE FROM org_settings WHERE org_id = ${orgVacia}`;
      await tx`DELETE FROM memberships WHERE org_id = ${orgVacia}`;
      await tx`DELETE FROM organizations WHERE id = ${orgVacia}`;
    }
  });

  const [{ n: proyectos }] = await sql`SELECT count(*)::int AS n FROM projects WHERE org_id = ${DEV_ORG_ID}`;
  console.log(`OK. ${user.nombre} <${email}> ahora es propietaria del espacio de desarrollo (${proyectos} proyecto(s), claves conservadas).`);
  if (proyectosEnVacia > 0) console.log(`Aviso: la org auto-creada tenía ${proyectosEnVacia} proyecto(s); NO se borró. Revísala a mano si quieres unificar.`);
} finally {
  await sql.end();
}
