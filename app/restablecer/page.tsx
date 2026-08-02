import { RestablecerForm } from "./RestablecerForm";
import { idiomaActual } from "@/src/i18n/servidor";
import { textosCuenta } from "@/src/i18n/cuenta";

export default async function RestablecerPage() {
  return <RestablecerForm t={textosCuenta(await idiomaActual()).restablecer} />;
}
