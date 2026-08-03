/**
 * Los textos de la capa legal que SE VEN en pantalla.
 *
 * Qué se traduce y qué no, decidido por Sebas el 2026-08-03:
 *
 * - **El banner y la política de cookies, a los cinco.** El banner sale en el
 *   idioma del visitante, así que enlazar desde un banner en francés a una
 *   página en español es una incoherencia que se ve. Y de los cuatro documentos
 *   es el más de trámite: explica qué cookies hay, no obliga a nada.
 * - **Aviso legal, privacidad y términos, solo en español.** Son el contrato.
 *   Dos versiones que dicen cosas distintas es peor que una sola que se entiende
 *   regular, y a un texto traducido que te compromete no lo salva una nota al
 *   pie. Llevan un aviso visible —ese sí traducido— diciendo en qué idioma
 *   están, que es lo honesto: enterarse antes de leer, no después.
 */
export type TextosLegal = {
  banner: {
    /** Lo que anuncia el diálogo a un lector de pantalla. */
    aria: string;
    aviso: string;
    /** Lleva el hueco `{enlace}`, que se rellena con el enlace de verdad. */
    mas: string;
    enlace: string;
    soloNecesarias: string;
    aceptarTodas: string;
  };
  /** La envoltura común de los cuatro documentos. */
  paginas: {
    avisoLegal: string;
    privacidad: string;
    cookies: string;
    terminos: string;
    /** Lleva el hueco `{fecha}`. */
    actualizado: string;
    cta: string;
    inicio: string;
    principal: string;
    /** El aviso de los tres que no se traducen. */
    soloEspanol: string;
  };
  politicaCookies: {
    metaTitulo: string;
    metaDescripcion: string;
    titulo: string;
    /** Lleva el hueco `{marca}`. */
    intro: string;
    /** Cuando HAY publicidad configurada. */
    conAds: string;
    /** Cuando no la hay: entonces la página puede afirmar que no hay ninguna. */
    sinAds: string;
    cambiarDecision: string;
    tablaTitulo: string;
    thNombre: string;
    thPara: string;
    thDuracion: string;
    thTipo: string;
    /** El tipo de las tres: no hay ninguna de terceros. */
    tecnicaPropia: string;
    sesionPara: string;
    sesionDuracion: string;
    espacioPara: string;
    espacioDuracion: string;
    googlePara: string;
    googleDuracion: string;
    httpOnly: string;
    eliminarTitulo: string;
    eliminarTexto: string;
    tusWebsTitulo: string;
    /** Lleva el hueco `{sitio}`. */
    tusWebsTexto: string;
    contactoTitulo: string;
    /** Lleva los huecos `{email}` y `{privacidad}`. */
    contactoTexto: string;
  };
};
