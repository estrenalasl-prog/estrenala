import "./globals.css";
import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { urlPlataforma } from "@/src/config/sitio";
import { analitica } from "@/src/config/analitica";
import { ProveedorDialogo } from "./_components/Dialogo";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space",
  display: "swap",
});

// TODO se renderiza en cada petición, nada se precalcula al construir.
//
// No es capricho: las variables de entorno las inyecta Dokploy AL ARRANCAR el
// contenedor, no al construir la imagen. Una página prerenderizada evalúa
// `process.env` durante el build, donde esas variables no existen todavía, y se
// queda con el valor congelado para siempre.
//
// Ha mordido dos veces: primero con `metadataBase` (og:image apuntando a
// localhost) y luego con el botón «Continuar con Google», que NUNCA aparecía en
// producción aunque el OAuth estuviera perfectamente configurado — la página
// se había construido con `googleConfigurado()` a false.
//
// Aquí no se pierde nada por no precalcular: esto es un panel, no un blog.
export const dynamic = "force-dynamic";

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
      {/* El proveedor va en la raíz para que cualquier pantalla pueda pedir un
          diálogo sin montar el suyo. Es un componente de cliente dentro de un
          layout de servidor: `children` se sigue renderizando en el servidor. */}
      <body><ProveedorDialogo>{children}</ProveedorDialogo></body>
    </html>
  );
}
