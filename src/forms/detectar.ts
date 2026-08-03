import { walkElementsInOrder, type WalkedElement } from "@/src/editor/walk";

/**
 * Los formularios de una web de cliente, y si van a alguna parte.
 *
 * El problema que resuelve: casi toda web hecha con IA trae su «Contacto» con su
 * formulario, y ese formulario **no envía nada**. El modelo escribe el marcado
 * bonito y deja el `action` vacío porque no tiene servidor al que apuntar. El
 * visitante rellena, pulsa, y no pasa nada — sin error y sin aviso. El dueño se
 * entera semanas después, si se entera.
 */

/** Qué le pasa a un formulario. */
export type EstadoFormulario =
  /** Sin destino: no envía a ninguna parte. Es el que podemos conectar. */
  | "muerto"
  /** Tiene su propio destino (Formspree, su backend…). No se toca. */
  | "ajeno"
  /** `action="mailto:…"`. Abre el cliente de correo del visitante. */
  | "mailto"
  /** Lo maneja su propio JavaScript (`onsubmit`). No se toca. */
  | "propio"
  /** Un buscador del sitio, no un formulario de contacto. */
  | "buscador";

export type FormularioDetectado = {
  /** El índice del `<form>` en la página, en orden documental. Es su nombre estable. */
  indice: number;
  estado: EstadoFormulario;
  /** El `action` tal cual venía, para poder contárselo al dueño. */
  action: string;
  /** Los `name` de sus campos, en orden. Sin esto no se puede enseñar nada útil. */
  campos: string[];
  /** Posiciones en el fuente, para reescribir sin re-serializar el documento. */
  startTagStart: number;
  startTagEnd: number;
  attrLocations: Record<string, { start: number; end: number }>;
};

/**
 * Un `action` que no lleva a ningún sitio.
 *
 * `#` y `#loquesea` son anclas a la propia página; `.` y `/` recargan. Los cuatro
 * dejan al visitante donde estaba, y es exactamente lo que escribe un modelo
 * cuando no tiene a dónde apuntar.
 */
function sinDestino(action: string): boolean {
  const a = action.trim();
  return a === "" || a === "." || a === "/" || a.startsWith("#");
}

/**
 * Nombres de campo de un buscador.
 *
 * Se mira el `name`, que es de la máquina, y no el texto visible, que cambia con
 * el idioma. Aun así no es infalible, y por eso NO decide solo: hace falta además
 * que el formulario no tenga ningún campo de correo (ver `esBuscador`).
 */
const NOMBRES_DE_BUSQUEDA = new Set(["q", "s", "search", "query", "buscar", "busqueda", "búsqueda"]);

/**
 * ¿Es el buscador del sitio y no un formulario de contacto?
 *
 * Importa porque adueñarse del buscador de alguien sería romperle una función que
 * sí usaba. Se exige que TODO apunte a lo mismo: un solo campo de texto, con
 * nombre de búsqueda o `type="search"`, y ningún campo de correo. Un formulario
 * de contacto de verdad siempre pide al menos el correo o el mensaje.
 */
function esBuscador(campos: { name: string; type: string; role: string }[]): boolean {
  const utiles = campos.filter((c) => c.type !== "submit" && c.type !== "button" && c.type !== "hidden");
  if (utiles.length !== 1) return false;
  if (utiles.some((c) => c.type === "email")) return false;
  const c = utiles[0];
  return c.type === "search" || NOMBRES_DE_BUSQUEDA.has(c.name.trim().toLowerCase());
}

/** Los campos de un `<form>`: los elementos que le siguen hasta su cierre. */
function camposDe(elementos: WalkedElement[], form: WalkedElement): { name: string; type: string; role: string }[] {
  const fin = form.endTagStart ?? Infinity;
  const dentro = elementos.filter(
    (e) =>
      e.startTagStart > form.startTagStart &&
      e.startTagStart < fin &&
      (e.tagName === "input" || e.tagName === "textarea" || e.tagName === "select")
  );
  return dentro.map((e) => ({
    name: e.attrs.name ?? "",
    type: (e.attrs.type ?? (e.tagName === "input" ? "text" : e.tagName)).toLowerCase(),
    role: e.attrs.role ?? "",
  }));
}

export function detectarFormularios(html: string): FormularioDetectado[] {
  const elementos = walkElementsInOrder(html);
  const forms = elementos.filter((e) => e.tagName === "form");

  return forms.map((form, indice) => {
    const action = form.attrs.action ?? "";
    const campos = camposDe(elementos, form);
    const base = {
      indice,
      action,
      campos: campos.map((c) => c.name).filter((n) => n !== ""),
      startTagStart: form.startTagStart,
      startTagEnd: form.startTagEnd,
      attrLocations: form.attrLocations,
    };

    // El orden importa. Lo primero, lo que descarta tocarlo:
    if (form.attrs.role === "search" || esBuscador(campos)) return { ...base, estado: "buscador" as const };
    if (typeof form.attrs.onsubmit === "string") return { ...base, estado: "propio" as const };
    if (action.trim().toLowerCase().startsWith("mailto:")) return { ...base, estado: "mailto" as const };
    if (!sinDestino(action)) return { ...base, estado: "ajeno" as const };
    return { ...base, estado: "muerto" as const };
  });
}

/** Los que se pueden conectar: sin destino y con algún campo que rellenar. */
export function formulariosMuertos(html: string): FormularioDetectado[] {
  return detectarFormularios(html).filter((f) => f.estado === "muerto" && f.campos.length > 0);
}
