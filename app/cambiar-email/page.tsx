"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "../_components/Logo";

function Confirmar() {
  const token = useSearchParams().get("token") ?? "";
  const [estado, setEstado] = useState<"cargando" | "ok" | "error">("cargando");
  const yaVa = useRef(false);

  useEffect(() => {
    if (yaVa.current) return;
    yaVa.current = true;
    (async () => {
      const res = await fetch("/api/cuenta/email/confirmar", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setEstado(res.ok ? "ok" : "error");
    })();
  }, [token]);

  return (
    <div className="form-panel">
      {estado === "cargando" && <><h2>Confirmando…</h2><p className="lead">Un momento.</p></>}
      {estado === "ok" && <><h2>¡Correo actualizado!</h2><p className="lead">Ya usas esta dirección para entrar en Estrénala.</p><Link href="/settings" className="btn btn-primario btn-lg" style={{ width: "100%", marginTop: 8 }}>Ir a Configuración</Link></>}
      {estado === "error" && <><h2>Este enlace ya no vale</h2><p className="lead">El enlace ha caducado o ya se usó. Pide el cambio otra vez desde tu cuenta.</p><Link href="/settings" className="btn btn-sec btn-lg" style={{ width: "100%", marginTop: 8 }}>Ir a Configuración</Link></>}
    </div>
  );
}

export default function CambiarEmailPage() {
  return (
    <main className="login-envoltorio">
      <div className="split">
        <aside className="marca-panel">
          <div className="grano" />
          <Logo tono="oscuro" alto={34} />
          <p className="claim">Tu cuenta, siempre al día.</p>
        </aside>
        <Suspense fallback={<div className="form-panel"><p className="lead">Cargando…</p></div>}>
          <Confirmar />
        </Suspense>
      </div>
    </main>
  );
}
