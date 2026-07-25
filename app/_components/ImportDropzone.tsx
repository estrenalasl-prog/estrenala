"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ArchivoSubida = { file: File; ruta: string };

// Recorre una entrada del drag&drop (archivo o carpeta) acumulando rutas relativas.
async function leerEntrada(entry: FileSystemEntry, base: string, out: ArchivoSubida[]): Promise<void> {
  if (entry.isFile) {
    const fe = entry as FileSystemFileEntry;
    const file = await new Promise<File>((res, rej) => fe.file(res, rej));
    out.push({ file, ruta: base + entry.name });
    return;
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    // readEntries devuelve por tandas: hay que insistir hasta que venga vacía.
    for (;;) {
      const lote = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
      if (lote.length === 0) break;
      for (const e of lote) await leerEntrada(e, base + entry.name + "/", out);
    }
  }
}

// OJO: webkitGetAsEntry debe llamarse ANTES del primer await (la lista de items
// se vacía al terminar el manejador del evento).
async function archivosDelDrop(dt: DataTransfer): Promise<ArchivoSubida[]> {
  const entries = Array.from(dt.items ?? [])
    .map((i) => (typeof i.webkitGetAsEntry === "function" ? i.webkitGetAsEntry() : null))
    .filter((e): e is FileSystemEntry => !!e);
  if (entries.length > 0) {
    const out: ArchivoSubida[] = [];
    for (const e of entries) await leerEntrada(e, "", out);
    return out;
  }
  return Array.from(dt.files ?? []).map((f) => ({ file: f, ruta: f.name }));
}

// Nombre sugerido: el de la carpeta si todo cuelga de una, si no el del archivo.
function nombreDe(archivos: ArchivoSubida[]): string {
  if (archivos.length === 0) return "";
  if (archivos.length === 1) {
    const hoja = archivos[0].ruta.split("/").pop() ?? "";
    return hoja.replace(/\.[^.]+$/, "");
  }
  const raiz = archivos[0].ruta.split("/")[0];
  return archivos.every((a) => a.ruta.startsWith(raiz + "/")) ? raiz : "";
}

export function ImportDropzone({ tono = "oscuro" }: { tono?: "oscuro" | "claro" }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const carpetaRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(archivos: ArchivoSubida[]) {
    if (archivos.length === 0) return;
    setError(null);
    setSubiendo(true);
    try {
      const form = new FormData();
      for (const a of archivos) form.append("file", a.file);
      form.append("rutas", JSON.stringify(archivos.map((a) => a.ruta)));
      form.append("nombre", nombreDe(archivos));
      const res = await fetch("/api/projects", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al importar");
      router.push(`/projects/${data.projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al importar");
      setSubiendo(false);
    }
  }

  const deInput = (lista: FileList | null): ArchivoSubida[] =>
    Array.from(lista ?? []).map((f) => ({
      file: f,
      // webkitRelativePath viene relleno al elegir una carpeta.
      ruta: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
    }));

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
          void archivosDelDrop(e.dataTransfer).then(subir);
        }}
      >
        <div className="icono">↑</div>
        <div className="grande">{subiendo ? "Subiendo…" : "Arrastra tu web aquí"}</div>
        <div className="peque">un .zip, un .html o la carpeta entera</div>
        {tono === "oscuro" ? (
          <div className="o-boton" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="btn btn-primario" disabled={subiendo}
              onClick={() => inputRef.current?.click()}>Elegir archivos</button>
            <button type="button" className="btn btn-sec" disabled={subiendo} style={{ marginLeft: 8 }}
              onClick={() => carpetaRef.current?.click()}>Elegir carpeta</button>
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        disabled={subiendo}
        onChange={(e) => { const a = deInput(e.target.files); e.target.value = ""; void subir(a); }}
      />
      {/* webkitdirectory no está en los tipos de React: se pasa como atributo suelto. */}
      <input
        ref={carpetaRef}
        type="file"
        className="hidden"
        disabled={subiendo}
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        onChange={(e) => { const a = deInput(e.target.files); e.target.value = ""; void subir(a); }}
      />

      {tono === "claro" && (
        <p className="ayuda-campo" style={{ marginTop: 10, textAlign: "center" }}>
          ¿Tienes una carpeta?{" "}
          <button type="button" className="btn btn-fantasma btn-sm" disabled={subiendo}
            onClick={() => carpetaRef.current?.click()}>Elegir carpeta</button>
        </p>
      )}
      {error && <p className="error-campo" style={{ marginTop: 12 }}>{error}</p>}
    </div>
  );
}
