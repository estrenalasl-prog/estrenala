import { claveSerpApi } from "@/src/config/claves";

export type CandidatoKeyword = {
  keyword: string;
  fuente: "trends" | "related";
  crecimientoPct: number | null;
  volumenAprox: number | null;
};

const BASE = "https://serpapi.com/search.json";

type JsonSerpApi = Record<string, unknown> & {
  error?: string;
  trending_searches?: Array<Record<string, unknown>>;
  related_queries?: { rising?: Array<Record<string, unknown>>; top?: Array<Record<string, unknown>> };
};

async function llamadaSerpApi(params: Record<string, string>): Promise<JsonSerpApi> {
  const url = new URL(BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("api_key", await claveSerpApi());
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`SerpAPI ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as JsonSerpApi;
  if (json.error) throw new Error(`SerpAPI: ${json.error}`);
  return json;
}

// Valida la clave de SerpAPI sin gastar créditos (endpoint account.json).
export async function probarConexionSerpApi(): Promise<string> {
  const key = await claveSerpApi();
  if (!key) throw new Error("Falta la clave de SerpAPI: añádela en Configuración");
  const res = await fetch(`https://serpapi.com/account.json?api_key=${encodeURIComponent(key)}`);
  if (!res.ok) throw new Error(`SerpAPI ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as Record<string, unknown>;
  if (j.error) throw new Error(`SerpAPI: ${j.error}`);
  const restantes = j.total_searches_left ?? j.plan_searches_left;
  return `Clave válida (quedan ${restantes ?? "?"} búsquedas este mes)`;
}

const num = (v: unknown): number | null => (typeof v === "number" ? v : null);

export function parseTrendingNow(json: JsonSerpApi): CandidatoKeyword[] {
  return (json.trending_searches ?? [])
    .map((t) => ({
      keyword: String(t.query ?? "").trim(),
      fuente: "trends" as const,
      crecimientoPct: num(t.increase_percentage),
      volumenAprox: num(t.search_volume),
    }))
    .filter((c) => c.keyword);
}

export function parseRelatedQueries(json: JsonSerpApi): CandidatoKeyword[] {
  return (json.related_queries?.rising ?? [])
    .map((r) => ({
      keyword: String(r.query ?? "").trim(),
      fuente: "related" as const,
      crecimientoPct: num(r.extracted_value),
      volumenAprox: null,
    }))
    .filter((c) => c.keyword);
}

// Búsquedas en alza hoy en España (1 crédito SerpAPI)
export async function buscarTendencias(geo = "ES"): Promise<CandidatoKeyword[]> {
  return parseTrendingNow(await llamadaSerpApi({ engine: "google_trends_trending_now", geo }));
}

// Consultas relacionadas en alza para una keyword semilla (1 crédito SerpAPI)
export async function buscarRelacionadas(semilla: string, geo = "ES"): Promise<CandidatoKeyword[]> {
  return parseRelatedQueries(
    await llamadaSerpApi({ engine: "google_trends", data_type: "RELATED_QUERIES", q: semilla, geo })
  );
}
