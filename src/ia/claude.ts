import { z } from "zod";

// El modelo se sirve vía OpenRouter (API compatible con OpenAI). El slug por
// defecto es el Sonnet más capaz; se puede cambiar con OPENROUTER_MODEL.
export const MODELO = process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4.6";

const BASE_URL = "https://openrouter.ai/api/v1";

function clave(): string {
  const k = process.env.OPENROUTER_API_KEY;
  if (!k) throw new Error("Falta OPENROUTER_API_KEY en .env.local");
  return k;
}

function cabeceras(): Record<string, string> {
  return {
    Authorization: `Bearer ${clave()}`,
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

// ---------- Helpers internos ----------

type Mensaje = { role: "system" | "user" | "assistant"; content: string };

async function completar(body: Record<string, unknown>): Promise<string> {
  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: cabeceras(),
    body: JSON.stringify({ model: MODELO, ...body }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`OpenRouter HTTP ${resp.status}: ${txt.slice(0, 500)}`);
  }
  const data = await resp.json();
  if (data?.error?.message) throw new Error(`OpenRouter: ${data.error.message}`);
  return data?.choices?.[0]?.message?.content ?? "";
}

// El modelo a veces envuelve el JSON en un bloque ```json … ```; lo quitamos.
export function limpiarJson(texto: string): string {
  const m = texto.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (m ? m[1] : texto).trim();
}

// ---------- API pública ----------

// JSON validado con zod; un reintento automático si la respuesta no valida.
export async function pedirJson<S extends z.ZodType>(
  prompt: string,
  schema: S,
  maxTokens = 4000
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

// Valida la clave de OpenRouter sin gastar tokens (endpoint /key).
export async function probarConexionModelo(): Promise<string> {
  const resp = await fetch(`${BASE_URL}/key`, { headers: cabeceras() });
  if (!resp.ok) throw new Error(`OpenRouter HTTP ${resp.status}`);
  const j = await resp.json();
  const d = j?.data ?? {};
  const limite = d.limit == null ? "sin límite de crédito" : `límite ${d.limit}`;
  return `Clave válida (uso ${d.usage ?? 0}, ${limite}). Modelo: ${MODELO}`;
}
