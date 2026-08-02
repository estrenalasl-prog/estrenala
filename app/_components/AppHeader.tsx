import Link from "next/link";
import { LogoutButton } from "../LogoutButton";
import { Logo } from "./Logo";
import { SelectorEspacio } from "./SelectorEspacio";
import { idiomaDeSesion } from "@/src/i18n/servidor";
import { textosPanel } from "@/src/i18n/panel";

// Cabecera común de la app (panel, proyecto, configuración). Estilo Estrénala.
// Fondo claro (lienzo) → variante del logo con el wordmark en tinta.
//
// Resuelve el idioma ella misma en vez de recibirlo: sale en todas las pantallas
// del panel, y pasárselo desde cada una sería repetir lo mismo en seis sitios y
// olvidarlo en el séptimo.
export async function AppHeader() {
  const t = textosPanel(await idiomaDeSesion()).cabecera;
  return (
    <header className="cabecera">
      <div className="cab-int">
        <Link href="/" aria-label={t.inicio}><Logo tono="claro" alto={26} /></Link>
        <nav>
          <SelectorEspacio etiqueta={t.espacioActivo} />
          <Link href="/settings">{t.configuracion}</Link>
          <LogoutButton texto={t.salir} />
        </nav>
      </div>
    </header>
  );
}
