import { pedirTexto, type Analisis } from "@/src/ia/claude";
import type { FnEtapa } from "./tipos";

export const etapaRedaccion: FnEtapa = async (draft, ctx, _deps, instruccion) => {
  const analisis = JSON.parse(draft.analisisJson!) as Analisis;
  const prompt = `Eres el mejor redactor de un equipo que crea artículos de blog de nivel mundial.
Escribe el artículo COMPLETO en ${ctx.idioma} perfecto, en Markdown, para el blog de ${ctx.nombre} (nicho: ${ctx.nicho}).

PLAN (síguelo sección a sección):
${draft.planMd}

INVESTIGACIÓN (integra los datos relevantes citando su fuente):
${draft.investigacionMd}

Requisitos:
- ~2.000 palabras en total.
- Empieza con un H1 que incluya la keyword principal: ${analisis.keyword_principal}.
- La keyword principal debe aparecer también en el primer párrafo y al menos una vez cerca del final.
- Usa los H2/H3 del plan con sus keywords: ${analisis.keywords_secundarias.join(", ")}.
- Párrafos cortos (máximo 4 líneas), viñetas donde aporten, lenguaje claro y sencillo (nivel de lectura fácil), tono cercano, profesional y orientado a la acción.
- Aporta valor concreto en cada párrafo: ejemplos, analogías, consejos accionables. Nada de relleno ni introducciones genéricas.
- Cita la investigación con enlaces Markdown: [texto](URL). Incluye al menos 4 referencias.
- No satures de keywords: intégralas con naturalidad.
- Termina con una sección de Conclusión y una sección FAQ (4-6 preguntas con respuestas breves).
- Devuelve SOLO el Markdown del artículo, sin comentarios.
${instruccion ? `\nInstrucción adicional del editor: ${instruccion}` : ""}`;
  return { articuloMd: await pedirTexto(prompt, 16000) };
};
