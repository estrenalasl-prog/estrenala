import { walkElementsInOrder, type WalkedElement } from "./walk";
import { escapeAttr } from "./apply";
import { ALLOWED_IMAGE_EXTS } from "./validate-op";

// Herramientas de cabecera: se materializan como ediciones quirúrgicas del <head>
// (reemplazar el objetivo existente o insertar antes de </head>). El HTML publicado
// las lleva tal cual (byte-idéntico): el único rastro añadido es el atributo marcador
// data-wc-tool en los scripts de Analytics, necesario para reemplazar/quitar sin
// heurísticas.

export type Herramienta =
  | { tipo: "google-verification"; codigo: string }
  | { tipo: "analytics"; medicion: string }
  | { tipo: "favicon"; ruta: string }
  | { tipo: "og-image"; ruta: string };

export type TipoHerramienta = Herramienta["tipo"];

export type EstadoHerramientas = {
  googleVerification: string | null;
  analytics: string | null;
  favicon: string | null;
  ogImage: string | null;
};

export class HeadToolsError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

const TOKEN_RE = /^[A-Za-z0-9_-]{16,100}$/;
const MEDICION_RE = /^G-[A-Z0-9]{4,20}$/;
const RUTA_RE = new RegExp(
  `^/wc-uploads/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(${ALLOWED_IMAGE_EXTS.join("|")})$`,
  "i"
);

export function normalizarVerificacion(input: string): string | null {
  let s = input.trim();
  const meta = s.match(/(?<![-\w])content\s*=\s*["']([^"']+)["']/i);
  if (meta) s = meta[1].trim();
  return TOKEN_RE.test(s) ? s : null;
}

export function normalizarMedicion(input: string): string | null {
  const s = input.trim().toUpperCase();
  return MEDICION_RE.test(s) ? s : null;
}

export function rutaDeAssetValida(ruta: string): boolean {
  return RUTA_RE.test(ruta);
}

function relTokens(el: WalkedElement): string[] {
  return (el.attrs["rel"] ?? "").toLowerCase().split(/\s+/).filter(Boolean);
}

function esObjetivo(el: WalkedElement, tipo: TipoHerramienta): boolean {
  if (tipo === "google-verification") {
    return el.tagName === "meta" && (el.attrs["name"] ?? "").toLowerCase() === "google-site-verification";
  }
  if (tipo === "analytics") {
    return el.tagName === "script" && el.attrs["data-wc-tool"] === "analytics";
  }
  if (tipo === "favicon") {
    const rel = relTokens(el);
    return el.tagName === "link" && rel.includes("icon") && !rel.includes("apple-touch-icon");
  }
  return el.tagName === "meta" && (el.attrs["property"] ?? "").toLowerCase() === "og:image";
}

function snippetDe(h: Herramienta): string {
  switch (h.tipo) {
    case "google-verification":
      return `<meta name="google-site-verification" content="${escapeAttr(h.codigo)}">`;
    case "analytics":
      return (
        `<script async src="https://www.googletagmanager.com/gtag/js?id=${h.medicion}" data-wc-tool="analytics"></script>` +
        `<script data-wc-tool="analytics">window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${h.medicion}');</script>`
      );
    case "favicon":
      return `<link rel="icon" href="${escapeAttr(h.ruta)}">`;
    case "og-image":
      return `<meta property="og:image" content="${escapeAttr(h.ruta)}">`;
  }
}

// Rango fuente completo de un elemento (para eliminarlo). En void elements no hay
// tag de cierre: el rango es el propio start tag.
function rangoDe(el: WalkedElement): { start: number; end: number } {
  return { start: el.startTagStart, end: el.endTagEnd ?? el.startTagEnd };
}

function puntoDeInsercion(els: WalkedElement[]): number {
  const head = els.find((e) => e.tagName === "head" && e.endTagStart != null);
  if (head) return head.endTagStart as number;
  // HTML sin </head> localizable (parse5 lo sintetiza sin posición): justo antes de <body>.
  const body = els.find((e) => e.tagName === "body");
  if (body) return body.startTagStart;
  throw new HeadToolsError("Esta página no tiene cabecera editable", 400);
}

function aplicarEdits(html: string, edits: { start: number; end: number; text: string }[]): string {
  edits.sort((a, b) => b.start - a.start);
  let out = html;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}

export function aplicarHerramienta(html: string, h: Herramienta): string {
  const els = walkElementsInOrder(html);
  const at = puntoDeInsercion(els);
  // Solo la región de cabecera (antes del punto de inserción): una etiqueta
  // parecida dentro del <body> jamás se toca.
  const edits = els
    .filter((e) => e.startTagStart < at && esObjetivo(e, h.tipo))
    .map((e) => ({ ...rangoDe(e), text: "" }));
  edits.push({ start: at, end: at, text: snippetDe(h) });
  return aplicarEdits(html, edits);
}

export function quitarHerramienta(html: string, tipo: TipoHerramienta): string {
  const els = walkElementsInOrder(html);
  let limite: number;
  try {
    limite = puntoDeInsercion(els);
  } catch {
    return html; // sin cabecera localizable no hay nada que quitar
  }
  const edits = els
    .filter((e) => e.startTagStart < limite && esObjetivo(e, tipo))
    .map((e) => ({ ...rangoDe(e), text: "" }));
  if (edits.length === 0) return html;
  return aplicarEdits(html, edits);
}

export function estadoHerramientas(html: string): EstadoHerramientas {
  const els = walkElementsInOrder(html);
  let limite: number;
  try {
    limite = puntoDeInsercion(els);
  } catch {
    return { googleVerification: null, analytics: null, favicon: null, ogImage: null };
  }
  const enCabecera = els.filter((e) => e.startTagStart < limite);
  const ver = enCabecera.find((e) => esObjetivo(e, "google-verification"));
  const ana = enCabecera.find((e) => esObjetivo(e, "analytics") && !!e.attrs["src"]);
  const fav = enCabecera.find((e) => esObjetivo(e, "favicon"));
  const og = enCabecera.find((e) => esObjetivo(e, "og-image"));
  const medicion = ana?.attrs["src"]?.match(/[?&]id=(G-[A-Z0-9]+)/i)?.[1] ?? null;
  return {
    googleVerification: ver?.attrs["content"] ?? null,
    analytics: medicion ? medicion.toUpperCase() : null,
    favicon: fav?.attrs["href"] ?? null,
    ogImage: og?.attrs["content"] ?? null,
  };
}
