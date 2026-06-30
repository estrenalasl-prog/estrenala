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
