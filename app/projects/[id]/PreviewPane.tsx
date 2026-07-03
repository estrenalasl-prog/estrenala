"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type EditOp =
  | { page: string; nodeId: number; kind: "text"; value: string }
  | { page: string; nodeId: number; kind: "href"; value: string }
  | { page: string; nodeId: number; kind: "src"; value: string; assetId: string }
  | { page: string; nodeId: number; kind: "style"; property: "color"; value: string };
type SnapshotInfo = { id: string; tipo: string; parentId: string | null; createdAt: string; esActual: boolean };

function opKey(op: EditOp): string {
  const prop = op.kind === "style" ? op.property : "";
  return `${op.page}#${op.nodeId}#${op.kind}#${prop}`;
}

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

  async function guardarEdicion() {
    setGuardando(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/edits`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ops: [...ops.values()] }),
      });
      if (res.ok) { setOps(new Map()); setEditMode(false); setRecarga((n) => n + 1); setSnapshots(null); router.refresh(); }
      else { const d = await res.json().catch(() => ({})); alert(d.error ?? "Error al guardar"); }
    } finally {
      setGuardando(false);
    }
  }

  async function verHistorial() {
    const d = await fetch(`/api/projects/${projectId}/snapshots`).then((r) => r.json());
    setSnapshots(d.snapshots ?? []);
  }
  async function restaurar(snapshotId: string) {
    await fetch(`/api/projects/${projectId}/snapshots/${snapshotId}/restore`, { method: "POST" });
    setSnapshots(null); setRecarga((n) => n + 1); router.refresh();
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/svg+xml"
        className="hidden"
        onChange={(e) => void onFileChange(e)}
      />
      <div className="mb-3 flex flex-wrap items-center gap-3">
        {!editMode ? (
          <>
            <label className="text-sm text-gray-600">Página de entrada:</label>
            <select value={actual} onChange={(e) => void cambiarEntrada(e.target.value)} className="rounded border px-2 py-1 text-sm">
              {pages.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={entrarEdicion} className="rounded bg-indigo-600 px-3 py-1 text-sm text-white">Editar</button>
            <button onClick={() => void verHistorial()} className="rounded border px-3 py-1 text-sm">Historial</button>
            {guardando && <span className="text-sm text-gray-400">guardando…</span>}
          </>
        ) : (
          <>
            <span className="text-sm font-medium text-indigo-700">Modo edición · {ops.size} cambios</span>
            <button onClick={() => void guardarEdicion()} disabled={ops.size === 0 || guardando} className="rounded bg-indigo-600 px-3 py-1 text-sm text-white disabled:opacity-50">Guardar</button>
            <button onClick={cancelarEdicion} className="rounded border px-3 py-1 text-sm">Cancelar</button>
            <span className="text-xs text-gray-400">Texto: click para editar · enlace/color: usa el panel flotante · imagen: «Cambiar imagen»</span>
          </>
        )}
      </div>

      {snapshots && (
        <div className="mb-3 rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Historial</span>
            <button onClick={() => setSnapshots(null)} className="text-xs text-gray-500">cerrar</button>
          </div>
          <ul className="space-y-1">
            {snapshots.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span>{s.tipo} · {s.createdAt.slice(0, 19).replace("T", " ")} {s.esActual && <em className="text-indigo-600">(actual)</em>}</span>
                {!s.esActual && <button onClick={() => void restaurar(s.id)} className="rounded border px-2 py-0.5 text-xs">Restaurar</button>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <iframe
        key={src}
        ref={iframeRef}
        src={src}
        sandbox="allow-scripts"
        className="h-[80vh] w-full rounded-lg border"
        title="preview"
      />
    </div>
  );
}
