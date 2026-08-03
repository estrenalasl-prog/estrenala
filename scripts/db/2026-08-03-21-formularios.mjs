// Migración 21 (aditiva): recoger los envíos de los formularios de las webs.
//
// Dos cosas: el interruptor por proyecto y la tabla donde caen los mensajes.
//
// El interruptor nace APAGADO a propósito. Encenderlo hace que la plataforma
// empiece a guardar datos de terceros —quien rellena el formulario no es cliente
// nuestro, es cliente de nuestro cliente— y eso lo decide el dueño de la web.
// Mientras esté apagado, su web se sirve exactamente como la subió.
//
// Uso:  node scripts/db/2026-08-03-21-formularios.mjs
// Lee DATABASE_URL de .env.local (nunca la imprime).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(path.join(RAIZ, "package.json"));
const postgres = require("postgres");

const env = readFileSync(path.join(RAIZ, ".env.local"), "utf8");
const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!url) { console.error("Falta DATABASE_URL en .env.local"); process.exit(1); }

const sql = postgres(url, { prepare: false, max: 1 });

try {
  // GUARDA: que la base de destino sea la de Estrénala y no otra cosa. Es una
  // comprobación barata que evita el accidente caro — aplicar esto contra la
  // base de otro producto.
  const nuestras = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('users','organizations','memberships','projects','snapshots')
  `;
  if (nuestras.length !== 5) {
    console.error(
      `Esta base NO parece la de Estrénala: de las 5 tablas esperadas solo hay ${nuestras.length}.\n` +
      `No se toca nada.`
    );
    process.exit(1);
  }

  await sql`
    ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS recoge_formularios boolean NOT NULL DEFAULT false
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS form_submissions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES projects(id),
      pagina text NOT NULL,
      form_indice integer NOT NULL,
      datos jsonb NOT NULL,
      leido boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  // La bandeja se lee SIEMPRE por proyecto y por fecha descendente (lo último,
  // arriba). Sin este índice, cada visita a la bandeja recorre la tabla entera, y
  // esta tabla es la que más va a crecer de todas.
  await sql`
    CREATE INDEX IF NOT EXISTS form_submissions_project_fecha
    ON form_submissions (project_id, created_at DESC)
  `;

  const [columna] = await sql`
    SELECT data_type, column_default FROM information_schema.columns
    WHERE table_schema='public' AND table_name='projects' AND column_name='recoge_formularios'
  `;
  if (!columna) { console.error("projects.recoge_formularios no se creó. Algo ha ido mal."); process.exit(1); }
  console.log(`OK -> projects.recoge_formularios  tipo=${columna.data_type}  por defecto=${columna.column_default}`);

  const [tabla] = await sql`
    SELECT count(*)::int AS columnas FROM information_schema.columns
    WHERE table_schema='public' AND table_name='form_submissions'
  `;
  console.log(`OK -> form_submissions con ${tabla.columnas} columnas`);

  const [{ encendidas, total }] = await sql`
    SELECT count(*) FILTER (WHERE recoge_formularios)::int AS encendidas,
           count(*)::int AS total
    FROM projects
  `;
  console.log(`Webs: ${total} · con recogida encendida: ${encendidas} (tiene que ser 0 recién migrado)`);
} finally {
  await sql.end({ timeout: 5 });
}
