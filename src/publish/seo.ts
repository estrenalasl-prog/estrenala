import { esVerificacion } from "@/src/seo/paginas";

// Cómo se le habla a Google al servir la web publicada de un cliente.
//
// Todo va en CABECERAS, nunca reescribiendo su HTML: el contrato de la
// plataforma es servir los archivos tal cual (ver resolve-site.ts), y así esto
// vale igual para un PDF o una imagen que para una página.

/** Valor de X-Robots-Tag cuando la web está en modo «que no me encuentren todavía». */
export const ROBOTS_NOINDEX = "noindex, nofollow";

/**
 * Cabecera `Link ... rel="canonical"`.
 *
 * Cuando hay dominio propio conectado, la MISMA web se sirve en dos direcciones
 * (mi-web.estrenala.com y midominio.com). Para Google eso es contenido duplicado
 * y reparte la autoridad entre las dos. Con esto se le dice cuál es la buena.
 *
 * A propósito NO es un 301 desde el subdominio: conectar un dominio no comprueba
 * el DNS (ver conectarDominio), así que redirigir dejaría la web inalcanzable por
 * ambos lados mientras el DNS no apunte. El canónico resuelve el SEO sin ese riesgo.
 */
export function cabeceraCanonica(dominio: string, ruta: string): string {
  return `<https://${dominio}${ruta}>; rel="canonical"`;
}

/**
 * La dirección pública de una página, con o sin barra final.
 *
 * La barra no es cosmética: decide dónde caen los enlaces RELATIVOS, porque el
 * navegador los resuelve contra la URL y no contra el archivo. El índice de una
 * carpeta la necesita (`/blog/` + `foto.html` → `/blog/foto.html`) y una URL
 * limpia la estorba (`/contacto/` + `equipo.html` → `/contacto/equipo.html`).
 * Ver resolve-site.ts, que redirige a la forma correcta.
 */
export function rutaPublica(pathSegments: string[], conBarra: boolean): string {
  const ruta = "/" + pathSegments.filter((s) => s !== "").map(encodeURIComponent).join("/");
  return conBarra && ruta !== "/" ? `${ruta}/` : ruta;
}

/**
 * Reapunta al dominio propio las direcciones absolutas que el blog dejó escritas
 * dentro del HTML.
 *
 * El blog calcula la dirección pública EN EL MOMENTO de escribir el artículo
 * (`basePublica`) y la congela en el `<link rel="canonical">`, en el `og:url` y
 * en el JSON-LD. Si el cliente escribe diez artículos y DESPUÉS conecta su
 * dominio, esos diez siguen diciéndole a Google que la buena es la dirección
 * `*.estrenala.com` — le estaríamos señalando como canónica una que no es suya.
 *
 * Y desde que mandamos también la cabecera `Link ... rel="canonical"`, dejarlo
 * así es peor que estar mal: serían DOS canónicos distintos para la misma
 * página, y ante esa contradicción Google no hace caso a ninguno.
 *
 * Se arregla al servir, no reescribiendo lo guardado: así no hay que republicar,
 * no se ensucia el historial del cliente y se deshace solo si desconecta el
 * dominio. La sustitución solo pega cuando la base va seguida de `/`, de comilla
 * o del final, para no tocar un dominio que la contenga como prefijo.
 */
export function reapuntarCanonicos(html: string, baseVieja: string, baseNueva: string): string {
  if (baseVieja === baseNueva) return html;
  const escapada = baseVieja.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.replace(new RegExp(`${escapada}(?=[/"'\\s>]|$)`, "g"), baseNueva);
}

