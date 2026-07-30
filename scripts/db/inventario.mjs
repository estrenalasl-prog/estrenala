// Radiografía de la base: quién hay dentro y qué tiene. SOLO LEE, no toca nada.
//
//   node scripts/db/inventario.mjs
//
// Pensado para mirar antes de limpiar (ver limpiar-pruebas.mjs) y para saber en
// cualquier momento si ha entrado gente de verdad.
//
// NUNCA imprime claves de nadie: de openrouter_key / serpapi_key solo dice si
// están puestas (sí/no). Son credenciales de terceros con dinero detrás.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(path.join(RAIZ, "package.json"));
const postgres = require("postgres");

const url = readFileSync(path.join(RAIZ, ".env.local"), "utf8").match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!url) { console.error("Falta DATABASE_URL en .env.local"); process.exit(1); }
const sql = postgres(url, { prepare: false, max: 1 });

const fecha = (d) => (d ? new Date(d).toISOString().slice(0, 16).replace("T", " ") : "—");

try {
  const usuarios = await sql`
    SELECT u.id, u.email, u.nombre, u.created_at, u.email_verificado_at,
           u.google_sub IS NOT NULL AS google, u.password_hash <> '' AS clave
    FROM users u ORDER BY u.created_at`;

  console.log(`\n=== ${usuarios.length} CUENTA(S) ===\n`);
  for (const u of usuarios) {
    const entra = [u.clave && "contraseña", u.google && "Google"].filter(Boolean).join(" + ") || "sin acceso";
    console.log(`· ${u.email}`);
    console.log(`    ${u.nombre} — alta ${fecha(u.created_at)} — ${entra} — ${u.email_verificado_at ? "verificado" : "SIN VERIFICAR"}`);

    const espacios = await sql`
      SELECT o.id, o.nombre, o.plan, o.plan_estado, o.plan_hasta, m.rol,
             o.stripe_customer_id IS NOT NULL AS stripe,
             (SELECT count(*) FROM memberships mm WHERE mm.org_id = o.id) AS miembros
      FROM memberships m JOIN organizations o ON o.id = m.org_id
      WHERE m.user_id = ${u.id} ORDER BY o.created_at`;
    for (const o of espacios) {
      const sus = o.plan_estado ? ` — suscripción ${o.plan_estado} hasta ${fecha(o.plan_hasta)}` : "";
      console.log(`    espacio «${o.nombre}» [${o.rol}] plan ${o.plan}${sus}${o.stripe ? " — cliente Stripe" : ""} — ${o.miembros} miembro(s)`);
      const [ajustes] = await sql`SELECT openrouter_key <> '' AS ia, serpapi_key <> '' AS serp FROM org_settings WHERE org_id = ${o.id}`;
      if (ajustes?.ia || ajustes?.serp) {
        console.log(`      claves propias: IA ${ajustes.ia ? "sí" : "no"}, SerpAPI ${ajustes.serp ? "sí" : "no"}`);
      }
      const webs = await sql`
        SELECT p.nombre, p.subdominio, p.dominio, p.no_indexar, p.published_snapshot_id IS NOT NULL AS publicada,
               (SELECT count(*) FROM posts pp WHERE pp.project_id = p.id) AS posts
        FROM projects p WHERE p.org_id = ${o.id} ORDER BY p.created_at`;
      for (const w of webs) {
        const dir = w.dominio ?? (w.subdominio ? `${w.subdominio}.*` : "sin dirección");
        console.log(`      web «${w.nombre}» — ${dir} — ${w.publicada ? "publicada" : "sin publicar"}${w.no_indexar ? " — noindex" : ""} — ${w.posts} artículo(s)`);
      }
    }
    console.log("");
  }

  // Espacios sin ningún miembro: no los ve nadie, pero ocupan y bloquean nombres.
  const huerfanos = await sql`
    SELECT o.id, o.nombre, o.created_at FROM organizations o
    WHERE NOT EXISTS (SELECT 1 FROM memberships m WHERE m.org_id = o.id)`;
  if (huerfanos.length > 0) {
    console.log(`=== ${huerfanos.length} ESPACIO(S) HUÉRFANO(S) (sin dueño) ===`);
    for (const o of huerfanos) console.log(`· «${o.nombre}» — ${fecha(o.created_at)} — ${o.id}`);
    console.log("");
  }

  const [t] = await sql`
    SELECT (SELECT count(*) FROM organizations) AS orgs, (SELECT count(*) FROM projects) AS webs,
           (SELECT count(*) FROM snapshots) AS snaps, (SELECT count(*) FROM posts) AS posts,
           (SELECT count(*) FROM auth_tokens WHERE usado_at IS NULL AND expira_at > now()) AS tokens`;
  console.log(`=== TOTALES ===`);
  console.log(`${usuarios.length} cuentas · ${t.orgs} espacios · ${t.webs} webs · ${t.snaps} versiones · ${t.posts} artículos · ${t.tokens} enlace(s) de correo vivos`);
} finally {
  await sql.end();
}
