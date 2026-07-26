import "../_landing/landing.css";
import { TITULAR, ACTUALIZADO } from "@/src/legal/titular";

const DOCS = [
  { href: "/legal/aviso-legal", texto: "Aviso legal" },
  { href: "/legal/privacidad", texto: "Privacidad" },
  { href: "/legal/cookies", texto: "Cookies" },
  { href: "/legal/terminos", texto: "Términos" },
];

// Envoltorio de los cuatro documentos legales: misma piel que la landing
// (reutiliza landing.css, todo acotado a .landing) con una columna de lectura.
export function PaginaLegal({
  titulo, children,
}: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="landing">
      <header className="top">
        <div className="contenedor top-int">
          <a href="/" aria-label="Estrénala — inicio">
            <img className="logo" src="/brand/logo-tinta.png" alt="Estrénala" />
          </a>
          <nav aria-label="Principal">
            <div className="enlaces">
              {DOCS.map((d) => <a key={d.href} href={d.href}>{d.texto}</a>)}
            </div>
            <a className="btn btn-primario btn-sm" href="/registro">Sube tu web gratis</a>
          </nav>
        </div>
      </header>

      <main className="seccion">
        <div className="contenedor doc-legal">
          <h1>{titulo}</h1>
          <p className="actualizado">Última actualización: {ACTUALIZADO}</p>
          {!TITULAR.nif && (
            <p className="falta-nif">
              ⚠️ Documento incompleto: falta el NIF del titular (obligatorio por la LSSI-CE).
              Rellénalo en <code>src/legal/titular.ts</code> antes de publicar.
            </p>
          )}
          {children}
        </div>
      </main>

      <footer className="pie">
        <div className="contenedor">
          <div className="pie-abajo" style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}>
            <span>© {new Date().getFullYear()} {TITULAR.marca} · {TITULAR.sitio}</span>
            <span>
              {DOCS.map((d, i) => (
                <span key={d.href}>
                  {i > 0 && " · "}
                  <a href={d.href}>{d.texto}</a>
                </span>
              ))}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
