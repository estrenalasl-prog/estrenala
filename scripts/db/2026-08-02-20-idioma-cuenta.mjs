// Migración 20 (aditiva): el idioma de la plataforma, por persona.
//
// Nula a propósito: nulo = «todavía no lo ha elegido a mano», y entonces se
// sigue haciendo caso a la landing por la que entró o a su navegador. Poner 'es'
// por defecto congelaría en español a todo el que se registre desde la landing
// italiana, que es justo a quien se intenta captar.
//
// Uso:  node scripts/db/2026-08-02-20-idioma-cuenta.mjs
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

  const antes = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='idioma'
  `;
  console.log(antes.length ? "users.idioma ya existía" : "users.idioma no existe todavía");

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS idioma text`;

  const despues = await sql`
    SELECT data_type, is_nullable FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='idioma'
  `;
  if (!despues.length) { console.error("La columna sigue sin existir. Algo ha ido mal."); process.exit(1); }
  console.log(`OK -> users.idioma  tipo=${despues[0].data_type}  admite nulos=${despues[0].is_nullable}`);

  // Que nadie se haya quedado con un idioma inventado.
  const [{ total, conIdioma }] = await sql`
    SELECT count(*)::int AS total, count(idioma)::int AS "conIdioma" FROM users
  `;
  console.log(`Cuentas: ${total} · con idioma elegido: ${conIdioma} (el resto va en automático)`);
} finally {
  await sql.end({ timeout: 5 });
}
