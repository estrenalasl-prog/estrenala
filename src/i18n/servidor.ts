import { cookies, headers } from "next/headers";
import { COOKIE_IDIOMA, idiomaDeLaPeticion, type Idioma } from "./idiomas";

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
  return idiomaDeLaPeticion(galletas.get(COOKIE_IDIOMA)?.value, cabeceras.get("accept-language"));
}
