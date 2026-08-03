import { walkElementsInOrder } from "@/src/editor/walk";

/**
 * El examen de SEO de una web recién subida.
 *
 * Por qué existe: una web hecha con IA sale casi siempre con el mismo puñado de
 * fallos —el mismo `<title>` copiado en las cinco páginas, ninguna descripción,
 * imágenes sin `alt`, sin `viewport`— y su dueño no tiene forma de saberlo. No
 * son fallos de diseño, así que mirando la web no se ven; solo se notan meses
 * después, cuando no aparece en Google y ya no sabe por qué.
 *
 * Aquí no se corrige nada: esto solo MIRA. Es una función pura sobre el HTML,
 * sin lecturas ni red, para poder examinarla entera con tests. Quien decide qué
 * hacer con el resultado es la pantalla del panel.
 *
 * Dos reglas que se han seguido a rajatabla al elegir qué comprobar:
 *
 *  1. Solo entra lo que el dueño puede ARREGLAR y le CAMBIA algo. Nada de
 *     avisos de manual que solo sirven para bajar la nota y que uno aprenda a
 *     ignorar los avisos.
 *  2. Nada de adivinar intenciones. `alt=""` es la forma correcta de decir «esta
 *     imagen es decorativa», así que un `alt` vacío NO es un fallo; solo lo es
 *     que no esté el atributo. Confundir las dos cosas es regañar a quien lo
 *     hizo bien.
 */

export type Gravedad = "grave" | "aviso";

export type ClaveFallo =
  | "sinTitulo"
  | "tituloLargo"
  | "titulosRepetidos"
  | "sinDescripcion"
  | "descripcionLarga"
  | "descripcionesRepetidas"
  | "sinH1"
  | "variosH1"
  | "saltoEncabezados"
  | "imagenesSinAlt"
  | "imagenesSinTamano"
  | "sinViewport"
  | "sinLang"
  | "sinOgImage"
  | "sinDatosEstructurados"
  | "enlacesGenericos"
  | "sinFavicon";

/**
 * Cuánto pesa cada fallo sobre 100, y si sabemos arreglarlo solos.
 *
 * Los pesos no son una opinión sobre «SEO en general»: son cuánto le cuesta ESO
 * a una web pequeña y nueva. Sin `viewport` Google la trata como no apta para
 * móvil, y hoy se indexa por la versión móvil: por eso pesa casi tanto como no
 * tener título. En cambio un título de 70 caracteres solo sale recortado, y eso
 * vale 3.
 */
const PESOS: Record<ClaveFallo, { peso: number; gravedad: Gravedad; arreglable: boolean }> = {
  sinTitulo:              { peso: 18, gravedad: "grave", arreglable: false },
  // `arreglable: false` a propósito, aunque la línea que falta la sepamos de
  // memoria. Poner el `viewport` CAMBIA cómo se dibuja la página en el móvil: una
  // web no responsive pasaría de verse alejada pero entera a verse cortada. Todo
  // lo que decimos que arreglamos solos tiene que ser invisible; esto no lo es, y
  // hacerlo en silencio sería romperle a alguien una web que le funcionaba.
  sinViewport:            { peso: 15, gravedad: "grave", arreglable: false },
  sinDescripcion:         { peso: 12, gravedad: "grave", arreglable: false },
  sinH1:                  { peso: 12, gravedad: "grave", arreglable: false },
  imagenesSinAlt:         { peso: 10, gravedad: "grave", arreglable: false },
  titulosRepetidos:       { peso: 10, gravedad: "grave", arreglable: false },
  sinDatosEstructurados:  { peso:  8, gravedad: "aviso", arreglable: true  },
  sinOgImage:             { peso:  6, gravedad: "aviso", arreglable: true  },
  sinLang:                { peso:  5, gravedad: "aviso", arreglable: false },
  variosH1:               { peso:  4, gravedad: "aviso", arreglable: false },
  descripcionesRepetidas: { peso:  4, gravedad: "aviso", arreglable: false },
  saltoEncabezados:       { peso:  3, gravedad: "aviso", arreglable: false },
  tituloLargo:            { peso:  3, gravedad: "aviso", arreglable: false },
  imagenesSinTamano:      { peso:  3, gravedad: "aviso", arreglable: false },
  descripcionLarga:       { peso:  2, gravedad: "aviso", arreglable: false },
  enlacesGenericos:       { peso:  2, gravedad: "aviso", arreglable: false },
  sinFavicon:             { peso:  2, gravedad: "aviso", arreglable: false },
};

