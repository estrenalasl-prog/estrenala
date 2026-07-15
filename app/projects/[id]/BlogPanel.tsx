"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/src/blog/slug";
import { BotonSubir } from "./ToolsPanel";
import { ArticleAiWorkspace, type DraftDetalle } from "./ArticleAiWorkspace";

type EstadoBlog = { tienePlantilla: boolean; posts: { id: string; titulo: string; slug: string; fecha: string }[] };
type BorradorItem = { id: string; keyword: string; estado: string; titulo: string | null; createdAt: string };
type TemaItem = {
  id: string; keyword: string; fuente: string; crecimientoPct: number | null;
  volumenAprox: number | null; relevancia: number; estado: string; discoveredAt: string;
};
type Vista = "lista" | "plantillas" | "editor" | "ia";

const AVISO = "Las páginas del blog se generan desde aquí; si las tocas con el editor visual, la próxima regeneración del blog deshará esos cambios.";

function estadoLegible(estado: string): string {
  if (estado === "revision") return "✅ para revisar";
  if (estado === "error") return "⚠ error";
  return "⏳ en marcha";
}

// Modelos curados del selector (4b2); "" = default de la plataforma. Cualquier
// otro slug de openrouter.ai/models entra por la opción «Otro…».
const MODELOS: { valor: string; nombre: string }[] = [
  { valor: "", nombre: "Por defecto de la plataforma (Claude Sonnet 4.6)" },
  { valor: "anthropic/claude-sonnet-4.6", nombre: "Claude Sonnet 4.6 — calidad máxima" },
  { valor: "anthropic/claude-haiku-4.5", nombre: "Claude Haiku 4.5 — rápido y económico" },
  { valor: "openai/gpt-5-mini", nombre: "GPT-5 Mini — económico" },
  { valor: "google/gemini-2.5-flash", nombre: "Gemini 2.5 Flash — muy económico" },
  { valor: "deepseek/deepseek-chat", nombre: "DeepSeek — muy económico" },
];

function nombreModelo(modelo: string): string {
  const curado = MODELOS.find((m) => m.valor === modelo);
  if (curado) return curado.nombre;
  return modelo; // slug libre
}

