// Colores "de marca" del sitio para la portada generada: se extraen del CSS y
// el HTML reales; los grises y extremos (fondos, textos) no cuentan como marca.

const RE_HEX = /#([0-9a-f]{6}|[0-9a-f]{3})\b/gi;
const RE_RGB = /rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gi;

type Rgb = { r: number; g: number; b: number };

function desglosar(hex: string): Rgb {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function esUtil({ r, g, b }: Rgb): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 30) return false; // gris (incluye blancos y negros puros)
  if (r > 235 && g > 235 && b > 235) return false; // casi blanco
  if (r < 25 && g < 25 && b < 25) return false; // casi negro
  return true;
}

export function extraerColores(textos: string[]): string[] {
  const cuenta = new Map<string, number>();
  const sumar = (hex: string) => cuenta.set(hex, (cuenta.get(hex) ?? 0) + 1);
  for (const texto of textos) {
    for (const m of texto.matchAll(RE_HEX)) {
      const h = m[1].toLowerCase();
      sumar("#" + (h.length === 3 ? h.split("").map((c) => c + c).join("") : h));
    }
    for (const m of texto.matchAll(RE_RGB)) {
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (r > 255 || g > 255 || b > 255) continue;
      sumar("#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join(""));
    }
  }
  return [...cuenta.entries()]
    .filter(([hex]) => esUtil(desglosar(hex)))
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex);
}

// Parejas curadas para sitios sin colores propios utilizables.
export const PALETAS: [string, string][] = [
  ["#4f46e5", "#0ea5e9"], // índigo → azul cielo
  ["#0f766e", "#84cc16"], // verde azulado → lima
  ["#7c3aed", "#db2777"], // violeta → rosa
  ["#0369a1", "#14b8a6"], // azul → turquesa
  ["#b45309", "#f59e0b"], // ámbar oscuro → ámbar
  ["#be123c", "#f97316"], // granate → naranja
  ["#1d4ed8", "#7c3aed"], // azul → violeta
  ["#065f46", "#0ea5e9"], // esmeralda → azul cielo
];

export function hashDeterminista(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function paletaPara(semilla: string): [string, string] {
  return PALETAS[hashDeterminista(semilla) % PALETAS.length];
}

// Luminancia percibida 0-255 (para decidir el color del texto encima).
export function luminancia(hex: string): number {
  const { r, g, b } = desglosar(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
