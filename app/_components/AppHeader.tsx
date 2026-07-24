import Link from "next/link";
import { LogoutButton } from "../LogoutButton";
import { Logo } from "./Logo";

// Cabecera común de la app (panel, proyecto, configuración). Estilo Estrénala.
// Fondo claro (lienzo) → variante del logo con el wordmark en tinta.
export function AppHeader() {
  return (
    <header className="cabecera">
      <div className="cab-int">
        <Link href="/" aria-label="Estrénala — ir al panel"><Logo tono="claro" alto={26} /></Link>
        <nav>
          <Link href="/settings">Configuración</Link>
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
