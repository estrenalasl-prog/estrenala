"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function PublishBar({
  projectId, subdominio, dominio, publishedSnapshotId, currentSnapshotId, sitesBaseDomain, dnsTargetIp,
}: {
  projectId: string;
  subdominio: string | null;
  dominio: string | null;
  publishedSnapshotId: string | null;
  currentSnapshotId: string | null;
  sitesBaseDomain: string;
  dnsTargetIp: string;
}) {
  const router = useRouter();
  const [sub, setSub] = useState(subdominio ?? "");
  const [editandoSub, setEditandoSub] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [dom, setDom] = useState("");
  const [editandoDom, setEditandoDom] = useState(false);
  const [confirmandoDom, setConfirmandoDom] = useState(false);
  const [verDns, setVerDns] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proto, setProto] = useState("http:");
  useEffect(() => { setProto(window.location.protocol); }, []);

  const publicado = !!publishedSnapshotId;
  const sinPublicar = publicado && currentSnapshotId !== publishedSnapshotId;
  const url = subdominio ? `${proto}//${subdominio}.${sitesBaseDomain}` : null;

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

  async function patch(body: unknown): Promise<boolean> {
    setOcupado(true); setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); return false; }
      router.refresh();
      return true;
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="mb-3 space-y-2 rounded-lg border bg-gray-50 px-3 py-2">
      <div className="flex flex-wrap items-center gap-3">
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
              <button onClick={() => void patch({ subdominio: sub }).then((ok) => ok && setEditandoSub(false))}
                disabled={ocupado} className="rounded border px-2 py-0.5 text-xs">Guardar</button>
              <button onClick={() => setEditandoSub(false)} className="text-xs text-gray-500">cancelar</button>
            </span>
          )
        )}
      </div>

      {publicado && (
        <div className="flex flex-wrap items-center gap-3 border-t pt-2">
          <span className="text-sm text-gray-600">Dominio propio:</span>
          {dominio ? (
            <>
              <a href={`https://${dominio}`} target="_blank" rel="noreferrer" className="text-sm text-emerald-700 underline">
                https://{dominio}
              </a>
              <button onClick={() => setVerDns(!verDns)} className="text-xs text-gray-500 underline">
                {verDns ? "ocultar instrucciones DNS" : "instrucciones DNS"}
              </button>
              {!confirmandoDom ? (
                <button onClick={() => setConfirmandoDom(true)} disabled={ocupado} className="rounded border px-2 py-0.5 text-xs">
                  Quitar
                </button>
              ) : (
                <span className="flex items-center gap-1">
                  <button onClick={() => void patch({ dominio: null }).then(() => setConfirmandoDom(false))}
                    disabled={ocupado} className="rounded border border-red-300 bg-red-50 px-2 py-0.5 text-xs text-red-700">
                    ¿Seguro? Sí, quitar
                  </button>
                  <button onClick={() => setConfirmandoDom(false)} className="text-xs text-gray-500">cancelar</button>
                </span>
              )}
            </>
          ) : !editandoDom ? (
            <button onClick={() => setEditandoDom(true)} className="text-xs text-gray-500 underline">
              conectar dominio propio
            </button>
          ) : (
            <span className="flex items-center gap-1">
              <input value={dom} onChange={(e) => setDom(e.target.value)}
                className="rounded border px-2 py-0.5 text-sm" placeholder="miempresa.com" />
              <button onClick={() => void patch({ dominio: dom }).then((ok) => { if (ok) { setEditandoDom(false); setVerDns(true); } })}
                disabled={ocupado} className="rounded border px-2 py-0.5 text-xs">Conectar</button>
              <button onClick={() => setEditandoDom(false)} className="text-xs text-gray-500">cancelar</button>
            </span>
          )}
          {verDns && dominio && (
            <div className="w-full rounded border bg-white px-3 py-2 text-xs text-gray-700">
              <p className="mb-1 font-medium">En el panel DNS de tu dominio crea estos dos registros:</p>
              <pre className="mb-1 rounded bg-gray-100 p-2">{`A    @      →  ${dnsTargetIp}\nA    www    →  ${dnsTargetIp}`}</pre>
              <p>No toques los registros MX (correo). El cambio puede tardar de minutos a unas horas en propagarse; el certificado HTTPS se emite solo al primer acceso.</p>
            </div>
          )}
        </div>
      )}

      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
