/**
 * Rellena los huecos de una plantilla: `Hola {nombre}` → `Hola Sebas`.
 *
 * UNA SOLA PASADA sobre la plantilla, no una vuelta por cada valor. La
 * diferencia importa: recorriendo los valores uno a uno, un usuario que se
 * llamara `{enlace}` vería su nombre sustituido por el enlace en la vuelta
 * siguiente. Aquí lo que entra por un valor ya no se vuelve a mirar.
 *
 * (Se escribió primero de la otra forma, con un comentario que prometía justo
 * esto. Lo destapó el test, no el comentario.)
 *
 * `replace` con función además no interpreta `$&` ni `$1` en el valor, así que
 * un enlace con `$` entra tal cual.
 *
 * Un hueco que no esté en el mapa se queda tal cual, a la vista: es feo, pero se
 * ve. Borrarlo dejaría una frase incompleta con toda la pinta de estar bien.
 */
export function rellenar(plantilla: string, valores: Record<string, string>): string {
  return plantilla.replace(/\{([a-zA-Z]+)\}/g, (hueco, clave: string) =>
    Object.prototype.hasOwnProperty.call(valores, clave) ? valores[clave] : hueco
  );
}

/** Para meter un valor dentro del HTML de un correo. */
export function escaparHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
