import { pedirTexto } from "@/src/ia/claude";
import type { FnEtapa } from "./tipos";

export const etapaLinks: FnEtapa = async (draft, ctx, deps, instruccion) => {
  const publicados = await deps.blog.listPosts(deps.orgId, deps.projectId);
  if (publicados.length === 0) return { linksHechos: 1 }; // primer post del sitio: nada que enlazar

  const lista = publicados.map((p) => `- "${p.titulo}" → ${ctx.base}/blog/${p.slug}.html`).join("\n");
  const prompt = `Eres el responsable de enlazado interno de un blog. Tienes un artículo en Markdown y la lista de artículos ya publicados.
Inserta entre 3 y 5 enlaces internos en formato Markdown [texto ancla](URL) hacia los artículos publicados,
SOLO donde sean realmente relevantes y aporten valor al lector (calidad > cantidad; nada de keyword stuffing).
No modifiques nada más del artículo: ni estructura, ni encabezados, ni contenido.
Si ningún artículo publicado es relevante, devuelve el artículo sin cambios.
Devuelve el artículo COMPLETO en Markdown, sin comentarios.

ARTÍCULO:
${draft.articuloMd}

ARTÍCULOS PUBLICADOS:
${lista}
${instruccion ? `\nInstrucción adicional del editor: ${instruccion}` : ""}`;
  return { articuloMd: await pedirTexto(prompt, 16000), linksHechos: 1 };
};
