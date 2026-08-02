"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "../_components/Logo";
import { FirmaQuantiva } from "../_components/FirmaQuantiva";
import { BotonGoogle } from "../_components/BotonGoogle";
import type { TextosCuenta } from "@/src/i18n/cuenta";

function destinoSeguro(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

type Textos = TextosCuenta["registro"];

function Formulario({ google, t }: { google: boolean; t: Textos }) {
  const router = useRouter();
  const destino = destinoSeguro(useSearchParams().get("next"));
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

        <form className="form-panel" onSubmit={crear}>
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
            <label className="etiqueta-campo" htmlFor="nombre">{t.nombre}</label>
            <input
              id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
              placeholder={t.nombrePh} autoComplete="name" autoFocus
              className={error ? "campo campo-error" : "campo"}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <label className="etiqueta-campo" htmlFor="email">{t.correo}</label>
            <input
              id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={t.correoPh} autoComplete="email"
              className={error ? "campo campo-error" : "campo"}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <label className="etiqueta-campo" htmlFor="password">{t.password}</label>
            <input
              id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPh} autoComplete="new-password"
              className={error ? "campo campo-error" : "campo"}
            />
            <p className="ayuda-campo">{t.passwordAyuda}</p>
          </div>

          <button type="submit" disabled={ocupado} className="btn btn-primario btn-lg" style={{ width: "100%", marginTop: 20 }}>
            {ocupado ? <><span className="cargador" /> {t.creando}</> : t.crear}
          </button>

          <p className="lead" style={{ marginTop: 22 }}>
            {t.yaTienes} <Link href="/login">{t.entra}</Link>
          </p>
        </form>
      </div>
    </main>
  );
}

export function RegistroForm({ google, t }: { google: boolean; t: Textos }) {
  return (
    <Suspense fallback={null}>
      <Formulario google={google} t={t} />
    </Suspense>
  );
}
