/**
 * Todo lo que escribe el editor va con `!important`.
 *
 * Sin esto, en una web cuyo CSS lleve `!important` el usuario sube la barra del
 * tamaño de letra y NO PASA NADA: una regla `!important` de la hoja de estilos
 * gana a un estilo en línea normal. Lo vio Sebas el 2026-08-10 en un artículo
 * suyo que traía dentro `p, ul, li { color:#000 !important; font-size:20px
 * !important }` — y las webs hechas con IA lo llevan a menudo.
 *
 * Se sabe lo que cuesta: en un elemento tocado, un `!important` de la web para
 * el móvil deja de aplicarse. Pero es que HOY ese elemento ya no se puede
 * cambiar, así que no se pierde nada que funcionara: se cambia «no hace nada»
 * por «hace lo que le has pedido». Un editor que se queda callado es lo peor de
 * los dos mundos.
 *
 * Lo mismo escribe `public/wc-editor.js` en la vista previa. Si uno lo pusiera y
 * el otro no, se vería una cosa y se publicaría otra.
 */
export function conPrioridad(value: string): string {
  return value + " !important";
}

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
