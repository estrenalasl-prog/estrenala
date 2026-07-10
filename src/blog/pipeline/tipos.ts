import type { ProjectStore } from "@/src/repositories/types";
import type { BlogStore, DraftRow, DraftPatch } from "@/src/repositories/blog";

export const ETAPAS = ["analisis", "plan", "investigacion", "redaccion", "links", "metadatos"] as const;
export type Etapa = (typeof ETAPAS)[number];

// Contexto del blog para los prompts (equivale al `sitio` del Creador de Blog):
// base = URL pública del proyecto (para los enlaces internos), "" si aún no tiene.
// modelo = slug de OpenRouter elegido por proyecto, "" = default de la plataforma.
export type Contexto = { nombre: string; nicho: string; idioma: string; base: string; modelo: string };

export type DepsPipeline = { store: ProjectStore; blog: BlogStore; orgId: string; projectId: string };

export type FnEtapa = (
  draft: DraftRow,
  ctx: Contexto,
  deps: DepsPipeline,
  instruccion?: string
) => Promise<DraftPatch>;
