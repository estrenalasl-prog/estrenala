"use client";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "../_components/Logo";

function Formulario() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [listo, setListo] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true); setError(null);
    try {
      const res = await fetch("/api/auth/restablecer", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); return; }
      setListo(true);
      setTimeout(() => { router.push("/login"); }, 1500);
    } finally {
      setOcupado(false);
    }
  }

  if (listo) {
    return (
      <div className="form-panel">
        <h2>Contraseña cambiada</h2>
        <p className="lead">Ya puedes entrar con tu nueva contraseña. Te llevamos…</p>
        <Link href="/login" className="btn btn-primario btn-lg" style={{ width: "100%", marginTop: 8 }}>Ir a entrar</Link>
      </div>
    );
  }

  return (
    <form className="form-panel" onSubmit={guardar}>
      <h2>Elige una nueva contraseña</h2>
      <p className="lead">Escríbela y guárdala. Con eso vuelves a tener acceso.</p>

      {error && (
        <div className="aviso-error" role="alert">
          <span className="ico">!</span><span>{error}</span>
        </div>
      )}

      <div>
        <label className="etiqueta-campo" htmlFor="password">Nueva contraseña</label>
        <input
          id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres" autoComplete="new-password" autoFocus
          className={error ? "campo campo-error" : "campo"}
        />
        <p className="ayuda-campo">Usa al menos 8 caracteres.</p>
      </div>

      <button type="submit" disabled={ocupado} className="btn btn-primario btn-lg" style={{ width: "100%", marginTop: 20 }}>
        {ocupado ? <><span className="cargador" /> Guardando…</> : "Guardar contraseña"}
      </button>
    </form>
  );
}

export default function RestablecerPage() {
  return (
    <main className="login-envoltorio">
      <div className="split">
        <aside className="marca-panel">
          <div className="grano" />
          <Logo tono="oscuro" alto={34} />
          <p className="claim">Un paso y vuelves a tus webs.</p>
        </aside>
        <Suspense fallback={<div className="form-panel"><p className="lead">Cargando…</p></div>}>
          <Formulario />
        </Suspense>
      </div>
    </main>
  );
}
