import "../_landing/landing.css";
import { TITULAR, ACTUALIZADO } from "@/src/legal/titular";
import { textosLegal } from "@/src/i18n/legal";
import { idiomaDeSesion } from "@/src/i18n/servidor";
import { rellenar } from "@/src/i18n/rellenar";

// Envoltorio de los cuatro documentos legales: misma piel que la landing
// (reutiliza landing.css, todo acotado a .landing) con una columna de lectura.
//
// La envoltura SÍ va traducida aunque tres de los cuatro documentos estén solo en
// español: son etiquetas de navegación, no el contrato. Lo que no puede pasar es
// que alguien llegue a un texto en español creyendo que está en el suyo, y de eso
// se encarga `soloEspanol` (ver src/i18n/legal/tipos.ts).
export async function PaginaLegal({
  titulo, soloEspanol, children,
}: {
  /** Ya traducido por quien llama, o en español si el documento no se traduce. */
  titulo: string;
  /** `true` en los tres que no se traducen: saca el aviso del idioma. */
  soloEspanol?: boolean;
  children: React.ReactNode;
}) {
  const idioma = await idiomaDeSesion();
  const t = textosLegal(idioma).paginas;
  // A quien lee en español no hay que avisarle de que el documento está en
  // español: solo es información para quien esperaba encontrárselo en el suyo.
  const avisarDelIdioma = soloEspanol && idioma !== "es";
  const docs = [
    { href: "/legal/aviso-legal", texto: t.avisoLegal },
    { href: "/legal/privacidad", texto: t.privacidad },
    { href: "/legal/cookies", texto: t.cookies },
    { href: "/legal/terminos", texto: t.terminos },
  ];

  return (
    <div className="landing">
      <header className="top">
        <div className="contenedor top-int">
          <a href="/" aria-label={t.inicio}>
            <img className="logo" src="/brand/logo-tinta.png" alt="Estrénala" />
          </a>
          <nav aria-label={t.principal}>
            <div className="enlaces">
              {docs.map((d) => <a key={d.href} href={d.href}>{d.texto}</a>)}
            </div>
            <a className="btn btn-primario btn-sm" href="/registro">{t.cta}</a>
          </nav>
        </div>
      </header>

      <main className="seccion">
        <div className="contenedor doc-legal">
          <h1>{titulo}</h1>
          <p className="actualizado">{rellenar(t.actualizado, { fecha: ACTUALIZADO })}</p>
          {/* `lang` es el del AVISO, que va traducido — no el del documento. */}
          {avisarDelIdioma && <p className="aviso-idioma" lang={idioma}>{t.soloEspanol}</p>}
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
              {docs.map((d, i) => (
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
