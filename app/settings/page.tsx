import { AppHeader } from "../_components/AppHeader";
import { SettingsBody } from "./SettingsBody";
import { idiomaDeSesion } from "@/src/i18n/servidor";
import { textosAjustes } from "@/src/i18n/ajustes";

// La cabecera es de SERVIDOR (resuelve el idioma de la cuenta) y el cuerpo de
// CLIENTE (hooks y fetch). Una pantalla de cliente no puede importar una de
// servidor, así que la página se parte aquí: esta envoltura es de servidor y
// monta las dos.
//
// El idioma se resuelve aquí y baja como prop: si el cuerpo importara el
// catálogo entero, el navegador se descargaría los cinco idiomas para enseñar
// uno.
export default async function SettingsPage() {
  const idioma = await idiomaDeSesion();
  return (
    <>
      <AppHeader />
      <SettingsBody idioma={idioma} t={textosAjustes(idioma)} />
    </>
  );
}
