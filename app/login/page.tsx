"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true); setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); return; }
      router.push("/");
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center p-8">
      <form onSubmit={entrar} className="w-full max-w-xs space-y-3 rounded-lg border p-6">
        <h1 className="text-lg font-bold">Wordclicks</h1>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña" autoFocus
          className="w-full rounded border px-3 py-2 text-sm" />
        <button type="submit" disabled={ocupado}
          className="w-full rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50">
          Entrar
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </main>
  );
}
