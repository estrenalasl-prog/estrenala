import { EditorError } from "@/src/editor/errors";
import { pedirJson, RelevanciaSchema, OpenRouterError } from "@/src/ia/claude";
import { basePublica } from "@/src/blog/render";
import { sitesBaseDomain } from "@/src/blog/apply";
import { claveSerpApi } from "@/src/config/claves";
import { buscarTendencias, buscarRelacionadas, type CandidatoKeyword } from "./serpapi";
import type { ProjectStore } from "@/src/repositories/types";
import type { BlogStore } from "@/src/repositories/blog";

export type DepsRadar = { store: ProjectStore; blog: BlogStore; orgId: string; projectId: string };

const RELEVANCIA_MINIMA = 20;
const MAX_SEMILLAS = 3; // 1 + 3 = máx. 4 créditos SerpAPI por actualización
const GEO = "ES";

export function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

// Radar de temas: candidatos de SerpAPI (tendencias + relacionadas de las
// semillas) puntuados con IA frente al nicho. Caché diaria por proyecto para
// no gastar créditos dos veces el mismo día (salvo `forzar`).
export async function actualizarRadar(
  deps: DepsRadar,
  forzar = false
): Promise<{ actualizado: false } | { actualizado: true; candidatos: number; tendencias: number; relacionadas: number }> {
  const project = await deps.store.getProject(deps.orgId, deps.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const settings = await deps.blog.getBlogSettings(deps.orgId, deps.projectId);
  if (!settings?.nicho.trim()) throw new EditorError("Configura primero de qué va tu blog (campo Nicho)", 400);
  if (!(await claveSerpApi())) throw new EditorError("Falta la clave de SerpAPI: añádela en Configuración", 500);

  const fechaHoy = hoy();
  if (!forzar && (await deps.blog.hayTrendsCache(deps.orgId, deps.projectId, fechaHoy))) {
    return { actualizado: false };
  }

  // 1) Candidatos. Una consulta que falle (p. ej. una semilla long-tail sin
  //    datos en Google Trends) NO tumba el radar: se ignora y se sigue.
  const candidatos: CandidatoKeyword[] = [];
  const errores: string[] = [];
  const intentar = async (fn: () => Promise<CandidatoKeyword[]>) => {
    try {
      candidatos.push(...(await fn()));
    } catch (e) {
      errores.push(e instanceof Error ? e.message : String(e));
    }
  };
  await intentar(() => buscarTendencias(GEO));
  const semillas = settings.keywordsSemilla.split(",").map((s) => s.trim()).filter(Boolean).slice(0, MAX_SEMILLAS);
  for (const s of semillas) await intentar(() => buscarRelacionadas(s, GEO));
  const unicos = [...new Map(candidatos.map((c) => [c.keyword.toLowerCase(), c])).values()];
  if (unicos.length === 0) {
    throw new EditorError(
      errores.length
        ? `SerpAPI no devolvió ninguna keyword (última causa: ${errores[errores.length - 1]})`
        : "SerpAPI no devolvió ninguna keyword.",
      502
    );
  }

  // 2) Puntuación de relevancia frente al nicho (con el modelo del proyecto, 4b2)
  const base = basePublica(project, sitesBaseDomain()) ?? "";
  const prompt = `Eres un estratega SEO muy exigente. Sitio: "${project.nombre}"${base ? ` (${base})` : ""}. Nicho: ${settings.nicho}.
Puntúa de 0 a 100 la relevancia de cada keyword como tema para un artículo del blog de este sitio.
Sé ESTRICTO con la escala: 100 = encaja perfecto con el nicho y su audiencia; 40 = solo tangencial
(habría que forzar el enfoque); 0-10 = nada que ver. Las tendencias genéricas (deportes, famosos,
televisión, sucesos, loterías, clima) puntúan 0-10 SALVO que el nicho trate exactamente de eso.
En la duda, puntúa BAJO: solo deben superar 20 los temas sobre los que este blog escribiría de verdad.
Devuelve una puntuación para CADA keyword. En cada puntuación, usa EXACTAMENTE el mismo texto de la
keyword tal y como aparece en la lista (cópialo literal).
Keywords:
${unicos.map((c) => `- ${c.keyword}`).join("\n")}`;
  // La puntuación usa SIEMPRE el modelo por defecto de la plataforma, NO el
  // elegido para redactar: los modelos económicos puntúan con manga ancha
  // (visto con DeepSeek: toda tendencia genérica recibía justo el corte de 20)
  // y es una sola llamada al día — céntimos con el modelo bueno.
  // Puede fallar por OpenRouter (saldo, modelo caído) DESPUÉS de haber gastado
  // SerpAPI: mensaje accionable y caché sin marcar (reintentable).
  let puntuaciones: { keyword: string; relevancia: number }[];
  try {
    ({ puntuaciones } = await pedirJson(prompt, RelevanciaSchema, 8000));
  } catch (e) {
    if (e instanceof OpenRouterError && e.status === 402) {
      throw new EditorError("Tu cuenta de OpenRouter no tiene saldo. Añade crédito en openrouter.ai/settings/credits e inténtalo de nuevo.", 402);
    }
    throw new EditorError("No se pudo puntuar la relevancia de los temas, vuelve a intentarlo", 502);
  }
  const mapa = new Map(puntuaciones.map((p) => [p.keyword.toLowerCase(), Math.round(p.relevancia)]));

  // 3) Guardar las relevantes (los duplicados los ignora el UNIQUE) y marcar la caché del día.
  const nuevas = unicos
    .map((c) => ({
      keyword: c.keyword,
      fuente: c.fuente,
      crecimientoPct: c.crecimientoPct,
      volumenAprox: c.volumenAprox,
      relevancia: mapa.get(c.keyword.toLowerCase()) ?? 0,
    }))
    .filter((k) => k.relevancia > RELEVANCIA_MINIMA); // "superar 20", como dice el prompt: el 20 justo (borderline) se queda fuera
  await deps.blog.insertKeywords(deps.orgId, deps.projectId, nuevas);
  await deps.blog.marcarTrendsCache(deps.orgId, deps.projectId, fechaHoy, JSON.stringify({ candidatos: unicos.length }));

  // Desglose por fuente: si las semillas no aportan nada, el usuario debe verlo.
  const tendencias = unicos.filter((c) => c.fuente === "trends").length;
  return { actualizado: true, candidatos: unicos.length, tendencias, relacionadas: unicos.length - tendencias };
}
