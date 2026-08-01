"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDialogo } from "@/app/_components/Dialogo";

// Actualizar la web desde un ZIP: para quien prefiere editar en su propia herramienta
// (Claude Code, ChatGPT, v0…) y subir la versión nueva. Crea un snapshot (revertible).
export function ActualizarPanel({ projectId }: { projectId: string }) {
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
      titulo: "Vas a reemplazar el contenido de esta web",
      cuerpo: "Se sustituye por el del ZIP nuevo. Tu versión actual queda en el Historial, así que puedes volver a ella cuando quieras.",
      etiqueta: "Se puede deshacer desde el Historial",
      aceptar: "Reemplazar",
    }))) return;
    setOcupado(true); setError(null); setOk(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/projects/${projectId}/actualizar`, { method: "POST", body: fd });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "No se pudo actualizar"); return; }
      setOk(true);
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally { setOcupado(false); }
  }

  return (
    <details className="direccion">
      <summary>
        <span className="flecha">▸</span> Actualizar desde ZIP
        <span className="estado-dom">¿La editaste en tu herramienta? Sube la versión nueva</span>
      </summary>
      <div className="direccion-cuerpo" style={{ display: "block" }}>
        <p style={{ fontSize: 13, color: "var(--color-texto-2)", marginBottom: 12 }}>
          Si prefieres seguir editando tu web en tu propia herramienta (Claude Code, ChatGPT, v0…),
          sube aquí el <b>.zip</b> con la versión nueva y tu web online se actualizará. La versión
          anterior queda en el <b>Historial</b>, así que siempre puedes revertir.
          <br />
          <span style={{ color: "var(--color-texto-3)" }}>
            Ojo: el ZIP reemplaza el contenido; lo que hayas editado <i>dentro</i> de Estrénala no se
            mezcla con él (tu proyecto en tu herramienta manda).
          </span>
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void subir(f); e.target.value = ""; }}
        />
        <button className="btn btn-sec btn-sm" disabled={ocupado} onClick={() => inputRef.current?.click()}>
          {ocupado ? "Actualizando…" : "↻ Subir ZIP y actualizar"}
        </button>
        {ok && <p style={{ marginTop: 10, fontSize: 14 }}>✓ Web actualizada. Revísala en la vista previa de abajo.</p>}
        {error && <p className="error-campo" style={{ marginTop: 10 }}>{error}</p>}
      </div>
    </details>
  );
}
