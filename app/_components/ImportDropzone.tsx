"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function ImportDropzone({ tono = "oscuro" }: { tono?: "oscuro" | "claro" }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
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

  const claseBase = tono === "oscuro" ? "dropzone" : "dropzone-vacio";

  return (
    <div>
      <div
        className={arrastrando ? `${claseBase} is-drag` : claseBase}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void subir(file);
        }}
      >
        <div className="icono">↑</div>
        <div className="grande">{subiendo ? "Subiendo…" : "Arrastra tu web aquí"}</div>
        <div className="peque">.zip de tu web</div>
        {tono === "oscuro" ? (
          <div className="o-boton">
            <button type="button" className="btn btn-primario" disabled={subiendo}>Elegir archivo</button>
          </div>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        disabled={subiendo}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void subir(file);
        }}
      />
      {error && <p className="error-campo" style={{ marginTop: 12 }}>{error}</p>}
    </div>
  );
}
