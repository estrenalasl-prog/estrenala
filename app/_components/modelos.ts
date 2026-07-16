// Modelos curados del selector de Configuración; "" = default de la plataforma.
// Cualquier otro slug de openrouter.ai/models entra por la opción «Otro…».
export const MODELOS: { valor: string; nombre: string }[] = [
  { valor: "", nombre: "Por defecto de la plataforma (Claude Sonnet 4.6)" },
  { valor: "anthropic/claude-sonnet-4.6", nombre: "Claude Sonnet 4.6 — calidad máxima" },
  { valor: "anthropic/claude-haiku-4.5", nombre: "Claude Haiku 4.5 — rápido y económico" },
  { valor: "openai/gpt-5-mini", nombre: "GPT-5 Mini — económico" },
  { valor: "google/gemini-2.5-flash", nombre: "Gemini 2.5 Flash — muy económico" },
  { valor: "deepseek/deepseek-chat", nombre: "DeepSeek — muy económico" },
];

export function nombreModelo(modelo: string): string {
  const curado = MODELOS.find((m) => m.valor === modelo);
  if (curado) return curado.nombre;
  return modelo; // slug libre
}
