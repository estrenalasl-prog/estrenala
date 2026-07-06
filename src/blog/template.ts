export function renderTemplate(tpl: string, valores: Record<string, string>): string {
  return tpl.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (original, clave: string) =>
    clave in valores ? valores[clave] : original
  );
}

export function huecosSinRellenar(html: string): string[] {
  return [...html.matchAll(/\{\{\s*([\w-]+)\s*\}\}/g)].map((m) => m[1]);
}
