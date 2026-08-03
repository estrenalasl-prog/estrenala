import type { TextosLegal } from "./tipos";

// El español marca la forma. Los textos son LOS MISMOS que había escritos a mano
// en las páginas: mover una coma aquí es cambiar el documento legal.

export const es: TextosLegal = {
  banner: {
    aria: "Cookies",
    aviso:
      "Usamos cookies propias necesarias para que funcione la plataforma, y cookies de Google para medir si nuestros anuncios sirven de algo. Las segundas solo si tú quieres.",
    mas: "Puedes cambiar de idea cuando quieras desde la {enlace}.",
    enlace: "política de cookies",
    soloNecesarias: "Solo las necesarias",
    aceptarTodas: "Aceptar todas",
  },
  paginas: {
    avisoLegal: "Aviso legal",
    privacidad: "Privacidad",
    cookies: "Cookies",
    terminos: "Términos",
    actualizado: "Última actualización: {fecha}",
    cta: "Sube tu web gratis",
    inicio: "Estrénala — inicio",
    principal: "Principal",
    soloEspanol:
      "Este documento está disponible únicamente en español. Es el texto que rige la relación entre tú y nosotros.",
  },
  politicaCookies: {
    metaTitulo: "Política de cookies · Estrénala",
    metaDescripcion:
      "Estrénala solo usa cookies técnicas necesarias para mantener tu sesión. Sin analítica ni publicidad.",
    titulo: "Política de cookies",
    intro:
      "En {marca} usamos **cookies técnicas**, las imprescindibles para que puedas iniciar sesión y trabajar. Nuestra analítica de visitas es **sin cookies**: no guarda nada en tu equipo.",
    conAds:
      "Además usamos **cookies de Google** para medir si nuestros anuncios funcionan. Esas **solo se activan si las aceptas**: hasta entonces se cargan bloqueadas y no guardan nada. Por eso te mostramos el aviso la primera vez que entras, y rechazarlas cuesta exactamente lo mismo que aceptarlas.",
    sinAds:
      "**No usamos cookies de analítica, publicidad ni seguimiento**, ni propias ni de terceros. Por eso no te mostramos un banner de consentimiento: la normativa no lo exige para las cookies estrictamente necesarias (art. 22.2 LSSI-CE).",
    cambiarDecision: "Cambiar mi decisión sobre las cookies",
    tablaTitulo: "Cookies que utilizamos",
    thNombre: "Nombre",
    thPara: "Para qué sirve",
    thDuracion: "Duración",
    thTipo: "Tipo",
    tecnicaPropia: "Técnica propia",
    sesionPara: "Mantener tu sesión iniciada de forma segura (va firmada criptográficamente)",
    sesionDuracion: "30 días",
    espacioPara: "Recordar en qué espacio de trabajo estás, si perteneces a varios",
    espacioDuracion: "Hasta 400 días",
    googlePara:
      "Protegerte frente a ataques CSRF mientras inicias sesión con Google (solo si usas esa opción)",
    googleDuracion: "10 minutos",
    httpOnly:
      "Todas son **HttpOnly** (no accesibles desde JavaScript) y viajan solo por conexiones seguras en producción.",
    eliminarTitulo: "Cómo eliminarlas",
    eliminarTexto:
      "Puedes cerrar sesión desde la propia plataforma o borrar las cookies desde la configuración de tu navegador. Ten en cuenta que, si las bloqueas, **no podrás iniciar sesión**: son necesarias para el funcionamiento del servicio.",
    tusWebsTitulo: "Las webs que publicas",
    tusWebsTexto:
      "Esta política cubre la plataforma {sitio}. **Las webs que tú publicas son tuyas**: si añades a tu web herramientas de analítica u otros servicios que usen cookies, serás tú quien deba informar a tus visitantes y recabar su consentimiento cuando proceda.",
    contactoTitulo: "Contacto",
    contactoTexto: "Cualquier duda: {email}. Más información en nuestra {privacidad}.",
  },
};
