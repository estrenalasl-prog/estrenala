import "./landing.css";
import { Reveal } from "./Reveal";
import { FirmaQuantiva } from "../_components/FirmaQuantiva";
import { conFormato, sinFormato } from "@/src/i18n/formato";
import { textosLanding } from "@/src/i18n/landing";
import { fichaLanding } from "./ficha";
import { IDIOMAS, NOMBRE_IDIOMA, rutaDeIdioma, type Idioma } from "@/src/i18n/idiomas";

// Landing pública de estrenala.com. Viene del mockup 11-landing.html de la sesión
// de diseño (Claude Design). Cambios deliberados al integrar, para no prometer
// nada que no exista:
//  - Los logos base64 del mockup se sustituyen por el PNG real de public/brand
//    (servido con <img> normal: next/image lo rompe, ver la guarda del logo).
//  - El rol «Invitado» del mock de equipos se quita: solo hay propietario y editor.
//  - Las «640 lecturas» del mock del blog se quitan: no hay analítica de lecturas.
//  - La columna «Legal» del pie enlaza las páginas reales de /legal (incremento 14).
//  - Los CTA apuntan al registro real (/registro) en vez del ancla #registro.
//  - «Sube el ZIP» pasa a «Súbela»: desde el incremento 12 también vale un .html
//    suelto o una carpeta.
//  - La sección del blog dice que va con los planes de pago (incremento 17): sin
//    precios todavía, pero sin dar a entender que entra en el gratuito.
//
// Los textos viven en src/i18n/landing/. Aquí solo queda la estructura, que es la
// misma en los cinco idiomas: el catálogo manda qué dice y esto manda cómo se ve.

const CTA = "/registro";

