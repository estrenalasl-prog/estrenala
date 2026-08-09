import { TITULAR } from "@/src/legal/titular";
import { RUTA_BLOG } from "@/src/blog-estrenala/indice";

/**
 * La cabecera y el pie del blog.
 *
 * Deliberadamente más flacos que los de la portada: aquí la gente viene a leer,
 * y un menú con nueve enlaces solo le da nueve formas de irse antes de terminar.
 * Una vuelta a la portada, un botón, y fuera.
 *
 * Misma piel que las páginas legales (landing.css, todo acotado a `.landing`),
 * por la misma razón: que el blog no parezca de otra empresa.
 */
export function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing">
      <header className="top">
        <div className="contenedor top-int">
          <a href="/" aria-label="Inicio">
            <img className="logo" src="/brand/logo-tinta.png" alt="Estrénala" width={460} height={115} />
          </a>
          <nav aria-label="Principal">
            <div className="enlaces">
              <a href={RUTA_BLOG}>Blog</a>
            </div>
            <a className="btn btn-primario btn-sm" href="/registro">Sube tu web</a>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="pie">
        <div className="contenedor">
          <div className="pie-abajo" style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}>
            <span>© {new Date().getFullYear()} {TITULAR.marca} · {TITULAR.sitio}</span>
            <span>
              <a href="/">Inicio</a> · <a href={RUTA_BLOG}>Blog</a> ·{" "}
              <a href="/legal/privacidad">Privacidad</a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
