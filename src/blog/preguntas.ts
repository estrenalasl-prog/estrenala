/**
 * Las preguntas y respuestas de un artículo, sacadas de su Markdown.
 *
 * Para qué sirve HOY, que no es lo que se cree: **Google retiró los resultados
 * enriquecidos de FAQ el 7 de mayo de 2026**. Las listas desplegables bajo un
 * resultado ya no las ve nadie —ni las webs oficiales, que fueron las últimas en
 * conservarlas desde 2023—, y en junio quitaron hasta el informe de Search
 * Console. Marcar esto NO va a cambiar cómo se ve el artículo en Google.
 *
 * Lo que sí hace, y por lo que se mantiene: `FAQPage` sigue siendo Schema.org
 * válido y es lo que leen ChatGPT, Perplexity y Gemini al rastrear. Les entrega
 * las preguntas ya troceadas con su respuesta en vez de un muro de texto del que
 * tengan que deducirlas. Ese es el tráfico que interesa.
 *
 * CÓMO SE RECONOCE UNA PREGUNTA, que es lo delicado: por su ESTRUCTURA, nunca
 * por buscar la palabra «FAQ» o «Preguntas frecuentes». Ramificar sobre cómo
 * está escrito un texto se rompe en silencio en cuanto el texto cambia de idioma
 * o el modelo decide titular la sección de otra forma. Aquí la señal es que un
 * encabezado ACABA EN `?` —que vale igual para «¿Cuánto cuesta?», «How much is
 * it?» o «Combien ça coûte ?»— y que hay varios seguidos al mismo nivel.
 */

export type Pregunta = { pregunta: string; respuesta: string };

/** Como mucho estas. Un artículo con veinte «preguntas» no tiene un FAQ. */
const MAX_PREGUNTAS = 10;
/** Menos que esto no es una respuesta, es un encabezado suelto. */
const MIN_RESPUESTA = 20;
const MAX_RESPUESTA = 1000;

type Encabezado = { nivel: number; texto: string; desde: number; hasta: number };

/**
 * Los encabezados del Markdown, con dónde empieza y acaba lo que cuelga de cada
 * uno.
 *
 * Se saltan los bloques de código: dentro de unas comillas triples, `# algo` es
 * un comentario de Bash, no un encabezado, y tomarlo por uno partiría el
 * artículo por la mitad.
 */
function encabezados(md: string): Encabezado[] {
  const lineas = md.split(/\r?\n/);
  const salida: Encabezado[] = [];
  let pos = 0;
  let enCodigo = false;

  for (const linea of lineas) {
    const largo = linea.length + 1; // +1 por el salto que se ha comido el split
    if (/^\s{0,3}(```|~~~)/.test(linea)) enCodigo = !enCodigo;
    else if (!enCodigo) {
      const m = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(linea);
      if (m) {
        if (salida.length > 0) salida[salida.length - 1].hasta = pos;
        salida.push({ nivel: m[1].length, texto: m[2].trim(), desde: pos + largo, hasta: md.length });
      }
    }
    pos += largo;
  }
  return salida;
}

/**
 * El texto de un trozo de Markdown, sin marcas.
 *
 * No pretende ser un conversor: solo dejar legible lo que va a leer una máquina.
 * De un enlace se queda el texto y se tira la dirección, que en una respuesta
 * hablada no pinta nada.
 */
export function textoPlano(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")        // imágenes: fuera enteras
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")      // enlaces: se queda el texto
    .replace(/^\s{0,3}>\s?/gm, "")                // citas
    .replace(/^\s{0,3}(?:[-*+]|\d+[.)])\s+/gm, "") // viñetas y numeración
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function recortar(s: string, max: number): string {
  if (s.length <= max) return s;
  const corte = s.slice(0, max);
  const espacio = corte.lastIndexOf(" ");
  return (espacio > max * 0.8 ? corte.slice(0, espacio) : corte) + "…";
}

/** ¿Este encabezado es una pregunta? Lo dice el signo, no el idioma. */
function esPregunta(texto: string): boolean {
  return /[?？]\s*$/.test(texto);
}

export function preguntasDelMarkdown(md: string): Pregunta[] {
  const heads = encabezados(md);

  // Cada encabezado con su respuesta, o null si no es una pregunta con contenido.
  const candidatos = heads.map((h) => {
    if (!esPregunta(h.texto)) return null;
    const cuerpo = textoPlano(md.slice(h.desde, h.hasta));
    if (cuerpo.length < MIN_RESPUESTA) return null;
    return { nivel: h.nivel, pregunta: textoPlano(h.texto), respuesta: recortar(cuerpo, MAX_RESPUESTA) };
  });

  /**
   * La tira más larga de preguntas SEGUIDAS y al mismo nivel.
   *
   * Hacen falta al menos dos, y esto es lo que separa un FAQ de un artículo
   * normal. «¿Qué es Kling AI?» como título de apartado es una pregunta retórica
   * con un texto detrás: es la forma normal de escribir, y marcarla como
   * pregunta frecuente sería decirle a Google que el artículo entero es un FAQ.
   * Dos o más seguidas, en cambio, solo pasa cuando de verdad hay un bloque de
   * preguntas — se llame como se llame la sección, o no se llame de ninguna forma.
   */
  let mejor: Pregunta[] = [];
  let actual: Pregunta[] = [];
  let nivelActual = 0;

  for (const c of candidatos) {
    if (!c || (actual.length > 0 && c.nivel !== nivelActual)) {
      if (actual.length > mejor.length) mejor = actual;
      actual = c ? [{ pregunta: c.pregunta, respuesta: c.respuesta }] : [];
      nivelActual = c ? c.nivel : 0;
      continue;
    }
    if (actual.length === 0) nivelActual = c.nivel;
    actual.push({ pregunta: c.pregunta, respuesta: c.respuesta });
  }
  if (actual.length > mejor.length) mejor = actual;

  return mejor.length >= 2 ? mejor.slice(0, MAX_PREGUNTAS) : [];
}

/** El nodo `FAQPage` de Schema.org, o null si el artículo no tiene preguntas. */
export function fichaDePreguntas(preguntas: Pregunta[]): Record<string, unknown> | null {
  if (preguntas.length === 0) return null;
  return {
    "@type": "FAQPage",
    mainEntity: preguntas.map((p) => ({
      "@type": "Question",
      name: p.pregunta,
      acceptedAnswer: { "@type": "Answer", text: p.respuesta },
    })),
  };
}
