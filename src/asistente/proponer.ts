import { z } from "zod";
import { EditorError } from "@/src/editor/errors";
import { isValidOp } from "@/src/editor/validate-op";
import { walkElementsInOrder } from "@/src/editor/walk";
import { listHtmlPages } from "@/src/storage/local-fs";
import { modeloOrganizacion } from "@/src/config/claves";
import { pedirJson } from "@/src/ia/claude";
import { entrarOrg } from "@/src/auth/org-context";
import type { EditOp } from "@/src/editor/apply";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";
import { construirInventario, serializarInventario, type NodoEditable } from "./inventario";

export const MAX_INSTRUCCION = 2000;
export const MAX_OPS = 100;
export const MAX_TOKENS = 6000;

// Esquema de la respuesta del modelo. Deliberadamente TOLERANTE (kind como string,
// nodeId como número o texto): un solo cambio mal formado no debe tumbar todo el
// lote; se filtra después en interpretarPropuesta con la MISMA validación que el
// editor manual.
export const PropuestaSchema = z.object({
  cambios: z
    .array(
      z.object({
        nodeId: z.union([z.number(), z.string()]),
        kind: z.string(),
        value: z.string(),
      })
    )
    .default([]),
});
export type Propuesta = z.infer<typeof PropuestaSchema>;

export type ResumenCambio = { nodeId: number; tag: string; kind: string; antes: string; despues: string };

function coaccionarId(v: unknown): number | null {
  if (typeof v === "number" && Number.isInteger(v)) return v;
  if (typeof v === "string") {
    const m = v.match(/\d+/);
    if (m) return parseInt(m[0], 10);
  }
  return null;
}

// Traduce la propuesta del modelo (no confiable) a EditOps reales. Solo acepta
// nodeIds que existen en el inventario editable de ESTA página y ops que pasan
// isValidOp (misma frontera de seguridad que /edits). Acota a MAX_OPS.
export function interpretarPropuesta(page: string, html: string, salida: Propuesta): EditOp[] {
  const permitidos = new Set(construirInventario(html).map((n) => n.id));
  const ops: EditOp[] = [];
  for (const c of salida?.cambios ?? []) {
    if (ops.length >= MAX_OPS) break;
    const id = coaccionarId(c.nodeId);
    if (id === null || !permitidos.has(id)) continue;
    if (typeof c.value !== "string") continue;
    let op: EditOp | null = null;
    switch (c.kind) {
      case "text": op = { page, nodeId: id, kind: "text", value: c.value }; break;
      case "richText": op = { page, nodeId: id, kind: "richText", value: c.value }; break;
      case "href": op = { page, nodeId: id, kind: "href", value: c.value }; break;
      case "style": op = { page, nodeId: id, kind: "style", property: "color", value: c.value }; break;
      default: op = null;
    }
    if (op && isValidOp(op)) ops.push(op);
  }
  return ops;
}

// Diff legible para enseñar al usuario ANTES de aplicar (antes → después).
export function resumenCambios(html: string, ops: EditOp[]): ResumenCambio[] {
  const byId = new Map(walkElementsInOrder(html).map((e) => [e.id, e]));
  return ops.map((op) => {
    const el = byId.get(op.nodeId);
    const antes =
      op.kind === "href" ? el?.attrs.href ?? "" :
      op.kind === "style" ? el?.attrs.style ?? "" :
      (el?.text ?? "").replace(/\s+/g, " ").trim();
    return { nodeId: op.nodeId, tag: el?.tagName ?? "?", kind: op.kind, antes, despues: op.value };
  });
}

