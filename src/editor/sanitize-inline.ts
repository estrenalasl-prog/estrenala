import { isSafeHref } from "./validate-op";

// Saneador de HTML EN LÍNEA para la edición rich-text. NO deja pasar los bytes
// del cliente: re-serializa SOLO la lista blanca, con atributos de la lista
// blanca y todo el texto escapado. La confianza vive aquí (servidor), no en el
// editor. Salida siempre bien formada: cierra solo lo que abrió y lo pendiente
// al final (defiende de anidamientos rotos y trucos de mutación).

const PERMITIDAS = new Set(["b", "strong", "i", "em", "u", "a", "br"]);
const VACIAS = new Set(["br"]);
// Etiquetas cuyo CONTENIDO también se tira (no solo la etiqueta).
const DESCARTAR_CONTENIDO = new Set(["script", "style", "iframe", "svg", "noscript", "template", "title", "textarea"]);

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

// Los navegadores decodifican entidades en los atributos ANTES de interpretar el
// esquema de una URL: `javascript&#58;` es `javascript:`. Se decodifican aquí
// para que isSafeHref vea el esquema real.
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => codepoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => codepoint(parseInt(d, 10)))
    .replace(/&colon;/gi, ":").replace(/&tab;/gi, "\t").replace(/&newline;/gi, "\n")
    .replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&apos;/gi, "'");
}
function codepoint(n: number): string {
  return Number.isFinite(n) && n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
}

function extraerHref(attrs: string): string | null {
  const m = attrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
  if (!m) return null;
  return decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
}

export function sanitizeInline(fragmento: string): string {
  if (typeof fragmento !== "string" || fragmento === "") return "";
  const out: string[] = [];
  const abiertas: string[] = [];
  let descartarContenidoDe: string | null = null;
  let pos = 0;
  const n = fragmento.length;

  while (pos < n) {
    const lt = fragmento.indexOf("<", pos);
    if (lt === -1) {
      if (!descartarContenidoDe) out.push(escapeText(fragmento.slice(pos)));
      break;
    }
    if (lt > pos && !descartarContenidoDe) out.push(escapeText(fragmento.slice(pos, lt)));

    const sig = fragmento[lt + 1];
    // Declaraciones/comentarios <!...>
    if (sig === "!") {
      if (fragmento.startsWith("<!--", lt)) {
        const fin = fragmento.indexOf("-->", lt + 4);
        pos = fin === -1 ? n : fin + 3;
      } else {
        const gt = fragmento.indexOf(">", lt + 1);
        pos = gt === -1 ? n : gt + 1;
      }
      continue;
    }
    // Un '<' que NO abre etiqueta (seguido de espacio, dígito, etc.) es texto.
    if (sig !== "/" && !(sig >= "a" && sig <= "z") && !(sig >= "A" && sig <= "Z")) {
      if (!descartarContenidoDe) out.push("&lt;");
      pos = lt + 1;
      continue;
    }
    // Fin de la etiqueta: el primer '>' FUERA de comillas (un '>' dentro de un
    // valor de atributo no cuenta).
    let j = lt + 1, comilla = "";
    while (j < n) {
      const ch = fragmento[j];
      if (comilla) { if (ch === comilla) comilla = ""; }
      else if (ch === '"' || ch === "'") comilla = ch;
      else if (ch === ">") break;
      j++;
    }
    if (j >= n) {
      if (!descartarContenidoDe) out.push(escapeText(fragmento.slice(lt)));
      break;
    }
    const cruda = fragmento.slice(lt + 1, j);
    pos = j + 1;

    const esCierre = cruda.startsWith("/");
    const cuerpo = esCierre ? cruda.slice(1) : cruda;
    const mNombre = cuerpo.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
    if (!mNombre) continue;
    const nombre = mNombre[1].toLowerCase();

    if (descartarContenidoDe) {
      if (esCierre && nombre === descartarContenidoDe) descartarContenidoDe = null;
      continue;
    }

    if (esCierre) {
      if (PERMITIDAS.has(nombre) && !VACIAS.has(nombre)) {
        const idx = abiertas.lastIndexOf(nombre);
        if (idx !== -1) {
          for (let k = abiertas.length - 1; k >= idx; k--) out.push(`</${abiertas[k]}>`);
          abiertas.length = idx;
        }
      }
      continue;
    }

    if (DESCARTAR_CONTENIDO.has(nombre)) { descartarContenidoDe = nombre; continue; }
    if (!PERMITIDAS.has(nombre)) continue; // desconocida → se desenvuelve (su texto sí sale)
    if (nombre === "br") { out.push("<br>"); continue; }
    if (nombre === "a") {
      const href = extraerHref(cuerpo.slice(mNombre[0].length));
      if (href && isSafeHref(href)) { out.push(`<a href="${escapeAttr(href)}">`); abiertas.push("a"); }
      continue; // href inseguro/ausente → desenvuelve
    }
    out.push(`<${nombre}>`);
    abiertas.push(nombre);
  }

  for (let k = abiertas.length - 1; k >= 0; k--) out.push(`</${abiertas[k]}>`);
  return out.join("");
}
