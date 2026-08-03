import "./globals.css";
import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { urlPlataforma } from "@/src/config/sitio";
import { analitica } from "@/src/config/analitica";
import { idAds } from "@/src/config/ads";
import {
  COOKIE_CONSENTIMIENTO, estadoConsentMode, haceFaltaBanner, leerDecision,
} from "@/src/legal/consentimiento";
import { cookies, headers } from "next/headers";
import { CABECERA_IDIOMA, esIdioma } from "@/src/i18n/idiomas";
import { idiomaDeSesion } from "@/src/i18n/servidor";
import { textosPanel } from "@/src/i18n/panel";
import { textosLegal } from "@/src/i18n/legal";
import { ProveedorDialogo } from "./_components/Dialogo";
import { Cookies } from "./_components/Cookies";

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Analítica sin cookies (ver src/config/analitica.ts). Si no está configurada
  // —desarrollo— no se pinta nada. `defer` para que no retrase la página.
  const medir = analitica();

  // Google Ads. Todo esto vive apagado hasta que exista GOOGLE_ADS_ID: sin él no
  // hay scripts, ni cookies publicitarias, ni banner. Ver src/legal/consentimiento.ts.
  const ads = idAds();
  const decision = leerDecision((await cookies()).get(COOKIE_CONSENTIMIENTO)?.value);
  const banner = haceFaltaBanner(ads ?? undefined, decision);
  const seguro = urlPlataforma().startsWith("https://");

  // `idiomaDeSesion` está memorizado por petición, así que pedirlo aquí NO añade
  // una consulta más aunque la pantalla ya lo haya pedido (ver i18n/servidor.ts).
  const idiomaSesion = await idiomaDeSesion();

  // Qué idioma se ANUNCIA en <html lang>. Manda la cabecera que pone el
  // middleware, que solo existe en las landings traducidas (/en, /pt…) y sabe
  // cuál es porque lo dice la URL; en el resto de la app manda el idioma de la
  // sesión, que es en el que se está pintando el panel.
  //
  // Antes esto era solo la cabecera, con el argumento de que el panel no estaba
  // traducido. Ya lo está: desde entonces, alguien con la cuenta en inglés veía
  // el panel entero en inglés dentro de un documento que declaraba `lang="es"`.
  // Eso es lo que usa un lector de pantalla para elegir la voz con la que lo lee
  // y el navegador para ofrecer traducir la página; con el idioma equivocado, no
  // funciona ninguna de las dos.
  const cabecera = (await headers()).get(CABECERA_IDIOMA);
  const idioma = esIdioma(cabecera) ? cabecera : idiomaSesion;

  // Los botones de la ventanita de avisos y el banner de cookies: salen en toda
  // la plataforma, así que se resuelven aquí una sola vez.
  const dialogo = textosPanel(idiomaSesion).dialogo;
  const textosBanner = textosLegal(idioma).banner;

  return (
    <html lang={idioma} className={spaceGrotesk.variable}>
      <head>
        {medir && <script defer src={medir.src} data-website-id={medir.websiteId} />}
        {/* Consent Mode v2. Este bloque va SIEMPRE ANTES del script de Google y
            arranca TODO en «denied»: es la regla del modo consentimiento, y es lo
            que permite cargar gtag sin poner una sola cookie hasta que alguien
            acepte. Al revés —cargar concedido y rechazar después— es justo lo
            que la norma prohíbe, y para entonces la cookie ya está puesta.

            Es `dangerouslySetInnerHTML` porque tiene que ser un script en línea y
            ejecutarse antes que nada; el contenido es nuestro y no lleva ni un
            dato que venga de fuera. */}
        {ads && (
          <>
            <script
              dangerouslySetInnerHTML={{
                __html:
                  "window.dataLayer=window.dataLayer||[];" +
                  "function gtag(){dataLayer.push(arguments)}" +
                  "gtag('consent','default'," + JSON.stringify(estadoConsentMode(decision)) + ");",
              }}
            />
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${ads}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `gtag('js',new Date());gtag('config',${JSON.stringify(ads)});`,
              }}
            />
          </>
        )}
      </head>
      {/* El proveedor va en la raíz para que cualquier pantalla pueda pedir un
          diálogo sin montar el suyo. Es un componente de cliente dentro de un
          layout de servidor: `children` se sigue renderizando en el servidor. */}
      <body>
        <ProveedorDialogo textos={dialogo}>{children}</ProveedorDialogo>
        {banner && <Cookies seguro={seguro} t={textosBanner} />}
      </body>
    </html>
  );
}
