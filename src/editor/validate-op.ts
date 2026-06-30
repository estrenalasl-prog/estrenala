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
  const t = href.trim();
  if (t === "") return false;
  if (/^(javascript|data|vbscript):/i.test(t)) return false;
  const m = t.match(/^([a-z][a-z0-9+.-]*):/i);
  if (m) return ["http", "https", "mailto", "tel"].includes(m[1].toLowerCase());
  return true; // sin esquema → relativa, ancla, root-absoluta
}

export function isValidOp(op: EditOp): boolean {
  if (!op || typeof op !== "object") return false;
  switch (op.kind) {
    case "text":
      return typeof op.value === "string";
    case "href":
      return isSafeHref(op.value);
    case "src": {
      if (typeof op.value !== "string" || typeof op.assetId !== "string") return false;
      const m = op.value.match(SRC_RE);
      return !!m && m[1].toLowerCase() === op.assetId.toLowerCase();
    }
    case "style":
      return op.property === "color" && typeof op.value === "string" && COLOR_RE.test(op.value.trim());
    default:
      return false;
  }
}
