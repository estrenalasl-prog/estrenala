import { AppHeader } from "../_components/AppHeader";
import { SettingsBody } from "./SettingsBody";

// La cabecera es de SERVIDOR (resuelve el idioma de la cuenta) y el cuerpo de
// CLIENTE (hooks y fetch). Una pantalla de cliente no puede importar una de
// servidor, así que la página se parte aquí: esta envoltura es de servidor y
// monta las dos.
export default function SettingsPage() {
  return (
    <>
      <AppHeader />
      <SettingsBody />
    </>
  );
}
