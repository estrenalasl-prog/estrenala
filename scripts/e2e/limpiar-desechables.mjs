// Borra cuentas de PRUEBAS que hayan quedado sueltas (@wordclicks.local).
//
// Los e2e se borran a sí mismos al terminar, pero si uno casca a medias deja su
// usuario y su espacio dentro. Esto los recoge.
//
// GUARDA: el filtro está fijado a @wordclicks.local y un espacio solo se borra
// si ese usuario de pruebas es su ÚNICO miembro. Jamás toca una cuenta real.
//
//   node scripts/e2e/limpiar-desechables.mjs            → lista, sin tocar nada
//   node scripts/e2e/limpiar-desechables.mjs --aplicar  → borra
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(path.join(RAIZ, "package.json"));
const postgres = require("postgres");

const APLICAR = process.argv.includes("--aplicar");
const url = readFileSync(path.join(RAIZ, ".env.local"), "utf8").match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!url) { console.error("Falta DATABASE_URL en .env.local"); process.exit(1); }
const sql = postgres(url, { prepare: false, max: 1 });

// Hijos de un proyecto, en orden de borrado (el esquema no tiene ON DELETE CASCADE).
const HIJOS = ["posts", "scheduled_posts", "trends_cache", "blog_keywords",
  "article_drafts", "blog_settings", "blog_templates", "assets", "snapshots"];

try {
  const usuarios = await sql`SELECT id, email FROM users WHERE email LIKE '%@wordclicks.local'`;
  console.log(`Cuentas de prueba sueltas: ${usuarios.length}`);
  for (const u of usuarios) console.log(`  ${u.email}`);

  if (usuarios.length === 0) {
    console.log("\nNada que limpiar.");
  } else if (!APLICAR) {
    console.log("\nEn seco: NO se ha borrado nada. Vuelve a lanzarlo con --aplicar.");
  } else {
    for (const u of usuarios) {
      const orgs = await sql`SELECT org_id FROM memberships WHERE user_id = ${u.id}`;
      for (const { org_id } of orgs) {
        const [{ n }] = await sql`SELECT count(*)::int AS n FROM memberships WHERE org_id = ${org_id}`;
        if (n !== 1) continue; // espacio compartido: no es solo suyo, se deja
        for (const tabla of HIJOS) {
          await sql.unsafe(
            `DELETE FROM ${tabla} WHERE project_id IN (SELECT id FROM projects WHERE org_id = $1)`,
            [org_id]
          );
        }
        await sql`DELETE FROM projects WHERE org_id = ${org_id}`;
        await sql`DELETE FROM org_settings WHERE org_id = ${org_id}`;
        await sql`DELETE FROM memberships WHERE org_id = ${org_id}`;
        await sql`DELETE FROM organizations WHERE id = ${org_id}`;
      }
      await sql`DELETE FROM memberships WHERE user_id = ${u.id}`;
      await sql`DELETE FROM auth_tokens WHERE email = ${u.email}`;
      await sql`DELETE FROM users WHERE id = ${u.id}`;
    }
    const [{ n }] = await sql`SELECT count(*)::int AS n FROM users WHERE email LIKE '%@wordclicks.local'`;
    console.log(n === 0 ? `\n✔ Limpias ${usuarios.length} cuenta(s) de prueba.` : `\n⚠ Quedan ${n}: revísalo.`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
