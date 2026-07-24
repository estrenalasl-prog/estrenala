import { Suspense } from "react";
import { googleConfigurado } from "@/src/auth/google";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm google={googleConfigurado()} />
    </Suspense>
  );
}
