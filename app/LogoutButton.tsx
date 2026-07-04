"use client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  async function salir() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button onClick={() => void salir()} className="text-xs text-gray-500 underline">
      Salir
    </button>
  );
}
