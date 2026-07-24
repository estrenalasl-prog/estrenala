import { googleConfigurado } from "@/src/auth/google";
import { RegistroForm } from "./RegistroForm";

export default function RegistroPage() {
  return <RegistroForm google={googleConfigurado()} />;
}
