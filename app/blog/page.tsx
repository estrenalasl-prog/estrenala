import type { Metadata } from "next";
import "../_landing/landing.css";
import "./blog.css";
import { Marco } from "./Marco";
import { ARTICULOS, RUTA_BLOG, rutaArticulo } from "@/src/blog-estrenala/indice";
import { rutaPortada } from "@/src/blog-estrenala/render";
import { fechaLarga, minutosDeLectura } from "@/src/blog-estrenala/tipos";

// Como el resto de lo público: la dirección sale del entorno del servidor, y
// estático se quedaría congelada la del build (donde no hay .env).
export const dynamic = "force-dynamic";

const TITULO = "Blog — Estrénala";
const DESCRIPCION =
  "Cómo publicar una web hecha con IA, conectar un dominio y no romperla después. Escrito para quien no programa.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  alternates: { canonical: RUTA_BLOG },
  openGraph: {
    type: "website", siteName: "Estrénala", locale: "es_ES",
    url: RUTA_BLOG, title: TITULO, description: DESCRIPCION,
    images: [{ url: "/brand/og.png", width: 1200, height: 630, alt: TITULO }],
  },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRIPCION, images: ["/brand/og.png"] },
};

export default function BlogIndice() {
  return (
    <Marco>
      <section className="blog-cab">
        <div className="contenedor">
          <h1>Publicar una web sin ser informático</h1>
          <p>{DESCRIPCION}</p>
        </div>
      </section>

      <section className="contenedor">
        <div className="blog-lista">
          {ARTICULOS.map((a) => (
            <a className="blog-item" key={a.slug} href={rutaArticulo(a.slug)}>
              {/* La portada ya lleva el título dentro, así que para quien no ve
                  la pantalla es una repetición: alt vacío y que la salte. */}
              <img className="blog-miniatura" src={rutaPortada(a.slug)} alt="" width={1200} height={630} loading="lazy" />
              <div className="blog-texto">
                <div className="blog-datos">
                  <span className="tema">{a.tema}</span>
                  <time dateTime={a.fecha}>{fechaLarga(a.fecha)}</time>
                  <span className="sep">·</span>
                  <span>{minutosDeLectura(a.cuerpo)} min</span>
                </div>
                <h2>{a.titulo}</h2>
                <p>{a.entradilla}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </Marco>
  );
}
