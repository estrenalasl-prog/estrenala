import { limpiarMd, pedirConBusquedaWeb, type Analisis } from "@/src/ia/claude";
import type { FnEtapa } from "./tipos";

export const etapaInvestigacion: FnEtapa = async (draft, ctx, _deps, instruccion) => {
  const analisis = JSON.parse(draft.analisisJson!) as Analisis;
  const prompt = `Eres un investigador experto que ayuda a un equipo de contenidos a enriquecer artículos de blog.
Fecha actual: ${ctx.hoy}. Busca en la web información ACTUAL (prioriza los últimos 12-24 meses) y de fuentes
fiables para un artículo sobre "${analisis.keyword_principal}"
(nicho del blog: ${ctx.nicho}; intención de búsqueda: ${analisis.intencion_busqueda}).

Plan del artículo (busca datos que apoyen estas secciones):
${draft.planMd}

Devuelve un informe en Markdown con:
- Datos, estadísticas y ejemplos concretos y recientes (con su año).
- CADA dato con su fuente en formato: (Fuente: URL completa).
- Nada de relleno: solo hallazgos útiles para el artículo.
${instruccion ? `\nInstrucción adicional del editor: ${instruccion}` : ""}`;
  return { investigacionMd: limpiarMd(await pedirConBusquedaWeb(prompt, 8000, 6, ctx.modelo || undefined)) };
};
