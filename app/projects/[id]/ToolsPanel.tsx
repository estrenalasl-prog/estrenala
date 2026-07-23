"use client";
import { useState } from "react";
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

// <input type="file"> pelado no se lee como acción; un <label> con pinta de botón
// que envuelve el input oculto abre el selector igual y sí parece pulsable.
export function BotonSubir({ texto, ocupado, onFile }: { texto: string; ocupado: boolean; onFile: (f: File) => void }) {
  return (
    <label className={"btn btn-sec btn-sm" + (ocupado ? " pointer-events-none opacity-50" : "")} style={{ cursor: "pointer" }}>
      {texto}
      <input type="file" accept="image/*" disabled={ocupado} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </label>
  );
}

function Estado_({ activo, textoActivo }: { activo: boolean; textoActivo: string }) {
  return activo
    ? <span className="badge badge-exito"><span className="punto" />{textoActivo}</span>
    : <span className="badge badge-neutro"><span className="punto" />Sin configurar</span>;
}

export function ToolsPanel({ projectId }: { projectId: string }) {
  const router = useRouter();
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

  const nConfig = estado
    ? [estado.googleVerification, estado.analytics, estado.favicon, estado.ogImage].filter(Boolean).length
    : null;

  return (
    <details className="direccion" onToggle={(e) => { if (e.currentTarget.open && !estado) void cargar(); }}>
      <summary>
        <span className="flecha">▸</span> Herramientas del sitio
        <span className="estado-dom">{nConfig === null ? "Search Console · Analítica · Favicon · Compartir" : `${nConfig} de 4 configuradas`}</span>
      </summary>
      <div className="direccion-cuerpo" style={{ display: "block" }}>

        <div className="fila-conf">
          <div className="info"><b>Google Search Console</b><small>Demuestra a Google que la web es tuya. Pega la etiqueta o el código que te da Google.</small></div>
          <div className="control">
            {estado?.googleVerification ? (
              <>
                <span className="badge badge-exito"><span className="punto" />Activa</span>
                <button className="btn btn-fantasma btn-sm" onClick={() => void quitar("google-verification")} disabled={ocupado}>Quitar</button>
              </>
            ) : (
              <>
                <input className="campo" style={{ width: 220, maxWidth: "100%" }} value={verificacion}
                  onChange={(e) => setVerificacion(e.target.value)} placeholder='<meta name="google-site-verification" …' />
                <button className="btn btn-sec btn-sm" onClick={() => void aplicar({ tipo: "google-verification", codigo: verificacion })} disabled={ocupado || !verificacion.trim()}>Aplicar</button>
              </>
            )}
          </div>
        </div>

        <div className="fila-conf">
          <div className="info"><b>Analítica de visitas</b><small>Mide las visitas con Google Analytics. Pega tu ID de medición de GA4 (empieza por G-).</small></div>
          <div className="control">
            {estado?.analytics ? (
              <>
                <span className="badge badge-exito"><span className="punto" />{estado.analytics}</span>
                <button className="btn btn-fantasma btn-sm" onClick={() => void quitar("analytics")} disabled={ocupado}>Quitar</button>
              </>
            ) : (
              <>
                <input className="campo" style={{ width: 160, maxWidth: "100%" }} value={medicion}
                  onChange={(e) => setMedicion(e.target.value)} placeholder="G-ABC1DE23FG" />
                <button className="btn btn-sec btn-sm" onClick={() => void aplicar({ tipo: "analytics", medicion })} disabled={ocupado || !medicion.trim()}>Aplicar</button>
              </>
            )}
          </div>
        </div>

        <div className="fila-conf">
          <div className="info"><b>Favicon</b><small>El iconito de la pestaña del navegador. Sube una imagen cuadrada (png recomendado).</small></div>
          <div className="control">
            {estado?.favicon && <img src={`/api/projects/${projectId}/preview${estado.favicon}`} alt="" style={{ height: 20, width: 20, borderRadius: 5 }} />}
            <Estado_ activo={!!estado?.favicon} textoActivo="Listo" />
            <BotonSubir texto={estado?.favicon ? "Cambiar" : "Subir imagen"} ocupado={ocupado} onFile={(f) => void subirYAplicar("favicon", f)} />
            {estado?.favicon && <button className="btn btn-fantasma btn-sm" onClick={() => void quitar("favicon")} disabled={ocupado}>Quitar</button>}
          </div>
        </div>

        <div className="fila-conf">
          <div className="info"><b>Imagen al compartir <span className="quees" title="La foto que aparece al pegar tu enlace en WhatsApp o redes (og:image).">?</span></b><small>Aparece al enviar tu web por WhatsApp o redes sociales.</small></div>
          <div className="control">
            {estado?.ogImage && <img src={`/api/projects/${projectId}/preview${estado.ogImage}`} alt="" style={{ height: 28, width: 48, borderRadius: 5, objectFit: "cover" }} />}
            <Estado_ activo={!!estado?.ogImage} textoActivo="Listo" />
            <BotonSubir texto={estado?.ogImage ? "Cambiar" : "Subir imagen"} ocupado={ocupado} onFile={(f) => void subirYAplicar("og-image", f)} />
            {estado?.ogImage && <button className="btn btn-fantasma btn-sm" onClick={() => void quitar("og-image")} disabled={ocupado}>Quitar</button>}
          </div>
        </div>

        {error && <p className="error-campo" style={{ marginTop: 10 }}>{error}</p>}
      </div>
    </details>
  );
}
