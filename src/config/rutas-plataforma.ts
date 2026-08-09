/**
 * Qué direcciones de la plataforma pasan sin sesión, cuáles la exigen, y qué se
 * responde a las que no son ninguna de las dos.
 *
 * Vive aquí y no dentro del middleware para que haya un test que las compare
 * contra las páginas que existen de verdad en `app/`. Una página nueva que no
 * aparezca en ninguna de las dos listas es justo el descuido que nadie ve.
 */

// Rutas del panel accesibles sin sesión. Los cron son para disparadores
// externos (sin cookie): solo hacen lo que el tick del servidor haría igual en
// <60 s (publicar vencidos / ejecutar pilotos ya configurados por sus dueños)
// y pueden exigir CRON_SECRET — el candado real está en cada ruta.
export const RUTAS_PUBLICAS = ["/login", "/api/login", "/registro", "/api/registro",
  "/verificar", "/recuperar", "/restablecer", "/api/auth/recuperar", "/api/auth/restablecer",
  "/api/auth/google", "/invitacion", "/cambiar-email", "/api/cuenta/email/confirmar",
  // `/api/health` dice si el proceso vive; `/api/salud` mira además la base de
  // datos, y la llama el vigilante externo, que no tiene sesión.
  "/api/health", "/api/salud", "/api/cron/publicar", "/api/cron/piloto", "/brand", "/legal",
  // El blog de marketing. Va por PREFIJO y no por coincidencia exacta a
  // propósito: los artículos cuelgan de él (`/blog/loquesea`). Sin esta línea
  // acabarían en el 307 a /login, o sea que no existirían para Google.
  "/blog",
  // Lo llama Stripe (sin cookie); su candado es la firma HMAC del cuerpo.
  "/api/stripe/webhook"];

// Archivos que Next sirve en la raíz por convención de `app/`. Los piden el
// navegador y los buscadores SIN sesión, así que van por coincidencia EXACTA
// (no por prefijo como RUTAS_PUBLICAS: no queremos abrir "/icon.png/loquesea").
// Sin esto acababan en el 307 a /login y el icono no se veía en la landing.
// `security.txt` está aquí por lo mismo y con más razón: existe para que alguien
// de FUERA nos avise de un problema —un banco, un investigador, el equipo de
// Safe Browsing de Google—, y pedirle sesión a esa gente es cerrarle la puerta
// justo a quien queremos que llame. Redirigía a /login hasta que se probó.
// `favicon.ico` está aquí desde que dejó de excluirse en el `matcher` (ver el
// final de middleware.ts). La plataforma no tiene ninguno —usa `icon.png`—, así
// que seguirá dando 404; pero un 404 es la respuesta correcta a un archivo que
// no existe, y un 307 al login por pedir un icono, no.
export const ARCHIVOS_PUBLICOS = new Set([
  "/robots.txt", "/sitemap.xml", "/icon.png", "/apple-icon.png", "/favicon.ico",
  "/.well-known/security.txt",
]);

/**
 * Las que SÍ existen y SÍ exigen sesión.
 *
 * Hasta ahora no hacía falta enumerarlas: todo lo que no fuera público acababa
 * en el 307 a /login, y punto. El problema es que eso incluía las direcciones
 * que no existen —una letra de más en la URL, un enlace mal copiado— y mandar a
 * alguien al login por eso se lee como «esta web es privada».
 *
 * Con la lista se distingue una puerta cerrada (login, para poder entrar y
 * seguir donde ibas) de una dirección que no lleva a ninguna parte (404).
 *
 * OJO CON LO QUE PARECE UN AGUJERO Y NO LO ES: si algún día se añade una página
 * con candado y se olvida meterla aquí, NO se abre — cae en el 404, que tampoco
 * la sirve. Se pierde la comodidad del «entra y te llevo», no el candado. Las
 * dos ramas niegan; la lista solo elige cuál de las dos negativas se devuelve.
 *
 * Y no revela nada que no se sepa: que existe `/projects` lo ve cualquiera que
 * se registre. Lo que NO se distingue —y no puede distinguirse— es si un
 * proyecto concreto existe: `/projects/<uuid real>` y `/projects/<uuid
 * inventado>` responden exactamente lo mismo, porque la comparación es por
 * prefijo y nunca toca la base de datos.
 */
export const RUTAS_PRIVADAS = [
  "/projects",
  "/settings",
  // Todo el API. Se deja entero a propósito: una ruta de API que no existe
  // responde 401 igual que una que sí, y así desde fuera no se puede ir
  // probando nombres para dibujar el mapa del servidor.
  "/api",
];

/** ¿Cae `pathname` bajo alguno de estos prefijos (él mismo o algo colgado de él)? */
export function bajoAlgunPrefijo(pathname: string, prefijos: readonly string[]): boolean {
  return prefijos.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

/**
 * A dónde se reescribe una dirección que no existe.
 *
 * Se reescribe en vez de dejarla pasar con `NextResponse.next()`: dejarla pasar
 * sería abrir la mano —si esa ruta resultara existir, se serviría sin candado—.
 * Reescribir a una página nuestra que solo sabe decir «esto no existe» acaba
 * siempre igual, exista o no la dirección pedida.
 *
 * Y es una página DE VERDAD, no el `not-found` de Next: cuando no hay ninguna
 * ruta que renderizar, Next no aplica la envoltura de la raíz y devuelve un
 * `<html id="__next_error__">` con el `<body>` vacío, así que la 404 solo se ve
 * después de ejecutar JavaScript. Ver `app/_components/NoEncontrada.tsx`.
 */
export const RUTA_NO_ENCONTRADA = "/no-encontrada";
