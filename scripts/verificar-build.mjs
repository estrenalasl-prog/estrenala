// Comprueba que NINGUNA página se ha precalculado al construir.
//
//   npm run build && node scripts/verificar-build.mjs
//
// POR QUÉ: las variables de entorno las inyecta Dokploy al ARRANCAR el
// contenedor, no al construirlo. Una página prerenderizada evalúa `process.env`
// durante el build —donde no hay nada— y se queda con ese valor para siempre.
//
// Ha mordido dos veces:
//   · `metadataBase` quedó en http://localhost:3000 y la tarjeta al compartir
//     apuntaba ahí (2026-07-28);
//   · el botón «Continuar con Google» NUNCA aparecía en producción, con el
//     OAuth perfectamente configurado, porque /registro se construyó con
//     `googleConfigurado()` a false (2026-07-29).
//
// Se arregla con `export const dynamic = "force-dynamic"` en app/layout.tsx,
// que se propaga a todo. Esto vigila que nadie lo quite sin querer.
//
// En `next dev` esto NO se puede detectar: en desarrollo todo se renderiza en
// cada petición, así que el fallo solo aparece al desplegar. De ahí este script.
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(RAIZ, "app");
const CONSTRUIDO = path.join(RAIZ, ".next", "server", "app");

if (!existsSync(CONSTRUIDO)) {
  console.error("No hay build que revisar. Lanza antes: npm run build");
  process.exit(1);
}

// La página de error global la genera Next y no lee nuestro entorno: se permite.
const PERMITIDAS = new Set(["_global-error.html"]);

function html(dir, base = "") {
  const salida = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) salida.push(...html(path.join(dir, e.name), rel));
    else if (e.name.endsWith(".html") && !PERMITIDAS.has(rel)) salida.push(rel);
  }
  return salida;
}

const prerenderizadas = html(CONSTRUIDO);

if (prerenderizadas.length > 0) {
  console.error(`\n✋ Hay ${prerenderizadas.length} página(s) precalculadas al construir:\n`);
  for (const p of prerenderizadas) console.error(`   ${p}`);
  console.error(`\nEso congela process.env con los valores del BUILD, donde Dokploy`);
  console.error(`todavía no ha inyectado nada. Revisa que app/layout.tsx siga teniendo`);
  console.error(`  export const dynamic = "force-dynamic";\n`);
  process.exit(1);
}

// Y de paso, que el layout no haya perdido la declaración.
const layout = readdirSync(DIR).includes("layout.tsx")
  ? (await import("node:fs")).readFileSync(path.join(DIR, "layout.tsx"), "utf8")
  : "";
if (!/export const dynamic\s*=\s*["']force-dynamic["']/.test(layout)) {
  console.error('✋ app/layout.tsx ya no declara `export const dynamic = "force-dynamic"`.');
  process.exit(1);
}

console.log("✔ Ninguna página se precalcula: el entorno se lee en cada petición.");
