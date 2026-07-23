"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true); setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); return; }
      router.push("/");
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="login-envoltorio">
      <div className="split">
        <aside className="marca-panel">
          <div className="grano" />
          <div className="wordmark">Estrénal<span className="hl">a</span></div>
          <p className="claim">Tu web hecha con IA, por fin en directo.</p>
          <p className="sub">Súbela online, edítala con un clic y deja que el blog escriba solo.</p>
        </aside>

        <form className="form-panel" onSubmit={entrar}>
          <h2>Entra</h2>
          <p className="lead">Bienvenido de nuevo. Vamos a tu web.</p>

          {error && (
            <div className="aviso-error" role="alert">
              <span className="ico">!</span>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="etiqueta-campo" htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              autoFocus
              className={error ? "campo campo-error" : "campo"}
            />
          </div>

          <button type="submit" disabled={ocupado} className="btn btn-primario btn-lg" style={{ width: "100%", marginTop: 20 }}>
            {ocupado ? <><span className="cargador" /> Entrando…</> : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
