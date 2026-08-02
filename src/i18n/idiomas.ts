// Los cinco idiomas de la PLATAFORMA. Las webs de los clientes no se traducen:
// el usuario ya las trae con sus idiomas puestos porque se los pide a la IA al
// crearlas, y responder por traducciones que no controlamos sería un problema
// nuestro a cambio de una ventaja que él ya se da solo.

export const IDIOMAS = ["es", "en", "pt", "fr", "it"] as const;
export type Idioma = (typeof IDIOMAS)[number];

/** El de casa, y el que se sirve cuando no hay nada mejor que decidir. */
export const IDIOMA_POR_DEFECTO: Idioma = "es";

/** Cómo se llama cada uno EN SU PROPIO idioma, que es como hay que ofrecerlos. */
export const NOMBRE_IDIOMA: Record<Idioma, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
  fr: "Français",
  it: "Italiano",
};

/**
 * Para `Intl`: fechas, números y monedas.
 *
 * Se dice el PAÍS y no solo la lengua porque cambia lo que sale en pantalla:
 * `pt` a secas le da a `Intl` el portugués de Brasil, y el catálogo está escrito
 * en el de Portugal («ficheiros», «ecrã»); y en inglés, `en` solo sería el de
 * Estados Unidos, con la fecha al revés (8/3/2026 en vez de 3/8/2026) — que en
 * una fecha de renovación de pago no es un detalle.
 */
export const LOCALE_INTL: Record<Idioma, string> = {
  es: "es-ES",
  en: "en-GB",
  pt: "pt-PT",
  fr: "fr-FR",
  it: "it-IT",
};

export function esIdioma(v: unknown): v is Idioma {
  return typeof v === "string" && (IDIOMAS as readonly string[]).includes(v);
}

/**
 * La ruta de la landing en cada idioma.
 *
 * El español se queda en la RAÍZ, sin prefijo: es la dirección que ya existe,
 * la que está indexada y la que lleva escrita cualquier enlace que apunte aquí.
 * Mandarla a `/es` sería regalar el posicionamiento que ya hay por simetría.
 */
export function rutaDeIdioma(idioma: Idioma): string {
  return idioma === IDIOMA_POR_DEFECTO ? "/" : `/${idioma}`;
}

/**
 * El idioma elegido, para que sobreviva a la landing.
 *
 * Sin esto, alguien lee la landing en italiano, pulsa «Registrati» y el
 * formulario le sale en español — y el correo de bienvenida, también. Traducir
 * la landing y perder el idioma en el primer clic es peor que no traducirla:
 * promete algo que se rompe a los cinco segundos.
 *
 * El registro y el login NO llevan el idioma en la URL, y es a propósito: nadie
 * busca en Google la página de registro de nadie, así que darle cinco
 * direcciones a cada una sería ensuciar el sitio sin ganar nada. Lo que hace
 * falta ahí es continuidad, y eso lo da la cookie.
 *
 * Es una cookie TÉCNICA —guarda una preferencia que ha pedido el propio usuario
 * y no identifica a nadie—, así que no necesita consentimiento previo. Mismo
 * criterio y misma forma que la de la decisión de cookies (ver
 * src/legal/consentimiento.ts).
 */
export const COOKIE_IDIOMA = "estrenala_idioma";
export const DIAS_IDIOMA = 365;

/**
 * El idioma DENTRO del enlace de los correos: `/verificar?token=…&lang=fr`.
 *
 * La cookie no sirve aquí, y esto costó verlo. Un correo no se abre donde se
 * pidió: se abre en el móvil, en otro navegador, dentro de Gmail, días después.
 * En ese sitio no hay ninguna cookie nuestra, así que la página se caía al
 * idioma del sistema — te registrabas en francés, el correo llegaba en francés,
 * y al pulsar el botón la confirmación salía en español.
 *
 * Y en la invitación es peor todavía: quien la recibe NUNCA ha estado aquí, así
 * que no puede tener cookie de ninguna manera.
 *
 * Por eso el idioma viaja con el enlace. Es el único sitio donde sobrevive al
 * salto del correo.
 */
export const PARAM_IDIOMA = "lang";

/** Le pega el idioma a un enlace que ya puede llevar `?token=…`. */
export function conIdioma(url: string, idioma: Idioma): string {
  return `${url}${url.includes("?") ? "&" : "?"}${PARAM_IDIOMA}=${idioma}`;
}

