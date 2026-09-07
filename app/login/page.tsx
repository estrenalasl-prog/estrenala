import type { Metadata } from "next";
import { Suspense } from "react";
import { googleConfigurado } from "@/src/auth/google";
import { LoginForm } from "./LoginForm";
import { idiomaActual } from "@/src/i18n/servidor";
import { textosCuenta } from "@/src/i18n/cuenta";

// Sin esto, la pestaña heredaba el título de app/layout.tsx, que es español
// fijo: con el navegador en inglés el cuerpo salía en inglés y la pestaña en
// español. Es lo primero que se ve en una captura de pantalla.
export async function generateMetadata(): Promise<Metadata> {
  return { title: `${textosCuenta(await idiomaActual()).login.titulo} · Estrénala` };
}

export default async function LoginPage() {
  const t = textosCuenta(await idiomaActual()).login;
  return (
    <Suspense fallback={null}>
      <LoginForm google={googleConfigurado()} t={t} />
    </Suspense>
  );
}
