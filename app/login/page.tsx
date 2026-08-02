import { Suspense } from "react";
import { googleConfigurado } from "@/src/auth/google";
import { LoginForm } from "./LoginForm";
import { idiomaActual } from "@/src/i18n/servidor";
import { textosCuenta } from "@/src/i18n/cuenta";

export default async function LoginPage() {
  const t = textosCuenta(await idiomaActual()).login;
  return (
    <Suspense fallback={null}>
      <LoginForm google={googleConfigurado()} t={t} />
    </Suspense>
  );
}
