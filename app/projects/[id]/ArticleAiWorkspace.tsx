"use client";
import { useEffect, useRef, useState } from "react";

export type DraftDetalle = {
  draft: {
    id: string; keyword: string; estado: string; errorMsg: string | null;
    analisisJson: string | null; planMd: string | null; investigacionMd: string | null;
    articuloMd: string | null; linksHechos: number;
    titulo: string | null; slug: string | null; metaDescripcion: string | null;
  };
  etapas: { nombre: string; completada: boolean }[];
  siguiente: string | null;
};

const NOMBRES: Record<string, string> = {
  analisis: "Análisis SEO",
  plan: "Plan del artículo",
  investigacion: "Investigación web",
  redaccion: "Redacción",
  links: "Enlaces internos",
  metadatos: "Metadatos SEO",
};

const AVISO_AUTO =
  "El modo automático ejecuta todas las etapas pendientes seguidas (varias llamadas de IA) y consume crédito de OpenRouter. ¿Continuar?";

// Texto legible del artefacto de cada etapa (los md se muestran tal cual).
function artefactoDe(d: DraftDetalle["draft"], etapa: string): string | null {
  switch (etapa) {
    case "analisis": {
      if (!d.analisisJson) return null;
      try {
        const a = JSON.parse(d.analisisJson) as { keyword_principal?: string; keywords_secundarias?: string[]; intencion_busqueda?: string };
        return `Keyword principal: ${a.keyword_principal ?? ""}\nSecundarias: ${(a.keywords_secundarias ?? []).join(", ")}\nIntención de búsqueda: ${a.intencion_busqueda ?? ""}`;
      } catch { return d.analisisJson; }
    }
    case "plan": return d.planMd;
    case "investigacion": return d.investigacionMd;
    case "redaccion": return d.articuloMd;
    case "links": return d.linksHechos === 1 ? "Hecho: los enlaces internos relevantes (si los había) están integrados en el artículo (ver Redacción)." : null;
    case "metadatos": return d.titulo ? `Título: ${d.titulo}\nSlug: ${d.slug ?? ""}\nMeta descripción: ${d.metaDescripcion ?? ""}` : null;
    default: return null;
  }
}

