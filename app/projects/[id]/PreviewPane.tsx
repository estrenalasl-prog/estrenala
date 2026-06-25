"use client";
import { useState } from "react";

export function PreviewPane({
  projectId, entryPath, pages,
}: { projectId: string; entryPath: string; pages: string[] }) {
  const [actual, setActual] = useState(entryPath);
  const [guardando, setGuardando] = useState(false);
  const src = `/api/projects/${projectId}/preview/${actual === entryPath ? "" : actual}`;

  async function cambiarEntrada(nuevo: string) {
    setActual(nuevo);
    setGuardando(true);
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entryPath: nuevo }),
    });
    setGuardando(false);
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <label className="text-sm text-gray-600">Página de entrada:</label>
        <select
          value={actual}
          onChange={(e) => void cambiarEntrada(e.target.value)}
          className="rounded border px-2 py-1 text-sm"
        >
          {pages.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        {guardando && <span className="text-sm text-gray-400">guardando…</span>}
      </div>
      <iframe
        key={src}
        src={src}
        sandbox="allow-scripts"
        className="h-[80vh] w-full rounded-lg border"
        title="preview"
      />
    </div>
  );
}
