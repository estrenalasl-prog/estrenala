import type { EditOp } from "./apply";

export const ALLOWED_IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "avif", "svg"] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SRC_RE = new RegExp(
  `^/wc-uploads/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\\.(${ALLOWED_IMAGE_EXTS.join("|")})$`,
  "i"
);
// hex (#rgb/#rrggbb/#rrggbbaa), rgb()/rgba() solo con números/%/comas/espacios, o
// nombre de color (palabra simple). Sin ';' ni '(' fuera de rgb → no se puede
// inyectar otra declaración.
const COLOR_RE = /^(#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\(\s*[\d.,%\s]+\)|[a-z]{1,32})$/i;

export function isUuid(s: string): boolean {
  return typeof s === "string" && UUID_RE.test(s);
}

export function isSafeHref(href: string): boolean {
  if (typeof href !== "string") return false;
  // Los navegadores ELIMINAN TAB/LF/CR (y otros controles C0) de la URL antes de
  // interpretar el esquema: `java\tscript:` o `javascript\n:` se ejecutan como
  // `javascript:`. Normalizamos igual (quitamos todos los controles C0 + DEL) y
  // recortamos los extremos para detectar el esquema REAL antes de validar.
  const t = href.replace(/[\x00-\x1f\x7f]/g, "").trim();
  if (t === "") return false;
  if (/^(javascript|data|vbscript):/i.test(t)) return false;
  const m = t.match(/^([a-z][a-z0-9+.-]*):/i);
  if (m) return ["http", "https", "mailto", "tel"].includes(m[1].toLowerCase());
  return true;
}

export function isValidOp(op: EditOp): boolean {
  if (!op || typeof op !== "object") return false;
  switch (op.kind) {
    case "text":
      return typeof op.value === "string";
    case "richText":
      // Cualquier string es admisible: el servidor lo sanea al aplicarlo.
      return typeof op.value === "string";
    case "href":
      return isSafeHref(op.value);
    case "src": {
      if (typeof op.value !== "string" || typeof op.assetId !== "string") return false;
      const m = op.value.match(SRC_RE);
      return !!m && m[1].toLowerCase() === op.assetId.toLowerCase();
    }
    case "insertImage": {
      // Mismas exigencias que "src" —la ruta tiene que ser un asset nuestro y
      // coincidir con el assetId declarado— más el sitio y el texto alternativo.
      if (typeof op.value !== "string" || typeof op.assetId !== "string") return false;
      if (typeof op.alt !== "string" || op.alt.length > 300) return false;
      if (op.posicion !== "antes" && op.posicion !== "despues") return false;
      const m = op.value.match(SRC_RE);
      return !!m && m[1].toLowerCase() === op.assetId.toLowerCase();
    }
    case "margen":
      return op.value === "ninguno" || op.value === "poco" || op.value === "normal" || op.value === "mucho";
    case "size":
      return op.value === "pequena" || op.value === "mediana" || op.value === "grande" || op.value === "completa";
    case "align":
      // Se admite la INTENCIÓN, no CSS: el servidor decide los márgenes. Así no
      // hay forma de colar una declaración de estilo en la página de nadie.
      return op.value === "izquierda" || op.value === "centro" || op.value === "derecha";
    case "style":
      return op.property === "color" && typeof op.value === "string" && COLOR_RE.test(op.value.trim());
    case "textNode":
      return typeof op.value === "string" && Number.isInteger(op.index) && op.index >= 0;
    default:
      return false;
  }
}