/**
 * Reapunta el sitemap a la dirección buena de HOY.
 *
 * El sitemap guarda direcciones ENTERAS, escritas cuando se generó. Si después el
 * cliente cambia de subdominio, o conecta su dominio propio —que es justo lo que
 * hace todo el que empieza a pagar—, esas direcciones se quedan viejas y el
 * sitemap le está diciendo a Google «mis páginas están allí», señalando a un sitio
 * que ya no existe. Es lo contrario de lo que se le vende.
 *
 * Visto el 2026-08-01 en la web de pruebas: seguía anunciando
 * `quantiva.estrenala.com` un rato después de haber cambiado el subdominio.
 *
 * Solo se tocan las direcciones que cuelgan de NUESTRO dominio de subdominios:
 * esas solo pueden ser nuestras y solo pueden estar viejas. Lo demás se deja tal
 * cual —incluidas las del dominio para el que se escribió la web original—, por lo
 * mismo que en `reapuntarMetadatosImportados`: reescribir el dominio de otro es
 * peor que dejarlo mal, porque puede ser un sitio suyo que sí existe.
 *
 * Al servir, no reescribiendo lo guardado: se arregla solo al conectar el dominio,
 * sin republicar, y se deshace solo si lo desconecta.
 */
export function reapuntarSitemap(xml: string, base: string, sitesBaseDomain: string): string {
  const bd = (sitesBaseDomain ?? "").trim().toLowerCase().replace(/:\d+$/, "");
  if (!bd) return xml;
  const escapado = bd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Un subdominio cualquiera del dominio base, no solo el actual: el caso que
  // falla es precisamente el del subdominio ANTERIOR.
  const re = new RegExp(`https?://[a-z0-9-]+\\.${escapado}(?=[/<"'\\s]|$)`, "gi");
  const reapuntado = (xml ?? "").replace(re, base.replace(/\/+$/, ""));

  // Al reapuntar, dos entradas que ANTES eran distintas pueden quedar idénticas:
  // el índice del blog estaba guardado dos veces, una con el subdominio viejo y
  // otra con el dominio nuevo, y las dos acaban siendo la misma dirección. Se
  // queda la primera. No es grave para Google, pero un sitemap con la misma URL
  // repetida es la clase de detalle que hace dudar de todo lo demás.
  const vistos = new Set<string>();
  return reapuntado.replace(/<url>[\s\S]*?<\/url>/gi, (bloque) => {
    const m = bloque.match(/<loc>([^<]*)<\/loc>/i);
    if (!m) return bloque;
    const loc = m[1].trim();
    if (vistos.has(loc)) return "";
    vistos.add(loc);
    return bloque;
  });
}

/**
 * Los dominios AJENOS que anuncia el sitemap del cliente.
 *
 * `reapuntarSitemap` solo toca lo que cuelga de nuestro dominio de subdominios,
 * y a propósito: reescribir el dominio de otro es peor que dejarlo mal, porque
 * puede ser un sitio suyo que sí existe. Pero entonces queda el caso que nadie
 * ve: subes una web hecha con IA para `suempresa.com`, con su sitemap dentro, la
 * publicas en `suempresa.estrenala.com` y NO conectas el dominio. El sitemap le
 * está diciendo a Google «mis páginas están en suempresa.com» — un sitio que
 * quizá no existe, o que es otro. Se indexa lo que no toca, o no se indexa nada.
 *
 * Callado no puede quedarse, porque es justo lo que la plataforma promete
 * resolver. Así que se avisa y decide el dueño: o conecta el dominio, o rehace
 * el sitemap. Aquí no se corrige nada.
 *
 * Se ignora el `www.` para comparar: quien conecta el dominio pelado tiene las
 * dos direcciones, y avisar de `www.sudominio.com` teniendo `sudominio.com`
 * conectado sería un aviso falso —de los que enseñan a ignorar los avisos—.
 */
