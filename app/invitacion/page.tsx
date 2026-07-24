"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "../_components/Logo";

function Aceptar() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [estado, setEstado] = useState<"cargando" | "ok" | "error">("cargando");
  const yaVa = useRef(false);

  useEffect(() => {
    if (yaVa.current) return;
    yaVa.current = true;
    (async () => {
      const res = await fetch("/api/equipo/aceptar", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.status === 401) {
        const destino = `/invitacion?token=${encodeURIComponent(token)}`;
        router.push(`/login?next=${encodeURIComponent(destino)}`);
        return;
      }
      if (res.ok) { setEstado("ok"); setTimeout(() => { router.push("/"); router.refresh(); }, 1200); }
      else setEstado("error");
    })();
  }, [token, router]);

  return (
    <div className="form-panel">
      {estado === "cargando" && <><h2>Uniéndote al espacio…</h2><p className="lead">Un momento.</p></>}
      {estado === "ok" && <><h2>¡Ya estás dentro!</h2><p className="lead">Te llevamos a tu panel.</p></>}
      {estado === "error" && (
        <>
          <h2>Esta invitación ya no vale</h2>
          <p className="lead">El enlace ha caducado o ya se usó. Pídele a quien te invitó que te mande uno nuevo.</p>
          <Link href="/" className="btn btn-primario btn-lg" style={{ width: "100%", marginTop: 8 }}>Ir a mi panel</Link>
        </>
      )}
    </div>
  );
}

export default function InvitacionPage() {
  return (
    <main className="login-envoltorio">
      <div className="split">
        <aside className="marca-panel">
          <div className="grano" />
          <Logo tono="oscuro" alto={34} />
          <p className="claim">Un espacio, todo el equipo.</p>
        </aside>
        <Suspense fallback={<div className="form-panel"><p className="lead">Cargando…</p></div>}>
          <Aceptar />
        </Suspense>
      </div>
    </main>
  );
}
