import "./globals.css";
import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { urlPlataforma } from "@/src/config/sitio";
import { analitica } from "@/src/config/analitica";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space",
  display: "swap",
});

const TITULO = "Estrénala — Tu web hecha con IA, por fin en directo";
const DESCRIPCION =
  "Sube la web que te ha hecho la IA, publícala en un clic con su dirección y su " +
  "certificado, y edítala sin tocar código haciendo clic sobre ella. Su blog escribe solo.";

// Sin `title.template`: las páginas que ya tienen título propio (las legales) lo
// escriben entero, con su «· Estrénala» incluido, y la plantilla lo duplicaría.
export const metadata: Metadata = {
  metadataBase: new URL(urlPlataforma()),
  title: TITULO,
  description: DESCRIPCION,
  // La tarjeta que se ve al pegar el enlace en WhatsApp, X o LinkedIn. La imagen
  // se genera a mano con `node scripts/brand/og-plataforma.mjs` y va commiteada.
  openGraph: {
    type: "website",
    siteName: "Estrénala",
    locale: "es_ES",
    url: "/",
    title: TITULO,
    description: DESCRIPCION,
    images: [{ url: "/brand/og.png", width: 1200, height: 630, alt: "Estrénala — Tu web hecha con IA, por fin en directo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRIPCION,
    images: ["/brand/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Analítica sin cookies (ver src/config/analitica.ts). Si no está configurada
  // —desarrollo— no se pinta nada. `defer` para que no retrase la página.
  const medir = analitica();
  return (
    <html lang="es" className={spaceGrotesk.variable}>
      <head>
        {medir && <script defer src={medir.src} data-website-id={medir.websiteId} />}
      </head>
      <body>{children}</body>
    </html>
  );
}