function BadgeRelevancia({ relevancia }: { relevancia: number }) {
  const color = relevancia >= 70 ? "bg-green-100 text-green-800"
    : relevancia >= 40 ? "bg-amber-100 text-amber-800"
    : "bg-gray-100 text-gray-600";
  return <span className={`rounded px-1.5 py-0.5 text-xs ${color}`} title="Relevancia para tu nicho (0-100)">{relevancia}</span>;
}

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
  // redacción con IA (4b)
  const [nicho, setNicho] = useState("");
  const [nichoMsg, setNichoMsg] = useState<string | null>(null);
  const [borradores, setBorradores] = useState<BorradorItem[]>([]);
  const [mostrarKw, setMostrarKw] = useState(false);
  const [kw, setKw] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftOrigenId, setDraftOrigenId] = useState<string | null>(null);
  // selector de modelo (4b2): sel = valor curado | "otro"; custom = slug libre
  const [modeloSel, setModeloSel] = useState("");
  const [modeloCustom, setModeloCustom] = useState("");
  const [modeloGuardado, setModeloGuardado] = useState("");
  // radar de temas (4c)
  const [semillas, setSemillas] = useState("");
  const [temas, setTemas] = useState<TemaItem[]>([]);
  const [radarMsg, setRadarMsg] = useState<string | null>(null);

  async function cargar() {
    try {
      const [rEstado, rSettings, rDrafts, rTemas] = await Promise.all([
        fetch(`/api/projects/${projectId}/blog`),
        fetch(`/api/projects/${projectId}/blog/settings`),
        fetch(`/api/projects/${projectId}/blog/drafts`),
        fetch(`/api/projects/${projectId}/blog/keywords`),
      ]);
      if (rEstado.ok) setEstado((await rEstado.json()) as EstadoBlog);
      if (rSettings.ok) {
        const s = (await rSettings.json()) as { nicho?: string; modelo?: string; keywordsSemilla?: string };
        setNicho(s.nicho ?? "");
        setSemillas(s.keywordsSemilla ?? "");
        const m = s.modelo ?? "";
        setModeloGuardado(m);
        if (MODELOS.some((x) => x.valor === m)) { setModeloSel(m); setModeloCustom(""); }
        else { setModeloSel("otro"); setModeloCustom(m); }
      }
      if (rDrafts.ok) setBorradores((await rDrafts.json()) as BorradorItem[]);
      if (rTemas.ok) setTemas((await rTemas.json()) as TemaItem[]);
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
    if (d) {
      if (draftOrigenId) {
        // El artículo ya está guardado: el borrador IA sobra. Si el DELETE
        // falla, el borrador queda visible en la lista y se puede borrar a mano.
        try { await fetch(`/api/projects/${projectId}/blog/drafts/${draftOrigenId}`, { method: "DELETE" }); } catch { /* silencioso */ }
        setDraftOrigenId(null);
      }
      setVista("lista"); setEstado(null); await cargar(); router.refresh();
    }
  }
  async function borrarArticulo(id: string, tituloPost: string) {
    if (!confirm(`¿Borrar el artículo "${tituloPost}"? Esta acción no se puede deshacer.`)) return;
    const d = await llamar(`/api/projects/${projectId}/blog/posts/${id}`, { method: "DELETE" });
    if (d) { setEstado(null); await cargar(); router.refresh(); }
  }

  // --- redacción con IA (4b) ---
  const modeloEfectivo = () => (modeloSel === "otro" ? modeloCustom.trim() : modeloSel);
  async function guardarConfig() {
    setNichoMsg(null);
    const modelo = modeloEfectivo();
    const d = await llamar(`/api/projects/${projectId}/blog/settings`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ nicho, modelo, keywordsSemilla: semillas }),
    });
    if (d) { setNichoMsg("Guardado"); setModeloGuardado(modelo); }
  }
  async function crearBorrador() {
    const d = await llamar(`/api/projects/${projectId}/blog/drafts`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ keyword: kw }),
    });
    if (d && d.draftId) {
      setKw(""); setMostrarKw(false);
      setDraftId(d.draftId as string); setVista("ia");
      void cargar();
    }
  }
  async function borrarBorrador(id: string, keyword: string) {
    if (!confirm(`¿Borrar el borrador "${keyword}"? Esta acción no se puede deshacer.`)) return;
    const d = await llamar(`/api/projects/${projectId}/blog/drafts/${id}`, { method: "DELETE" });
    if (d) await cargar();
  }
  // --- radar de temas (4c) ---
  async function buscarTemas(forzar: boolean) {
    setRadarMsg(null);
    const d = await llamar(`/api/projects/${projectId}/blog/keywords/radar`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ forzar }),
    });
    if (!d) return;
    if (d.actualizado === false) setRadarMsg("El radar ya se actualizó hoy.");
    else setRadarMsg(`Radar actualizado: ${d.candidatos as number} temas analizados.`);
    await cargar();
  }
  async function escribirDesdeTema(t: TemaItem) {
    const d = await llamar(`/api/projects/${projectId}/blog/drafts`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ keyword: t.keyword }),
    });
    if (!d || !d.draftId) return;
    // Marcarla usada es best-effort: si falla, seguirá en la lista.
    try {
      await fetch(`/api/projects/${projectId}/blog/keywords/${t.id}`, {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ estado: "usada" }),
      });
    } catch { /* silencioso */ }
    setDraftId(d.draftId as string); setVista("ia");
    void cargar();
  }
  async function descartarTema(t: TemaItem) {
    const d = await llamar(`/api/projects/${projectId}/blog/keywords/${t.id}`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ estado: "descartada" }),
    });
    if (d) await cargar();
  }

  // Borrador en revision → editor 4a pre-rellenado; la portada la sube el usuario.
  function usarBorrador(det: DraftDetalle) {
    setPostId(null);
    setTitulo(det.draft.titulo ?? "");
    setSlug(det.draft.slug ?? "");
    setSlugTocado(true);
    setMeta(det.draft.metaDescripcion ?? "");
    setMd(det.draft.articuloMd ?? "");
    setImagenAssetId(""); setImagenUrl(""); setPreviewArt(null);
    setDraftOrigenId(det.draft.id);
    setVista("editor");
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
                  <div className="mb-2 rounded-lg border bg-white p-3">
                    <p className="text-sm font-medium">Escribir con IA</p>
                    <label className="mt-1 block text-xs text-gray-500">De qué va tu blog (la IA lo usa para enfocar los artículos)</label>
                    <textarea value={nicho} rows={2}
                      placeholder="p. ej.: Automatización e IA para pymes: agentes, herramientas y casos prácticos"
                      onChange={(e) => { setNicho(e.target.value); setNichoMsg(null); }}
                      className="mt-1 w-full rounded border p-2 text-xs" />
                    <label className="mt-1 block text-xs text-gray-500">Keywords semilla (separadas por comas; ayudan al radar a buscar temas de tu nicho)</label>
                    <input value={semillas}
                      placeholder="p. ej.: agentes ia, automatización pymes, chatbots"
                      onChange={(e) => { setSemillas(e.target.value); setNichoMsg(null); }}
                      className="mt-1 w-full rounded border px-2 py-1 text-xs" />
                    <label className="mt-1 block text-xs text-gray-500">Modelo de IA para redactar</label>
                    <div className="mt-1 flex items-center gap-2">
                      <select value={modeloSel}
                        onChange={(e) => { setModeloSel(e.target.value); setNichoMsg(null); }}
                        className="rounded border px-2 py-1 text-xs">
                        {MODELOS.map((m) => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
                        <option value="otro">Otro…</option>
                      </select>
                      {modeloSel === "otro" && (
                        <input value={modeloCustom}
                          placeholder="identificador de openrouter.ai/models, p. ej. deepseek/deepseek-chat:free"
                          onChange={(e) => { setModeloCustom(e.target.value); setNichoMsg(null); }}
                          className="w-full rounded border px-2 py-1 text-xs" />
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => void guardarConfig()} disabled={ocupado}
                        className="rounded border px-2 py-1 text-xs disabled:opacity-50">Guardar configuración</button>
                      {nichoMsg && <span className="text-xs text-green-700">{nichoMsg}</span>}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">Los modelos económicos gastan menos crédito (los «:free» nada); si uno da error al generar, prueba otro.</p>
                    {!mostrarKw ? (
                      <button onClick={() => setMostrarKw(true)} disabled={ocupado}
                        className="mt-2 rounded bg-indigo-600 px-3 py-1 text-sm text-white disabled:opacity-50">Escribir artículo con IA</button>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        <input value={kw} placeholder="Keyword o tema del artículo"
                          onChange={(e) => setKw(e.target.value)} className="w-full rounded border px-2 py-1 text-sm" />
                        <button onClick={() => void crearBorrador()} disabled={ocupado}
                          className="shrink-0 rounded bg-indigo-600 px-3 py-1 text-sm text-white disabled:opacity-50">Crear borrador</button>
                        <button onClick={() => { setMostrarKw(false); setKw(""); }}
                          className="shrink-0 rounded border px-2 py-1 text-xs">Cancelar</button>
                      </div>
                    )}
                    {borradores.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {borradores.map((b) => (
                          <li key={b.id} className="flex items-center justify-between rounded border bg-gray-50 px-2 py-1 text-sm">
                            <span>{b.titulo ?? b.keyword} <span className="text-xs text-gray-400">· {estadoLegible(b.estado)}</span></span>
                            <span className="flex gap-2">
                              <button onClick={() => { setDraftId(b.id); setVista("ia"); }} disabled={ocupado}
                                className="rounded border px-2 py-0.5 text-xs">Abrir</button>
                              <button onClick={() => void borrarBorrador(b.id, b.keyword)} disabled={ocupado}
                                className="text-xs text-gray-500 underline">borrar</button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-3 border-t pt-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">Temas en tendencia</p>
                        <button onClick={() => void buscarTemas(false)} disabled={ocupado}
                          className="rounded border px-2 py-0.5 text-xs disabled:opacity-50">🔍 Buscar temas de hoy</button>
                        {radarMsg?.startsWith("El radar ya") && (
                          <button onClick={() => void buscarTemas(true)} disabled={ocupado}
                            className="text-xs text-gray-500 underline">Forzar</button>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">Busca lo que sube hoy en Google (España), lo cruza con tu nicho y te propone temas. Gasta hasta 4 créditos de SerpAPI + 1 llamada de IA; una vez al día.</p>
                      {radarMsg && <p className="mt-1 text-xs text-gray-600">{radarMsg}</p>}
                      {temas.filter((t) => t.estado === "nueva").length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {temas.filter((t) => t.estado === "nueva").map((t) => (
                            <li key={t.id} className="flex items-center justify-between rounded border bg-gray-50 px-2 py-1 text-sm">
                              <span className="flex items-center gap-2">
                                <BadgeRelevancia relevancia={t.relevancia} />
                                {t.keyword}
                                <span className="text-xs text-gray-400">
                                  {t.crecimientoPct != null ? `+${t.crecimientoPct}% ` : ""}
                                  {t.fuente === "trends" ? "· tendencia de hoy" : "· relacionada con tus semillas"}
                                </span>
                              </span>
                              <span className="flex shrink-0 gap-2">
                                <button onClick={() => void escribirDesdeTema(t)} disabled={ocupado}
                                  className="rounded bg-indigo-600 px-2 py-0.5 text-xs text-white disabled:opacity-50">Escribir artículo</button>
                                <button onClick={() => void descartarTema(t)} disabled={ocupado}
                                  className="text-xs text-gray-500 underline">descartar</button>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
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

          {vista === "ia" && draftId && (
            <ArticleAiWorkspace
              projectId={projectId}
              draftId={draftId}
              modelo={nombreModelo(modeloGuardado)}
              onUsar={usarBorrador}
              onSalir={() => { setVista("lista"); void cargar(); }}
            />
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