/** Google recorta el título alrededor de aquí. No es un error, sale a medias. */
const MAX_TITULO = 60;
const MAX_DESCRIPCION = 160;

/**
 * Textos de enlace que no dicen a dónde llevan.
 *
 * Van los cinco idiomas de la plataforma porque la web examinada es la del
 * CLIENTE y puede estar en cualquiera de ellos —o en otro, y entonces esta
 * comprobación sencillamente no salta, que es lo correcto: preferimos no avisar
 * a avisar en falso—. Coincidencia exacta tras normalizar; nada de «contiene»,
 * que marcaría «leer más sobre nuestros talleres», un enlace perfectamente claro.
 */
const ENLACES_VACIOS = new Set([
  "aqui", "clic aqui", "haz clic aqui", "pincha aqui", "pulsa aqui", "ver mas", "leer mas", "mas",
  "here", "click here", "read more", "more", "learn more", "see more",
  "aqui mesmo", "clique aqui", "saiba mais", "ver mais", "ler mais",
  "ici", "cliquez ici", "en savoir plus", "voir plus", "lire la suite",
  "qui", "clicca qui", "leggi di piu", "scopri di piu", "vedi altro",
]);

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // sin tildes: «aquí» y «aqui» son lo mismo
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "") // sin puntuación ni flechas: «Leer más →»
    .replace(/\s+/g, " ")
    .trim();
}

export type Fallo = {
  clave: ClaveFallo;
  gravedad: Gravedad;
  arreglable: boolean;
  /** Cuántas veces ocurre. Para los que son de la página entera, 1. */
  cuantos: number;
  /** Para enseñarlo: nombres de imagen, textos de enlace, el título repetido… */
  ejemplos: string[];
};

export type ExamenPagina = {
  ruta: string;
  fallos: Fallo[];
  /** Se sacan para poder comparar entre páginas; no son fallos por sí mismos. */
  titulo: string;
  descripcion: string;
};

/** Un fallo visto en todo el sitio, con las páginas donde sale. */
export type FalloSitio = Fallo & { paginas: string[] };

export type ExamenSitio = {
  nota: number;
  fallos: FalloSitio[];
  paginas: ExamenPagina[];
  /** Cuántas se han mirado y cuántas hay: puede haber tope (ver examinarSitio). */
  examinadas: number;
  totales: number;
};

const HEADINGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

/** Las que Google mira: las de contenido. Un icono suelto no lleva `alt` útil. */
function esImagenDeContenido(src: string): boolean {
  return src.trim() !== "" && !src.trim().toLowerCase().startsWith("data:");
}

