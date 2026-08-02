import Link from "next/link";
import { verificarEmail } from "@/src/auth/verificacion";
import { accountStore } from "@/src/repositories/accounts";
import { Logo } from "../_components/Logo";
import { idiomaActual } from "@/src/i18n/servidor";
import { textosCuenta } from "@/src/i18n/cuenta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function VerificarPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const t = textosCuenta(await idiomaActual()).verificar;
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
          <p className="claim">{t.claim}</p>
        </aside>
        <div className="form-panel">
          <h2>{ok ? t.okTitulo : t.malTitulo}</h2>
          <p className="lead">{ok ? t.okLead : t.malLead}</p>
          <Link href={ok ? "/" : "/login"} className="btn btn-primario btn-lg" style={{ width: "100%", marginTop: 8 }}>
            {ok ? t.okBoton : t.malBoton}
          </Link>
        </div>
      </div>
    </main>
  );
}
