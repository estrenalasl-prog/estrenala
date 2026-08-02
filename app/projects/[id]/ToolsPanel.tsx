"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TextosPanel } from "@/src/i18n/panel";
import { rellenar } from "@/src/i18n/rellenar";

type Textos = TextosPanel["proyecto"];

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

function Estado_({ activo, textoActivo, textoInactivo }: { activo: boolean; textoActivo: string; textoInactivo: string }) {
  return activo
    ? <span className="badge badge-exito"><span className="punto" />{textoActivo}</span>
    : <span className="badge badge-neutro"><span className="punto" />{textoInactivo}</span>;
}

export function ToolsPanel({ projectId, textos }: { projectId: string; textos: Textos }) {
  const t = textos.herramientas;
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
      if (!res.ok) { setError(d.error ?? textos.errores.generico); return; }
      await cargar(); router.refresh();
      setVerificacion(""); setMedicion("");
    } catch {
      setError(textos.errores.conexion);
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
      if (!res.ok) { setError(d.error ?? textos.errores.generico); return; }
      await cargar(); router.refresh();
    } catch {
      setError(textos.errores.conexion);
    } finally { setOcupado(false); }
  }

  async function subirYAplicar(tipo: "favicon" | "og-image", file: File) {
    setOcupado(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/projects/${projectId}/assets`, { method: "POST", body: fd });
      const d = (await res.json().catch(() => ({}))) as { error?: string; assetId?: string; ext?: string };
      if (!res.ok || !d.assetId || !d.ext) { setError(d.error ?? textos.errores.subirImagen); return; }
      await aplicar({ tipo, ruta: `/wc-uploads/${d.assetId}.${d.ext}` } as Herramienta);
    } catch {
      setError(textos.errores.conexion);
    } finally { setOcupado(false); }
  }

  const nConfig = estado
    ? [estado.googleVerification, estado.analytics, estado.favicon, estado.ogImage].filter(Boolean).length
    : null;

  return (
    <details className="direccion" onToggle={(e) => { if (e.currentTarget.open && !estado) void cargar(); }}>
      <summary>
        <span className="flecha">▸</span> {t.titulo}
        <span className="estado-dom">{nConfig === null ? t.resumen : rellenar(t.configuradas, { n: String(nConfig) })}</span>
      </summary>
      <div className="direccion-cuerpo" style={{ display: "block" }}>

        <div className="fila-conf">
          <div className="info"><b>{t.searchConsole}</b><small>{t.searchConsoleTexto}</small></div>
          <div className="control">
            {estado?.googleVerification ? (
              <>
                <span className="badge badge-exito"><span className="punto" />{t.activa}</span>
                <button className="btn btn-fantasma btn-sm" onClick={() => void quitar("google-verification")} disabled={ocupado}>{t.quitar}</button>
              </>
            ) : (
              <>
                <input className="campo" style={{ width: 220, maxWidth: "100%" }} value={verificacion}
                  onChange={(e) => setVerificacion(e.target.value)} placeholder='<meta name="google-site-verification" …' />
                <button className="btn btn-sec btn-sm" onClick={() => void aplicar({ tipo: "google-verification", codigo: verificacion })} disabled={ocupado || !verificacion.trim()}>{t.aplicar}</button>
              </>
            )}
          </div>
        </div>

        <div className="fila-conf">
          <div className="info"><b>{t.analitica}</b><small>{t.analiticaTexto}</small></div>
          <div className="control">
            {estado?.analytics ? (
              <>
                <span className="badge badge-exito"><span className="punto" />{estado.analytics}</span>
                <button className="btn btn-fantasma btn-sm" onClick={() => void quitar("analytics")} disabled={ocupado}>{t.quitar}</button>
              </>
            ) : (
              <>
                <input className="campo" style={{ width: 160, maxWidth: "100%" }} value={medicion}
                  onChange={(e) => setMedicion(e.target.value)} placeholder="G-ABC1DE23FG" />
                <button className="btn btn-sec btn-sm" onClick={() => void aplicar({ tipo: "analytics", medicion })} disabled={ocupado || !medicion.trim()}>{t.aplicar}</button>
              </>
            )}
          </div>
        </div>

        <div className="fila-conf">
          <div className="info"><b>{t.favicon}</b><small>{t.faviconTexto}</small></div>
          <div className="control">
            {estado?.favicon && <img src={`/api/projects/${projectId}/preview${estado.favicon}`} alt="" style={{ height: 20, width: 20, borderRadius: 5 }} />}
            <Estado_ activo={!!estado?.favicon} textoActivo={t.listo} textoInactivo={t.sinConfigurar} />
            <BotonSubir texto={estado?.favicon ? t.cambiar : t.subirImagen} ocupado={ocupado} onFile={(f) => void subirYAplicar("favicon", f)} />
            {estado?.favicon && <button className="btn btn-fantasma btn-sm" onClick={() => void quitar("favicon")} disabled={ocupado}>{t.quitar}</button>}
          </div>
        </div>

        <div className="fila-conf">
          <div className="info"><b>{t.compartir} <span className="quees" title={t.compartirQueEs}>?</span></b><small>{t.compartirTexto}</small></div>
          <div className="control">
            {estado?.ogImage && <img src={`/api/projects/${projectId}/preview${estado.ogImage}`} alt="" style={{ height: 28, width: 48, borderRadius: 5, objectFit: "cover" }} />}
            <Estado_ activo={!!estado?.ogImage} textoActivo={t.listo} textoInactivo={t.sinConfigurar} />
            <BotonSubir texto={estado?.ogImage ? t.cambiar : t.subirImagen} ocupado={ocupado} onFile={(f) => void subirYAplicar("og-image", f)} />
            {estado?.ogImage && <button className="btn btn-fantasma btn-sm" onClick={() => void quitar("og-image")} disabled={ocupado}>{t.quitar}</button>}
          </div>
        </div>

        {error && <p className="error-campo" style={{ marginTop: 10 }}>{error}</p>}
      </div>
    </details>
  );
}
