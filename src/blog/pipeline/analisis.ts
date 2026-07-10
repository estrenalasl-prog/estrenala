import { pedirJson, AnalisisSchema } from "@/src/ia/claude";
import type { FnEtapa } from "./tipos";

export const etapaAnalisis: FnEtapa = async (draft, ctx, _deps, instruccion) => {
  const prompt = `Eres un analista SEO experto en contenido estratégico.
Sitio: ${ctx.nombre}${ctx.base ? ` (${ctx.base})` : ""}. Nicho: ${ctx.nicho}. Idioma del blog: ${ctx.idioma}.
Keyword elegida: "${draft.keyword}"

Define, para un artículo de blog sobre esa keyword:
1. keyword_principal: la más relevante y representativa; clara, específica, con potencial de búsqueda y apta para aparecer en el título.
2. keywords_secundarias: de 5 a 10 términos relacionados que ayuden a posicionar (sinónimos, long-tail, conceptos cercanos).
3. intencion_busqueda: qué quiere aprender o lograr quien busca esto, en una frase.
${instruccion ? `\nInstrucción adicional del editor: ${instruccion}` : ""}`;
  const analisis = await pedirJson(prompt, AnalisisSchema, 2000);
  return { analisisJson: JSON.stringify(analisis) };
};
