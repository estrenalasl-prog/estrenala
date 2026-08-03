import { limpiarMd, pedirTexto, type Analisis } from "@/src/ia/claude";
import type { FnEtapa } from "./tipos";

/**
 * Por debajo de esto no es un artículo, es un trozo.
 *
 * Se le piden ~2.000 palabras (unos 12.000 caracteres) más conclusión y FAQ, así
 * que ni el más corto de verdad se acerca a este suelo: está puesto a ras del
 * agua para que nunca rechace uno bueno.
 */
export const MIN_ARTICULO = 1200;

/** Byte-exacto: lo fijan los tests. */
export const MSG_ARTICULO_CORTO =
  "El modelo devolvió el artículo a medias. Vuelve a lanzar la redacción; si se repite, elige otro modelo en Configuración.";

export const etapaRedaccion: FnEtapa = async (draft, ctx, _deps, instruccion) => {
  const analisis = JSON.parse(draft.analisisJson!) as Analisis;
  const prompt = `Eres el mejor redactor de un equipo que crea artículos de blog de nivel mundial.
Fecha actual: ${ctx.hoy}. Escribe desde el presente: no hables de años pasados como si fueran «ahora»
ni digas «en ${new Date().getFullYear() - 3}» refiriéndote a la actualidad; usa los datos más recientes de la investigación.
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
- Termina con una sección de Conclusión y una sección de preguntas frecuentes.
- En esa sección, cada pregunta va como un encabezado propio del MISMO nivel (H3)
  y termina en «?», con su respuesta en el párrafo de debajo. De 4 a 6 preguntas.
  Ejemplo:  ### ¿Cuánto cuesta empezar?  y debajo el párrafo con la respuesta.
  Esto es lo que permite marcarlas para que ChatGPT y Perplexity las encuentren
  troceadas; si las pones en negrita o en una lista, se pierden.
- Devuelve SOLO el Markdown del artículo, sin comentarios.
${instruccion ? `\nInstrucción adicional del editor: ${instruccion}` : ""}`;
  const articuloMd = limpiarMd(await pedirTexto(prompt, 16000, ctx.modelo || undefined));

  // Se comprueba el RESULTADO, no lo que diga el proveedor.
  //
  // El 2026-07-31 Gemini vía Google Vertex devolvió 311 caracteres cortados a
  // mitad de frase, con cero tokens facturados y SIN motivo de parada. Como
  // «redacción hecha» significaba solo «hay algo en el campo» (ver
  // etapaCompletada), el pipeline marcó el paso en verde y siguió: los
  // metadatos se calcularon sobre ese trozo y el artículo quedó listo para
  // publicar. Un fallo del proveedor no puede acabar en un tick verde.
  //
  // La comprobación de `finish_reason` en claude.ts no basta: ahí no venía
  // ninguno. Por eso se mira lo único que no se puede falsear, el texto.
  if (articuloMd.trim().length < MIN_ARTICULO) {
    console.error("[blog] redaccion demasiado corta", JSON.stringify({
      caracteres: articuloMd.trim().length, minimo: MIN_ARTICULO, modelo: ctx.modelo || "por defecto",
    }));
    throw new Error(MSG_ARTICULO_CORTO);
  }
  return { articuloMd };
};
