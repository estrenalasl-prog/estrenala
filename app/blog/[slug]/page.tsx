import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../../_landing/landing.css";
import "../blog.css";
import { Marco } from "../Marco";
import { articuloPorSlug, otrosArticulos, rutaArticulo, RUTA_BLOG } from "@/src/blog-estrenala/indice";
import { cuerpoAHtml, datosEstructurados, rutaPortada } from "@/src/blog-estrenala/render";
import { fechaLarga, minutosDeLectura } from "@/src/blog-estrenala/tipos";
import { urlPlataforma } from "@/src/config/sitio";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = articuloPorSlug(slug);
  if (!a) return {};
  const ruta = rutaArticulo(a.slug);
  // Su propia portada, no la genérica de la marca: pegar cinco artículos en un
  // grupo y que salgan cinco tarjetas idénticas es peor que no tener tarjeta.
  const portada = rutaPortada(a.slug);
  return {
    title: `${a.titulo} — Estrénala`,
    description: a.descripcion,
    alternates: { canonical: ruta },
    openGraph: {
      // `article`, no `website`: es lo que hace que LinkedIn y compañía enseñen
      // la fecha junto al enlace en vez de tratarlo como una página cualquiera.
      type: "article",
      siteName: "Estrénala",
      locale: "es_ES",
      url: ruta,
      title: a.titulo,
      description: a.descripcion,
      publishedTime: a.fecha,
      images: [{ url: portada, width: 1200, height: 630, alt: a.titulo }],
    },
    twitter: { card: "summary_large_image", title: a.titulo, description: a.descripcion, images: [portada] },
  };
}

export default async function Articulo({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = articuloPorSlug(slug);
  if (!a) notFound();
  const otros = otrosArticulos(a.slug);

  return (
    <Marco>
      {/* Los datos estructurados salen del MISMO artículo que se pinta abajo, así
          que no pueden decir cosas distintas. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados(a, urlPlataforma())) }}
      />

      <article>
        <header className="art">
          <div className="contenedor art-col">
            <div className="blog-datos">
              <span className="tema">{a.tema}</span>
              <time dateTime={a.fecha}>{fechaLarga(a.fecha)}</time>
              <span className="sep">·</span>
              <span className="minutos">{minutosDeLectura(a.cuerpo)} min de lectura</span>
            </div>
            <h1>{a.titulo}</h1>
            <p className="entradilla">{a.entradilla}</p>
          </div>
        </header>

        <div className="contenedor art-col">
          {/* Qué se lleva quien lo lea. Quien llega de una búsqueda decide en
              cinco segundos si se queda, y el titular le dice de qué va pero no
              si le sirve. */}
          {a.resumen.length > 0 && (
            <aside className="resumen" aria-label="Lo que vas a leer">
              <p className="resumen-tit">Lo que vas a leer</p>
              <ul>{a.resumen.map((r) => <li key={r}>{r}</li>)}</ul>
            </aside>
          )}

          {/* El contenido es nuestro y está en el repositorio: no hay entrada de
              usuario por ningún lado. */}
          <div className="prosa" dangerouslySetInnerHTML={{ __html: cuerpoAHtml(a.cuerpo) }} />

          {a.preguntas.length > 0 && (
            <section className="faq-art">
              <h2>Preguntas frecuentes</h2>
              <dl>
                {a.preguntas.map((q) => (
                  <div key={q.p}>
                    <dt>{q.p}</dt>
                    <dd>{q.r}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <aside className="art-cta">
            <h2>Tu web ya está hecha. Solo le falta existir.</h2>
            <p>Sube el .zip y ponle dirección gratis. Se tarda menos que en leer esto.</p>
            <a className="btn btn-primario" href="/registro">Publicar mi web</a>
          </aside>

          {/* Enlaces entre artículos: sin ellos cada uno es una isla, Google
              reparte peor la autoridad y quien acaba de leer no tiene a dónde
              ir. Con un solo artículo no se pinta nada. */}
          {otros.length > 0 && (
            <section className="sigue">
              <h2>Sigue leyendo</h2>
              <div className="sigue-lista">
                {otros.map((o) => (
                  <a className="sigue-item" key={o.slug} href={rutaArticulo(o.slug)}>
                    <span className="tema">{o.tema}</span>
                    <span className="sigue-tit">{o.titulo}</span>
                    <span className="sigue-min">{minutosDeLectura(o.cuerpo)} min</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          <a className="volver" href={RUTA_BLOG}>← Todos los artículos</a>
        </div>
      </article>
    </Marco>
  );
}
