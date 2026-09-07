import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * El título de la pestaña también es parte de la traducción.
 *
 * Se descubrió el 2026-09-03 preparando el lanzamiento: con el navegador en
 * inglés, `/login` servía el cuerpo en inglés y la pestaña en español, porque la
 * página no tenía título propio y heredaba la constante de `app/layout.tsx`, que
 * es español fijo. En la 404 era peor: `<title>` en español y `<h1>` en inglés,
 * a la vez y en la misma pantalla.
 *
 * No lo ve ningún test de los que pintan componentes, porque el título no está
 * en el árbol que pintan: lo resuelve Next aparte. Por eso este mira los
 * archivos.
 */
const lee = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");

/** Páginas que un visitante alcanza con el navegador en el idioma que sea. */
const CON_TITULO_PROPIO = [
  "app/login/page.tsx",
  "app/registro/page.tsx",
  "app/settings/page.tsx",
  "app/projects/[id]/page.tsx",
];

describe("cada pantalla resuelve su propio título", () => {
  it("no heredan el título en español del layout", () => {
    for (const ruta of CON_TITULO_PROPIO) {
      expect(lee(ruta), `${ruta} no exporta generateMetadata: su pestaña saldrá en español`)
        .toContain("export async function generateMetadata");
    }
  });

  /**
   * El título del layout es español fijo y así se queda: es el de la landing, que
   * ES la página en español. Lo que no puede es colarse en pantallas traducidas.
   */
  it("el layout sigue siendo el único con el título en español fijo", () => {
    expect(lee("app/layout.tsx")).toContain('const TITULO = "Estrénala — Tu web hecha con IA, por fin en directo"');
  });
});

describe("las dos 404", () => {
  const PAGINAS_404 = ["app/not-found.tsx", "app/no-encontrada/page.tsx"];

  // «404» se lee igual en los cinco idiomas. El cuerpo sí se traduce (sale del
  // catálogo de la landing), así que un título en español lo contradecía.
  it("no tienen un título en español mientras el cuerpo va traducido", () => {
    for (const ruta of PAGINAS_404) {
      const fuente = lee(ruta);
      expect(fuente, `${ruta} vuelve a tener el título fijo en español`)
        .not.toContain('title: "Página no encontrada');
      expect(fuente, `${ruta} sin título`).toContain('title: "404 · Estrénala"');
    }
  });

  it("siguen fuera del índice de los buscadores", () => {
    for (const ruta of PAGINAS_404) {
      expect(lee(ruta)).toContain("robots: { index: false, follow: false }");
    }
  });
});


/**
 * Qué desbloquea de verdad confirmar el correo.
 *
 * OJO, que aquí me equivoqué el 2026-09-03 y conviene que quede escrito: al
 * buscar dónde se exigía la verificación di por hecho que lo único que hacía era
 * pintar un banner en el panel, y dije que se podía publicar sin confirmar. Es
 * FALSO. Se puede SUBIR sin confirmar —ahí no se comprueba nada—, pero PUBLICAR
 * pasa por `exigirEmailVerificado` y responde 403 «Confirma tu correo antes de
 * publicar».
 *
 * Se pasa por alto fácil porque en desarrollo NO se exige: sin envío de correo
 * configurado, `exigirEmailVerificado` se rinde y deja pasar, así que en local
 * no se ve nunca. Solo aparece en producción.
 *
 * De lo que sí era verdad: la pantalla decía «Ya puedes publicar tus webs sin
 * límites», y ese «sin límites» sobra — el plan gratuito incluye UNA web.
 */
describe("confirmar el correo", () => {
  const IDIOMAS = ["es", "en", "pt", "fr", "it"] as const;

  it("hace falta para publicar, y por eso la pantalla puede prometerlo", () => {
    expect(lee("app/api/projects/[id]/publish/route.ts"), "publicar dejó de exigir el correo confirmado")
      .toContain("exigirEmailVerificado");
  });

  it("subir NO lo exige: el ZIP entra antes de confirmar", () => {
    expect(lee("app/api/projects/route.ts")).not.toContain("exigirEmailVerificado");
  });

  it("ninguna versión promete un «sin límites» que el plan gratuito no da", () => {
    for (const idioma of IDIOMAS) {
      const linea = lee(`src/i18n/cuenta/${idioma}.ts`).split("\n").find((l) => l.includes("okLead:")) ?? "";
      expect(linea, `${idioma}: sigue prometiendo publicar «sin límites»`)
        .not.toMatch(/sin límites|without limits|sem limites|sans limite|senza limiti/i);
    }
  });
});

/**
 * Las cuatro legales existían y estaban enlazadas en el pie, pero el formulario
 * de alta no las mencionaba. Quien crea una cuenta no tiene por qué ir a
 * buscarlas: el aviso va donde se acepta, debajo del botón.
 */
describe("el aviso legal del registro", () => {
  it("el formulario enlaza términos y privacidad", () => {
    const fuente = lee("app/registro/RegistroForm.tsx");
    expect(fuente).toContain('href="/legal/terminos"');
    expect(fuente).toContain('href="/legal/privacidad"');
  });

  it("está en los cinco idiomas", () => {
    for (const idioma of ["es", "en", "pt", "fr", "it"] as const) {
      expect(lee(`src/i18n/cuenta/${idioma}.ts`), `falta en ${idioma}`).toContain("legalPrivacidad:");
    }
  });
});
