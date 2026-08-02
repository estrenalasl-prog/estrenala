import type { es } from "./es";

/**
 * La forma del catálogo la MANDA el español, que es el original.
 *
 * Así cada idioma nuevo se comprueba solo: si le falta una clave, o le sobra, o
 * la escribe mal, no compila. Es lo que evita el fallo clásico de las
 * traducciones — el hueco que nadie ve hasta que un cliente se encuentra un
 * texto en blanco en su idioma.
 */
export type TextosLanding = typeof es;
