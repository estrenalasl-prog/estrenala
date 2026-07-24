import Link from "next/link";
import { verificarEmail } from "@/src/auth/verificacion";
import { accountStore } from "@/src/repositories/accounts";
import { Logo } from "../_components/Logo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function VerificarPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  let ok = false;
  try {
    await verificarEmail(accountStore, token ?? "");
    ok = true;
  } catch {
    ok = false;
  }

  return (
    <main className="login-envoltorio">
      <div className="split">
        <aside className="marca-panel">
          <div className="grano" />
          <Logo tono="oscuro" alto={34} />
          <p className="claim">Tu web hecha con IA, por fin en directo.</p>
        </aside>
        <div className="form-panel">
          <h2>{ok ? "¡Correo confirmado!" : "Este enlace ya no vale"}</h2>
          <p className="lead">
            {ok
              ? "Tu cuenta está verificada. Ya puedes publicar tus webs sin límites."
              : "El enlace ha caducado o ya se usó. Entra y pide uno nuevo desde el aviso del panel."}
          </p>
          <Link href={ok ? "/" : "/login"} className="btn btn-primario btn-lg" style={{ width: "100%", marginTop: 8 }}>
            {ok ? "Ir a mi panel" : "Ir a entrar"}
          </Link>
        </div>
      </div>
    </main>
  );
}