function nombreDe(src: string): string {
  const limpio = src.split(/[?#]/)[0];
  return limpio.slice(limpio.lastIndexOf("/") + 1) || limpio;
}

/**
 * Examina UNA página.
 *
 * `ruta` solo se guarda para poder decir dónde estaba el fallo.
 */
export function examinarPagina(html: string, ruta: string): ExamenPagina {
  const els = walkElementsInOrder(html);
  const fallos: Fallo[] = [];
  const añadir = (clave: ClaveFallo, cuantos = 1, ejemplos: string[] = []) => {
    fallos.push({ clave, ...PESOS[clave], cuantos, ejemplos });
  };

  const html_ = els.find((e) => e.tagName === "html");
  const titulo = (els.find((e) => e.tagName === "title")?.text ?? "").trim();
  const metas = els.filter((e) => e.tagName === "meta");
  const links = els.filter((e) => e.tagName === "link");

  const metaPorNombre = (nombre: string) =>
    metas.find((m) => (m.attrs.name ?? "").toLowerCase() === nombre)?.attrs.content ?? "";
  const metaPorPropiedad = (prop: string) =>
    metas.find(
      (m) =>
        (m.attrs.property ?? "").toLowerCase() === prop ||
        (m.attrs.name ?? "").toLowerCase() === prop
    )?.attrs.content ?? "";

  // — Título y descripción —
  if (titulo === "") añadir("sinTitulo");
  else if (titulo.length > MAX_TITULO) añadir("tituloLargo", 1, [titulo]);

  const descripcion = metaPorNombre("description").trim();
  if (descripcion === "") añadir("sinDescripcion");
  else if (descripcion.length > MAX_DESCRIPCION) añadir("descripcionLarga", 1, [descripcion]);

  // — Encabezados —
  const encabezados = els.filter((e) => HEADINGS.has(e.tagName));
  const h1 = encabezados.filter((e) => e.tagName === "h1");
  if (h1.length === 0) añadir("sinH1");
  // `deepText` y no `text`: un héroe animado palabra a palabra tiene el titular
  // repartido en `<span>`s y con `text` saldrían ejemplos en blanco. Es
  // exactamente lo que genera cualquier constructor de webs con IA.
  else if (h1.length > 1) añadir("variosH1", h1.length, h1.map((e) => e.deepText.trim()).filter(Boolean));

  // Un salto (h1 → h3) rompe el índice con el que un lector de pantalla —y los
  // buscadores— entienden de qué va cada trozo. Se compara con el anterior, no
  // con el mínimo visto: bajar de h3 a h2 y volver a h3 es correcto.
  let anterior = 0;
  let saltos = 0;
  for (const e of encabezados) {
    const nivel = Number(e.tagName[1]);
    if (anterior !== 0 && nivel > anterior + 1) saltos++;
    anterior = nivel;
  }
  if (saltos > 0) añadir("saltoEncabezados", saltos);

  // — Imágenes —
  // `alt=""` NO cuenta: es la forma correcta de marcar una imagen decorativa.
  // Solo cuenta que el atributo no esté.
  const imgs = els.filter((e) => e.tagName === "img" && esImagenDeContenido(e.attrs.src ?? ""));
  const sinAlt = imgs.filter((e) => e.attrs.alt === undefined);
  if (sinAlt.length > 0) {
    añadir("imagenesSinAlt", sinAlt.length, sinAlt.slice(0, 5).map((e) => nombreDe(e.attrs.src ?? "")));
  }
  // Sin `width`/`height` el navegador no sabe cuánto hueco reservar y la página
  // pega saltos mientras carga. Google lo mide (CLS) y lo usa para ordenar.
  const sinTamano = imgs.filter((e) => e.attrs.width === undefined || e.attrs.height === undefined);
  if (sinTamano.length > 0) {
    añadir("imagenesSinTamano", sinTamano.length, sinTamano.slice(0, 5).map((e) => nombreDe(e.attrs.src ?? "")));
  }

  // — Cabecera —
  if (metaPorNombre("viewport").trim() === "") añadir("sinViewport");
  if ((html_?.attrs.lang ?? "").trim() === "") añadir("sinLang");
  if (metaPorPropiedad("og:image").trim() === "") añadir("sinOgImage");

  const tieneFavicon = links.some((l) =>
    (l.attrs.rel ?? "").toLowerCase().split(/\s+/).some((r) => r === "icon" || r === "shortcut" || r === "apple-touch-icon")
  );
  if (!tieneFavicon) añadir("sinFavicon");

  // — Datos estructurados —
  // Lo que le dice a Google y a los asistentes QUÉ es esto: un negocio, un
  // artículo, un producto. Es lo que casi ninguna web hecha con IA trae, y lo
  // único de esta lista que la plataforma puede poner sola sin inventarse texto.
  const jsonLd = els.some(
    (e) => e.tagName === "script" && (e.attrs.type ?? "").toLowerCase().trim() === "application/ld+json"
  );
  if (!jsonLd) añadir("sinDatosEstructurados");

  // — Enlaces —
  // También por `deepText`: `<a><span>Leer más</span></a>` es el mismo enlace
  // vacío de siempre, y mirando solo el texto directo se escaparía.
  const vacios = els.filter(
    (e) => e.tagName === "a" && (e.attrs.href ?? "").trim() !== "" && ENLACES_VACIOS.has(normalizar(e.deepText))
  );
  if (vacios.length > 0) {
    añadir("enlacesGenericos", vacios.length, [...new Set(vacios.map((e) => e.deepText.trim()))].slice(0, 5));
  }

  return { ruta, fallos, titulo, descripcion };
}

/**
 * Junta los exámenes de todas las páginas y pone la nota.
 *
 * La nota se calcula por FRACCIÓN de páginas afectadas, no por «lo tiene o no lo
 * tiene»: que falte el título en una página de veinte no puede costar lo mismo
 * que falte en las veinte. Da la casualidad de que en una web hecha con IA suele
 * fallar en todas —salen de la misma plantilla—, así que en el caso real la
 * fracción es 1 y la nota baja igual; pero quien ya ha arreglado nueve de diez
 * páginas tiene que VER que ha subido, o no arregla la décima.
 */
export function examinarSitio(input: {
  paginas: { ruta: string; html: string }[];
  /** Cuántas páginas tiene el sitio en total, si se ha examinado solo un tope. */
  totales?: number;
}): ExamenSitio {
  const paginas = input.paginas.map((p) => examinarPagina(p.html, p.ruta));
  const examinadas = paginas.length;
  if (examinadas === 0) {
    return { nota: 0, fallos: [], paginas: [], examinadas: 0, totales: input.totales ?? 0 };
  }

  const porClave = new Map<ClaveFallo, FalloSitio>();
  const acumular = (f: Fallo, ruta: string) => {
    const ya = porClave.get(f.clave);
    if (!ya) {
      porClave.set(f.clave, { ...f, ejemplos: [...f.ejemplos], paginas: [ruta] });
      return;
    }
    ya.cuantos += f.cuantos;
    if (!ya.paginas.includes(ruta)) ya.paginas.push(ruta);
    for (const e of f.ejemplos) if (ya.ejemplos.length < 5 && !ya.ejemplos.includes(e)) ya.ejemplos.push(e);
  };

  for (const p of paginas) for (const f of p.fallos) acumular(f, p.ruta);

  // — Comprobaciones que solo existen mirando el sitio ENTERO —
  // Es el fallo más típico de una web hecha con IA: las cinco páginas heredan el
  // `<title>` de la plantilla. En Google todas compiten entre sí por lo mismo y
  // el resultado sale con el nombre del sitio repetido cinco veces.
  const repetido = <K extends "titulo" | "descripcion">(campo: K) => {
    const cuenta = new Map<string, string[]>();
    for (const p of paginas) {
      const v = p[campo].trim();
      if (v === "") continue; // ausente ya se ha contado como su propio fallo
      cuenta.set(v, [...(cuenta.get(v) ?? []), p.ruta]);
    }
    return [...cuenta.entries()].filter(([, rutas]) => rutas.length > 1);
  };

  for (const [valor, rutas] of repetido("titulo")) {
    for (const r of rutas) acumular({ clave: "titulosRepetidos", ...PESOS.titulosRepetidos, cuantos: 1, ejemplos: [valor] }, r);
  }
  for (const [valor, rutas] of repetido("descripcion")) {
    for (const r of rutas) acumular({ clave: "descripcionesRepetidas", ...PESOS.descripcionesRepetidas, cuantos: 1, ejemplos: [valor] }, r);
  }

  let castigo = 0;
  for (const f of porClave.values()) castigo += PESOS[f.clave].peso * (f.paginas.length / examinadas);

  const fallos = [...porClave.values()].sort(
    (a, b) =>
      PESOS[b.clave].peso * (b.paginas.length / examinadas) -
      PESOS[a.clave].peso * (a.paginas.length / examinadas)
  );

  return {
    nota: Math.max(0, Math.round(100 - castigo)),
    fallos,
    paginas,
    examinadas,
    totales: input.totales ?? examinadas,
  };
}
