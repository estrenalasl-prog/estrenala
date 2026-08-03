/**
 * Los textos NUESTROS que se ven dentro de las webs de los clientes.
 *
 * Son los únicos de la plataforma que no lee un usuario nuestro, sino la
 * AUDIENCIA de un usuario nuestro: quien entra en la web de una peluquería de
 * Lyon y ve el sello abajo a la derecha, o quien teclea mal una dirección y se
 * lleva la 404. Por eso el idioma no se decide igual que en el resto de la
 * plataforma — ver `idiomaDeLaPagina` y el uso de `Accept-Language` en
 * `resolve-site.ts`.
 *
 * «Estrénala» NO se traduce en ninguno: es la marca.
 */
export type TextosPublico = {
  marca: {
    /** El sello del plan gratuito, abajo a la derecha. */
    texto: string;
    /** Lo que lee un lector de pantalla. Frase entera, no un trozo que se pega
     *  a `texto`: cada idioma la ordena a su manera. */
    aria: string;
  };
  pagina404: {
    /** El host existe pero no hay ninguna web publicada en él. */
    noPublicada: string;
    /** La web está publicada, pero esa página concreta no existe. */
    noEncontrado: string;
    lead: string;
    boton: string;
    promoTitulo: string;
    promoTexto: string;
    /** El eslogan. Es el MISMO que el `<title>` de la landing en ese idioma. */
    pie: string;
  };
  /**
   * Lo que ve quien acaba de enviar un formulario de la web de un cliente.
   *
   * Va en el idioma del VISITANTE, no en el de la página: esto ya no está dentro
   * del documento del cliente, es una página nuestra servida desde su dominio.
   */
  gracias: {
    titulo: string;
    texto: string;
    volver: string;
  };
};
