import { walkElementsInOrder } from "@/src/editor/walk";

/**
 * La ficha para buscadores (JSON-LD) de una web que no la trae.
 *
 * Qué es: un bloque invisible que le dice a Google —y a ChatGPT, y a Perplexity—
 * QUÉ es esto, en vez de dejar que lo deduzca leyendo. Es lo que hace que en
 * lugar de un enlace más salga una ficha con el teléfono, o que un asistente te
 * cite por tu nombre. Casi ninguna web hecha con IA lo trae.
 *
 * Se genera AL SERVIR, igual que el sello y los canónicos: no hay que republicar,
 * se recalcula solo cuando el cliente cambia algo, y el HTML guardado no se toca.
 * Y aquí está el motivo de que esto sea nuestro y no de la competencia: quien
 * sirve archivos tal cual —Netlify Drop, Tiiny, Pages— no puede hacerlo por
 * contrato, y quien no tiene el archivo delante tampoco.
 *
 * LA REGLA: no se inventa NADA. Todo lo que entra en la ficha está escrito en la
 * página. Si no está el dato, la propiedad no sale. Meterle a Google un teléfono
 * inventado o un nombre de empresa deducido es peor que no poner ficha: es
 * ponerle a nuestro cliente datos falsos con su firma.
 */

/** Dominios de los que un enlace SÍ identifica al negocio, para `sameAs`. */
const REDES = [
  "facebook.com", "instagram.com", "x.com", "twitter.com", "linkedin.com",
  "youtube.com", "tiktok.com", "pinterest.com", "github.com", "threads.net",
];

/**
 * Separadores con los que casi todo el mundo escribe «Página — Sitio».
 *
 * Se coge lo de DESPUÉS del último, que es donde va el nombre del sitio. Y solo
 * si hay separador: de un título suelto no se deduce ningún nombre de empresa.
 */
const SEPARADORES = /\s+[|—–·-]\s+/;

function absoluta(url: string, base: string): string | null {
  const u = url.trim();
  if (u === "" || u.startsWith("data:") || u.startsWith("#")) return null;
  try {
    return new URL(u, base).toString();
  } catch {
    return null;
  }
}

/**
 * De quién es este sitio, según lo dice él mismo.
 *
 * Es la pieza que decide si hay ficha o no, y por eso está suelta: sin saber a
 * QUIÉN pertenece la web no hay ninguna identidad que declarar, y un nodo
 * `WebPage` con el título dentro no le cuenta a Google nada que no supiera ya
 * leyendo el `<title>`. Eso no es una ficha: es ruido en todas las páginas.
 */
export function nombreDelSitio(html: string): string | null {
  const els = walkElementsInOrder(html);
  const declarado = els.find(
    (e) =>
      e.tagName === "meta" &&
      ((e.attrs.property ?? "").toLowerCase() === "og:site_name" ||
        (e.attrs.name ?? "").toLowerCase() === "og:site_name")
  )?.attrs.content?.trim();
  if (declarado) return declarado;

  const titulo = els.find((e) => e.tagName === "title")?.text.trim() ?? "";
  if (!SEPARADORES.test(titulo)) return null;
  const trozos = titulo.split(SEPARADORES);
  return trozos[trozos.length - 1].trim() || null;
}

export type DatosFicha = {
  nombreSitio: string | null;
  titulo: string | null;
  descripcion: string | null;
  imagen: string | null;
  logo: string | null;
  telefono: string | null;
  correo: string | null;
  redes: string[];
};

