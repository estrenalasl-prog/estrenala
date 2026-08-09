import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../../_landing/landing.css";
import "../blog.css";
import { Marco } from "../Marco";
import { articuloPorSlug, rutaArticulo, RUTA_BLOG } from "@/src/blog-estrenala/indice";
import { cuerpoAHtml, datosEstructurados } from "@/src/blog-estrenala/render";
import { fechaLarga, minutosDeLectura } from "@/src/blog-estrenala/tipos";
import { urlPlataforma } from "@/src/config/sitio";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = articuloPorSlug(slug);
  if (!a) return {};
  const ruta = rutaArticulo(a.slug);
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
      images: [{ url: "/brand/og.png", width: 1200, height: 630, alt: a.titulo }],
    },
    twitter: { card: "summary_large_image", title: a.titulo, description: a.descripcion, images: ["/brand/og.png"] },
  };
}

export default async function Articulo({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = articuloPorSlug(slug);
  if (!a) notFound();

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
              <span>{minutosDeLectura(a.cuerpo)} min de lectura</span>
            </div>
            <h1>{a.titulo}</h1>
            <p className="entradilla">{a.entradilla}</p>
          </div>
        </header>

        <div className="contenedor art-col">
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

          <a className="volver" href={RUTA_BLOG}>← Todos los artículos</a>
        </div>
      </article>
    </Marco>
  );
}