export function Landing({ idioma = "es" }: { idioma?: Idioma }) {
  const t = textosLanding(idioma);

  // Enlaces de verdad, no un desplegable con JavaScript: así Google encuentra
  // las cinco versiones y funcionan aunque los scripts no carguen. Se usan en
  // tres sitios (cabecera, menú móvil y pie) y por eso se construyen una vez.
  const enlacesIdioma = IDIOMAS.map((i) => (
    <a key={i} href={rutaDeIdioma(i)} hrefLang={i} lang={i} aria-current={i === idioma ? "true" : undefined}>
      {NOMBRE_IDIOMA[i]}
    </a>
  ));

  return (
    <div className="landing" lang={idioma}>
      {/* La ficha que le decimos a todo el mundo que hay que tener. La landing
          no la traía: lo destapó nuestro propio examen de SEO al pasárselo a
          esta página. */}
      <script
        type="application/ld+json"
        // El contenido está serializado y con el `<` escapado en ficha.ts; no
        // hay ninguna entrada de usuario en él.
        dangerouslySetInnerHTML={{ __html: fichaLanding(idioma) }}
      />
      <Reveal />

      <header className="top">
        <div className="contenedor top-int">
          <a href={rutaDeIdioma(idioma)} aria-label={t.nav.inicio}>
            <img className="logo" src="/brand/logo-tinta.png" alt="Estrénala" width={460} height={115} />
          </a>
          <nav aria-label={t.nav.principal}>
            <div className="enlaces">
              <a href="#como">{t.nav.como}</a>
              <a href="#editar">{t.nav.editar}</a>
              <a href="#encontrar">{t.nav.encontrar}</a>
              <a href="#blog">{t.nav.blog}</a>
              <a href="#faq">{t.nav.faq}</a>
            </div>
            <a className="btn btn-primario btn-sm" href={CTA}>{t.nav.cta}</a>
            {/* Arriba y también en el pie. Solo en el pie no basta: la landing es
                larga, y quien cae en un idioma que no lee tendría que bajarla
                entera —leyéndola— para encontrar la salida. */}
            <details className="menu-idioma">
              <summary aria-label={t.pie.idioma}>
                <span lang={idioma}>{NOMBRE_IDIOMA[idioma]}</span>
                <span className="flecha" />
              </summary>
              <div className="panel">{enlacesIdioma}</div>
            </details>
            <details className="menu-movil">
              <summary aria-label={t.nav.abrirMenu}><span className="barras" /></summary>
              <div className="panel">
                <a href="#como">{t.nav.como}</a>
                <a href="#editar">{t.nav.editar}</a>
                <a href="#encontrar">{t.nav.encontrar}</a>
                <a href="#blog">{t.nav.blog}</a>
                <a href="#equipo">{t.nav.equipos}</a>
                <a href="#faq">{t.nav.faq}</a>
                <a className="btn btn-primario btn-sm" href={CTA}>{t.nav.cta}</a>
                <div className="idiomas-movil">
                  <span className="tit">{t.pie.idioma}</span>
                  {enlacesIdioma}
                </div>
              </div>
            </details>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="hero" aria-labelledby="dolor">
          <div className="grano" />
          <div className="contenedor" style={{ position: "relative" }}>
            <p className="eyebrow reveal">{t.hero.eyebrow}</p>
            <h1 id="dolor" className="reveal d1">{t.hero.titular}</h1>
            <p className="promesa reveal d2">{conFormato(t.hero.promesa)}</p>
            <p className="sub reveal d2">{t.hero.sub}</p>
            <div className="acciones reveal d3">
              <a className="btn btn-primario" href={CTA}>{t.hero.cta}</a>
              <span className="nota">{t.hero.nota}</span>
            </div>

            <div className="mock reveal d3" role="img" aria-label={t.hero.mockAria}>
              <div className="mock-barra">
                <span className="nom">{t.hero.mockNombre}</span>
                <span className="badge"><span className="punto" />{t.hero.mockPublicado}</span>
                <span className="url">clinica-sonrisa.estrenala.com</span>
              </div>
              <div className="mock-lienzo">
                <span className="mock-cinta" />
                <span className="mock-etq">{t.hero.mockEtiqueta}</span>
              </div>
              <div className="mock-pasos">
                <div className="p"><b>1.</b> {t.hero.mockPaso1}</div>
                <div className="p"><b>2.</b> {t.hero.mockPaso2}</div>
                <div className="p on">3. {t.hero.mockPaso3}</div>
              </div>
            </div>
          </div>
        </section>

        {/* PROBLEMA */}
        <section className="seccion problema">
          <div className="contenedor">
            <div className="problema-caja reveal">
              <span className="eyebrow">{t.problema.eyebrow}</span>
              <h2 style={{ marginTop: 14 }}>{conFormato(t.problema.titulo)}</h2>
              <p>{t.problema.texto}</p>
              <p className="firma">{conFormato(t.problema.firma)}</p>
            </div>
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section className="seccion" id="como">
          <div className="contenedor">
            <div className="cab-seccion reveal">
              <span className="eyebrow">{t.como.eyebrow}</span>
              <h2>{t.como.titulo}</h2>
              <p>{t.como.texto}</p>
            </div>
            <div className="pasos">
              <div className="paso reveal">
                <div className="n">1</div>
                <h3>{t.como.paso1Titulo}</h3>
                <p>{t.como.paso1Texto}</p>
                <span className="chip">{t.como.paso1Chip}</span>
              </div>
              <div className="paso reveal d1">
                <div className="n">2</div>
                <h3>{t.como.paso2Titulo}</h3>
                <p>{t.como.paso2Texto}</p>
                <span className="chip">{t.como.paso2Chip}</span>
              </div>
              <div className="paso reveal d2">
                <div className="n">3</div>
                <h3>{t.como.paso3Titulo}</h3>
                <p>{t.como.paso3Texto}</p>
                <span className="chip">{t.como.paso3Chip}</span>
              </div>
            </div>
          </div>
        </section>

        {/* EDÍTALA COMO QUIERAS */}
        <section className="seccion" id="editar" style={{ background: "var(--superficie-2)" }}>
          <div className="contenedor">
            <div className="cab-seccion reveal">
              <span className="eyebrow">{t.editar.eyebrow}</span>
              <h2>{t.editar.titulo}</h2>
              <p>{t.editar.texto}</p>
            </div>
            <div className="vias">
              <div className="tarjeta-via reveal">
                <div className="via-icono suave">✎</div>
                <span className="etq">{t.editar.via1Etq}</span>
                <h3>{t.editar.via1Titulo}</h3>
                <p>{t.editar.via1Texto}</p>
                <ul>
                  <li><span className="tick">✓</span> {t.editar.via1Punto1}</li>
                  <li><span className="tick">✓</span> {t.editar.via1Punto2}</li>
                  <li><span className="tick">✓</span> {t.editar.via1Punto3}</li>
                </ul>
              </div>
              <div className="tarjeta-via destacada reveal d1">
                <div className="via-icono lima">✦</div>
                <span className="etq">{t.editar.via2Etq}</span>
                <h3>{t.editar.via2Titulo}</h3>
                <p>{t.editar.via2Texto}</p>
                <ul>
                  <li><span className="tick">✓</span> {t.editar.via2Punto1}</li>
                  <li><span className="tick">✓</span> {t.editar.via2Punto2}</li>
                  <li><span className="tick">✓</span> {t.editar.via2Punto3}</li>
                </ul>
              </div>
              <div className="tarjeta-via reveal d2">
                <div className="via-icono tinta">⭳</div>
                <span className="etq">{t.editar.via3Etq}</span>
                <h3>{t.editar.via3Titulo}</h3>
                <p>{t.editar.via3Texto}</p>
                <ul>
                  <li><span className="tick">✓</span> {t.editar.via3Punto1}</li>
                  <li><span className="tick">✓</span> {t.editar.via3Punto2}</li>
                  <li><span className="tick">✓</span> {t.editar.via3Punto3}</li>
                </ul>
              </div>
            </div>
            <div className="banda-revertir reveal">
              <span className="badge badge-neutro"><span className="punto" />{t.editar.bandaBadge}</span>
              <span className="txt">{conFormato(t.editar.bandaTexto)}</span>
            </div>
          </div>
        </section>

        {/* BLOG AUTOMÁTICO */}
        {/* Y HACEMOS QUE LA ENCUENTREN.
            Va aquí, entre «edítala» y «el blog», porque cuenta el paso de en
            medio: ya la tienes online y bonita, ahora falta que la vean. */}
        <section className="seccion" id="encontrar">
          <div className="contenedor">
            <div className="cab-seccion reveal">
              <span className="eyebrow">{t.encontrar.eyebrow}</span>
              <h2>{t.encontrar.titulo}</h2>
              <p>{t.encontrar.texto}</p>
              {/* El artículo entero, solo en la portada en español: está escrito
                  solo en español y mandar a un italiano a leerlo es peor que no
                  ofrecérselo. Y no es relleno — es lo que enlaza la portada con
                  el blog, que sin esto sería una página huérfana. */}
              {idioma === "es" && (
                <a className="enlace-articulo" href="/blog/formulario-contacto-web-ia-no-envia">
                  {t.encontrar.enlace} →
                </a>
              )}
            </div>
            <div className="enc-grid">
              <div className="enc-features">
                {/* El sobre va PRIMERO, y el examen después: el formulario roto
                    se puede comprobar en treinta segundos y le duele a quien lo
                    comprueba. La nota de SEO es un argumento; esto es un susto. */}
                <div className="enc-feature reveal">
                  <div className="ic">✉</div>
                  <div>
                    <h3>{t.encontrar.f1Titulo}</h3>
                    <p>{t.encontrar.f1Texto}</p>
                  </div>
                </div>
                <div className="enc-feature reveal d1">
                  <div className="ic">◐</div>
                  <div>
                    <h3>{t.encontrar.f2Titulo}</h3>
                    <p>{t.encontrar.f2Texto}</p>
                  </div>
                </div>
                <div className="enc-feature reveal d2">
                  <div className="ic">◈</div>
                  <div>
                    <h3>{t.encontrar.f3Titulo}</h3>
                    <p>{t.encontrar.f3Texto}</p>
                  </div>
                </div>
              </div>

              {/* El examen tal y como se ve en el panel. Es el «ajá» de la
                  sección: se entiende antes viéndolo que leyéndolo. */}
              <div className="examen reveal d1" role="img" aria-label={t.encontrar.panelAria}>
                <div className="nota">
                  <span className="n">62</span>
                  <span className="de">{t.encontrar.notaPie}</span>
                  <p>{t.encontrar.veredicto}</p>
                </div>
                <div className="item">
                  <span className="badge badge-grave">{t.encontrar.fallo1Badge}</span>
                  <div className="t">
                    <b>{t.encontrar.fallo1}</b>
                    <small>{t.encontrar.fallo1Pie}</small>
                  </div>
                </div>
                <div className="item">
                  <span className="badge badge-nuestro">{t.encontrar.fallo2Badge}</span>
                  <div className="t">
                    <b>{t.encontrar.fallo2}</b>
                    <small>{t.encontrar.fallo2Pie}</small>
                  </div>
                </div>
                <div className="item">
                  <span className="badge badge-grave">{t.encontrar.fallo3Badge}</span>
                  <div className="t">
                    <b>{t.encontrar.fallo3}</b>
                    <small>{t.encontrar.fallo3Pie}</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="banda-revertir reveal d2">
              <span className="txt">{conFormato(t.encontrar.banda)}</span>
            </div>
          </div>
        </section>

        <section className="seccion seccion-oscura" id="blog">
          <div className="grano" />
          <div className="contenedor" style={{ position: "relative" }}>
            <div className="cab-seccion claro reveal">
              <span className="eyebrow" style={{ color: "var(--acento)" }}>{t.blog.eyebrow}</span>
              <h2>{t.blog.titulo}</h2>
              <p>{t.blog.texto}</p>
            </div>
            <div className="blog-grid">
              <div className="blog-features">
                <div className="blog-feature reveal">
                  <div className="ic">◎</div>
                  <div>
                    <h3>{t.blog.f1Titulo}</h3>
                    <p>{t.blog.f1Texto}</p>
                  </div>
                </div>
                <div className="blog-feature reveal d1">
                  <div className="ic">✎</div>
                  <div>
                    <h3>{t.blog.f2Titulo}</h3>
                    <p>{t.blog.f2Texto}</p>
                  </div>
                </div>
                <div className="blog-feature reveal d1">
                  <div className="ic">◳</div>
                  <div>
                    <h3>{t.blog.f3Titulo}</h3>
                    <p>{t.blog.f3Texto}</p>
                  </div>
                </div>
                <div className="blog-feature reveal d2">
                  <div className="ic">◷</div>
                  <div>
                    <h3>{t.blog.f4Titulo}</h3>
                    <p>{t.blog.f4Texto}</p>
                  </div>
                </div>
                <div className="aviso-coste reveal d2">{t.blog.aviso}</div>
              </div>

              <div className="blog-panel reveal d1" role="img" aria-label={t.blog.panelAria}>
                <div className="item">
                  <div className="t">
                    <b>{t.blog.art1Titulo}</b>
                    <small>{t.blog.art1Pie}</small>
                  </div>
                  <span className="badge badge-dark ok"><span className="punto" />{t.blog.art1Badge}</span>
                </div>
                <div className="item">
                  <div className="t">
                    <b>{t.blog.art2Titulo}</b>
                    <small>{t.blog.art2Pie}</small>
                  </div>
                  <span className="badge badge-ia">{t.blog.art2Badge}</span>
                </div>
                <div className="item">
                  <div className="t">
                    <b>{t.blog.art3Titulo}</b>
                    <small>{t.blog.art3Pie}</small>
                  </div>
                  <span className="badge badge-dark prog"><span className="punto" />{t.blog.art3Badge}</span>
                </div>
                <div className="piloto">
                  <div className="t">
                    <b>{t.blog.pilotoTitulo}</b>
                    <small>{t.blog.pilotoPie}</small>
                  </div>
                  <span className="interruptor" role="img" aria-label={t.blog.pilotoActivado} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* EQUIPOS */}
        <section className="seccion" id="equipo">
          <div className="contenedor">
            <div className="equipo-grid">
              <div className="reveal">
                <span className="eyebrow">{t.equipo.eyebrow}</span>
                <h2 style={{
                  font: "700 clamp(26px,4.2vw,36px)/1.1 var(--sans)",
                  letterSpacing: "-.02em",
                  marginTop: 14,
                }}>
                  {t.equipo.titulo}
                </h2>
                <p style={{ fontSize: "16.5px", color: "var(--texto-2)", marginTop: 16, maxWidth: "44ch" }}>
                  {t.equipo.texto}
                </p>
                <div className="equipo-lista">
                  <div className="fila"><span className="tick">✓</span> {t.equipo.punto1}</div>
                  <div className="fila"><span className="tick">✓</span> {t.equipo.punto2}</div>
                  <div className="fila"><span className="tick">✓</span> {t.equipo.punto3}</div>
                </div>
              </div>
              <div className="reveal d1" style={{ textAlign: "center" }}>
                <div className="equipo-caras" style={{ justifyContent: "center" }}>
                  <span className="ava" style={{ background: "var(--acento)", color: "var(--texto)" }}>MR</span>
                  <span className="ava" style={{ background: "var(--texto)", color: "#fff" }}>AM</span>
                  <span className="ava" style={{ background: "var(--superficie-2)", color: "var(--texto-2)" }}>EM</span>
                  <span className="ava" style={{ background: "var(--acento-suave)", color: "var(--acento-texto)" }}>+3</span>
                </div>
                <p style={{ marginTop: 18, fontSize: 14, color: "var(--texto-3)" }}>{t.equipo.roles}</p>
              </div>
            </div>
          </div>
        </section>

        {/* PARA QUIÉN */}
        <section className="seccion" style={{ background: "var(--superficie-2)" }}>
          <div className="contenedor">
            <div className="cab-seccion reveal">
              <span className="eyebrow">{t.publico.eyebrow}</span>
              <h2>{t.publico.titulo}</h2>
            </div>
            <div className="publico">
              <div className="card reveal">
                <span className="em">🌱</span>
                <h3>{t.publico.c1Titulo}</h3>
                <p>{t.publico.c1Texto}</p>
              </div>
              <div className="card reveal d1">
                <span className="em">💼</span>
                <h3>{t.publico.c2Titulo}</h3>
                <p>{t.publico.c2Texto}</p>
              </div>
              <div className="card reveal d2">
                <span className="em">✋</span>
                <h3>{t.publico.c3Titulo}</h3>
                <p>{t.publico.c3Texto}</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="seccion" id="faq">
          <div className="contenedor">
            <div className="cab-seccion reveal">
              <span className="eyebrow">{t.faq.eyebrow}</span>
              <h2>{t.faq.titulo}</h2>
            </div>
            <div className="faq-lista">
              {t.faq.preguntas.map((q) => (
                <details className="faq reveal" key={q.p}>
                  <summary>{q.p}<span className="mas" /></summary>
                  <div className="resp">{conFormato(q.r)}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="seccion-oscura cta-final">
          <div className="grano" />
          <div className="contenedor" style={{ position: "relative" }}>
            <h2 className="reveal">{conFormato(t.ctaFinal.titulo)}</h2>
            <p className="reveal d1">{t.ctaFinal.texto}</p>
            <div className="acciones reveal d2">
              <a className="btn btn-primario" href={CTA}>{t.ctaFinal.cta}</a>
              <span className="nota">{t.ctaFinal.nota}</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="pie">
        <div className="contenedor">
          <div className="pie-int">
            <div className="marca">
              <img className="logo-pie" src="/brand/logo-blanco.png" alt="Estrénala" width={461} height={115} />
              <p>{t.pie.lema}</p>
            </div>
            <div className="pie-cols">
              <div className="pie-col">
                <h3>{t.pie.colProducto}</h3>
                <a href="#como">{t.nav.como}</a>
                <a href="#editar">{t.pie.editarSinCodigo}</a>
                <a href="#blog">{t.pie.blogAutomatico}</a>
                <a href="#equipo">{t.nav.equipos}</a>
              </div>
              <div className="pie-col">
                <h3>{t.pie.colEmpezar}</h3>
                <a href={CTA}>{t.pie.subeTuWeb}</a>
                <a href="/login">{t.pie.entrar}</a>
                <a href="#faq">{t.pie.preguntasFrecuentes}</a>
                {/* El blog de verdad (/blog), que no es el «Blog automático» de
                    ahí arriba: eso es un ancla a la sección de producto.
                    Sin este enlace /blog era una página HUÉRFANA — Google solo
                    llegaba por el sitemap y no le pasaba nada de la autoridad de
                    la portada, que es la página fuerte del sitio.
                    Solo en español, y no por descuido: los artículos están solo
                    en español, y mandar a un italiano a leerlos es peor que no
                    ofrecérselo. La palabra «Blog» no necesita traducción. */}
                {idioma === "es" && <a href="/blog">Blog</a>}
              </div>
              <div className="pie-col">
                <h3>{t.pie.colLegal}</h3>
                <a href="/legal/aviso-legal">{t.pie.avisoLegal}</a>
                <a href="/legal/privacidad">{t.pie.privacidad}</a>
                <a href="/legal/cookies">{t.pie.cookies}</a>
                <a href="/legal/terminos">{t.pie.terminos}</a>
              </div>
              {/* También en el pie, y no solo por comodidad: es la única parte del
                  selector que Google ve sin abrir ningún desplegable. */}
              <div className="pie-col">
                <h3>{t.pie.idioma}</h3>
                {enlacesIdioma}
              </div>
            </div>
          </div>
          <div className="pie-abajo">
            <span>© {new Date().getFullYear()} Estrénala · estrenala.com</span>
            <span>{sinFormato(t.pie.hechoEn)}</span>
            <FirmaQuantiva tono="oscuro" />
          </div>
        </div>
      </footer>
    </div>
  );
}
