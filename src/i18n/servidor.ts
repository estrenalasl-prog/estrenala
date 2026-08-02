import { cookies, headers } from "next/headers";
import { CABECERA_IDIOMA, COOKIE_IDIOMA, esIdioma, idiomaDeLaPeticion, type Idioma } from "./idiomas";

/**
 * El idioma de quien está pidiendo esta página, para todo lo que NO lleva el
 * idioma en la URL: registro, entrada, recuperar contraseña y los correos.
 *
 * Lo que eligió en la landing (cookie) → lo que pide su navegador → español.
 *
 * Vive aparte de idiomas.ts porque tira de `next/headers`, que solo existe en el
 * servidor: si estuviera allí, importar cualquier constante de idioma desde un
 * componente de cliente arrastraría medio Next y no compilaría.
 */
export async function idiomaActual(): Promise<Idioma> {
  const [galletas, cabeceras] = await Promise.all([cookies(), headers()]);
  // Lo primero, lo que venga en la URL (lo pone el middleware desde `?lang=`).
  // Manda sobre la cookie: es el enlace de un correo que se escribió para este
  // idioma, y quien lo abre puede estar en otro navegador — o no haber estado
  // aquí nunca, como el invitado a un espacio.
  const deUrl = cabeceras.get(CABECERA_IDIOMA);
  if (esIdioma(deUrl)) return deUrl;
  return idiomaDeLaPeticion(galletas.get(COOKIE_IDIOMA)?.value, cabeceras.get("accept-language"));
}