/** Saca de la página todo lo que se pueda usar. Nada de aquí es inventado. */
export function datosDeLaPagina(html: string, urlPagina: string): DatosFicha {
  const els = walkElementsInOrder(html);
  const metas = els.filter((e) => e.tagName === "meta");
  const links = els.filter((e) => e.tagName === "link");

  const meta = (clave: string) =>
    metas.find(
      (m) =>
        (m.attrs.property ?? "").toLowerCase() === clave || (m.attrs.name ?? "").toLowerCase() === clave
    )?.attrs.content?.trim() || null;

  const titulo = meta("og:title") ?? (els.find((e) => e.tagName === "title")?.text.trim() || null);
  const descripcion = meta("og:description") ?? meta("description");

  const nombreSitio = nombreDelSitio(html);

  // La imagen: la que declara, y si no, la primera de verdad que haya en la
  // página. Es lo mismo que hace WhatsApp cuando no encuentra og:image, así que
  // no se está eligiendo nada raro.
  const imagen =
    absoluta(meta("og:image") ?? "", urlPagina) ??
    (() => {
      const img = els.find((e) => e.tagName === "img" && (e.attrs.src ?? "").trim() !== "");
      return img ? absoluta(img.attrs.src ?? "", urlPagina) : null;
    })();

  // Como logo solo vale un icono grande de verdad. Un favicon de 16 píxeles no
  // le sirve a Google para nada y ponerlo es ensuciar la ficha.
  const apple = links.find((l) =>
    (l.attrs.rel ?? "").toLowerCase().split(/\s+/).includes("apple-touch-icon")
  );
  const logo = apple ? absoluta(apple.attrs.href ?? "", urlPagina) : null;

  const enlaces = els.filter((e) => e.tagName === "a").map((e) => (e.attrs.href ?? "").trim());
  const telefono = enlaces.find((h) => /^tel:/i.test(h))?.slice(4).trim() || null;
  const correo = enlaces.find((h) => /^mailto:/i.test(h))?.slice(7).split("?")[0].trim() || null;

  const redes: string[] = [];
  for (const h of enlaces) {
    if (!/^https?:\/\//i.test(h)) continue;
    let host: string;
    try {
      host = new URL(h).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      continue;
    }
    if (!REDES.includes(host)) continue;
    // El enlace pelado al inicio de la red («instagram.com/») no identifica a
    // nadie: hace falta que apunte a un perfil.
    if (new URL(h).pathname.replace(/\/+$/, "") === "") continue;
    if (!redes.includes(h)) redes.push(h);
  }

  return { nombreSitio, titulo, descripcion, imagen, logo, telefono, correo, redes };
}

/**
 * Construye el grafo.
 *
 * Tres nodos enlazados entre sí y no tres bloques sueltos: así Google entiende
 * que la página es parte de un sitio, y que ese sitio es de una organización
 * concreta. Es la diferencia entre tres datos y una identidad.
 */
export function fichaDeLaPagina(input: {
  datos: DatosFicha;
  /** La raíz del sitio, absoluta y con barra final. */
  base: string;
  esPortada: boolean;
}): Record<string, unknown> | null {
  // SOLO LA PORTADA, y esto lo decidió una web real.
  //
  // El nombre se deduce del título de cada página, así que en la web de pruebas
  // salía «Quantiva Core Agentes IA» en el índice del blog y «Quantiva
  // Technology» en las tres páginas legales. Todas declarando el MISMO
  // `#organizacion`: dos identidades contradictorias para el mismo id, que es
  // peor que no declarar ninguna.
  //
  // Se podría arreglar deduciendo el nombre una sola vez por sitio y
  // guardándolo al publicar. Pero mientras tanto, la portada es la única página
  // donde la identidad se puede declarar sin poder contradecirse — y es donde
  // vale, porque es de ahí de donde Google saca la ficha del negocio. En las
  // demás, un `WebPage` con el título dentro no le cuenta nada que no supiera.
  if (!input.esPortada) return null;

  const d = input.datos;
  // Sin nombre no hay ficha. No es un caso raro que se deja para luego: es la
  // regla. Si la web no dice de quién es, lo único que podríamos declarar es un
  // `WebPage` con el título dentro —que Google ya ha leído del `<title>`—, y eso
  // no informa de nada: solo mete un bloque más en todas las páginas.
  if (!d.nombreSitio) return null;

  const grafo: Record<string, unknown>[] = [];
  const idOrg = `${input.base}#organizacion`;
  const idWeb = `${input.base}#web`;

  const org: Record<string, unknown> = { "@type": "Organization", "@id": idOrg, name: d.nombreSitio, url: input.base };
  if (d.logo) org.logo = d.logo;
  if (d.telefono) org.telephone = d.telefono;
  if (d.correo) org.email = d.correo;
  if (d.redes.length > 0) org.sameAs = d.redes;
  grafo.push(org);

  grafo.push({ "@type": "WebSite", "@id": idWeb, url: input.base, name: d.nombreSitio, publisher: { "@id": idOrg } });

  return { "@context": "https://schema.org", "@graph": grafo };
}

/**
 * La imagen de la tarjeta al compartir, cuando la web no declara ninguna.
 *
 * Sin `og:image`, pegar el enlace en WhatsApp o LinkedIn saca una tarjeta sin
 * foto — y eso decide si lo abren o no. La imagen que se pone es la primera de
 * la propia página: exactamente lo que hacen los rastreadores cuando no
 * encuentran la etiqueta, así que no se está eligiendo nada por nuestra cuenta.
 *
 * Es invisible: una etiqueta en el `<head>` no cambia ni un píxel de cómo se ve
 * la web. Por eso se puede hacer solos, y por eso NO se hace lo mismo con el
 * `viewport`, que sí cambiaría cómo se dibuja en el móvil (ver examen.ts).
 *
 * Si ya declara `og:image` —aunque sea una que a nosotros no nos guste—, no se
 * toca: es su decisión.
 */
export function conTarjetaAlCompartir(html: string, urlPagina: string): string {
  if (/<meta[^>]+(?:property|name)\s*=\s*["']og:image["']/i.test(html)) return html;

  const { imagen } = datosDeLaPagina(html, urlPagina);
  if (!imagen) return html;

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  // `summary_large_image` va con la imagen y solo con ella: declarar la tarjeta
  // grande sin foto que enseñar deja un hueco en blanco, que es peor que la
  // tarjeta pequeña.
  const bloque =
    `<meta property="og:image" content="${esc(imagen)}">` +
    (/<meta[^>]+name\s*=\s*["']twitter:card["']/i.test(html)
      ? ""
      : `<meta name="twitter:card" content="summary_large_image">`);

  return insertarEnHead(html, bloque);
}

export const ID_FICHA = "estrenala-ficha";

/**
 * Serializa el JSON para meterlo dentro de un `<script>`.
 *
 * `<` escapado como `<` SIEMPRE. Si el nombre del sitio contiene
 * `</script>` —y lo puede contener, porque sale del HTML del cliente— sin esto
 * se cierra la etiqueta a mitad y el resto del JSON se pinta como texto en su
 * web. Es la vía clásica de meter marcado ajeno en una página.
 */
function comoScript(ficha: Record<string, unknown>): string {
  return JSON.stringify(ficha).replace(/</g, "\\u003c");
}

/**
 * Mete la ficha en el `<head>`, justo antes de cerrarlo.
 *
 * Se edita por posiciones sobre el fuente, nunca re-serializando: pasar la web
 * de un cliente por un serializador se lo reescribe todo —comillas, mayúsculas,
 * entidades— y cualquier diferencia es un fallo nuestro en una web que iba bien.
 *
 * Si la página YA trae datos estructurados, no se toca: los suyos saben más de
 * su negocio que nosotros, y dos fichas que se contradicen son peores que una.
 */
export function conFicha(html: string, input: { url: string; base: string; esPortada: boolean }): string {
  if (/<script[^>]*type\s*=\s*["']?application\/ld\+json/i.test(html)) return html;

  const ficha = fichaDeLaPagina({ datos: datosDeLaPagina(html, input.url), ...input });
  if (!ficha) return html;

  return insertarEnHead(html, `<script type="application/ld+json" id="${ID_FICHA}">${comoScript(ficha)}</script>`);
}

/**
 * Mete un trozo antes del último `</head>`.
 *
 * Si el documento no lo cierra —HTML suelto, mal formado, y de eso sube mucho—,
 * antes del `<body>`; y si tampoco lo hay, al principio del todo. Los navegadores
 * y los rastreadores lo leen igual, y así nunca se cuela dentro de lo que se ve.
 *
 * Se corta el fuente por posiciones y se pega: NUNCA se re-serializa. Pasar la
 * web de un cliente por un serializador se lo reescribe entero —comillas,
 * mayúsculas de las etiquetas, entidades, espacios— y cualquier diferencia es un
 * fallo nuestro en una web que le iba bien.
 */
function insertarEnHead(html: string, bloque: string): string {
  const cierre = /<\/head\s*>/gi;
  let corte = -1;
  for (let m = cierre.exec(html); m; m = cierre.exec(html)) corte = m.index;
  if (corte < 0) corte = html.search(/<body\b/i);
  if (corte < 0) return bloque + html;
  return html.slice(0, corte) + bloque + html.slice(corte);
}
