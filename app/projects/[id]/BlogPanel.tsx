"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/src/blog/slug";
import { BotonSubir } from "./ToolsPanel";

type EstadoBlog = { tienePlantilla: boolean; posts: { id: string; titulo: string; slug: string; fecha: string }[] };
type Vista = "lista" | "plantillas" | "editor";

const AVISO = "Las páginas del blog se generan desde aquí; si las tocas con el editor visual, la próxima regeneración del blog deshará esos cambios.";

function IframePreview({ html }: { html: string }) {
  return <iframe srcDoc={html} sandbox="" className="h-96 w-full rounded border bg-white" title="vista previa" />;
}

export function BlogPanel({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<Vista>("lista");
  const [estado, setEstado] = useState<EstadoBlog | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // plantillas
  const [tplPost, setTplPost] = useState("");
  const [tplIndex, setTplIndex] = useState("");
  const [previewTpl, setPreviewTpl] = useState<string | null>(null);
  // editor de artículo
  const [postId, setPostId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTocado, setSlugTocado] = useState(false);
  const [meta, setMeta] = useState("");
  const [md, setMd] = useState("");
  const [imagenAssetId, setImagenAssetId] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [previewArt, setPreviewArt] = useState<string | null>(null);

  async function cargar() {
    try {
      const res = await fetch(`/api/projects/${projectId}/blog`);
      if (res.ok) setEstado((await res.json()) as EstadoBlog);
    } catch { /* silencioso: se reintenta al reabrir */ }
  }
  useEffect(() => { if (abierto && !estado) void cargar(); }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  async function llamar(url: string, init: RequestInit): Promise<Record<string, unknown> | null> {
    setOcupado(true); setError(null);
    try {
      const res = await fetch(url, init);
      const d = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) { setError((d.error as string) ?? "Error"); return null; }
      return d;
    } catch { setError("Error de conexión"); return null; }
    finally { setOcupado(false); }
  }

  async function generarPlantillas() {
    const d = await llamar(`/api/projects/${projectId}/blog/template`, { method: "POST" });
    if (d) { setTplPost(d.tplPost as string); setTplIndex(d.tplIndex as string); setPreviewTpl(null); }
  }
  async function abrirPlantillas() {
    setVista("plantillas"); setPreviewTpl(null);
    const d = await llamar(`/api/projects/${projectId}/blog/template`, { method: "GET" });
    if (d && d.tplPost) { setTplPost(d.tplPost as string); setTplIndex(d.tplIndex as string); }
  }
  async function guardarPlantillas() {
    const d = await llamar(`/api/projects/${projectId}/blog/template`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ tplPost, tplIndex }),
    });
    if (d) { setVista("lista"); setEstado(null); await cargar(); router.refresh(); }
  }
  async function verPreview(cual: "post" | "index") {
    const body = cual === "post" ? { cual, tplPost } : { cual, tplIndex };
    const d = await llamar(`/api/projects/${projectId}/blog/preview`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    if (d) setPreviewTpl(d.html as string);
  }

  function nuevoArticulo() {
    setPostId(null); setTitulo(""); setSlug(""); setSlugTocado(false); setMeta(""); setMd("");
    setImagenAssetId(""); setImagenUrl(""); setPreviewArt(null); setVista("editor");
  }
  async function editarArticulo(id: string) {
    const d = await llamar(`/api/projects/${projectId}/blog/posts/${id}`, { method: "GET" });
    if (!d) return;
    setPostId(id); setTitulo(d.titulo as string); setSlug(d.slug as string); setSlugTocado(true);
    setMeta(d.metaDescripcion as string); setMd(d.md as string);
    setImagenAssetId(d.imagenAssetId as string);
    setImagenUrl(`/api/projects/${projectId}/preview/blog/img/${d.slug}.${d.imagenExt}`);
    setPreviewArt(null); setVista("editor");
  }
  async function subirPortada(f: File) {
    setOcupado(true); setError(null);
    try {
      const fd = new FormData(); fd.append("file", f);
      const res = await fetch(`/api/projects/${projectId}/assets`, { method: "POST", body: fd });
      const d = (await res.json().catch(() => ({}))) as { error?: string; assetId?: string; url?: string };
      if (!res.ok || !d.assetId) { setError(d.error ?? "Error al subir la imagen"); return; }
      setImagenAssetId(d.assetId); setImagenUrl(d.url ?? "");
    } catch { setError("Error de conexión"); }
    finally { setOcupado(false); }
  }
  async function verPreviewArticulo() {
    const d = await llamar(`/api/projects/${projectId}/blog/preview`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ cual: "post", titulo, slug, metaDescripcion: meta, md, imagenUrl: imagenUrl || undefined }),
    });
    if (d) setPreviewArt(d.html as string);
  }
  async function guardarArticulo() {
    const body = JSON.stringify({ titulo, slug, metaDescripcion: meta, md, imagenAssetId });
    const d = postId
      ? await llamar(`/api/projects/${projectId}/blog/posts/${postId}`, { method: "PUT", headers: { "content-type": "application/json" }, body })
      : await llamar(`/api/projects/${projectId}/blog/posts`, { method: "POST", headers: { "content-type": "application/json" }, body });
    if (d) { setVista("lista"); setEstado(null); await cargar(); router.refresh(); }
  }
  async function borrarArticulo(id: string, tituloPost: string) {
    if (!confirm(`¿Borrar el artículo "${tituloPost}"? Esta acción no se puede deshacer.`)) return;
    const d = await llamar(`/api/projects/${projectId}/blog/posts/${id}`, { method: "DELETE" });
    if (d) { setEstado(null); await cargar(); router.refresh(); }
  }

  return (
    <div className="mb-3 rounded-lg border bg-gray-50 px-3 py-2">
      <button onClick={() => setAbierto(!abierto)} className="text-sm font-medium">
        {abierto ? "▾" : "▸"} Blog
      </button>
      {abierto && (
        <div className="mt-2">
          <p className="mb-2 text-xs text-gray-500">{AVISO}</p>

          {vista === "lista" && (
            <div>
              {estado && !estado.tienePlantilla ? (
                <div className="rounded-lg border bg-white p-3">
                  <p className="text-sm font-medium">El blog de tu web</p>
                  <p className="mb-2 text-xs text-gray-500">Artículos con tu diseño, índice y sitemap automáticos. Primero crea la plantilla: la IA lee tu portada y propone el diseño del blog.</p>
                  <button onClick={() => { setVista("plantillas"); void generarPlantillas(); }} disabled={ocupado}
                    className="rounded bg-indigo-600 px-3 py-1 text-sm text-white disabled:opacity-50">Crear la plantilla del blog con IA</button>
                </div>
              ) : (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <button onClick={nuevoArticulo} className="rounded bg-indigo-600 px-3 py-1 text-sm text-white">Nuevo artículo</button>
                    <button onClick={() => void abrirPlantillas()} className="text-xs text-gray-500 underline">Editar plantillas</button>
                    {ocupado && <span className="text-sm text-gray-400">cargando…</span>}
                  </div>
                  <ul className="space-y-1">
                    {(estado?.posts ?? []).map((p) => (
                      <li key={p.id} className="flex items-center justify-between rounded border bg-white px-2 py-1 text-sm">
                        <span>{p.titulo} <span className="text-xs text-gray-400">· {p.fecha} · /blog/{p.slug}.html</span></span>
                        <span className="flex gap-2">
                          <button onClick={() => void editarArticulo(p.id)} disabled={ocupado} className="rounded border px-2 py-0.5 text-xs">Editar</button>
                          <button onClick={() => void borrarArticulo(p.id, p.titulo)} disabled={ocupado} className="text-xs text-gray-500 underline">borrar</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {vista === "plantillas" && (
            <div className="space-y-2">
              {ocupado && !tplPost && <p className="text-sm text-gray-500">Generando la plantilla con IA (puede tardar un minuto)…</p>}
              {tplPost && (
                <>
                  <label className="block text-xs font-medium">Plantilla de artículo</label>
                  <textarea value={tplPost} onChange={(e) => setTplPost(e.target.value)} rows={8} className="w-full rounded border p-2 font-mono text-xs" />
                  <label className="block text-xs font-medium">Plantilla del índice</label>
                  <textarea value={tplIndex} onChange={(e) => setTplIndex(e.target.value)} rows={8} className="w-full rounded border p-2 font-mono text-xs" />
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => void guardarPlantillas()} disabled={ocupado} className="rounded bg-indigo-600 px-3 py-1 text-sm text-white disabled:opacity-50">Guardar plantillas</button>
                    <button onClick={() => void verPreview("post")} disabled={ocupado} className="rounded border px-2 py-1 text-xs">Vista previa artículo</button>
                    <button onClick={() => void verPreview("index")} disabled={ocupado} className="rounded border px-2 py-1 text-xs">Vista previa índice</button>
                    <button onClick={() => void generarPlantillas()} disabled={ocupado} className="rounded border px-2 py-1 text-xs">Volver a generar</button>
                    <button onClick={() => setVista("lista")} className="rounded border px-2 py-1 text-xs">Cancelar</button>
                  </div>
                  {previewTpl && <IframePreview html={previewTpl} />}
                </>
              )}
            </div>
          )}

          {vista === "editor" && (
            <div className="space-y-2">
              <input value={titulo} placeholder="Título del artículo"
                onChange={(e) => { setTitulo(e.target.value); if (!slugTocado) setSlug(slugify(e.target.value)); }}
                className="w-full rounded border px-2 py-1 text-sm" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">/blog/</span>
                <input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTocado(true); }}
                  className="w-64 rounded border px-2 py-1 text-xs" />
                <span className="text-xs text-gray-500">.html</span>
              </div>
              <div>
                <input value={meta} placeholder="Meta descripción (para Google)"
                  onChange={(e) => setMeta(e.target.value)} className="w-full rounded border px-2 py-1 text-sm" />
                <span className={"text-xs " + (meta.length > 160 ? "text-red-600" : "text-gray-400")}>{meta.length}/160</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Imagen de portada:</span>
                {imagenUrl && <img src={imagenUrl} alt="" className="h-8 w-14 rounded object-cover" />}
                <BotonSubir texto={imagenAssetId ? "Cambiar imagen" : "Subir imagen"} ocupado={ocupado} onFile={(f) => void subirPortada(f)} />
              </div>
              <textarea value={md} onChange={(e) => setMd(e.target.value)} rows={14}
                placeholder="Escribe o pega aquí el artículo en markdown (por ejemplo, el que te escribió tu IA)…"
                className="w-full rounded border p-2 font-mono text-xs" />
              <div className="flex gap-2">
                <button onClick={() => void guardarArticulo()} disabled={ocupado} className="rounded bg-indigo-600 px-3 py-1 text-sm text-white disabled:opacity-50">Guardar artículo</button>
                <button onClick={() => void verPreviewArticulo()} disabled={ocupado} className="rounded border px-2 py-1 text-xs">Vista previa</button>
                <button onClick={() => setVista("lista")} className="rounded border px-2 py-1 text-xs">Cancelar</button>
              </div>
              {previewArt && <IframePreview html={previewArt} />}
            </div>
          )}

          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
