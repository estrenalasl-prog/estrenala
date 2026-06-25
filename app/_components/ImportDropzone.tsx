"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ImportDropzone() {
  const router = useRouter();
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(file: File) {
    setError(null);
    setSubiendo(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("nombre", file.name.replace(/\.zip$/i, ""));
      const res = await fetch("/api/projects", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al importar");
      router.push(`/projects/${data.projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al importar");
      setSubiendo(false);
    }
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) void subir(file);
      }}
      className="rounded-xl border-2 border-dashed border-gray-300 p-10 text-center"
    >
      <p className="mb-3 text-gray-600">
        {subiendo ? "Subiendo…" : "Arrastra aquí el .zip de tu web"}
      </p>
      <label className="cursor-pointer rounded-lg bg-black px-4 py-2 text-white">
        Elegir archivo
        <input
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          disabled={subiendo}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void subir(file);
          }}
        />
      </label>
      {error && <p className="mt-3 text-red-600">{error}</p>}
    </div>
  );
}
