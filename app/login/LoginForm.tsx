"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "../_components/Logo";
import { FirmaQuantiva } from "../_components/FirmaQuantiva";
import { BotonGoogle } from "../_components/BotonGoogle";
import type { TextosCuenta } from "@/src/i18n/cuenta";

// Solo rutas internas: evita redirigir a otro sitio con ?next=//malo.
function destinoSeguro(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function LoginForm({ google, t }: { google: boolean; t: TextosCuenta["login"] }) {
  const router = useRouter();
  const params = useSearchParams();
  const errorGoogle = params.get("error") === "google";
  const destino = destinoSeguro(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(errorGoogle ? t.errorGoogle : null);
  const [ocupado, setOcupado] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true); setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); return; }
      router.push(destino);
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
          <p className="claim">{t.claim}</p>
          <p className="sub">{t.sub}</p>
          <FirmaQuantiva tono="oscuro" />
        </aside>

        <form className="form-panel" onSubmit={entrar}>
          <h2>{t.titulo}</h2>
          <p className="lead">{t.lead}</p>

          {error && (
            <div className="aviso-error" role="alert">
              <span className="ico">!</span>
              <span>{error}</span>
            </div>
          )}

          {google && <BotonGoogle texto={t.google} />}

          <div>
            <label className="etiqueta-campo" htmlFor="email">{t.correo}</label>
            <input
              id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={t.correoPh} autoComplete="email" autoFocus
              className={error ? "campo campo-error" : "campo"}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <label className="etiqueta-campo" htmlFor="password">{t.password}</label>
            <input
              id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPh} autoComplete="current-password"
              className={error ? "campo campo-error" : "campo"}
            />
          </div>

          <button type="submit" disabled={ocupado} className="btn btn-primario btn-lg" style={{ width: "100%", marginTop: 20 }}>
            {ocupado ? <><span className="cargador" /> {t.entrando}</> : t.entrar}
          </button>

          <p className="lead" style={{ marginTop: 18, marginBottom: 0 }}>
            <Link href="/recuperar">{t.olvidaste}</Link>
          </p>
          <p className="lead" style={{ marginTop: 10 }}>
            {t.aunNo} <Link href="/registro">{t.creaUna}</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
