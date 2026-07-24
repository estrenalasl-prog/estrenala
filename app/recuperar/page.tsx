"use client";
import { useState } from "react";
import Link from "next/link";
import { Logo } from "../_components/Logo";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    try {
      const res = await fetch("/api/auth/recuperar", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = (await res.json().catch(() => ({}))) as { mensaje?: string };
      setMensaje(d.mensaje ?? "Si ese correo tiene cuenta, te hemos enviado un enlace");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="login-envoltorio">
      <div className="split">
        <aside className="marca-panel">
          <div className="grano" />
          <Logo tono="oscuro" alto={34} />
          <p className="claim">Recupera el acceso a tus webs.</p>
        </aside>
        <form className="form-panel" onSubmit={enviar}>
          <h2>¿Olvidaste tu contraseña?</h2>
          <p className="lead">Escribe tu correo y te enviamos un enlace para cambiarla.</p>

          {mensaje ? (
            <div className="aviso-ok" role="status" style={{ marginBottom: 8 }}>{mensaje}</div>
          ) : (
            <>
              <div>
                <label className="etiqueta-campo" htmlFor="email">Correo</label>
                <input
                  id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com" autoComplete="email" autoFocus className="campo"
                />
              </div>
              <button type="submit" disabled={ocupado} className="btn btn-primario btn-lg" style={{ width: "100%", marginTop: 20 }}>
                {ocupado ? <><span className="cargador" /> Enviando…</> : "Enviar enlace"}
              </button>
            </>
          )}

          <p className="lead" style={{ marginTop: 22 }}>
            <Link href="/login">Volver a entrar</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
