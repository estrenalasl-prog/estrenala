"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type EditOp =
  | { page: string; nodeId: number; kind: "text"; value: string }
  | { page: string; nodeId: number; kind: "richText"; value: string }
  | { page: string; nodeId: number; kind: "href"; value: string }
  | { page: string; nodeId: number; kind: "style"; property: "color"; value: string };

type ResumenCambio = { nodeId: number; tag: string; kind: string; antes: string; despues: string };

const AVISO =
  "El asistente lee tu página y usa la IA con tu clave de OpenRouter (consume crédito). Revisarás los cambios antes de aplicarlos. ¿Continuar?";

const NOMBRE_KIND: Record<string, string> = {
  text: "texto",
  richText: "formato",
  href: "enlace",
  style: "color",
};

export function AssistantPanel({
  projectId, pages, entryPath,
}: { projectId: string; pages: string[]; entryPath: string }) {
  const router = useRouter();
  const [page, setPage] = useState(entryPath);
  const [instruccion, setInstruccion] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propuesta, setPropuesta] = useState<{ ops: EditOp[]; resumen: ResumenCambio[] } | null>(null);
  const [aplicado, setAplicado] = useState(false);

  async function proponer() {
    if (!instruccion.trim() || ocupado) return;
    if (!window.confirm(AVISO)) return;
    setOcupado(true); setError(null); setPropuesta(null); setAplicado(false);
    try {
      const res = await fetch(`/api/projects/${projectId}/asistente`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ page, instruccion }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string; ops?: EditOp[]; resumen?: ResumenCambio[] };
      if (!res.ok) { setError(d.error ?? "Error"); return; }
      setPropuesta({ ops: d.ops ?? [], resumen: d.resumen ?? [] });
    } catch {
      setError("Error de conexión");
    } finally { setOcupado(false); }
  }

  async function aplicar() {
    if (!propuesta || propuesta.ops.length === 0 || ocupado) return;
    setOcupado(true); setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/edits`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ops: propuesta.ops }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error al aplicar"); return; }
      setPropuesta(null); setInstruccion(""); setAplicado(true);
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally { setOcupado(false); }
  }

  return (
    <details className="direccion">
      <summary>
        <span className="flecha">▸</span> Asistente de IA
        <span className="estado-dom">Dile en tus palabras qué cambiar y lo hace por ti</span>
      </summary>
      <div className="direccion-cuerpo" style={{ display: "block" }}>
        <p style={{ fontSize: 13, color: "var(--color-texto-2)", marginBottom: 12 }}>
          Escribe qué quieres cambiar de esta página. El asistente <b>propone</b> los cambios y tú decides si
          aplicarlos. Todo queda en el Historial, así que siempre puedes revertir.
        </p>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
          <label style={{ fontSize: 13, color: "var(--color-texto-2)" }}>Página:</label>
          <select className="previo-select" value={page} onChange={(e) => setPage(e.target.value)} disabled={ocupado}>
            {pages.map((p) => <option key={p} value={p}>{p === entryPath ? `${p} (inicio)` : p}</option>)}
          </select>
        </div>

        <textarea
          className="campo"
          style={{ width: "100%", minHeight: 72, resize: "vertical" }}
          value={instruccion}
          maxLength={2000}
          disabled={ocupado}
          onChange={(e) => setInstruccion(e.target.value)}
          placeholder={'Ej.: "Haz el titular más directo y corrige las faltas de ortografía"'}
        />

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
          <button className="btn btn-primario btn-sm" onClick={() => void proponer()} disabled={ocupado || !instruccion.trim()}>
            {ocupado && !propuesta ? "Pensando…" : "Proponer cambios"}
          </button>
          <small style={{ color: "var(--color-texto-3)" }}>Consume crédito de OpenRouter (tu clave).</small>
        </div>

        {propuesta && (
          propuesta.ops.length === 0 ? (
            <p style={{ marginTop: 12, fontSize: 14 }}>El asistente no propuso ningún cambio.</p>
          ) : (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                {propuesta.ops.length} {propuesta.ops.length === 1 ? "cambio propuesto" : "cambios propuestos"}:
              </p>
              <ul style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {propuesta.resumen.map((c, i) => (
                  <li key={i} className="rounded-c border border-borde bg-superficie" style={{ padding: "8px 10px" }}>
                    <div style={{ fontSize: 12, color: "var(--color-texto-3)", marginBottom: 2 }}>
                      &lt;{c.tag}&gt; · {NOMBRE_KIND[c.kind] ?? c.kind}
                    </div>
                    {c.antes && <div style={{ fontSize: 13, color: "var(--color-texto-3)", textDecoration: "line-through" }}>{c.antes}</div>}
                    <div style={{ fontSize: 13, color: "var(--color-texto)" }}>{c.despues}</div>
                  </li>
                ))}
              </ul>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primario btn-sm" onClick={() => void aplicar()} disabled={ocupado}>
                  Aplicar {propuesta.ops.length} {propuesta.ops.length === 1 ? "cambio" : "cambios"}
                </button>
                <button className="btn btn-fantasma btn-sm" onClick={() => setPropuesta(null)} disabled={ocupado}>Descartar</button>
              </div>
            </div>
          )
        )}

        {aplicado && <p style={{ marginTop: 12, fontSize: 14, color: "var(--color-exito, inherit)" }}>✓ Cambios aplicados. Revísalos en la vista previa de abajo.</p>}
        {error && <p className="error-campo" style={{ marginTop: 12 }}>{error}</p>}
      </div>
    </details>
  );
}
