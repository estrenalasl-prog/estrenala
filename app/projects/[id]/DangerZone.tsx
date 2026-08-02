"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TextosPanel } from "@/src/i18n/panel";
import { conValores } from "@/src/i18n/formato";

const botonPeligro = { background: "var(--color-peligro-texto, #b91c1c)", color: "#fff", borderColor: "transparent" };

type Textos = TextosPanel["proyecto"];

// Zona de peligro del proyecto: borrar la web entera con confirmación en dos pasos
// (escribir el nombre). El servidor solo deja borrar al propietario (403 si no).
export function DangerZone({ projectId, nombre, textos }: { projectId: string; nombre: string; textos: Textos }) {
  const t = textos.peligro;
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
        setError(d.error ?? textos.errores.borrar); return;
      }
      router.push("/");
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
        <p style={{ fontSize: 13, color: "var(--color-texto-2)" }}>
          {conValores(t.texto, { nombre: <b>{nombre}</b> })}
        </p>
        {!confirmando ? (
          <button className="btn btn-sm" style={botonPeligro} onClick={() => setConfirmando(true)}>
            {t.boton}
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13 }}>{conValores(t.escribe, { nombre: <b>{nombre}</b> })}</label>
            <input className="campo" value={texto} onChange={(e) => setTexto(e.target.value)}
              placeholder={nombre} style={{ maxWidth: 320 }} disabled={ocupado} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-sm" style={botonPeligro} disabled={texto !== nombre || ocupado} onClick={() => void borrar()}>
                {ocupado ? t.borrando : t.borrar}
              </button>
              <button className="btn btn-fantasma btn-sm" onClick={() => { setConfirmando(false); setTexto(""); }} disabled={ocupado}>
                {t.cancelar}
              </button>
            </div>
          </div>
        )}
        {error && <p className="error-campo" style={{ marginTop: 10 }}>{error}</p>}
      </div>
    </details>
  );
}
