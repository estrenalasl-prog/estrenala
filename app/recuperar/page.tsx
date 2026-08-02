import { RecuperarForm } from "./RecuperarForm";
import { idiomaActual } from "@/src/i18n/servidor";
import { textosCuenta } from "@/src/i18n/cuenta";

export default async function RecuperarPage() {
  return <RecuperarForm t={textosCuenta(await idiomaActual()).recuperar} />;
}
