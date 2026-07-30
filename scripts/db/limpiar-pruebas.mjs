// Borra cuentas de la base, con todo lo que cuelga de ellas.
//
//   node scripts/db/limpiar-pruebas.mjs                      → SIMULACRO de las de prueba
//   node scripts/db/limpiar-pruebas.mjs --borrar             → borra las de prueba
//   node scripts/db/limpiar-pruebas.mjs correo@x.com         → SIMULACRO de esa cuenta
//   node scripts/db/limpiar-pruebas.mjs correo@x.com --borrar
//
// POR DEFECTO NO BORRA NADA: enseña qué se llevaría por delante y para. Hay que
// pedirlo con --borrar a propósito. Esta base es la MISMA que usa producción.
//
// «De prueba» = los correos desechables que fabrican los e2e (@wordclicks.local).
// Una cuenta con un correo real NUNCA entra en esa lista: hay que nombrarla.
//
// El orden de borrado copia el de src/repositories/projects.ts (deleteProjectCascade)
// y src/auth/eliminar-cuenta.ts. Si algún día cambian las tablas, mira ahí.
//
// Los ARCHIVOS de las webs (storage) no se borran desde aquí: en producción
// viven en Supabase Storage y este script solo habla con la base. Se listan los
// prefijos que quedan huérfanos para poder limpiarlos aparte.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(path.join(RAIZ, "package.json"));
const postgres = require("postgres");

const args = process.argv.slice(2);
const BORRAR = args.includes("--borrar");
const correos = args.filter((a) => !a.startsWith("--")).map((a) => a.trim().toLowerCase());

const url = readFileSync(path.join(RAIZ, ".env.local"), "utf8").match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!url) { console.error("Falta DATABASE_URL en .env.local"); process.exit(1); }
const sql = postgres(url, { prepare: false, max: 1 });