export function dominiosAjenosDelSitemap(input: {
  xml: string;
  sitesBaseDomain: string;
  dominio: string | null;
}): string[] {
  const bd = (input.sitesBaseDomain ?? "").trim().toLowerCase().replace(/:\d+$/, "");
  const propio = (input.dominio ?? "").trim().toLowerCase().replace(/^www\./, "");
  const ajenos = new Set<string>();

  for (const m of (input.xml ?? "").matchAll(/<loc>([^<]*)<\/loc>/gi)) {
    const host = m[1].trim().match(/^https?:\/\/([^/?#]+)/i)?.[1]?.toLowerCase().replace(/:\d+$/, "");
    if (!host) continue; // relativa o basura: no es un dominio del que avisar
    if (bd && (host === bd || host.endsWith(`.${bd}`))) continue;
    if (propio && (host === propio || host === `www.${propio}`)) continue;
    ajenos.add(host);
  }
  // Ordenados para que el aviso no cambie de orden entre recargas por el capricho
  // del orden de aparición.
  return [...ajenos].sort();
}

/**
 * Reapunta a esta casa los metadatos de una web escrita para OTRO dominio.
 *
 * Nuestro caso de uso es literalmente ese: alguien hace una web con IA para
 * `suempresa.com`, la sube aquí y la publica. Dentro, el HTML sigue diciendo
 * que la imagen de compartir está en `https://suempresa.com/assets/og.jpg` —un
 * archivo que ahí no existe—, así que al pegar el enlace en WhatsApp sale la
 * tarjeta SIN imagen aunque la imagen esté subida y se sirva de maravilla desde
 * aquí. Le pasó a Sebas con la web de Quantiva y es lo primero que hace
 * cualquiera al estrenar: mandarle el enlace a alguien.
 *
 * Qué se toca y qué no, que es todo el diseño:
 *
 *  - La web DECLARA para qué dominio se escribió, en su `<link rel="canonical">`
 *    o en su `og:url`. Sin eso no se adivina nada y no se toca nada.
 *  - Solo se reapuntan las etiquetas que describen ESTA página (canónico,
 *    og:url, og:image, twitter:image) y solo si apuntan a ese dominio viejo.
 *    Una imagen en un CDN ajeno se queda donde está.
 *  - Los `<a href>` al dominio viejo NO se tocan: si enlaza a su tienda de
 *    siempre, tiene que seguir llevando allí. Por eso esto no es un reemplazo
 *    global de la base como `reapuntarCanonicos`.
 *  - Una imagen escrita como ruta (`/assets/og.jpg`) se vuelve absoluta:
 *    WhatsApp y Facebook no enseñan nada si og:image no trae dominio.
 *
 * Se hace AL SERVIR, no reescribiendo lo guardado: así no hay que republicar y
 * se corrige solo si mañana conecta un dominio propio.
 */
const META_DE_ESTA_PAGINA = new Set([
  "og:url", "og:image", "og:image:url", "og:image:secure_url",
  "twitter:image", "twitter:image:src",
]);

const ETIQUETA_META = /<(?:meta|link)\b[^>]*>/gi;

function escaparRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function valorAtributo(tag: string, nombre: string): string | null {
  const m = tag.match(new RegExp(`\\b${nombre}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
  return m ? (m[1] ?? m[2] ?? "") : null;
}

/** `https://host:puerto` de una URL absoluta; null si no lo es. */
function origenDe(url: string): string | null {
  return url.match(/^(https?:\/\/[^/?#]+)/i)?.[1] ?? null;
}

/** Cómo se llama el atributo que lleva la URL en esta etiqueta. */
function clavesDe(tag: string): { esCanonico: boolean; esNuestra: boolean; attr: "href" | "content" } {
  const rel = (valorAtributo(tag, "rel") ?? "").toLowerCase().split(/\s+/);
  const prop = (valorAtributo(tag, "property") ?? valorAtributo(tag, "name") ?? "").toLowerCase();
  const esCanonico = rel.includes("canonical");
  return { esCanonico, esNuestra: esCanonico || META_DE_ESTA_PAGINA.has(prop), attr: esCanonico ? "href" : "content" };
}

export function reapuntarMetadatosImportados(html: string, basePublica: string): string {
  const origenActual = origenDe(basePublica);
  if (!origenActual) return html;

  // Para qué dominio se escribió esta web. Lo dice ella misma.
  let origenViejo: string | null = null;
  for (const tag of html.match(ETIQUETA_META) ?? []) {
    const rel = (valorAtributo(tag, "rel") ?? "").toLowerCase().split(/\s+/);
    const prop = (valorAtributo(tag, "property") ?? valorAtributo(tag, "name") ?? "").toLowerCase();
    if (!rel.includes("canonical") && prop !== "og:url") continue;
    const o = origenDe(valorAtributo(tag, "href") ?? valorAtributo(tag, "content") ?? "");
    if (o) { origenViejo = o; break; }
  }
  const mudanza = origenViejo !== null && origenViejo.toLowerCase() !== origenActual.toLowerCase();

  return html.replace(ETIQUETA_META, (tag) => {
    const { esNuestra, attr } = clavesDe(tag);
    if (!esNuestra) return tag;
    const valor = valorAtributo(tag, attr);
    if (valor === null || valor === "") return tag;

    let nuevo: string | null = null;
    if (valor.startsWith("/") && !valor.startsWith("//")) {
      nuevo = origenActual + valor; // ruta → absoluta (WhatsApp la exige)
    } else if (mudanza && origenDe(valor)?.toLowerCase() === origenViejo!.toLowerCase()) {
      nuevo = origenActual + valor.slice(origenViejo!.length);
    }
    if (nuevo === null) return tag;

    const destino = nuevo;
    return tag.replace(
      new RegExp(`(\\b${attr}\\s*=\\s*["'])${escaparRegExp(valor)}`, "i"),
      (_m, apertura: string) => apertura + destino
    );
  });
}

/**
 * Sitemap de emergencia para las webs que no tienen ninguno.
 *
 * Hasta ahora solo se generaba `sitemap.xml` al publicar artículos del blog, así
 * que una web de cinco páginas subida en ZIP no tenía ninguno —y para un sitio
 * recién nacido, sin enlaces entrantes, el sitemap es lo que acelera que Google
 * lo encuentre—. Este se calcula AL SERVIR, mirando qué páginas hay dentro:
 * no hay que republicar para que aparezca una página nueva.
 *
 * Solo se usa cuando el sitio NO trae el suyo. Si el cliente subió uno, o si el
 * blog ya lo escribió, manda el suyo y aquí no se toca nada.
 */
export function sitemapDeLasPaginas(input: {
  /** Claves completas del almacenamiento, incluido el prefijo del snapshot. */
  claves: string[];
  prefijo: string;
  /** Base pública sin barra final, p. ej. "https://micafe.com". */
  base: string;
  /** La página de inicio, que se anuncia como "/" y no por su nombre de archivo. */
  entryPath: string;
}): string {
  const paginas = input.claves
    .map((k) => (k.startsWith(input.prefijo) ? k.slice(input.prefijo.length) : k))
    .filter((rel) => /\.html?$/i.test(rel))
    // Las del blog ya las lista el sitemap del blog; y los parciales que empiezan
    // por "_" no son páginas que nadie deba visitar sueltas.
    .filter((rel) => !rel.split("/").some((t) => t.startsWith("_")))
    // Tampoco los archivos de verificación de los buscadores: ofrecerle a Google
    // que indexe el papelito con el que le demuestras que el dominio es tuyo es
    // gastar rastreo y arriesgarse a que salga en los resultados.
    .filter((rel) => !esVerificacion(rel));

  const rutas = new Set<string>();
  for (const rel of paginas) {
    if (rel === input.entryPath) { rutas.add("/"); continue; }
    // `blog/index.html` se sirve TAMBIÉN en `/blog` desde el incremento 21 (ver
    // resolve-site.ts), y `/blog` es la dirección que usan los menús. Anunciar
    // aquí la otra sería ofrecerle a Google dos direcciones con el mismo
    // contenido, que es justo lo que un sitemap debería estar evitando.
    const esIndice = /(^|\/)index\.html?$/i.test(rel);
    const partes = rel.replace(/(^|\/)index\.html?$/i, "").split("/").filter(Boolean);
    const ruta = "/" + partes.map(encodeURIComponent).join("/");
    // Con barra final, que es donde acaba sirviéndose (allí resuelven bien sus
    // enlaces relativos) y por tanto la única dirección buena de esa página.
    rutas.add(esIndice && partes.length > 0 ? `${ruta}/` : ruta);
  }

  const urls = [...rutas].sort().map((r) => `  <url><loc>${input.base}${r}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
