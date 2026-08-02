import { cache } from "react";
import { cookies, headers } from "next/headers";
import { verificarSesion, SESSION_COOKIE } from "@/src/auth/session-cookie";
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

/**
 * El idioma de quien ha entrado con su cuenta.
 *
 * Manda lo que haya elegido en Configuración, y por encima de todo lo demás: es
 * una decisión suya, explícita y guardada. Si no ha elegido nada, se sigue con
 * lo de siempre —la landing por la que entró, o su navegador—, que es lo que
 * hace que alguien registrado desde `/it` vea el panel en italiano sin haber
 * tocado nada.
 *
 * El store se importa de forma perezosa, como en getContexto: así los tests que
 * inyectan un store falso no arrastran la conexión de verdad a la base de datos.
 *
 * Envuelto en `cache` porque una misma página lo pide TRES veces —la envoltura
 * de la raíz, la cabecera y la pantalla— y cada una acabaría preguntando a la
 * base de datos por el mismo usuario. React lo recuerda dentro de una petición y
 * lo olvida al terminarla, así que no hay riesgo de servirle a alguien el idioma
 * de otro.
 */
export const idiomaDeSesion = cache(async function idiomaDeSesion(): Promise<Idioma> {
  const porLaPeticion = await idiomaActual();
  const secret = process.env.SESSION_SECRET;
  const cookie = secret ? (await cookies()).get(SESSION_COOKIE)?.value : undefined;
  const sesion = secret && cookie ? await verificarSesion(secret, cookie, Date.now()) : null;
  if (!sesion) return porLaPeticion;
  try {
    const { accountStore } = await import("@/src/repositories/accounts");
    const user = await accountStore.getUserById(sesion.userId);
    return esIdioma(user?.idioma) ? user.idioma : porLaPeticion;
  } catch {
    // El idioma no puede tumbar una pantalla. Si la BD falla, ya fallará donde
    // toque y con su mensaje; aquí se sigue con lo que diga la petición.
    return porLaPeticion;
  }
});
