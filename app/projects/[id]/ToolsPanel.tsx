"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Estado = {
  googleVerification: string | null;
  analytics: string | null;
  favicon: string | null;
  ogImage: string | null;
};

type Herramienta =
  | { tipo: "google-verification"; codigo: string }
  | { tipo: "analytics"; medicion: string }
  | { tipo: "favicon"; ruta: string }
  | { tipo: "og-image"; ruta: string };

function Tarjeta({ titulo, ayuda, children }: { titulo: string; ayuda: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <p className="text-sm font-medium">{titulo}</p>
      <p className="mb-2 text-xs text-gray-500">{ayuda}</p>
      {children}
    </div>
  );
}

function BotonQuitar({ tipo, ocupado, onQuitar }: {
  tipo: Herramienta["tipo"]; ocupado: boolean; onQuitar: (tipo: Herramienta["tipo"]) => void;
}) {
  return (
    <button onClick={() => onQuitar(tipo)} disabled={ocupado} className="text-xs text-gray-500 underline">
      quitar
    </button>
  );
}

// El <input type="file"> pelado no se lee como acción; un <label> con pinta de botón
// que envuelve el input oculto abre el selector igual y sí parece pulsable.
function BotonSubir({ texto, ocupado, onFile }: { texto: string; ocupado: boolean; onFile: (f: File) => void }) {
  return (
    <label className={"cursor-pointer rounded bg-indigo-600 px-2 py-1 text-xs text-white" + (ocupado ? " pointer-events-none opacity-50" : "")}>
      {texto}
      <input type="file" accept="image/*" disabled={ocupado} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </label>
  );
}

export function ToolsPanel({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [verificacion, setVerificacion] = useState("");
  const [medicion, setMedicion] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    try {
      const res = await fetch(`/api/projects/${projectId}/tools`);
      if (res.ok) setEstado((await res.json()) as Estado);
    } catch {
      /* silencioso: se reintenta al reabrir */
    }
  }
  useEffect(() => { if (abierto && !estado) void cargar(); }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  async function aplicar(herramienta: Herramienta) {
    setOcupado(true); setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/tools`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ herramienta }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); return; }
      await cargar(); router.refresh();
      setVerificacion(""); setMedicion("");
    } catch {
      setError("Error de conexión");
    } finally { setOcupado(false); }
  }

  async function quitar(tipo: Herramienta["tipo"]) {
    setOcupado(true); setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/tools`, {
        method: "DELETE", headers: { "content-type": "application/json" },
        body: JSON.stringify({ tipo }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); return; }
      await cargar(); router.refresh();
    } catch {
      setError("Error de conexión");
    } finally { setOcupado(false); }
  }

  async function subirYAplicar(tipo: "favicon" | "og-image", file: File) {
    setOcupado(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/projects/${projectId}/assets`, { method: "POST", body: fd });
      const d = (await res.json().catch(() => ({}))) as { error?: string; assetId?: string; ext?: string };
      if (!res.ok || !d.assetId || !d.ext) { setError(d.error ?? "Error al subir la imagen"); return; }
      await aplicar({ tipo, ruta: `/wc-uploads/${d.assetId}.${d.ext}` } as Herramienta);
    } catch {
      setError("Error de conexión");
    } finally { setOcupado(false); }
  }

  return (
    <div className="mb-3 rounded-lg border bg-gray-50 px-3 py-2">
      <button onClick={() => setAbierto(!abierto)} className="text-sm font-medium">
        {abierto ? "▾" : "▸"} Herramientas
      </button>
      {abierto && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Tarjeta titulo="Verificación de Google"
            ayuda="Demuestra a Google que la web es tuya (Search Console). Pega aquí la etiqueta o el código que te da Google.">
            {estado?.googleVerification ? (
              <p className="flex items-center gap-2 text-xs text-emerald-700">
                Activa: <code className="rounded bg-gray-100 px-1">{estado.googleVerification.slice(0, 18)}…</code>
                <BotonQuitar tipo="google-verification" ocupado={ocupado} onQuitar={(t) => void quitar(t)} />
              </p>
            ) : (
              <span className="flex items-center gap-1">
                <input value={verificacion} onChange={(e) => setVerificacion(e.target.value)}
                  placeholder='<meta name="google-site-verification" …' className="w-full rounded border px-2 py-1 text-xs" />
                <button onClick={() => void aplicar({ tipo: "google-verification", codigo: verificacion })}
                  disabled={ocupado} className="rounded border px-2 py-1 text-xs">Aplicar</button>
              </span>
            )}
          </Tarjeta>

          <Tarjeta titulo="Google Analytics"
            ayuda="Mide las visitas de tu web. Pega tu ID de medición de GA4 (empieza por G-).">
            {estado?.analytics ? (
              <p className="flex items-center gap-2 text-xs text-emerald-700">
                Activo: <code className="rounded bg-gray-100 px-1">{estado.analytics}</code>
                <BotonQuitar tipo="analytics" ocupado={ocupado} onQuitar={(t) => void quitar(t)} />
              </p>
            ) : (
              <span className="flex items-center gap-1">
                <input value={medicion} onChange={(e) => setMedicion(e.target.value)}
                  placeholder="G-ABC1DE23FG" className="w-full rounded border px-2 py-1 text-xs" />
                <button onClick={() => void aplicar({ tipo: "analytics", medicion })}
                  disabled={ocupado} className="rounded border px-2 py-1 text-xs">Aplicar</button>
              </span>
            )}
          </Tarjeta>

          <Tarjeta titulo="Favicon"
            ayuda="El icono que sale en la pestaña del navegador. Sube una imagen cuadrada (png recomendado).">
            <span className="flex items-center gap-2">
              {estado?.favicon && <img src={`/api/projects/${projectId}/preview${estado.favicon}`} alt="" className="h-5 w-5 rounded" />}
              <BotonSubir texto={estado?.favicon ? "Cambiar imagen" : "Subir imagen"} ocupado={ocupado}
                onFile={(f) => void subirYAplicar("favicon", f)} />
              {estado?.favicon && <BotonQuitar tipo="favicon" ocupado={ocupado} onQuitar={(t) => void quitar(t)} />}
            </span>
          </Tarjeta>

          <Tarjeta titulo="Imagen para compartir"
            ayuda="La imagen que aparece al enviar tu web por WhatsApp o redes sociales (og:image).">
            <span className="flex items-center gap-2">
              {estado?.ogImage && <img src={`/api/projects/${projectId}/preview${estado.ogImage}`} alt="" className="h-8 w-14 rounded object-cover" />}
              <BotonSubir texto={estado?.ogImage ? "Cambiar imagen" : "Subir imagen"} ocupado={ocupado}
                onFile={(f) => void subirYAplicar("og-image", f)} />
              {estado?.ogImage && <BotonQuitar tipo="og-image" ocupado={ocupado} onQuitar={(t) => void quitar(t)} />}
            </span>
          </Tarjeta>
        </div>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
