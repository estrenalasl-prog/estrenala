"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type EditOp =
  | { page: string; nodeId: number; kind: "text"; value: string }
  | { page: string; nodeId: number; kind: "href"; value: string }
  | { page: string; nodeId: number; kind: "src"; value: string; assetId: string }
  | { page: string; nodeId: number; kind: "style"; property: "color"; value: string }
  | { page: string; nodeId: number; kind: "textNode"; index: number; value: string };
type SnapshotInfo = { id: string; tipo: string; parentId: string | null; createdAt: string; esActual: boolean };

function opKey(op: EditOp): string {
  const extra = op.kind === "style" ? op.property : op.kind === "textNode" ? String(op.index) : "";
  return `${op.page}#${op.nodeId}#${op.kind}#${extra}`;
}

const NOMBRE_TIPO: Record<string, string> = {
  import: "Importación inicial",
  edit: "Edición",
  restore: "Restauración",
  publish: "Publicación",
};
function etiquetaTipo(t: string): string { return NOMBRE_TIPO[t] ?? t; }
function cuando(iso: string): string { return iso.slice(0, 16).replace("T", " "); }

export function PreviewPane({
  projectId, entryPath, pages,
}: { projectId: string; entryPath: string; pages: string[] }) {
  const [actual, setActual] = useState(entryPath);
  const [guardando, setGuardando] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [ops, setOps] = useState<Map<string, EditOp>>(new Map());
  const [snapshots, setSnapshots] = useState<SnapshotInfo[] | null>(null);
  const [recarga, setRecarga] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingImg = useRef<{ nodeId: number; page: string } | null>(null);
  const router = useRouter();

  const relPath = actual === entryPath ? "" : actual;
  const src = `/api/projects/${projectId}/preview/${relPath}${editMode ? "?edit=1" : ""}#${recarga}`;

  const cargarHistorial = useCallback(async () => {
    const d = await fetch(`/api/projects/${projectId}/snapshots`).then((r) => r.json()).catch(() => ({}));
    setSnapshots(d.snapshots ?? []);
  }, [projectId]);
  useEffect(() => { void cargarHistorial(); }, [cargarHistorial]);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      const data = e.data as { type?: string; op?: EditOp; nodeId?: number; page?: string };
      if (data?.type === "wc-edit" && data.op) {
        setOps((prev) => {
          const next = new Map(prev);
          next.set(opKey(data.op!), data.op!);
          return next;
        });
      } else if (data?.type === "wc-image-request" && typeof data.nodeId === "number" && data.page) {
        pendingImg.current = { nodeId: data.nodeId, page: data.page };
        fileInputRef.current?.click();
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const pend = pendingImg.current;
    pendingImg.current = null;
    if (!file || !pend) return;
    setGuardando(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/projects/${projectId}/assets`, { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "Error al subir la imagen");
        return;
      }
      const { assetId, ext, url } = (await res.json()) as { assetId: string; ext: string; url: string };
      iframeRef.current?.contentWindow?.postMessage({ type: "wc-image-set", nodeId: pend.nodeId, previewUrl: url }, "*");
      const op: EditOp = { page: pend.page, nodeId: pend.nodeId, kind: "src", value: `/wc-uploads/${assetId}.${ext}`, assetId };
      setOps((prev) => {
        const next = new Map(prev);
        next.set(opKey(op), op);
        return next;
      });
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEntrada(nuevo: string) {
    setActual(nuevo);
    setGuardando(true);
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ entryPath: nuevo }),
    });
    setGuardando(false);
  }

  function entrarEdicion() { setOps(new Map()); setEditMode(true); }
  function cancelarEdicion() { setOps(new Map()); setEditMode(false); setRecarga((n) => n + 1); }
  function alternarEdicion() { if (editMode) cancelarEdicion(); else entrarEdicion(); }

  async function guardarEdicion() {
    setGuardando(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/edits`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ops: [...ops.values()] }),
      });
      if (res.ok) { setOps(new Map()); setEditMode(false); setRecarga((n) => n + 1); await cargarHistorial(); router.refresh(); }
      else { const d = await res.json().catch(() => ({})); alert(d.error ?? "Error al guardar"); }
    } finally {
      setGuardando(false);
    }
  }

  async function restaurar(snapshotId: string) {
    await fetch(`/api/projects/${projectId}/snapshots/${snapshotId}/restore`, { method: "POST" });
    setRecarga((n) => n + 1); await cargarHistorial(); router.refresh();
  }

  return (
    <div className="area">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/svg+xml"
        className="hidden"
        onChange={(e) => void onFileChange(e)}
      />

      <div className="previo">
        <div className="previo-barra">
          <select
            className="previo-select"
            value={actual}
            onChange={(e) => void cambiarEntrada(e.target.value)}
            disabled={editMode}
            title={editMode ? "Guarda o descarta los cambios para cambiar de página" : "Página que se muestra"}
          >
            {pages.map((p) => <option key={p} value={p}>{p === entryPath ? `${p} (inicio)` : p}</option>)}
          </select>

          <button
            type="button"
            role="switch"
            aria-checked={editMode}
            className="interruptor"
            onClick={alternarEdicion}
            aria-label="Modo edición"
          />
          <span className="conmutador" onClick={alternarEdicion} style={{ userSelect: "none" }}>Modo edición</span>

          <div className="derecha">
            {editMode ? (
              <>
                <span style={{ fontSize: 13, color: "var(--color-texto-2)" }}>{ops.size} {ops.size === 1 ? "cambio" : "cambios"}</span>
                <button className="btn btn-fantasma btn-sm" onClick={cancelarEdicion} disabled={guardando}>Descartar</button>
                <button className="btn btn-primario btn-sm" onClick={() => void guardarEdicion()} disabled={ops.size === 0 || guardando}>Guardar cambios</button>
              </>
            ) : (
              guardando && <span style={{ fontSize: 13, color: "var(--color-texto-3)" }}>guardando…</span>
            )}
          </div>
        </div>

        <iframe
          key={src}
          ref={iframeRef}
          src={src}
          sandbox="allow-scripts"
          // El sandbox crea un origen opaco (cross-origin): sin delegar autoplay, los
          // vídeos de fondo de las webs (hero videos) no arrancan dentro del preview.
          allow="autoplay"
          className="lienzo-web"
          title="preview"
        />
      </div>

      <aside className="historial">
        <header>Historial</header>
        {snapshots === null ? (
          <p className="vacio-hist">Cargando…</p>
        ) : snapshots.length === 0 ? (
          <p className="vacio-hist">Aún no hay cambios guardados.</p>
        ) : (
          <ul>
            {snapshots.map((s) => (
              <li key={s.id}>
                <span className={s.esActual ? "tipo actual" : "tipo"} />
                <span className="detalle">
                  {etiquetaTipo(s.tipo)}
                  <br />
                  <span className="cuando">{s.esActual ? "actual · " : ""}{cuando(s.createdAt)}</span>
                </span>
                {!s.esActual && <button className="btn btn-sec btn-sm" onClick={() => void restaurar(s.id)}>Restaurar</button>}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
