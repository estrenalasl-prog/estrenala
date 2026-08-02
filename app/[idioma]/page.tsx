import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Landing } from "../_landing/Landing";
import { textosLanding } from "@/src/i18n/landing";
import {
  IDIOMAS, IDIOMA_POR_DEFECTO, alternativasHreflang, esIdioma, rutaDeIdioma,
} from "@/src/i18n/idiomas";

export const dynamic = "force-dynamic";

// La landing en los otros idiomas: /en, /pt, /fr, /it. El español se queda en la
// raíz (app/page.tsx), que es la dirección que ya está indexada.
//
// Un segmento dinámico en la raíz suena peligroso, pero no lo es: las rutas fijas
// mandan sobre las dinámicas en Next, así que /login o /registro siguen yendo a
// las suyas. Y lo que no sea un idioma no llega ni aquí — el middleware solo
// abre estas cuatro y el resto se va al 307 de /login. El notFound() es el
// segundo cerrojo, para el día que alguien toque el matcher del middleware.
export function generateStaticParams() {
  return IDIOMAS.filter((i) => i !== IDIOMA_POR_DEFECTO).map((idioma) => ({ idioma }));
}

export async function generateMetadata({ params }: { params: Promise<{ idioma: string }> }): Promise<Metadata> {
  const { idioma } = await params;
  if (!esIdioma(idioma) || idioma === IDIOMA_POR_DEFECTO) return {};
  const t = textosLanding(idioma);
  return {
    title: t.meta.titulo,
    description: t.meta.descripcion,
    alternates: { canonical: rutaDeIdioma(idioma), languages: alternativasHreflang() },
    openGraph: {
      type: "website",
      siteName: "Estrénala",
      // `es_ES` en el layout, aquí el de esta versión. Es lo que lee WhatsApp o
      // LinkedIn al pegar el enlace, y sin esto enseñarían la tarjeta en español
      // sobre una página en italiano.
      locale: idioma,
      url: rutaDeIdioma(idioma),
      title: t.meta.titulo,
      description: t.meta.descripcion,
      images: [{ url: "/brand/og.png", width: 1200, height: 630, alt: t.meta.titulo }],
    },
    twitter: { card: "summary_large_image", title: t.meta.titulo, description: t.meta.descripcion, images: ["/brand/og.png"] },
  };
}

export default async function LandingTraducida({ params }: { params: Promise<{ idioma: string }> }) {
  const { idioma } = await params;
  // El español vive en «/», no en «/es»: dos direcciones con la misma página
  // serían contenido duplicado, justo lo que el hreflang intenta evitar.
  if (!esIdioma(idioma) || idioma === IDIOMA_POR_DEFECTO) notFound();
  return <Landing idioma={idioma} />;
}
