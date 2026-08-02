import { googleConfigurado } from "@/src/auth/google";
import { RegistroForm } from "./RegistroForm";
import { idiomaActual } from "@/src/i18n/servidor";
import { textosCuenta } from "@/src/i18n/cuenta";

// Los textos se resuelven AQUÍ, en el servidor, y bajan como propiedad. Si el
// formulario importara el catálogo, los cinco idiomas acabarían en el paquete
// que se descarga el navegador para enseñar uno.
export default async function RegistroPage() {
  const t = textosCuenta(await idiomaActual()).registro;
  return <RegistroForm google={googleConfigurado()} t={t} />;
}