export function ArticleAiWorkspace({ projectId, draftId, onUsar, onSalir }: {
  projectId: string;
  draftId: string;
  onUsar: (det: DraftDetalle) => void;
  onSalir: () => void;
}) {
  const [detalle, setDetalle] = useState<DraftDetalle | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [auto, setAuto] = useState(false);
  const [etapaEnCurso, setEtapaEnCurso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [instrucciones, setInstrucciones] = useState<Record<string, string>>({});
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const pararRef = useRef(false);

  async function cargar(): Promise<DraftDetalle | null> {
    try {
      const res = await fetch(`/api/projects/${projectId}/blog/drafts/${draftId}`);
      const d = (await res.json().catch(() => ({}))) as DraftDetalle & { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); return null; }
      setDetalle(d);
      return d;
    } catch { setError("Error de conexión"); return null; }
  }
  useEffect(() => { void cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ejecuta una etapa y recarga el detalle; el error de etapa queda visible.
  async function pasoEtapa(etapa: string): Promise<{ ok: boolean; det: DraftDetalle | null }> {
    setError(null); setEtapaEnCurso(etapa);
    let ok = false;
    try {
      const res = await fetch(`/api/projects/${projectId}/blog/drafts/${draftId}/stage`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ etapa, instruccion: instrucciones[etapa]?.trim() || undefined }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      ok = res.ok;
      if (!res.ok) setError(d.error ?? "Error");
    } catch { setError("Error de conexión"); }
    setEtapaEnCurso(null);
    const det = await cargar();
    return { ok, det };
  }

  async function ejecutarUna(etapa: string) {
    setOcupado(true);
    try { await pasoEtapa(etapa); } finally { setOcupado(false); }
  }

  async function autoHastaRevision() {
    if (!confirm(AVISO_AUTO)) return;
    setAuto(true); setOcupado(true); pararRef.current = false;
    try {
      let det = detalle ?? (await cargar());
      while (det?.siguiente && !pararRef.current) {
        const r = await pasoEtapa(det.siguiente);
        if (!r.ok) break;
        det = r.det;
      }
    } finally { setAuto(false); setOcupado(false); pararRef.current = false; }
  }

  if (!detalle) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-500">Cargando borrador…</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button onClick={onSalir} className="rounded border px-2 py-1 text-xs">← Volver</button>
      </div>
    );
  }

  const d = detalle.draft;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Artículo con IA: <span className="font-normal">{d.keyword}</span></p>
        <button onClick={onSalir} className="rounded border px-2 py-1 text-xs">← Volver</button>
      </div>

      {d.estado === "revision" && (
        <div className="rounded border border-green-300 bg-green-50 p-2">
          <p className="text-sm text-green-800">El borrador está listo para revisar.</p>
          <button onClick={() => onUsar(detalle)}
            className="mt-1 rounded bg-green-700 px-3 py-1 text-sm text-white">Usar este borrador</button>
          <p className="mt-1 text-xs text-green-700">Se abrirá el editor de artículos con todo pre-rellenado; ahí subes la imagen de portada y guardas.</p>
        </div>
      )}
      {d.estado === "error" && d.errorMsg && (
        <div className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {d.errorMsg} — puedes reintentar la etapa.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {detalle.siguiente && !auto && (
          <>
            <button onClick={() => void ejecutarUna(detalle.siguiente!)} disabled={ocupado}
              className="rounded bg-indigo-600 px-3 py-1 text-sm text-white disabled:opacity-50">
              ▶ Ejecutar {NOMBRES[detalle.siguiente] ?? detalle.siguiente}
            </button>
            <button onClick={() => void autoHastaRevision()} disabled={ocupado}
              className="rounded border px-2 py-1 text-xs disabled:opacity-50">⏩ Auto hasta revisión</button>
          </>
        )}
        {auto && (
          <button onClick={() => { pararRef.current = true; }} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700">
            ⏹ Detener (para al acabar la etapa en curso)
          </button>
        )}
      </div>

      <ul className="space-y-1">
        {detalle.etapas.map((e) => {
          const artefacto = artefactoDe(d, e.nombre);
          const abierto = !!abiertos[e.nombre];
          const enCurso = etapaEnCurso === e.nombre;
          return (
            <li key={e.nombre} className="rounded border bg-white px-2 py-1">
              <div className="flex items-center justify-between text-sm">
                <span>{enCurso ? "⏳" : e.completada ? "✅" : "○"} {NOMBRES[e.nombre] ?? e.nombre}{enCurso && <span className="text-xs text-gray-400"> generando…</span>}</span>
                <span className="flex gap-2">
                  {e.completada && !auto && (
                    <button onClick={() => void ejecutarUna(e.nombre)} disabled={ocupado}
                      className="rounded border px-2 py-0.5 text-xs disabled:opacity-50">↻ Regenerar</button>
                  )}
                  {artefacto && (
                    <button onClick={() => setAbiertos({ ...abiertos, [e.nombre]: !abierto })}
                      className="text-xs text-gray-500 underline">{abierto ? "ocultar" : "ver"}</button>
                  )}
                </span>
              </div>
              {e.completada && !auto && (
                <input value={instrucciones[e.nombre] ?? ""} placeholder="Instrucción opcional para regenerar (p. ej.: más corto, tono formal…)"
                  onChange={(ev) => setInstrucciones({ ...instrucciones, [e.nombre]: ev.target.value })}
                  className="mt-1 w-full rounded border px-2 py-0.5 text-xs" />
              )}
              {abierto && artefacto && (
                <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs">{artefacto}</pre>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-gray-400">Regenerar una etapa no rehace las posteriores: tú decides cuáles regenerar.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
