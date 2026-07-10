import { pedirJson, MetadatosSchema, type Analisis } from "@/src/ia/claude";
import { slugify, slugUnico } from "@/src/blog/slug";
import type { FnEtapa } from "./tipos";

export const etapaMetadatos: FnEtapa = async (draft, ctx, deps, instruccion) => {
  const analisis = JSON.parse(draft.analisisJson!) as Analisis;
  const prompt = `Genera los metadatos SEO de este artículo de blog (en ${ctx.idioma}):

${draft.articuloMd}

Devuelve:
- titulo: el título del post; debe incluir la keyword principal "${analisis.keyword_principal}" e informar de inmediato de qué obtendrá el lector. Sin comillas ni formato.
- slug: 4-5 palabras máximo, incluyendo la keyword principal.
- meta_descripcion: 150-160 caracteres, con la keyword principal de forma natural, que describa el valor del artículo e invite al clic (verbo de acción o pregunta). Debe reflejar fielmente el contenido.
${instruccion ? `\nInstrucción adicional del editor: ${instruccion}` : ""}`;
  const meta = await pedirJson(prompt, MetadatosSchema, 1500, ctx.modelo || undefined);

  const existentes = (await deps.blog.listPosts(deps.orgId, deps.projectId)).map((p) => p.slug);
  const slug = slugUnico(slugify(meta.slug), existentes);
  if (!slug) throw new Error("No se pudo generar un slug válido a partir del título; reintenta la etapa de metadatos");
  return { titulo: meta.titulo, slug, metaDescripcion: meta.meta_descripcion };
};
