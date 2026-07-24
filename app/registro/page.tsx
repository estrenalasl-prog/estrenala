"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "../_components/Logo";

export default function RegistroPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true); setError(null);
    try {
      const res = await fetch("/api/registro", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ nombre, email, password }),
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
          <Logo tono="oscuro" alto={34} />
          <p className="claim">Empieza a estrenar tus webs hoy.</p>
          <p className="sub">Crea tu cuenta gratis: sube tu web, edítala con un clic y déjale el blog a la IA.</p>
        </aside>

        <form className="form-panel" onSubmit={crear}>
          <h2>Crea tu cuenta</h2>
          <p className="lead">En un minuto tienes tu espacio listo.</p>

          {error && (
            <div className="aviso-error" role="alert">
              <span className="ico">!</span>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="etiqueta-campo" htmlFor="nombre">Tu nombre</label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Como quieres que te llamemos"
              autoComplete="name"
              autoFocus
              className={error ? "campo campo-error" : "campo"}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <label className="etiqueta-campo" htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              autoComplete="email"
              className={error ? "campo campo-error" : "campo"}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <label className="etiqueta-campo" htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              className={error ? "campo campo-error" : "campo"}
            />
            <p className="ayuda-campo">Usa al menos 8 caracteres. Cuanto más larga, mejor.</p>
          </div>

          <button type="submit" disabled={ocupado} className="btn btn-primario btn-lg" style={{ width: "100%", marginTop: 20 }}>
            {ocupado ? <><span className="cargador" /> Creando…</> : "Crear cuenta"}
          </button>

          <p className="lead" style={{ marginTop: 22 }}>
            ¿Ya tienes cuenta? <Link href="/login">Entra</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
