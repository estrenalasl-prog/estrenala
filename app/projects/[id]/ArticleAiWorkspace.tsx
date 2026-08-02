"use client";
import { useEffect, useRef, useState } from "react";
import { useDialogo } from "@/app/_components/Dialogo";
import type { TextosBlog } from "@/src/i18n/blog";
import { rellenar } from "@/src/i18n/rellenar";

type Textos = TextosBlog["taller"];

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

// El nombre de cada etapa. `Object.hasOwn` y no `??` por lo de siempre: con la
// búsqueda directa, una etapa llamada "constructor" devolvería la función Object.
function nombreEtapa(etapa: string, t: Textos): string {
  const nombres: Record<string, string> = {
    analisis: t.etapaAnalisis,
    plan: t.etapaPlan,
    investigacion: t.etapaInvestigacion,
    redaccion: t.etapaRedaccion,
    links: t.etapaLinks,
    metadatos: t.etapaMetadatos,
  };
  return Object.hasOwn(nombres, etapa) ? nombres[etapa] : etapa;
}

// Texto legible del artefacto de cada etapa (los md se muestran tal cual).
function artefactoDe(d: DraftDetalle["draft"], etapa: string, t: Textos): string | null {
  switch (etapa) {
    case "analisis": {
      if (!d.analisisJson) return null;
      try {
        const a = JSON.parse(d.analisisJson) as { keyword_principal?: string; keywords_secundarias?: string[]; intencion_busqueda?: string };
        return rellenar(t.analisisResumen, {
          principal: a.keyword_principal ?? "",
          secundarias: (a.keywords_secundarias ?? []).join(", "),
          intencion: a.intencion_busqueda ?? "",
        });
      } catch { return d.analisisJson; }
    }
    case "plan": return d.planMd;
    case "investigacion": return d.investigacionMd;
    case "redaccion": return d.articuloMd;
    case "links": return d.linksHechos === 1 ? t.linksHecho : null;
    case "metadatos":
      return d.titulo
        ? rellenar(t.metadatosResumen, { titulo: d.titulo, slug: d.slug ?? "", meta: d.metaDescripcion ?? "" })
        : null;
    default: return null;
  }
}

export function ArticleAiWorkspace({ projectId, draftId, modelo, onUsar, onSalir, t, errores }: {
  projectId: string;
  draftId: string;
  modelo: string; // nombre legible del modelo con el que se generará (info pre-gasto)
  onUsar: (det: DraftDetalle) => void;
  onSalir: () => void;
  t: Textos;
  errores: TextosBlog["errores"];
}) {
  const { confirmar } = useDialogo();
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
      if (!res.ok) { setError(d.error ?? errores.generico); return null; }
      setDetalle(d);
      return d;
    } catch { setError(errores.conexion); return null; }
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
      if (!res.ok) setError(d.error ?? errores.generico);
    } catch { setError(errores.conexion); }
    setEtapaEnCurso(null);
    const det = await cargar();
    return { ok, det };
  }

  async function ejecutarUna(etapa: string) {
    setOcupado(true);
    try { await pasoEtapa(etapa); } finally { setOcupado(false); }
  }

  async function autoHastaRevision() {
    if (!(await confirmar({
      titulo: t.autoTitulo,
      cuerpo: t.autoCuerpo,
      tono: "coste",
      aceptar: t.autoAceptar,
    }))) return;
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
        <p className="text-sm text-texto-2">{t.cargando}</p>
        {error && <p className="error-campo">{error}</p>}
        <button onClick={onSalir} className="btn btn-sec btn-sm">{t.volver}</button>
      </div>
    );
  }

  const d = detalle.draft;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{t.encabezado} <span className="font-normal">{d.keyword}</span></p>
        <button onClick={onSalir} className="btn btn-sec btn-sm">{t.volver}</button>
      </div>
      <p className="text-xs text-texto-2">
        {rellenar(t.modelo, { modelo })} <span className="text-texto-3">{t.modeloDonde}</span>
      </p>

      {d.estado === "revision" && (
        <div className="rounded-c border p-3" style={{ background: "var(--color-exito-suave)", borderColor: "#B7E3C1" }}>
          <p className="text-sm text-exito-texto">{t.listo}</p>
          <button onClick={() => onUsar(detalle)}
            className="btn btn-primario btn-sm mt-2">{t.usar}</button>
          <p className="mt-2 text-xs text-exito-texto">{t.usarTexto}</p>
        </div>
      )}
      {d.estado === "error" && d.errorMsg && (
        <div className="rounded-c border border-peligro-borde p-3 text-sm text-peligro-texto" style={{ background: "var(--color-peligro-suave)" }}>
          {rellenar(t.puedesReintentar, { error: d.errorMsg })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {detalle.siguiente && !auto && (
          <>
            <button onClick={() => void ejecutarUna(detalle.siguiente!)} disabled={ocupado}
              className="btn btn-primario btn-sm">
              {rellenar(t.ejecutar, { etapa: nombreEtapa(detalle.siguiente, t) })}
            </button>
            <button onClick={() => void autoHastaRevision()} disabled={ocupado}
              className="btn btn-sec btn-sm">{t.auto}</button>
          </>
        )}
        {auto && (
          <button onClick={() => { pararRef.current = true; }} className="btn btn-peligro-sutil btn-sm">
            {t.detener}
          </button>
        )}
      </div>

      <ul className="space-y-1">
        {detalle.etapas.map((e) => {
          const artefacto = artefactoDe(d, e.nombre, t);
          const abierto = !!abiertos[e.nombre];
          const enCurso = etapaEnCurso === e.nombre;
          return (
            <li key={e.nombre} className="tarjeta px-3 py-2">
              <div className="flex items-center justify-between text-sm">
                <span>{enCurso ? "⏳" : e.completada ? "✅" : "○"} {nombreEtapa(e.nombre, t)}{enCurso && <span className="text-xs text-texto-3">{t.generando}</span>}</span>
                <span className="flex gap-2">
                  {e.completada && !auto && (
                    <button onClick={() => void ejecutarUna(e.nombre)} disabled={ocupado}
                      className="btn btn-sec btn-sm">{t.regenerar}</button>
                  )}
                  {artefacto && (
                    <button onClick={() => setAbiertos({ ...abiertos, [e.nombre]: !abierto })}
                      className="btn btn-fantasma btn-sm">{abierto ? t.ocultar : t.ver}</button>
                  )}
                </span>
              </div>
              {e.completada && !auto && (
                <input value={instrucciones[e.nombre] ?? ""} placeholder={t.instruccion}
                  onChange={(ev) => setInstrucciones({ ...instrucciones, [e.nombre]: ev.target.value })}
                  className="campo mt-1" />
              )}
              {abierto && artefacto && (
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-c bg-superficie-2 p-2 text-xs">{artefacto}</pre>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-texto-3">{t.nota}</p>
      {error && <p className="error-campo">{error}</p>}
    </div>
  );
}
