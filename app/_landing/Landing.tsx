import "./landing.css";
import { Reveal } from "./Reveal";
import { FirmaQuantiva } from "../_components/FirmaQuantiva";

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

const CTA = "/registro";

export function Landing() {
  return (
    <div className="landing">
      <Reveal />

      <header className="top">
        <div className="contenedor top-int">
          <a href="/" aria-label="Estrénala — inicio">
            <img className="logo" src="/brand/logo-tinta.png" alt="Estrénala" />
          </a>
          <nav aria-label="Principal">
            <div className="enlaces">
              <a href="#como">Cómo funciona</a>
              <a href="#editar">Editar</a>
              <a href="#blog">Blog</a>
              <a href="#faq">Preguntas</a>
            </div>
            <a className="btn btn-primario btn-sm" href={CTA}>Sube tu web gratis</a>
            <details className="menu-movil">
              <summary aria-label="Abrir menú"><span className="barras" /></summary>
              <div className="panel">
                <a href="#como">Cómo funciona</a>
                <a href="#editar">Editar</a>
                <a href="#blog">Blog</a>
                <a href="#equipo">Equipos</a>
                <a href="#faq">Preguntas</a>
                <a className="btn btn-primario btn-sm" href={CTA}>Sube tu web gratis</a>
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
            <p className="eyebrow reveal">La IA te hizo una web preciosa…</p>
            <h1 id="dolor" className="reveal d1">…y lleva semanas muerta en una carpeta.</h1>
            <p className="promesa reveal d2">Nosotros la ponemos <span className="hl">en el mundo</span>.</p>
            <p className="sub reveal d2">
              Arrastra la web que te dio Claude, ChatGPT o v0 y queda online con dominio y HTTPS.
              Edítala como quieras. El blog escribe solo. Sin saber programar.
            </p>
            <div className="acciones reveal d3">
              <a className="btn btn-primario" href={CTA}>Sube tu web gratis →</a>
              <span className="nota">Gratis para empezar · sin tarjeta</span>
            </div>

            <div
              className="mock reveal d3"
              role="img"
              aria-label="Vista del panel de proyecto de Estrénala: la web Clínica Sonrisa publicada, con los pasos Súbela, Publica y Edítala."
            >
              <div className="mock-barra">
                <span className="nom">Clínica Sonrisa</span>
                <span className="badge"><span className="punto" />Publicado</span>
                <span className="url">clinica-sonrisa.estrenala.com</span>
              </div>
              <div className="mock-lienzo">
                <span className="mock-cinta" />
                <span className="mock-etq">en directo ✂</span>
              </div>
              <div className="mock-pasos">
                <div className="p"><b>1.</b> Súbela</div>
                <div className="p"><b>2.</b> Publica</div>
                <div className="p on">3. Edítala</div>
              </div>
            </div>
          </div>
        </section>

        {/* PROBLEMA */}
        <section className="seccion problema">
          <div className="contenedor">
            <div className="problema-caja reveal">
              <span className="eyebrow">El momento en que te quedas atascado</span>
              <h2 style={{ marginTop: 14 }}>
                La IA te hizo la web en minutos. <span className="tach">Subirla</span> te lleva semanas.
              </h2>
              <p>
                Tienes un ZIP con tu web dentro, o unos archivos que no sabes dónde poner. Aparecen
                palabras como «hosting», «DNS», «servidor»… y la ilusión se apaga. La web que te
                encantó se queda en tu ordenador, sin que la vea nadie.
              </p>
              <p className="firma">
                Estrénala empieza justo <span className="hl">donde la IA te deja tirado</span>.
              </p>
            </div>
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section className="seccion" id="como">
          <div className="contenedor">
            <div className="cab-seccion reveal">
              <span className="eyebrow">Cómo funciona</span>
              <h2>De la carpeta a internet, en tres pasos</h2>
              <p>Sin instalar nada, sin tocar código, sin llamar a tu sobrino que «sabe de ordenadores».</p>
            </div>
            <div className="pasos">
              <div className="paso reveal">
                <div className="n">1</div>
                <h3>Súbela</h3>
                <p>Arrastra el archivo o la carpeta que te dio la IA. Da igual si es de Claude, ChatGPT o v0: si es una web en HTML, vale.</p>
                <span className="chip">.html · .zip · carpeta</span>
              </div>
              <div className="paso reveal d1">
                <div className="n">2</div>
                <h3>Publica</h3>
                <p>En un clic queda online con una dirección propia y HTTPS. ¿Tienes tu dominio? Conéctalo y listo.</p>
                <span className="chip">subdominio o dominio propio · HTTPS</span>
              </div>
              <div className="paso reveal d2">
                <div className="n">3</div>
                <h3>Edítala</h3>
                <p>Cambia textos, imágenes, botones y colores cuando quieras. Con historial, para volver atrás sin miedo.</p>
                <span className="chip">historial y revertir</span>
              </div>
            </div>
          </div>
        </section>

        {/* EDÍTALA COMO QUIERAS */}
        <section className="seccion" id="editar" style={{ background: "var(--superficie-2)" }}>
          <div className="contenedor">
            <div className="cab-seccion reveal">
              <span className="eyebrow">Edítala como quieras · sin encierro</span>
              <h2>Tres formas de editar. Eliges tú, no nosotros.</h2>
              <p>Puedes usar una, otra o las tres a la vez. Pases por donde pases, siempre queda guardado en el historial.</p>
            </div>
            <div className="vias">
              <div className="tarjeta-via reveal">
                <div className="via-icono suave">✎</div>
                <span className="etq">Gratis</span>
                <h3>A mano, aquí mismo</h3>
                <p>Haz clic sobre tu web real y cambia lo que veas: textos (con negrita, cursiva y enlaces), imágenes, botones y colores.</p>
                <ul>
                  <li><span className="tick">✓</span> Sin código, sobre la web real</li>
                  <li><span className="tick">✓</span> Historial y revertir siempre</li>
                  <li><span className="tick">✓</span> Gratis, sin límite</li>
                </ul>
              </div>
              <div className="tarjeta-via destacada reveal d1">
                <div className="via-icono lima">✦</div>
                <span className="etq">Con tu clave de IA · opt-in</span>
                <h3>Con el asistente de IA</h3>
                <p>Dile en tus palabras qué cambiar («haz el titular más corto», «pon el teléfono en la cabecera») y lo hace por ti.</p>
                <ul>
                  <li><span className="tick">✓</span> Conectas tu propia clave de IA</li>
                  <li><span className="tick">✓</span> Tú decides cuándo gastas</li>
                  <li><span className="tick">✓</span> Una opción potente, nunca obligatoria</li>
                </ul>
              </div>
              <div className="tarjeta-via reveal d2">
                <div className="via-icono tinta">⭳</div>
                <span className="etq">Sigue en tu herramienta</span>
                <h3>En tu propia herramienta</h3>
                <p>¿Prefieres seguir en Claude Code, ChatGPT o v0? Edita allí y vuelve a subir el ZIP: tu web online se actualiza en un clic.</p>
                <ul>
                  <li><span className="tick">✓</span> Re-subes el ZIP y ya está</li>
                  <li><span className="tick">✓</span> La versión anterior queda guardada</li>
                  <li><span className="tick">✓</span> Nunca te encerramos aquí</li>
                </ul>
              </div>
            </div>
            <div className="banda-revertir reveal">
              <span className="badge badge-neutro"><span className="punto" />Historial</span>
              <span className="txt">
                Cambies como cambies, <b>siempre puedes volver atrás</b>. Si algo se rompe, lo restauras en un clic.
              </span>
            </div>
          </div>
        </section>

        {/* BLOG AUTOMÁTICO */}
        <section className="seccion seccion-oscura" id="blog">
          <div className="grano" />
          <div className="contenedor" style={{ position: "relative" }}>
            <div className="cab-seccion claro reveal">
              <span className="eyebrow" style={{ color: "var(--acento)" }}>El blog que se escribe solo</span>
              <h2>Aparece en Google sin que tengas que escribir</h2>
              <p>Un blog con contenido fresco te trae visitas. El nuestro se ocupa: encuentra los temas, los escribe y los publica.</p>
            </div>
            <div className="blog-grid">
              <div className="blog-features">
                <div className="blog-feature reveal">
                  <div className="ic">◎</div>
                  <div>
                    <h3>Radar de temas en tendencia</h3>
                    <p>Detecta qué busca la gente de tu sector este mes, con datos reales de búsquedas.</p>
                  </div>
                </div>
                <div className="blog-feature reveal d1">
                  <div className="ic">✎</div>
                  <div>
                    <h3>Redacción por etapas</h3>
                    <p>La IA escribe el artículo paso a paso y tú lo revisas cuando quieras, no de golpe.</p>
                  </div>
                </div>
                <div className="blog-feature reveal d1">
                  <div className="ic">◳</div>
                  <div>
                    <h3>Portada automática</h3>
                    <p>Cada artículo sale con su imagen de portada, sin que tengas que buscarla.</p>
                  </div>
                </div>
                <div className="blog-feature reveal d2">
                  <div className="ic">◷</div>
                  <div>
                    <h3>Programación y piloto automático</h3>
                    <p>Publica en la fecha que elijas, o deja el piloto y sale solo cada semana.</p>
                  </div>
                </div>
                <div className="aviso-coste reveal d2">
                  El blog va con los planes de pago, y escribe con tu propia clave de IA · opt-in: tú decides
                  cuándo gastas. Publicar y editar a mano es gratis.
                </div>
              </div>

              <div
                className="blog-panel reveal d1"
                role="img"
                aria-label="Panel del blog: un artículo publicado, un borrador escrito por IA, uno programado, y el piloto automático activado."
              >
                <div className="item">
                  <div className="t">
                    <b>5 señales de que necesitas una revisión</b>
                    <small>Publicado el 3 de julio</small>
                  </div>
                  <span className="badge badge-dark ok"><span className="punto" />Publicado</span>
                </div>
                <div className="item">
                  <div className="t">
                    <b>Blanqueamiento: mitos y verdades</b>
                    <small>Redacción por etapas · 2 de 4</small>
                  </div>
                  <span className="badge badge-ia">Borrador IA</span>
                </div>
                <div className="item">
                  <div className="t">
                    <b>Cuidar tu ortodoncia en verano</b>
                    <small>Se publica el 20 jul</small>
                  </div>
                  <span className="badge badge-dark prog"><span className="punto" />Programado</span>
                </div>
                <div className="piloto">
                  <div className="t">
                    <b>Piloto automático</b>
                    <small>Un artículo nuevo cada semana</small>
                  </div>
                  <span className="interruptor" role="img" aria-label="Activado" />
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
                <span className="eyebrow">¿Trabajas con más gente?</span>
                <h2 style={{
                  font: "700 clamp(26px,4.2vw,36px)/1.1 var(--sans)",
                  letterSpacing: "-.02em",
                  marginTop: 14,
                }}>
                  Tu equipo, en el mismo sitio
                </h2>
                <p style={{ fontSize: "16.5px", color: "var(--texto-2)", marginTop: 16, maxWidth: "44ch" }}>
                  Tanto si eres tú solo como si eres una agencia con varios clientes, cada web vive en
                  su espacio y trabajáis sin pisaros.
                </p>
                <div className="equipo-lista">
                  <div className="fila"><span className="tick">✓</span> Entra con tu correo o con Google</div>
                  <div className="fila"><span className="tick">✓</span> Invita a más gente a tu espacio</div>
                  <div className="fila"><span className="tick">✓</span> Roles claros: propietario y editor</div>
                </div>
              </div>
              <div className="reveal d1" style={{ textAlign: "center" }}>
                <div className="equipo-caras" style={{ justifyContent: "center" }}>
                  <span className="ava" style={{ background: "var(--acento)", color: "var(--texto)" }}>MR</span>
                  <span className="ava" style={{ background: "var(--texto)", color: "#fff" }}>AM</span>
                  <span className="ava" style={{ background: "var(--superficie-2)", color: "var(--texto-2)" }}>EM</span>
                  <span className="ava" style={{ background: "var(--acento-suave)", color: "var(--acento-texto)" }}>+3</span>
                </div>
                <p style={{ marginTop: 18, fontSize: 14, color: "var(--texto-3)" }}>Propietario · Editor</p>
              </div>
            </div>
          </div>
        </section>

        {/* PARA QUIÉN */}
        <section className="seccion" style={{ background: "var(--superficie-2)" }}>
          <div className="contenedor">
            <div className="cab-seccion reveal">
              <span className="eyebrow">Para quién es</span>
              <h2>Pensada para quien no quiere pelearse con la técnica</h2>
            </div>
            <div className="publico">
              <div className="card reveal">
                <span className="em">🌱</span>
                <h3>Emprendedores</h3>
                <p>Lanzas tu proyecto sin depender de nadie ni esperar semanas a un desarrollador.</p>
              </div>
              <div className="card reveal d1">
                <span className="em">💼</span>
                <h3>Pequeñas agencias</h3>
                <p>Publicas y mantienes las webs de tus clientes en un sitio, con tu equipo dentro.</p>
              </div>
              <div className="card reveal d2">
                <span className="em">✋</span>
                <h3>Gente no técnica</h3>
                <p>Si sabes usar el correo, sabes usar Estrénala. Nada de código ni servidores.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="seccion" id="faq">
          <div className="contenedor">
            <div className="cab-seccion reveal">
              <span className="eyebrow">Preguntas frecuentes</span>
              <h2>Lo que sueles querer saber</h2>
            </div>
            <div className="faq-lista">
              <details className="faq reveal">
                <summary>¿Necesito saber programar?<span className="mas" /></summary>
                <div className="resp">No. Subes tu web, la publicas y la editas haciendo clic sobre ella. Si sabes usar el correo o WhatsApp, sabes usar Estrénala.</div>
              </details>
              <details className="faq reveal">
                <summary>¿Sirve la web que me hizo ChatGPT, Claude o v0?<span className="mas" /></summary>
                <div className="resp">Sí. Si es una web en HTML —lo que generan estas herramientas—, la subes tal cual (un archivo, un ZIP o la carpeta entera) y queda online.</div>
              </details>
              <details className="faq reveal">
                <summary>¿Puedo usar mi propio dominio?<span className="mas" /></summary>
                <div className="resp">Sí. Puedes empezar con una dirección gratuita <b>tunombre.estrenala.com</b> y, cuando quieras, conectar tu dominio propio (p. ej. <b>tunegocio.com</b>). Todo con HTTPS.</div>
              </details>
              <details className="faq reveal">
                <summary>¿Cuánto cuesta la parte de IA?<span className="mas" /></summary>
                <div className="resp">Editar <b>a mano es gratis</b>. La IA (asistente de edición y blog) funciona con <b>tu propia clave</b> y es opt-in: la conectas si quieres y <b>tú decides cuándo gastas</b>. No vendemos «IA ilimitada gratis»: pagas tu consumo real a tu proveedor.</div>
              </details>
              <details className="faq reveal">
                <summary>¿Y si prefiero seguir editando en mi herramienta de IA?<span className="mas" /></summary>
                <div className="resp">Perfecto. Sigue en Claude Code, ChatGPT o v0 y, cuando termines, vuelve a subir el ZIP: tu web online se actualiza en un clic y la versión anterior queda en el historial. No te encerramos aquí.</div>
              </details>
              <details className="faq reveal">
                <summary>¿Puedo volver atrás si rompo algo?<span className="mas" /></summary>
                <div className="resp">Siempre. Cada cambio queda en el historial y puedes restaurar una versión anterior en un clic. Editar sin miedo es parte del trato.</div>
              </details>
              <details className="faq reveal">
                <summary>¿Puedo trabajar en equipo?<span className="mas" /></summary>
                <div className="resp">Sí. Entras con tu correo o con Google e invitas a más gente a tu espacio con roles (propietario o editor). Ideal para agencias con varios clientes.</div>
              </details>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="seccion-oscura cta-final">
          <div className="grano" />
          <div className="contenedor" style={{ position: "relative" }}>
            <h2 className="reveal">Tu web ya está lista. <span className="hl">Estrénala</span>.</h2>
            <p className="reveal d1">Súbela ahora y verla online en internet te llevará menos de lo que has tardado en leer esto.</p>
            <div className="acciones reveal d2">
              <a className="btn btn-primario" href={CTA}>Sube tu web gratis →</a>
              <span className="nota">Gratis para empezar · sin tarjeta · sin saber programar</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="pie">
        <div className="contenedor">
          <div className="pie-int">
            <div className="marca">
              <img className="logo-pie" src="/brand/logo-blanco.png" alt="Estrénala" />
              <p>El sitio donde tu web hecha con IA por fin sale al mundo.</p>
            </div>
            <div className="pie-cols">
              <div className="pie-col">
                <h4>Producto</h4>
                <a href="#como">Cómo funciona</a>
                <a href="#editar">Editar sin código</a>
                <a href="#blog">Blog automático</a>
                <a href="#equipo">Equipos</a>
              </div>
              <div className="pie-col">
                <h4>Empezar</h4>
                <a href={CTA}>Sube tu web</a>
                <a href="/login">Entrar</a>
                <a href="#faq">Preguntas frecuentes</a>
              </div>
              <div className="pie-col">
                <h4>Legal</h4>
                <a href="/legal/aviso-legal">Aviso legal</a>
                <a href="/legal/privacidad">Privacidad</a>
                <a href="/legal/cookies">Cookies</a>
                <a href="/legal/terminos">Términos</a>
              </div>
            </div>
          </div>
          <div className="pie-abajo">
            <span>© {new Date().getFullYear()} Estrénala · estrenala.com</span>
            <span>Hecho en España · Tu web hecha con IA, por fin en directo.</span>
            <FirmaQuantiva tono="oscuro" />
          </div>
        </div>
      </footer>
    </div>
  );
}
