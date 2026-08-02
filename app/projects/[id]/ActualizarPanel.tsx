"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDialogo } from "@/app/_components/Dialogo";
import type { TextosPanel } from "@/src/i18n/panel";
import { conFormato } from "@/src/i18n/formato";

type Textos = TextosPanel["proyecto"];

// Actualizar la web desde un ZIP: para quien prefiere editar en su propia herramienta
// (Claude Code, ChatGPT, v0…) y subir la versión nueva. Crea un snapshot (revertible).
export function ActualizarPanel({ projectId, textos }: { projectId: string; textos: Textos }) {
  const t = textos.actualizar;
  const router = useRouter();
  const { confirmar } = useDialogo();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function subir(file: File) {
    // Tono normal y no «peligro» a propósito: esto SÍ se puede deshacer, y decir
    // lo contrario asustaría de balde justo en el camino que queremos que usen
    // los que editan su web en su propia herramienta.
    if (!(await confirmar({
      titulo: t.confirmarTitulo,
      cuerpo: t.confirmarCuerpo,
      etiqueta: t.confirmarEtiqueta,
      aceptar: t.confirmarAceptar,
    }))) return;
    setOcupado(true); setError(null); setOk(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/projects/${projectId}/actualizar`, { method: "POST", body: fd });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? textos.errores.actualizar); return; }
      setOk(true);
      router.refresh();
    } catch {
      setError(textos.errores.conexion);
    } finally { setOcupado(false); }
  }

  return (
    <details className="direccion">
      <summary>
        <span className="flecha">▸</span> {t.titulo}
        <span className="estado-dom">{t.resumen}</span>
      </summary>
      <div className="direccion-cuerpo" style={{ display: "block" }}>
        <p style={{ fontSize: 13, color: "var(--color-texto-2)", marginBottom: 12 }}>
          {conFormato(t.texto)}
          <br />
          <span style={{ color: "var(--color-texto-3)" }}>{conFormato(t.ojo)}</span>
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void subir(f); e.target.value = ""; }}
        />
        <button className="btn btn-sec btn-sm" disabled={ocupado} onClick={() => inputRef.current?.click()}>
          {ocupado ? t.actualizando : t.boton}
        </button>
        {ok && <p style={{ marginTop: 10, fontSize: 14 }}>{t.hecho}</p>}
        {error && <p className="error-campo" style={{ marginTop: 10 }}>{error}</p>}
      </div>
    </details>
  );
}
