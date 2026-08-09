// Fija prop=value en una cadena `style` inline. Reemplaza si la propiedad ya
// existe (case-insensitive en el nombre), conservando el resto y el orden.
// Devuelve el valor interno (sin `style="…"`).
export function mergeStyleProperty(style: string, prop: string, value: string): string {
  const pares: [string, string][] = [];
  let reemplazado = false;
  for (const decl of style.split(";")) {
    const t = decl.trim();
    if (!t) continue;
    const i = t.indexOf(":");
    if (i === -1) continue;
    const nombre = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim();
    if (nombre.toLowerCase() === prop.toLowerCase()) {
      pares.push([prop, value]);
      reemplazado = true;
    } else {
      pares.push([nombre, val]);
    }
  }
  if (!reemplazado) pares.push([prop, value]);
  return pares.map(([n, v]) => `${n}: ${v}`).join("; ");
}

/**
 * Quita una propiedad de la cadena `style`. Hace falta para «sin recuadro»: un
 * recuadro se pone escribiendo fondo, borde y relleno, y quitarlo NO es
 * escribirlos a cero —eso deja `padding: 0` pisando lo que la web ya tenía en su
 * hoja de estilos—, es borrarlos para que vuelva a mandar el diseño original.
 */
export function quitarStyleProperty(style: string, prop: string): string {
  const pares: [string, string][] = [];
  for (const decl of style.split(";")) {
    const t = decl.trim();
    if (!t) continue;
    const i = t.indexOf(":");
    if (i === -1) continue;
    const nombre = t.slice(0, i).trim();
    if (nombre.toLowerCase() === prop.toLowerCase()) continue;
    pares.push([nombre, t.slice(i + 1).trim()]);
  }
  return pares.map(([n, v]) => `${n}: ${v}`).join("; ");
}
