"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const HOST = process.env.NEXT_PUBLIC_PLATFORM_HOST ?? "localhost:3000";

export function PublishBar({
  projectId, subdominio, publishedSnapshotId, currentSnapshotId,
}: {
  projectId: string;
  subdominio: string | null;
  publishedSnapshotId: string | null;
  currentSnapshotId: string | null;
}) {
  const router = useRouter();
  const [sub, setSub] = useState(subdominio ?? "");
  const [editandoSub, setEditandoSub] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proto, setProto] = useState("http:");
  useEffect(() => { setProto(window.location.protocol); }, []);

  const publicado = !!publishedSnapshotId;
  const sinPublicar = publicado && currentSnapshotId !== publishedSnapshotId;
  const url = subdominio ? `${proto}//${subdominio}.${HOST}` : null;

  async function llamar(metodo: "POST" | "DELETE") {
    setOcupado(true); setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/publish`, { method: metodo });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); setConfirmando(false); return; }
      setConfirmando(false);
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  async function guardarSub() {
    setOcupado(true); setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ subdominio: sub }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string; subdominio?: string };
      if (!res.ok) { setError(d.error ?? "Error"); return; }
      setEditandoSub(false);
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border bg-gray-50 px-3 py-2">
      {!publicado ? (
        <>
          <span className="text-sm text-gray-600">Sin publicar</span>
          <button onClick={() => void llamar("POST")} disabled={ocupado}
            className="rounded bg-emerald-600 px-3 py-1 text-sm text-white disabled:opacity-50">
            Publicar
          </button>
        </>
      ) : (
        <>
          <span className="text-sm font-medium text-emerald-700">Publicado:</span>
          {url && <a href={url} target="_blank" rel="noreferrer" className="text-sm text-emerald-700 underline">{url}</a>}
          {sinPublicar && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Tienes cambios sin publicar</span>}
          <button onClick={() => void llamar("POST")} disabled={ocupado}
            className="rounded bg-emerald-600 px-3 py-1 text-sm text-white disabled:opacity-50">
            Republicar
          </button>
          {!confirmando ? (
            <button onClick={() => setConfirmando(true)} disabled={ocupado} className="rounded border px-3 py-1 text-sm">
              Despublicar
            </button>
          ) : (
            <span className="flex items-center gap-1">
              <button onClick={() => void llamar("DELETE")} disabled={ocupado}
                className="rounded border border-red-300 bg-red-50 px-3 py-1 text-sm text-red-700">
                ¿Seguro? Sí, despublicar
              </button>
              <button onClick={() => setConfirmando(false)} className="text-xs text-gray-500">cancelar</button>
            </span>
          )}
        </>
      )}

      {subdominio !== null && (
        !editandoSub ? (
          <button onClick={() => { setSub(subdominio); setEditandoSub(true); }} className="text-xs text-gray-500 underline">
            cambiar subdominio
          </button>
        ) : (
          <span className="flex items-center gap-1">
            <input value={sub} onChange={(e) => setSub(e.target.value)}
              className="rounded border px-2 py-0.5 text-sm" placeholder="mi-subdominio" />
            <button onClick={() => void guardarSub()} disabled={ocupado} className="rounded border px-2 py-0.5 text-xs">Guardar</button>
            <button onClick={() => setEditandoSub(false)} className="text-xs text-gray-500">cancelar</button>
          </span>
        )
      )}

      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
