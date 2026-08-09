import "../_landing/landing.css";
import { idiomaActual } from "@/src/i18n/servidor";
import { textosLanding } from "@/src/i18n/landing";
import { rutaDeIdioma } from "@/src/i18n/idiomas";

/**
 * El cuerpo de la 404 de la plataforma.
 *
 * Está aquí y no en `not-found.tsx` porque se pinta desde DOS sitios y tienen
 * que enseñar lo mismo:
 *
 *  - `app/not-found.tsx`, para cuando una página existente decide que lo que le
 *    piden no está (un artículo del blog con un slug inventado).
 *  - `app/no-encontrada/page.tsx`, adonde el middleware reescribe las
 *    direcciones que no encajan con ninguna ruta. Va por una página de verdad
 *    porque el `not-found` de Next, cuando NO hay ninguna ruta que renderizar,
 *    sale sin la envoltura de la raíz: `<html id="__next_error__">` con el
 *    `<body>` vacío y el contenido en el payload, o sea que solo aparece
 *    después de ejecutar JavaScript. (Comprobado contra el build de producción.
 *    `global-not-found` lo arreglaría, pero su bandera solo la lee la
 *    construcción con webpack y aquí se construye con Turbopack.)
 *
 * Se parece a propósito a la 404 de las webs de clientes —el mismo glifo negro
 * con el 404 en lima, ver `pagina404` en src/publish/resolve-site.ts—: son la
 * misma casa, y quien se cruce con las dos tiene que reconocerlo.
 *
 * El idioma sale de la petición (cookie o navegador) y no de la URL: aquí no hay
 * URL de la que fiarse, precisamente porque esa dirección no existe.
 */
export async function NoEncontrada() {
  const idioma = await idiomaActual();
  const t = textosLanding(idioma).noEncontrada;

  return (
    <div className="landing" lang={idioma}>
      <main style={{ minHeight: "80vh", display: "grid", placeItems: "center", padding: "72px 20px" }}>
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <div
            style={{
              width: 76, height: 76, borderRadius: 20, margin: "0 auto 26px",
              background: "var(--texto)", color: "var(--acento)",
              display: "grid", placeItems: "center",
              font: "700 30px var(--sans)", boxShadow: "var(--sombra-2)",
            }}
          >
            404
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12, lineHeight: 1.15 }}>{t.titulo}</h1>
          <p style={{ color: "var(--texto-2)", fontSize: 17, margin: "0 auto 30px", maxWidth: 440 }}>{t.texto}</p>
          {/* Un <a> normal y no next/link: esto se pinta fuera del camino
              habitual de la aplicación, y un enlace de verdad funciona siempre. */}
          <a className="btn btn-primario" href={rutaDeIdioma(idioma)}>{t.boton}</a>
        </div>
      </main>
    </div>
  );
}