export function cookieIdioma(idioma: Idioma, seguro: boolean): string {
  const partes = [
    `${COOKIE_IDIOMA}=${idioma}`,
    "Path=/",
    `Max-Age=${DIAS_IDIOMA * 24 * 60 * 60}`,
    "SameSite=Lax",
  ];
  if (seguro) partes.push("Secure");
  return partes.join("; ");
}

/**
 * El idioma de quien está pidiendo una página que NO lleva idioma en la URL
 * (registro, login, correos…).
 *
 * Por orden: lo que eligió (cookie) → lo que pide su navegador → español. El
 * navegador va después de la cookie porque una elección explícita gana siempre
 * a una preferencia heredada del sistema operativo.
 */
export function idiomaDeLaPeticion(
  cookie: string | null | undefined,
  acceptLanguage: string | null | undefined
): Idioma {
  if (esIdioma(cookie)) return cookie;
  return idiomaDeAcceptLanguage(acceptLanguage);
}

/**
 * Cómo le llega el idioma al layout.
 *
 * El layout es común a TODA la app y no sabe en qué ruta está, así que no puede
 * saber por sí mismo si lo que está pintando es la landing italiana. El
 * middleware sí lo sabe, y se lo dice por esta cabecera de petición.
 *
 * Hace falta para que `<html lang>` diga la verdad: es lo que usa un lector de
 * pantalla para elegir la voz con la que lee, y el navegador para ofrecer
 * traducir la página. Con `lang="es"` en una página en italiano, ninguna de las
 * dos cosas funciona.
 */
export const CABECERA_IDIOMA = "x-estrenala-idioma";

export function idiomaDeCabecera(valor: string | null | undefined): Idioma {
  return esIdioma(valor) ? valor : IDIOMA_POR_DEFECTO;
}

/** Los prefijos que el middleware tiene que dejar pasar sin sesión. */
export const PREFIJOS_PUBLICOS: string[] = IDIOMAS
  .filter((i) => i !== IDIOMA_POR_DEFECTO)
  .map((i) => `/${i}`);

/**
 * Las cinco direcciones de la landing, para el `hreflang` de cada una.
 *
 * Sin esto, cinco páginas que dicen lo mismo en distinto idioma son, para
 * Google, contenido duplicado: elige una y las otras cuatro no aparecen. El
 * `hreflang` es lo que le dice «son la misma página para públicos distintos».
 *
 * Va en TODAS las versiones apuntando a TODAS —incluida ella misma—, que es como
 * lo pide Google: si la francesa no se declara a sí misma, no se fía de ninguna.
 *
 * `x-default` es a dónde mandar a quien no encaja en ninguno (un alemán, un
 * japonés): a la raíz.
 */
export function alternativasHreflang(): Record<string, string> {
  const alt: Record<string, string> = {};
  for (const i of IDIOMAS) alt[i] = rutaDeIdioma(i);
  alt["x-default"] = rutaDeIdioma(IDIOMA_POR_DEFECTO);
  return alt;
}

/**
 * Qué idioma prefiere quien manda esta cabecera.
 *
 * NO se usa para decidir qué landing servir: eso lo decide la URL y solo la URL.
 * Redirigir por `Accept-Language` es el clásico tiro en el pie del SEO —
 * Googlebot rastrea desde Estados Unidos y sin cabecera de idioma, así que se
 * llevaría siempre la misma versión y las otras cuatro no se indexarían nunca.
 *
 * Sirve para lo otro: elegir el idioma de UNA PERSONA la primera vez (al
 * registrarse, o al mandarle un correo), donde no hay URL que mirar y acertar de
 * primeras es mejor que empezar todos en español.
 */
export function idiomaDeAcceptLanguage(cabecera: string | null | undefined): Idioma {
  if (!cabecera) return IDIOMA_POR_DEFECTO;
  const candidatos = cabecera
    .split(",")
    .map((trozo) => {
      const [etiqueta, ...params] = trozo.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const peso = q ? Number(q.slice(2)) : 1;
      return { etiqueta: etiqueta.trim().toLowerCase(), peso: Number.isFinite(peso) ? peso : 0 };
    })
    .filter((c) => c.etiqueta !== "" && c.peso > 0)
    // Estable: con dos idiomas del mismo peso gana el que venía antes, que es el
    // orden en que el navegador los pone.
    .sort((a, b) => b.peso - a.peso);

  for (const { etiqueta } of candidatos) {
    // `pt-BR` es portugués; `*` es «lo que sea», así que no decide nada.
    const base = etiqueta.split("-")[0];
    if (esIdioma(base)) return base;
  }
  return IDIOMA_POR_DEFECTO;
}