export function promptAsistente(ctx: { instruccion: string; nombre: string; inventario: NodoEditable[] }): string {
  return [
    "Eres un asistente que edita el CONTENIDO de una web ya publicada. Recibes una",
    "lista de nodos editables (cada uno con un id, su etiqueta HTML y su texto actual)",
    "y una instrucción del usuario. Devuelve SOLO los cambios necesarios en JSON.",
    "",
    "Reglas estrictas:",
    "- Edita únicamente nodos de la lista, referenciados por su id EXACTO. No inventes ids.",
    "- No cambies nada que el usuario no haya pedido; omite los nodos que no cambian.",
    "- Conserva el idioma del texto original salvo que el usuario pida traducir.",
    "- \"value\" es el contenido/valor NUEVO y completo del nodo.",
    // Sin estas dos reglas el modelo hace lo natural para él y desastroso para la
    // web: mete la frase entera en el primer nodo y deja los demás vacíos. Una
    // frase suele venir partida porque cada trozo lleva su estilo (un degradado,
    // otro color), así que juntarla borra ese diseño sin avisar.
    "- NUNCA dejes un nodo vacío (\"\") salvo que el usuario pida explícitamente borrar ese texto.",
    "- Una frase puede venir REPARTIDA en varios nodos seguidos porque cada trozo tiene su",
    "  estilo propio. En ese caso reescribe CADA nodo con la parte que le toca, respetando el",
    "  reparto: no juntes toda la frase en uno solo ni vacíes los demás. Si la frase nueva tiene",
    "  menos trozos que la vieja, reparte el texto entre los nodos existentes de forma natural.",
    "- kind admitidos:",
    "    text     → texto plano (lo más habitual).",
    "    richText → texto con formato en línea: <b> <i> <u> <a href=\"...\">. Nada más.",
    "    href     → nueva URL de un enlace (http, https, mailto o tel).",
    "    style    → color del texto; value = \"#rrggbb\" o un nombre de color CSS.",
    "",
    `Web: ${ctx.nombre}`,
    `Instrucción del usuario: ${ctx.instruccion}`,
    "",
    "Nodos editables:",
    serializarInventario(ctx.inventario),
    "",
    'Responde SOLO con: {"cambios":[{"nodeId":<id>,"kind":"text|richText|href|style","value":"..."}]}',
  ].join("\n");
}

export type PedirFn = (prompt: string) => Promise<Propuesta>;

async function pedirPorDefecto(prompt: string): Promise<Propuesta> {
  const modelo = await modeloOrganizacion();
  return pedirJson(prompt, PropuestaSchema, MAX_TOKENS, modelo || undefined);
}

// Lee la página del snapshot actual, pide al modelo una propuesta y la interpreta
// a ops validadas. NO guarda nada (el usuario aplica luego vía /edits). `pedir` es
// inyectable para tests (sin IA real). Entra en org-context para que la clave BYOK
// sea la de esta organización.
export async function proponerEdiciones(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string; page: string; instruccion: string },
  pedir: PedirFn = pedirPorDefecto
): Promise<{ ops: EditOp[]; resumen: ResumenCambio[]; page: string }> {
  entrarOrg(input.orgId);
  const instruccion = (input.instruccion ?? "").trim();
  if (!instruccion) throw new EditorError("Escribe qué quieres cambiar", 400);
  if (instruccion.length > MAX_INSTRUCCION) throw new EditorError("La instrucción es demasiado larga", 400);

  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const current = await deps.store.getCurrentSnapshot(input.orgId, input.projectId);
  if (!current) throw new EditorError("El proyecto no tiene snapshot actual", 400);

  const pages = await listHtmlPages(deps.storage, current.storagePrefix);
  const page = input.page && pages.includes(input.page) ? input.page : project.entryPath;
  const file = await deps.storage.get(current.storagePrefix + page);
  if (!file) throw new EditorError("Página no encontrada", 404);
  const html = file.body.toString("utf-8");

  const inventario = construirInventario(html);
  if (inventario.length === 0) return { ops: [], resumen: [], page };

  const salida = await pedir(promptAsistente({ instruccion, nombre: project.nombre, inventario }));
  const ops = interpretarPropuesta(page, html, salida);
  return { ops, resumen: resumenCambios(html, ops), page };
}
