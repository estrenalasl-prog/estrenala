import { esIdioma, IDIOMA_POR_DEFECTO, type Idioma } from "@/src/i18n/idiomas";

/**
 * En qué idioma está escrita la web de un cliente, según ella misma.
 *
 * Es la señal que decide el idioma del sello «Hecho con Estrénala», y no el
 * idioma del DUEÑO —que era lo apuntado al principio— porque el sello no lo lee
 * él: lo lee su audiencia. Una agencia de Madrid que le hace la web a un
 * restaurante de Lyon tiene la plataforma en español, pero a esa web entran
 * franceses. Con el idioma del dueño, todos ellos verían una línea en español
 * al pie de una página que por lo demás está entera en francés.
 *
 * Tampoco vale el `Accept-Language` del visitante: el sello viaja DENTRO de una
 * página que ya ha elegido un idioma, y una web francesa con un sello en alemán
 * porque el visitante iba de paso se lee como un fallo, no como una atención.
 * Lo que se quiere es que el sello no desentone con la página en la que está, y
 * eso lo dice la página: `<html lang>`.
 *
 * Y es un dato que está ahí siempre y gratis. Cualquier web hecha con IA nace
 * con su `lang` puesto —se lo pone el modelo—, así que no hay que preguntar a
 * nadie ni guardar nada.
 *
 * Si no hay `lang`, o es un idioma que no hablamos (`de`, `ja`), se cae al
 * español: es el de casa y el que ya salía antes, así que ninguna web existente
 * cambia de la noche a la mañana.
 */

// Sin `g` a propósito: `exec` sobre un regex global arrastra `lastIndex` entre
// llamadas y a la segunda página empezaría a buscar por la mitad.
//
// El espacio de `\slang` es obligatorio y no vale `\b`: un guion no es carácter
// de palabra, así que `\blang` casa DENTRO de `data-lang="fr"` y una web con ese
// atributo elegiría idioma por un dato que no es el suyo.
const LANG = /<html\b[^>]*\slang\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i;

export function idiomaDeLaPagina(html: string): Idioma {
  const m = LANG.exec(html);
  if (!m) return IDIOMA_POR_DEFECTO;
  // `pt-BR` es portugués y `fr-CA` es francés: manda la parte de delante.
  const base = (m[1] ?? m[2] ?? m[3] ?? "").trim().toLowerCase().split("-")[0];
  return esIdioma(base) ? base : IDIOMA_POR_DEFECTO;
}
