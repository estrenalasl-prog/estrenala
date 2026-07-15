import { pedirTexto, type Analisis } from "@/src/ia/claude";
import type { FnEtapa } from "./tipos";

export const etapaPlan: FnEtapa = async (draft, ctx, deps, instruccion) => {
  const analisis = JSON.parse(draft.analisisJson!) as Analisis;
  const previos = await deps.blog.listPosts(deps.orgId, deps.projectId);
  const prompt = `Eres parte de un equipo que crea artículos de blog de nivel mundial. Tu rol: estratega de contenidos.
Fecha actual: ${ctx.hoy} (plantea el artículo desde el presente, no desde años pasados).
Prepara el PLAN de un artículo en ${ctx.idioma} para ${ctx.nombre} (nicho: ${ctx.nicho}).

Keyword principal: ${analisis.keyword_principal}
Keywords secundarias: ${analisis.keywords_secundarias.join(", ")}
Intención de búsqueda: ${analisis.intencion_busqueda}
${previos.length ? `Títulos ya publicados en este blog (no repitas tema ni enfoque): ${previos.map((p) => p.titulo).join(" | ")}` : ""}

El plan debe:
- Estar en formato de viñetas, con los H2/H3 propuestos y qué keyword va en cada sección.
- Girar en torno a la keyword principal e integrar todas las secundarias de forma natural.
- Satisfacer por completo la intención de búsqueda del usuario.
- Señalar en qué secciones convendrá citar datos o fuentes externas.
- Terminar con una conclusión y una sección de preguntas frecuentes (FAQ).
NO escribas el artículo: solo el plan.
${instruccion ? `\nInstrucción adicional del editor: ${instruccion}` : ""}`;
  return { planMd: await pedirTexto(prompt, 3000, ctx.modelo || undefined) };
};
