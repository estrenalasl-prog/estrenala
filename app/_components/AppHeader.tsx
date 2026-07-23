import Link from "next/link";
import { LogoutButton } from "../LogoutButton";

// Cabecera común de la app (panel, proyecto, configuración). Estilo Estrénala.
export function AppHeader() {
  return (
    <header className="cabecera">
      <div className="cab-int">
        <Link href="/" className="wordmark">Estrénal<span className="hl">a</span></Link>
        <nav>
          <Link href="/settings">Configuración</Link>
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
