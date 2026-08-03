import type { TextosLegal } from "./tipos";

// Same direct, second-person tone as the Spanish original.

export const en: TextosLegal = {
  banner: {
    aria: "Cookies",
    aviso:
      "We use our own cookies, which the platform needs to work, and Google cookies to measure whether our ads are worth anything. The second kind only if you want them.",
    mas: "You can change your mind whenever you like from the {enlace}.",
    enlace: "cookie policy",
    soloNecesarias: "Only the necessary ones",
    aceptarTodas: "Accept all",
  },
  paginas: {
    avisoLegal: "Legal notice",
    privacidad: "Privacy",
    cookies: "Cookies",
    terminos: "Terms",
    actualizado: "Last updated: {fecha}",
    cta: "Put your site online, free",
    inicio: "Estrénala — home",
    principal: "Main",
    soloEspanol:
      "This document is available in Spanish only. It is the text that governs the relationship between you and us.",
  },
  politicaCookies: {
    metaTitulo: "Cookie policy · Estrénala",
    metaDescripcion:
      "Estrénala only uses the technical cookies needed to keep you signed in. No analytics cookies, no advertising.",
    titulo: "Cookie policy",
    intro:
      "At {marca} we use **technical cookies**, the ones you cannot do without to sign in and get to work. Our visitor analytics is **cookie-free**: it stores nothing on your device.",
    conAds:
      "We also use **Google cookies** to measure whether our ads work. Those **only switch on if you accept them**: until then they load blocked and store nothing. That is why we show you the notice the first time you come in, and why refusing costs exactly the same as accepting.",
    sinAds:
      "**We use no analytics, advertising or tracking cookies**, neither our own nor anyone else's. That is why we show you no consent banner: the law does not require one for strictly necessary cookies (art. 22.2 LSSI-CE).",
    cambiarDecision: "Change my cookie decision",
    tablaTitulo: "Cookies we use",
    thNombre: "Name",
    thPara: "What it is for",
    thDuracion: "Lifetime",
    thTipo: "Type",
    tecnicaPropia: "Our own, technical",
    sesionPara: "Keeping you signed in securely (it travels cryptographically signed)",
    sesionDuracion: "30 days",
    espacioPara: "Remembering which workspace you are in, if you belong to several",
    espacioDuracion: "Up to 400 days",
    googlePara:
      "Protecting you against CSRF attacks while you sign in with Google (only if you use that option)",
    googleDuracion: "10 minutes",
    httpOnly:
      "All of them are **HttpOnly** (not reachable from JavaScript) and travel only over secure connections in production.",
    eliminarTitulo: "How to delete them",
    eliminarTexto:
      "You can sign out from the platform itself, or delete the cookies from your browser settings. Bear in mind that if you block them **you will not be able to sign in**: they are needed for the service to work.",
    tusWebsTitulo: "The sites you publish",
    tusWebsTexto:
      "This policy covers the {sitio} platform. **The sites you publish are yours**: if you add analytics tools or other services that use cookies to your site, it is you who must inform your visitors and obtain their consent where required.",
    contactoTitulo: "Contact",
    contactoTexto: "Any questions: {email}. More in our {privacidad}.",
  },
};
