"use client";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "../_components/Logo";
import type { TextosCuenta } from "@/src/i18n/cuenta";

type Textos = TextosCuenta["restablecer"];

function Formulario({ t }: { t: Textos }) {
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
        <h2>{t.hechaTitulo}</h2>
        <p className="lead">{t.hechaLead}</p>
        <Link href="/login" className="btn btn-primario btn-lg" style={{ width: "100%", marginTop: 8 }}>{t.irEntrar}</Link>
      </div>
    );
  }

  return (
    <form className="form-panel" onSubmit={guardar}>
      <h2>{t.titulo}</h2>
      <p className="lead">{t.lead}</p>

      {error && (
        <div className="aviso-error" role="alert">
          <span className="ico">!</span><span>{error}</span>
        </div>
      )}

      <div>
        <label className="etiqueta-campo" htmlFor="password">{t.nueva}</label>
        <input
          id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder={t.nuevaPh} autoComplete="new-password" autoFocus
          className={error ? "campo campo-error" : "campo"}
        />
        <p className="ayuda-campo">{t.ayuda}</p>
      </div>

      <button type="submit" disabled={ocupado} className="btn btn-primario btn-lg" style={{ width: "100%", marginTop: 20 }}>
        {ocupado ? <><span className="cargador" /> {t.guardando}</> : t.guardar}
      </button>
    </form>
  );
}

export function RestablecerForm({ t }: { t: Textos }) {
  return (
    <main className="login-envoltorio">
      <div className="split">
        <aside className="marca-panel">
          <div className="grano" />
          <Logo tono="oscuro" alto={34} />
          <p className="claim">{t.claim}</p>
        </aside>
        <Suspense fallback={<div className="form-panel"><p className="lead">{t.cargando}</p></div>}>
          <Formulario t={t} />
        </Suspense>
      </div>
    </main>
  );
}
