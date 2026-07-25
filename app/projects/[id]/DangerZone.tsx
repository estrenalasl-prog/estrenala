"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const botonPeligro = { background: "var(--color-peligro-texto, #b91c1c)", color: "#fff", borderColor: "transparent" };

// Zona de peligro del proyecto: borrar la web entera con confirmación en dos pasos
// (escribir el nombre). El servidor solo deja borrar al propietario (403 si no).
export function DangerZone({ projectId, nombre }: { projectId: string; nombre: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function borrar() {
    setOcupado(true); setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error ?? "No se pudo borrar"); return;
      }
      router.push("/");
    } catch {
      setError("Error de conexión");
    } finally { setOcupado(false); }
  }

  return (
    <details className="direccion">
      <summary>
        <span className="flecha">▸</span> Zona de peligro
        <span className="estado-dom">Eliminar esta web para siempre</span>
      </summary>
      <div className="direccion-cuerpo" style={{ display: "block" }}>
        <p style={{ fontSize: 13, color: "var(--color-texto-2)" }}>
          Se borrará <b>{nombre}</b> con todo su historial, su blog y sus archivos. Si está publicada,
          dejará de estar online. <b>Esto no se puede deshacer.</b>
        </p>
        {!confirmando ? (
          <button className="btn btn-sm" style={botonPeligro} onClick={() => setConfirmando(true)}>
            Eliminar esta web…
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13 }}>Para confirmar, escribe <b>{nombre}</b>:</label>
            <input className="campo" value={texto} onChange={(e) => setTexto(e.target.value)}
              placeholder={nombre} style={{ maxWidth: 320 }} disabled={ocupado} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-sm" style={botonPeligro} disabled={texto !== nombre || ocupado} onClick={() => void borrar()}>
                {ocupado ? "Borrando…" : "Borrar definitivamente"}
              </button>
              <button className="btn btn-fantasma btn-sm" onClick={() => { setConfirmando(false); setTexto(""); }} disabled={ocupado}>
                Cancelar
              </button>
            </div>
          </div>
        )}
        {error && <p className="error-campo" style={{ marginTop: 10 }}>{error}</p>}
      </div>
    </details>
  );
}
