/**
 * Los textos de la capa legal que SE VEN en pantalla.
 *
 * De momento solo el banner de cookies. Las cuatro páginas legales
 * (`app/legal/*`) siguen en español a propósito y por decisión: son el contrato,
 * y dos versiones que dicen cosas distintas es peor que una sola que se entiende
 * regular. Si algún día se traducen, van aquí y con el español declarado como la
 * versión que manda.
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
};
