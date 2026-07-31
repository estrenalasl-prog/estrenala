import { z } from "zod";
import { claveOpenRouter } from "@/src/config/claves";

// El modelo se sirve vía OpenRouter (API compatible con OpenAI). El slug por
// defecto es el Sonnet más capaz; se puede cambiar con OPENROUTER_MODEL.
export const MODELO = process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4.6";

const BASE_URL = "https://openrouter.ai/api/v1";

// Error de la API de OpenRouter que conserva el código HTTP para que las capas
// superiores puedan distinguir casos (p. ej. 402 = sin saldo) del genérico.
export class OpenRouterError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "OpenRouterError";
  }
}

async function clave(): Promise<string> {
  const k = await claveOpenRouter();
  if (!k) throw new Error("Falta la clave de OpenRouter: añádela en Configuración");
  return k;
}

async function cabeceras(): Promise<Record<string, string>> {
  return {
    Authorization: `Bearer ${await clave()}`,
    "Content-Type": "application/json",
    // Atribución opcional para el panel de OpenRouter.
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Wordclicks",
  };
}

// ---------- Schemas de salidas estructuradas ----------

export const PlantillasSchema = z.object({
  plantilla_post: z.string(),
  plantilla_index: z.string(),
});

export const AnalisisSchema = z.object({
  keyword_principal: z.string(),
  keywords_secundarias: z.array(z.string()),
  intencion_busqueda: z.string(),
});
export type Analisis = z.infer<typeof AnalisisSchema>;

export const MetadatosSchema = z.object({
  titulo: z.string(),
  slug: z.string(),
  meta_descripcion: z.string(),
});
export type Metadatos = z.infer<typeof MetadatosSchema>;

export const RelevanciaSchema = z.object({
  puntuaciones: z.array(z.object({ keyword: z.string(), relevancia: z.number() })),
});

// ---------- Helpers internos ----------

type Mensaje = { role: "system" | "user" | "assistant"; content: string };

/** Mensaje del corte por límite. Byte-exacto: lo fijan los tests. */
export const MSG_CORTADO =
  "El modelo dejó el texto a medias al llegar a su límite. Vuelve a intentarlo; si se repite, elige otro modelo en Configuración.";

// El modelo se quedó sin presupuesto de salida. OpenRouter normaliza a "length";
// algunos proveedores lo mandan además en crudo (Gemini dice "MAX_TOKENS").
function cortadoPorLimite(motivo: unknown, nativo: unknown): boolean {
  const m = String(motivo ?? "").toLowerCase();
  const n = String(nativo ?? "").toLowerCase();
  return m === "length" || n === "max_tokens";
}

async function completar(body: Record<string, unknown>): Promise<string> {
  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: await cabeceras(),
    body: JSON.stringify({ model: MODELO, ...body }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new OpenRouterError(resp.status, `OpenRouter HTTP ${resp.status}: ${txt.slice(0, 500)}`);
  }
  const data = await resp.json();
  if (data?.error?.message) {
    throw new OpenRouterError(Number(data.error.code) || 502, `OpenRouter: ${data.error.message}`);
  }

  // Un texto CORTADO no se devuelve como si estuviera terminado.
  //
  // Sin esto, un artículo que el modelo dejó a mitad de frase se guardaba tan
  // ricamente y el pipeline marcaba todos sus pasos en verde: el usuario veía
  // «hecho» y luego medio artículo publicado. Es el peor fallo posible — mentir
  // diciendo que salió bien —, y encima ya se ha pagado por esos tokens.
  //
  // Se registra el consumo porque es lo único que explica POR QUÉ se cortó: si
  // `reasoning` se ha comido casi todo el presupuesto, el modelo pensó mucho y
  // escribió poco, y la respuesta es cambiar de modelo, no subir el límite.
  const eleccion = data?.choices?.[0];
  if (cortadoPorLimite(eleccion?.finish_reason, eleccion?.native_finish_reason)) {
    const u = data?.usage ?? {};
    console.error("[ia] respuesta cortada por limite", JSON.stringify({
      modelo: data?.model,
      motivo: eleccion?.finish_reason,
      nativo: eleccion?.native_finish_reason,
      pedidos: body.max_tokens,
      salida: u.completion_tokens,
      razonamiento: u.completion_tokens_details?.reasoning_tokens,
      entrada: u.prompt_tokens,
    }));
    throw new OpenRouterError(502, MSG_CORTADO);
  }

  return eleccion?.message?.content ?? "";
}

