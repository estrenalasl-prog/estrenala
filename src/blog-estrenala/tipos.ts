/**
 * El blog de la PLATAFORMA (estrenala.com/blog). No confundir con `src/blog/`,
 * que es la herramienta que genera artículos para las webs de los clientes.
 *
 * Los artículos son módulos de TypeScript y no archivos `.md` sueltos. Suena
 * menos cómodo, pero un `.md` habría que leerlo del disco en tiempo de ejecución
 * y el `output: standalone` de Next solo copia a la imagen lo que el compilador
 * ve referenciado: un directorio de contenido leído con `fs` se queda fuera y el
 * blog aparece vacío EN PRODUCCIÓN y lleno en local. Así el contenido viaja
 * dentro del bundle y o está todo o no compila.
 *
 * Va solo en español, a propósito. Un artículo de posicionamiento traducido a
 * máquina no posiciona en ningún idioma, y escribir cinco versiones buenas de
 * cada uno es otro proyecto. Por eso el blog no cuelga de `/[idioma]/`.
 */

/** Una pregunta del bloque final. Fuente única: de aquí salen el HTML y el JSON-LD. */
export type Pregunta = { p: string; r: string };

export type Articulo = {
  /** El trozo de la URL: `/blog/<slug>`. No se cambia nunca una vez publicado. */
  slug: string;
  /** El `<h1>` y el título de la pestaña. */
  titulo: string;
  /** La `<meta name="description">`. Entre 120 y 160 caracteres. */
  descripcion: string;
  /** La frase que va bajo el título, en la página. Puede ser más larga y con voz. */
  entradilla: string;
  /** ISO `YYYY-MM-DD`. Es la que ve Google y la que se ordena. */
  fecha: string;
  /** Para el listado: de qué va, en dos palabras. */
  tema: string;
  /** El cuerpo, en Markdown. */
  cuerpo: string;
  /**
   * Las preguntas del final. Se pintan Y se declaran como `FAQPage`, que es lo
   * que hace que Google las enseñe desplegadas debajo del resultado.
   */
  preguntas: Pregunta[];
};

/**
 * Cuánto se tarda en leerlo.
 *
 * 200 palabras por minuto, que es lo que se lee en pantalla en español, y
 * redondeando hacia arriba: prometer «3 min» y que sean 4 molesta más que decir
 * 4 desde el principio. Mínimo 1, que «0 min de lectura» no significa nada.
 */
export function minutosDeLectura(texto: string): number {
  const palabras = texto.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(palabras / 200));
}

/** «9 de agosto de 2026». Fijo a España: el blog solo existe en español. */
export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}
