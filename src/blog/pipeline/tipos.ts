import type { ProjectStore } from "@/src/repositories/types";
import type { BlogStore, DraftRow, DraftPatch } from "@/src/repositories/blog";

export const ETAPAS = ["analisis", "plan", "investigacion", "redaccion", "links", "metadatos"] as const;
export type Etapa = (typeof ETAPAS)[number];

// Contexto del blog para los prompts (equivale al `sitio` del Creador de Blog):
// base = URL pública del proyecto (para los enlaces internos), "" si aún no tiene.
// modelo = slug de OpenRouter elegido en Configuración, "" = default de la plataforma.
// hoy = fecha actual YYYY-MM-DD: sin ella el modelo redacta desde su año de
// entrenamiento («la automatización en 2023» estando en 2026).
export type Contexto = { nombre: string; nicho: string; idioma: string; base: string; modelo: string; hoy: string };

export type DepsPipeline = { store: ProjectStore; blog: BlogStore; orgId: string; projectId: string };

export type FnEtapa = (
  draft: DraftRow,
  ctx: Contexto,
  deps: DepsPipeline,
  instruccion?: string
) => Promise<DraftPatch>;