// El modelo a veces envuelve el JSON en un bloque ```json … ```; lo quitamos.
export function limpiarJson(texto: string): string {
  const m = texto.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (m ? m[1] : texto).trim();
}

// Los modelos (sobre todo los económicos) a veces envuelven TODO el markdown en
// un bloque ```markdown … ```; si se guardara así, marked renderizaría el
// artículo entero como un único <pre> monoespaciado. Solo se quita la envoltura
// EXTERIOR (los bloques de código internos se conservan).
export function limpiarMd(texto: string): string {
  const m = texto.trim().match(/^```[\w-]*[ \t]*\r?\n([\s\S]*?)\r?\n?```$/);
  return m ? m[1].trim() : texto;
}

// ---------- API pública ----------

// `modelo` (opcional en las tres funciones) sobreescribe OPENROUTER_MODEL
// para esa llamada: es la elección por proyecto del 4b2.
export async function pedirTexto(prompt: string, maxTokens = 8000, modelo?: string): Promise<string> {
  const messages: Mensaje[] = [{ role: "user", content: prompt }];
  return completar({ max_tokens: maxTokens, messages, ...(modelo ? { model: modelo } : {}) });
}

// Investigación con búsqueda web. OpenRouter añade resultados de búsqueda
// vía el plugin "web" (Exa) al contexto del modelo.
export async function pedirConBusquedaWeb(
  prompt: string,
  maxTokens = 8000,
  maxBusquedas = 6,
  modelo?: string
): Promise<string> {
  const messages: Mensaje[] = [{ role: "user", content: prompt }];
  return completar({
    max_tokens: maxTokens,
    messages,
    plugins: [{ id: "web", max_results: maxBusquedas }],
    ...(modelo ? { model: modelo } : {}),
  });
}

// JSON validado con zod; un reintento automático si la respuesta no valida.
export async function pedirJson<S extends z.ZodType>(
  prompt: string,
  schema: S,
  maxTokens = 4000,
  modelo?: string
): Promise<z.infer<S>> {
  const { $schema: _omit, ...esquema } = z.toJSONSchema(schema) as Record<string, unknown>;
  const messages: Mensaje[] = [{ role: "user", content: prompt }];
  const llamada = async (): Promise<z.infer<S>> => {
    const texto = await completar({
      max_tokens: maxTokens,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: { name: "salida", strict: false, schema: esquema },
      },
      ...(modelo ? { model: modelo } : {}),
    });
    return schema.parse(JSON.parse(limpiarJson(texto)));
  };
  try {
    return await llamada();
  } catch {
    // Primer intento con JSON inválido o no conforme: reintentamos una vez.
    return await llamada(); // si vuelve a fallar, el error se propaga
  }
}

// Modelo de imagen (portadas 4f). Fijo e independiente del modelo de texto
// elegido por el usuario (los de texto no generan imágenes); override con
// OPENROUTER_MODEL_IMAGEN.
export const MODELO_IMAGEN = process.env.OPENROUTER_MODEL_IMAGEN ?? "google/gemini-2.5-flash-image";

// Genera una imagen; OpenRouter la devuelve como data URL base64 dentro de
// message.images (API de modalidades). Céntimos por imagen.
export async function pedirImagen(prompt: string): Promise<{ bytes: Buffer; contentType: string }> {
  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: await cabeceras(),
    body: JSON.stringify({
      model: MODELO_IMAGEN,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new OpenRouterError(resp.status, `OpenRouter HTTP ${resp.status}: ${txt.slice(0, 500)}`);
  }
  const data = await resp.json();
  if (data?.error?.message) {
    throw new OpenRouterError(Number(data.error.code) || 502, `OpenRouter: ${data.error.message}`);
  }
  const url: unknown = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const m = typeof url === "string" ? url.match(/^data:(image\/[\w.+-]+);base64,(.+)$/s) : null;
  if (!m) throw new OpenRouterError(502, "OpenRouter no devolvió ninguna imagen");
  return { bytes: Buffer.from(m[2], "base64"), contentType: m[1] };
}

// Valida la clave de OpenRouter sin gastar tokens (endpoint /key).
export async function probarConexionModelo(): Promise<string> {
  const resp = await fetch(`${BASE_URL}/key`, { headers: await cabeceras() });
  if (!resp.ok) throw new Error(`OpenRouter HTTP ${resp.status}`);
  const j = await resp.json();
  const d = j?.data ?? {};
  const limite = d.limit == null ? "sin límite de crédito" : `límite ${d.limit}`;
  return `Clave válida (uso ${d.usage ?? 0}, ${limite}). Modelo: ${MODELO}`;
}