try {
  const objetivo = correos.length > 0
    ? await sql`SELECT id, email, nombre FROM users WHERE lower(email) = ANY(${correos})`
    : await sql`SELECT id, email, nombre FROM users WHERE email LIKE '%@wordclicks.local' ORDER BY created_at`;

  if (correos.length > 0) {
    for (const c of correos) {
      if (!objetivo.some((u) => u.email.toLowerCase() === c)) console.log(`(no existe ninguna cuenta ${c})`);
    }
  }

  if (objetivo.length === 0) {
    console.log(correos.length > 0 ? "\nNada que borrar." : "\nNo hay cuentas de prueba (@wordclicks.local). Nada que borrar.");
    process.exit(0);
  }

  // Espacios donde el usuario es el ÚNICO propietario: se van enteros con él.
  // Si el espacio tiene otro dueño, solo se le quita del equipo (no se orfana a nadie).
  const idsUsuarios = objetivo.map((u) => u.id);
  const espacios = await sql`
    SELECT DISTINCT o.id, o.nombre FROM memberships m JOIN organizations o ON o.id = m.org_id
    WHERE m.user_id = ANY(${idsUsuarios}) AND m.rol = 'owner'
      AND (SELECT count(*) FROM memberships mm WHERE mm.org_id = o.id AND mm.rol = 'owner') = 1
      AND (SELECT count(*) FROM memberships mm WHERE mm.org_id = o.id) = 1`;
  const idsEspacios = espacios.map((o) => o.id);

  const webs = idsEspacios.length > 0
    ? await sql`SELECT id, nombre, subdominio, dominio, org_id FROM projects WHERE org_id = ANY(${idsEspacios})`
    : [];
  const idsWebs = webs.map((p) => p.id);

  console.log(`\n${BORRAR ? "SE VA A BORRAR" : "SIMULACRO — esto es lo que se borraría"}:\n`);
  for (const u of objetivo) console.log(`  cuenta   ${u.email} (${u.nombre})`);
  for (const o of espacios) console.log(`  espacio  «${o.nombre}»`);
  for (const w of webs) console.log(`  web      «${w.nombre}» ${w.dominio ?? w.subdominio ?? ""}`);

  // Cuántas filas colgando, para que el número cuadre con lo que se espera.
  if (idsWebs.length > 0) {
    const [n] = await sql`
      SELECT (SELECT count(*) FROM posts WHERE project_id = ANY(${idsWebs})) AS posts,
             (SELECT count(*) FROM snapshots WHERE project_id = ANY(${idsWebs})) AS snaps,
             (SELECT count(*) FROM assets WHERE project_id = ANY(${idsWebs})) AS assets`;
    console.log(`\n  y con ellas: ${n.posts} artículo(s), ${n.snaps} versión(es), ${n.assets} archivo(s) registrados`);
  }

  // Espacios con más gente: no se borran, solo se sale del equipo. Se avisa.
  const compartidos = await sql`
    SELECT o.nombre, m.rol FROM memberships m JOIN organizations o ON o.id = m.org_id
    WHERE m.user_id = ANY(${idsUsuarios}) AND NOT (o.id = ANY(${idsEspacios.length ? idsEspacios : [null]}))`;
  for (const c of compartidos) console.log(`  (el espacio «${c.nombre}» NO se borra: hay más gente dentro; solo se le saca del equipo)`);

  if (!BORRAR) {
    console.log(`\nNo se ha tocado nada. Para hacerlo de verdad:\n  node scripts/db/limpiar-pruebas.mjs ${correos.join(" ")} --borrar\n`);
    process.exit(0);
  }

  // Todo en una transacción: o se va entero, o no se va nada.
  await sql.begin(async (tx) => {
    if (idsWebs.length > 0) {
      await tx`DELETE FROM posts WHERE project_id = ANY(${idsWebs})`;
      await tx`DELETE FROM scheduled_posts WHERE project_id = ANY(${idsWebs})`;
      await tx`DELETE FROM trends_cache WHERE project_id = ANY(${idsWebs})`;
      await tx`DELETE FROM blog_keywords WHERE project_id = ANY(${idsWebs})`;
      await tx`DELETE FROM article_drafts WHERE project_id = ANY(${idsWebs})`;
      await tx`DELETE FROM blog_settings WHERE project_id = ANY(${idsWebs})`;
      await tx`DELETE FROM blog_templates WHERE project_id = ANY(${idsWebs})`;
      await tx`DELETE FROM assets WHERE project_id = ANY(${idsWebs})`;
      await tx`DELETE FROM snapshots WHERE project_id = ANY(${idsWebs})`;
      await tx`DELETE FROM projects WHERE id = ANY(${idsWebs})`;
    }
    if (idsEspacios.length > 0) {
      await tx`DELETE FROM org_settings WHERE org_id = ANY(${idsEspacios})`;
      await tx`DELETE FROM memberships WHERE org_id = ANY(${idsEspacios})`;
      await tx`DELETE FROM organizations WHERE id = ANY(${idsEspacios})`;
    }
    // Enlaces de correo vivos (verificación / reset / invitación) y membresías sueltas.
    await tx`DELETE FROM auth_tokens WHERE user_id = ANY(${idsUsuarios})
             OR lower(email) = ANY(${objetivo.map((u) => u.email.toLowerCase())})`;
    await tx`DELETE FROM memberships WHERE user_id = ANY(${idsUsuarios})`;
    await tx`DELETE FROM users WHERE id = ANY(${idsUsuarios})`;
  });

  console.log(`\n✔ Borrado: ${objetivo.length} cuenta(s), ${espacios.length} espacio(s), ${webs.length} web(s).`);
  if (idsWebs.length > 0) {
    console.log(`\nQuedan huérfanos estos archivos en el storage (bórralos aparte si molestan):`);
    for (const id of idsWebs) console.log(`  projects/${id}/`);
  }
} finally {
  await sql.end();
}
