/**
 * Nombres que no se pueden pedir para un subdominio porque son de OTRO.
 *
 * POR QUÉ ESTO EXISTE, que no es evidente. Todas las webs publicadas viven en
 * `algo.estrenala.com`. Si alguien monta ahí una página que imita a su banco y
 * Google Safe Browsing marca `estrenala.com`, el navegador enseña la pantalla
 * roja de «sitio peligroso» **en las webs de TODOS los clientes**, no solo en la
 * del que lo hizo. Es de las pocas cosas que pueden matar el producto en un día,
 * y le ha pasado a Vercel y a Netlify con sus dominios gratuitos.
 *
 * La lista de `slug.ts` es otra cosa: protege NUESTRA infraestructura (`send`
 * lleva el correo, `analitica` lleva Umami). Esta protege el dominio entero.
 *
 * QUÉ NO ES: un filtro de phishing. Quien vaya en serio a estafar registra
 * `bbva-clientes-2026` y se lo salta si no está la palabra. Esto para lo que
 * sirve es para el 90% que sí lleva la marca a pelo, y sobre todo para poder
 * decir —a Google, a un banco, a quien pregunte— que la puerta no estaba
 * abierta de par en par. Lo que de verdad aísla el daño es estar en la Public
 * Suffix List (ver docs/SEGURIDAD-DOMINIO.md).
 *
 * SE PREFIERE UN FALSO POSITIVO A UN FALSO NEGATIVO. Una clínica que se llame
 * «Apple Dental» no va a poder pedir `apple-dental`, y es un fastidio; se le
 * ofrece escribirnos. Al revés —dejar pasar `apple-soporte`— nos puede costar
 * las webs de todo el mundo.
 */

/**
 * Marcas e instituciones cuyo nombre en un subdominio es, casi siempre, una
 * suplantación.
 *
 * Con foco en España y en lo que de verdad se usa para estafar aquí: la banca,
 * los pagos, la administración y la paquetería —el «tu paquete está retenido»
 * es la estafa más repetida del país—. Lo demás son los inicios de sesión que
 * más se imitan del mundo.
 */
export const PROTEGIDOS: readonly string[] = [
  // Banca española
  "bbva", "santander", "caixabank", "lacaixa", "sabadell", "bankinter", "unicaja",
  "kutxabank", "ibercaja", "abanca", "openbank", "imagin", "cajamar", "evobanco",
  "cajarural", "bankia", "pibank", "wizink",
  // Pagos y criptomonedas
  "paypal", "bizum", "stripe", "revolut", "n26", "wise", "verse", "binance",
  "coinbase", "kraken", "metamask", "trustwallet", "ledger",
  // Administración española
  "hacienda", "aeat", "seguridadsocial", "segsocial", "dgt", "sepe", "clave",
  "clavepin", "carpetaciudadana", "notificaciones", "renta", "catastro", "inem",
  // Paquetería y transporte
  "correos", "correosexpress", "seur", "mrw", "gls", "dhl", "ups", "fedex",
  "nacex", "ctt", "packlink", "envialia", "tipsa",
  // Inicios de sesión que más se imitan
  "google", "gmail", "microsoft", "outlook", "office365", "apple", "icloud",
  "amazon", "netflix", "facebook", "instagram", "whatsapp", "telegram", "tiktok",
  "linkedin", "steam", "epicgames", "spotify", "dropbox", "adobe", "booking",
  "airbnb", "aliexpress", "shein", "temu", "vinted", "wallapop", "milanuncios",
  // Energía y telecos españolas (facturas falsas)
  "endesa", "iberdrola", "naturgy", "repsol", "movistar", "vodafone", "orange",
  "jazztel", "yoigo", "masmovil", "digi",
  // Y la nuestra: nadie monta una web que parezca la plataforma. Una página en
  // `estrenala-soporte.estrenala.com` pidiendo la contraseña sería redonda.
  //
  // «quantiva» NO está, y es a propósito: es la empresa que hay detrás, o sea
  // que su dueño es el primer usuario de la plataforma y meterla aquí le
  // bloquearía usar su propio nombre. Lo cazó un test con `quantiva-web`, que es
  // literalmente su proyecto. El día que haya que proteger la marca de un
  // cliente, hará falta una lista por espacio, no una global.
  "estrenala",
];

/**
 * Palabras que solas no dicen nada pero que, pegadas a una marca, son la firma
 * de una estafa: `bbva-acceso`, `correos-pago`, `apple-verificacion`.
 *
 * No se bloquean por sí solas a propósito. Una gestoría puede llamarse
 * legítimamente `facturacion`, y una empresa de seguridad, `seguridad`.
 */
export const CEBOS: readonly string[] = [
  "acceso", "login", "signin", "verificar", "verificacion", "validar", "validacion",
  "seguro", "seguridad", "cuenta", "cuentas", "cliente", "clientes", "usuario",
  "soporte", "ayuda", "actualizar", "actualizacion", "confirmar", "confirmacion",
  "pago", "pagos", "factura", "facturas", "recibo", "reembolso", "devolucion",
  "premio", "sorteo", "aviso", "alerta", "bloqueo", "bloqueado", "suspendido",
];

/**
 * Los trozos de un slug, tal y como los lee una persona.
 *
 * Se parte por guiones y también por los números pegados, porque `bbva2026` se
 * lee «bbva» igual que `bbva-2026`. Lo que NO se hace es buscar la marca dentro
 * de una palabra más larga: `bbvana` no es «bbva», y `apple` está dentro de
 * `grapples`. Buscar por «contiene» convertiría esto en una fuente de falsos
 * positivos absurdos.
 */
export function trozosDelSlug(slug: string): string[] {
  return slug
    .toLowerCase()
    .split("-")
    .flatMap((t) => t.split(/(?<=\D)(?=\d)|(?<=\d)(?=\D)/))
    .filter((t) => t !== "");
}

export type Suplantacion = { marca: string; cebo: string | null };

/**
 * ¿Este subdominio suplanta a alguien? Devuelve a quién, o null.
 *
 * Basta con que aparezca la marca: `bbva` solo ya es suplantación, y el cebo
 * únicamente sirve para poder contarlo mejor en el aviso y en los registros.
 */
export function suplanta(slug: string): Suplantacion | null {
  const trozos = trozosDelSlug(slug);
  const marca = trozos.find((t) => PROTEGIDOS.includes(t));
  if (!marca) return null;
  return { marca, cebo: trozos.find((t) => CEBOS.includes(t)) ?? null };
}

/**
 * Quita las marcas de un texto para poder fabricar un subdominio con lo que
 * queda.
 *
 * Se usa donde el subdominio se genera SOLO, a partir del nombre del proyecto
 * (ver generarSubdominio): ahí no hay a quién avisar, y rechazarlo dejaría sin
 * publicar a una «Clínica Apple» que no ha hecho nada malo. Se le quita la
 * palabra y sigue adelante.
 *
 * Se parte por lo mismo que `trozosDelSlug` para que las dos funciones vean
 * exactamente las mismas palabras: si una encontrara marcas donde la otra no,
 * el subdominio generado seguiría siendo rechazado más adelante.
 */
export function sinMarcas(texto: string): string {
  return texto
    .split(/[^\p{L}\p{N}]+/u)
    .flatMap((t) => t.split(/(?<=\D)(?=\d)|(?<=\d)(?=\D)/))
    .filter((t) => t !== "" && !PROTEGIDOS.includes(t.toLowerCase()))
    .join(" ");
}
