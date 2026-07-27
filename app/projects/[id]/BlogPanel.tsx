"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PLANES } from "@/src/planes/planes";
import { slugify } from "@/src/blog/slug";
import { BotonSubir } from "./ToolsPanel";
import { ArticleAiWorkspace, type DraftDetalle } from "./ArticleAiWorkspace";
import { nombreModelo } from "../../_components/modelos";

type EstadoBlog = { tienePlantilla: boolean; posts: { id: string; titulo: string; slug: string; fecha: string }[] };
type BorradorItem = { id: string; keyword: string; estado: string; titulo: string | null; createdAt: string };
type TemaItem = {
  id: string; keyword: string; fuente: string; crecimientoPct: number | null;
  volumenAprox: number | null; relevancia: number; estado: string; discoveredAt: string;
};
type ProgramadoItem = {
  id: string; titulo: string; slug: string; metaDescripcion: string; md: string;
  imagenAssetId: string; publicarEn: string; estado: string; errorMsg: string | null; postId: string | null;
};
type PilotoConfig = {
  activo: boolean; cadaDias: number; hora: number; portada: string;
  ultimoDia: string | null; ultimoMsg: string | null;
};
type Vista = "lista" | "plantillas" | "editor" | "ia";

const AVISO = "Las páginas del blog se generan desde aquí; si las tocas con el editor visual, la próxima regeneración del blog deshará esos cambios.";

function estadoLegible(estado: string): string {
  if (estado === "revision") return "✅ para revisar";
  if (estado === "error") return "⚠ error";
  return "⏳ en marcha";
}

function estadoProgramadoLegible(estado: string): string {
  if (estado === "publicado") return "✓ publicado";
  if (estado === "error") return "⚠ error";
  return "⏳ pendiente"; // pendiente | publicando
}

function BadgeRelevancia({ relevancia }: { relevancia: number }) {
  const clase = relevancia >= 70 ? "badge-exito" : relevancia >= 40 ? "badge-aviso" : "badge-neutro";
  return (
    <span className={`badge ${clase}`} title="Relevancia para tu nicho (0-100)">
      <span className="punto" />{relevancia}
    </span>
  );
}

function IframePreview({ html }: { html: string }) {
  return <iframe srcDoc={html} sandbox="" className="h-96 w-full rounded-c border border-borde bg-superficie" title="vista previa" />;
}

// Sin plan que incluya blog no se monta el panel: se enseña qué se pierde y por
// dónde se consigue. El candado de verdad está en la API (402), esto es cortesía.
export function BlogDePago() {
  return (
    <details className="direccion">
      <summary>
        <span className="flecha">▸</span> Blog
        <span className="estado-dom">Incluido en los planes de pago</span>
      </summary>
      <div className="direccion-cuerpo" style={{ display: "block" }}>
        <div className="tarjeta p-3">
          <p className="text-sm font-medium">Un blog que escribe solo</p>
          <p className="mb-2 text-xs text-texto-2">
            Artículos con el diseño de tu propia web, índice y sitemap al día, y un piloto automático que
            busca temas y publica cada pocos días. Desde {PLANES.personal.precioMes} €/mes con el plan {PLANES.personal.nombre}.
          </p>
          <Link href="/settings#plan" className="btn btn-primario btn-sm">Ver los planes</Link>
        </div>
      </div>
    </details>
  );
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
  // modelo de IA activo (se elige en /settings; aquí solo se muestra)
  const [modeloOrg, setModeloOrg] = useState("");
  // radar de temas (4c)
  const [semillas, setSemillas] = useState("");
  const [temas, setTemas] = useState<TemaItem[]>([]);
  const [radarMsg, setRadarMsg] = useState<string | null>(null);
  // publicación programada (4e)
  const [programados, setProgramados] = useState<ProgramadoItem[]>([]);
  const [progFecha, setProgFecha] = useState(""); // valor del datetime-local del editor
  const [progMsg, setProgMsg] = useState<string | null>(null);
  // piloto automático (4g)
  const [piloto, setPiloto] = useState<PilotoConfig | null>(null);
  const [pilotoMsg, setPilotoMsg] = useState<string | null>(null);

  async function cargar() {
    try {
      const [rEstado, rSettings, rDrafts, rTemas, rOrg, rProg, rPiloto] = await Promise.all([
        fetch(`/api/projects/${projectId}/blog`),
        fetch(`/api/projects/${projectId}/blog/settings`),
        fetch(`/api/projects/${projectId}/blog/drafts`),
        fetch(`/api/projects/${projectId}/blog/keywords`),
        fetch(`/api/settings`),
        fetch(`/api/projects/${projectId}/blog/programados`),
        fetch(`/api/projects/${projectId}/blog/piloto`),
      ]);
      if (rEstado.ok) setEstado((await rEstado.json()) as EstadoBlog);
      if (rSettings.ok) {
        const s = (await rSettings.json()) as { nicho?: string; keywordsSemilla?: string };
        setNicho(s.nicho ?? "");
        setSemillas(s.keywordsSemilla ?? "");
      }
      if (rDrafts.ok) setBorradores((await rDrafts.json()) as BorradorItem[]);
      if (rTemas.ok) setTemas((await rTemas.json()) as TemaItem[]);
      if (rOrg.ok) setModeloOrg(((await rOrg.json()) as { modeloIa?: string }).modeloIa ?? "");
      if (rProg.ok) setProgramados((await rProg.json()) as ProgramadoItem[]);
      if (rPiloto.ok) setPiloto((await rPiloto.json()) as PilotoConfig);
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
    setImagenAssetId(""); setImagenUrl(""); setPreviewArt(null); setProgFecha(""); setVista("editor");
  }
  async function editarArticulo(id: string) {
    const d = await llamar(`/api/projects/${projectId}/blog/posts/${id}`, { method: "GET" });
    if (!d) return;
    setPostId(id); setTitulo(d.titulo as string); setSlug(d.slug as string); setSlugTocado(true);
    setMeta(d.metaDescripcion as string); setMd(d.md as string);
    setImagenAssetId(d.imagenAssetId as string);
    setImagenUrl(`/api/projects/${projectId}/preview/blog/img/${d.slug}.${d.imagenExt}`);
    setPreviewArt(null); setProgFecha(""); setVista("editor");
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

  // --- piloto automático (4g) ---
  async function guardarPiloto() {
    if (!piloto) return;
    setPilotoMsg(null);
    const d = await llamar(`/api/projects/${projectId}/blog/piloto`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ activo: piloto.activo, cadaDias: piloto.cadaDias, hora: piloto.hora, portada: piloto.portada }),
    });
    if (d) setPilotoMsg(piloto.activo ? "Guardado. El piloto está EN MARCHA." : "Guardado (piloto apagado).");
  }

  // --- portada automática (4f) ---
  async function generarPortadaAuto(modo: "diseno" | "ia") {
    const d = await llamar(`/api/projects/${projectId}/blog/portada`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ titulo, modo }),
    });
    if (d && d.assetId) {
      setImagenAssetId(d.assetId as string);
      setImagenUrl(d.url as string);
    }
  }

  // --- publicación programada (4e) ---
  async function programarArticulo() {
    const d = await llamar(`/api/projects/${projectId}/blog/programados`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        titulo, slug, metaDescripcion: meta, md, imagenAssetId,
        publicarEn: progFecha ? new Date(progFecha).toISOString() : "",
      }),
    });
    if (!d) return;
    if (draftOrigenId) {
      // Igual que al guardar: el contenido ya vive en la programación.
      try { await fetch(`/api/projects/${projectId}/blog/drafts/${draftOrigenId}`, { method: "DELETE" }); } catch { /* silencioso */ }
      setDraftOrigenId(null);
    }
    setProgMsg(`Artículo programado para el ${new Date(progFecha).toLocaleString()}. A esa hora se publica solo (artículo y sitio).`);
    setProgFecha("");
    setVista("lista"); setEstado(null); await cargar();
  }
  // «Editar» recupera el contenido al editor y quita la programación:
  // reprogramar = volver a programar desde ahí.
  async function editarProgramado(p: ProgramadoItem) {
    const d = await llamar(`/api/projects/${projectId}/blog/programados/${p.id}`, { method: "DELETE" });
    if (!d) return;
    setPostId(null); setTitulo(p.titulo); setSlug(p.slug); setSlugTocado(true);
    setMeta(p.metaDescripcion); setMd(p.md);
    setImagenAssetId(p.imagenAssetId);
    setImagenUrl(p.imagenAssetId ? `/api/projects/${projectId}/assets/${p.imagenAssetId}` : "");
    setPreviewArt(null); setDraftOrigenId(null); setProgFecha(""); setProgMsg(null);
    setVista("editor");
    void cargar();
  }
  async function ocultarProgramado(id: string) {
    const d = await llamar(`/api/projects/${projectId}/blog/programados/${id}`, { method: "DELETE" });
    if (d) { setProgMsg(null); await cargar(); }
  }

  // --- redacción con IA (4b) ---
  async function guardarConfig() {
    setNichoMsg(null);
    const d = await llamar(`/api/projects/${projectId}/blog/settings`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ nicho, keywordsSemilla: semillas }),
    });
    if (d) setNichoMsg("Guardado");
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
    else {
      const rel = (d.relacionadas as number) ?? 0;
      setRadarMsg(
        `Radar actualizado: ${d.candidatos as number} temas analizados (${(d.tendencias as number) ?? 0} de tendencias de hoy, ${rel} de tus semillas).` +
        (rel === 0 ? " Tus semillas no dieron resultados en Google Trends: prueba con otras más habituales." : "")
      );
    }
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
    setImagenAssetId(""); setImagenUrl(""); setPreviewArt(null); setProgFecha("");
    setDraftOrigenId(det.draft.id);
    setVista("editor");
  }

  return (
    <details className="direccion" onToggle={(e) => { if (e.currentTarget.open) setAbierto(true); }}>
      <summary><span className="flecha">▸</span> Blog</summary>
      {abierto && (
        <div className="direccion-cuerpo" style={{ display: "block" }}>
          <p className="ayuda-campo" style={{ marginBottom: 12 }}>{AVISO}</p>

          {vista === "lista" && (
            <div>
              {estado && !estado.tienePlantilla ? (
                <div className="tarjeta p-3">
                  <p className="text-sm font-medium">El blog de tu web</p>
                  <p className="mb-2 text-xs text-texto-2">Artículos con tu diseño, índice y sitemap automáticos. Primero crea la plantilla: la IA lee tu portada y propone el diseño del blog.</p>
                  <button onClick={() => { setVista("plantillas"); void generarPlantillas(); }} disabled={ocupado}
                    className="btn btn-primario btn-sm">Crear la plantilla del blog con IA</button>
                </div>
              ) : (
                <div>
                  <div className="tarjeta p-3 mb-2">
                    <p className="text-sm font-medium">Escribir con IA</p>
                    <label className="mt-1 block text-xs text-texto-2">De qué va tu blog (la IA lo usa para enfocar los artículos)</label>
                    <textarea value={nicho} rows={2}
                      placeholder="p. ej.: Automatización e IA para pymes: agentes, herramientas y casos prácticos"
                      onChange={(e) => { setNicho(e.target.value); setNichoMsg(null); }}
                      className="campo mt-1" />
                    <label className="mt-1 block text-xs text-texto-2">Keywords semilla (separadas por comas; ayudan al radar a buscar temas de tu nicho)</label>
                    <input value={semillas}
                      placeholder="p. ej.: agentes ia, automatización pymes, chatbots"
                      onChange={(e) => { setSemillas(e.target.value); setNichoMsg(null); }}
                      className="campo mt-1" />
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => void guardarConfig()} disabled={ocupado}
                        className="btn btn-sec btn-sm">Guardar configuración</button>
                      {nichoMsg && <span className="text-xs text-exito-texto">{nichoMsg}</span>}
                    </div>
                    <p className="mt-1 text-xs text-texto-3">
                      Modelo de IA: {nombreModelo(modeloOrg)} — se cambia en <a href="/settings" className="underline">Configuración</a>.
                    </p>
                    {!mostrarKw ? (
                      <button onClick={() => setMostrarKw(true)} disabled={ocupado}
                        className="btn btn-primario btn-sm mt-2">Escribir artículo con IA</button>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        <input value={kw} placeholder="Keyword o tema del artículo"
                          onChange={(e) => setKw(e.target.value)} className="campo" />
                        <button onClick={() => void crearBorrador()} disabled={ocupado}
                          className="btn btn-primario btn-sm shrink-0">Crear borrador</button>
                        <button onClick={() => { setMostrarKw(false); setKw(""); }}
                          className="btn btn-sec btn-sm shrink-0">Cancelar</button>
                      </div>
                    )}
                    {borradores.length > 0 && (
                      <ul className="lista mt-2">
                        {borradores.map((b) => (
                          <li key={b.id} className="item justify-between">
                            <span>{b.titulo ?? b.keyword} <span className="text-xs text-texto-3">· {estadoLegible(b.estado)}</span></span>
                            <span className="flex gap-2">
                              <button onClick={() => { setDraftId(b.id); setVista("ia"); }} disabled={ocupado}
                                className="btn btn-sec btn-sm">Abrir</button>
                              <button onClick={() => void borrarBorrador(b.id, b.keyword)} disabled={ocupado}
                                className="btn btn-fantasma btn-sm">borrar</button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-3 border-t pt-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">Temas en tendencia</p>
                        <button onClick={() => void buscarTemas(false)} disabled={ocupado}
                          className="btn btn-sec btn-sm">🔍 Buscar temas de hoy</button>
                        {radarMsg?.startsWith("El radar ya") && (
                          <button onClick={() => void buscarTemas(true)} disabled={ocupado}
                            className="btn btn-fantasma btn-sm">Forzar</button>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-texto-3">Busca lo que sube hoy en Google (España), lo cruza con tu nicho y te propone temas. Gasta hasta 4 créditos de SerpAPI + 1 llamada de IA; una vez al día.</p>
                      {radarMsg && <p className="mt-1 text-xs text-texto-2">{radarMsg}</p>}
                      {temas.filter((t) => t.estado === "nueva").length > 0 && (
                        <ul className="lista mt-2">
                          {temas.filter((t) => t.estado === "nueva").map((t) => (
                            <li key={t.id} className="item justify-between">
                              <span className="flex items-center gap-2">
                                <BadgeRelevancia relevancia={t.relevancia} />
                                {t.keyword}
                                <span className="text-xs text-texto-3">
                                  {t.crecimientoPct != null ? `+${t.crecimientoPct}% ` : ""}
                                  {t.fuente === "trends" ? "· tendencia de hoy" : "· relacionada con tus semillas"}
                                </span>
                              </span>
                              <span className="flex shrink-0 gap-2">
                                <button onClick={() => void escribirDesdeTema(t)} disabled={ocupado}
                                  className="btn btn-primario btn-sm">Escribir artículo</button>
                                <button onClick={() => void descartarTema(t)} disabled={ocupado}
                                  className="btn btn-fantasma btn-sm">descartar</button>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  {piloto && (
                    <div className="card-piloto mb-2">
                      <div className="grano" />
                      <div className="top">
                        <h3>Piloto automático</h3>
                        <button type="button" role="switch" aria-checked={piloto.activo} className="interruptor"
                          aria-label="Piloto automático"
                          onClick={() => { setPiloto({ ...piloto, activo: !piloto.activo }); setPilotoMsg(null); }} />
                      </div>
                      <p>
                        El blog se escribe solo: el radar busca el tema del día, la IA redacta con tu modelo,
                        se genera la portada y la publicación se programa automáticamente. Solo escribe si hay
                        un tema con relevancia &gt; 60 (si no, ese día no gasta nada en redactar). Gasto por
                        artículo: las llamadas de IA de tu modelo + el radar (hasta 4 créditos de SerpAPI al día).
                      </p>
                      <div className="relative mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <select value={piloto.cadaDias} onChange={(e) => { setPiloto({ ...piloto, cadaDias: Number(e.target.value) }); setPilotoMsg(null); }}
                          className="campo">
                          <option value={1}>Cada día</option>
                          <option value={3}>Cada 3 días</option>
                          <option value={7}>Cada semana</option>
                        </select>
                        <select value={piloto.hora} onChange={(e) => { setPiloto({ ...piloto, hora: Number(e.target.value) }); setPilotoMsg(null); }}
                          className="campo">
                          {Array.from({ length: 24 }, (_, h) => (
                            <option key={h} value={h}>a partir de las {h}:00</option>
                          ))}
                        </select>
                        <select value={piloto.portada} onChange={(e) => { setPiloto({ ...piloto, portada: e.target.value }); setPilotoMsg(null); }}
                          className="campo">
                          <option value="diseno">Portada: diseño (gratis)</option>
                          <option value="ia">Portada: imagen con IA (céntimos)</option>
                        </select>
                        <button onClick={() => void guardarPiloto()} disabled={ocupado}
                          className="btn btn-primario btn-sm">Guardar</button>
                        {pilotoMsg && <span style={{ color: "#9BE0AC" }}>{pilotoMsg}</span>}
                      </div>
                      {piloto.ultimoMsg && (
                        <p className="ultima">
                          Última ejecución{piloto.ultimoDia ? ` (${piloto.ultimoDia})` : ""}: {piloto.ultimoMsg}
                        </p>
                      )}
                    </div>
                  )}
                  {(programados.length > 0 || progMsg) && (
                    <div className="tarjeta p-3 mb-2">
                      <p className="text-sm font-medium">Programados</p>
                      {progMsg && <p className="mt-1 text-xs text-exito-texto">{progMsg}</p>}
                      <ul className="lista mt-1">
                        {programados.map((p) => (
                          <li key={p.id} className="item justify-between">
                            <span>
                              {p.titulo}{" "}
                              <span className="text-xs text-texto-3">· {new Date(p.publicarEn).toLocaleString()} · {estadoProgramadoLegible(p.estado)}</span>
                              {p.estado === "error" && p.errorMsg && <span className="text-xs text-peligro-texto"> — {p.errorMsg}</span>}
                            </span>
                            <span className="flex shrink-0 gap-2">
                              {(p.estado === "pendiente" || p.estado === "error") && (
                                <button onClick={() => void editarProgramado(p)} disabled={ocupado}
                                  title="Recupera el contenido al editor y quita la programación (reprograma desde ahí)"
                                  className="btn btn-sec btn-sm">Editar</button>
                              )}
                              {p.estado === "publicado" && (
                                <button onClick={() => void ocultarProgramado(p.id)} disabled={ocupado}
                                  title="Quita esta fila; el artículo ya está en la lista de abajo"
                                  className="btn btn-fantasma btn-sm">Ocultar</button>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mb-2 flex items-center gap-2">
                    <button onClick={nuevoArticulo} className="btn btn-primario btn-sm">Nuevo artículo</button>
                    <button onClick={() => void abrirPlantillas()} className="btn btn-fantasma btn-sm">Editar plantillas</button>
                    {ocupado && <span className="text-sm text-texto-3">cargando…</span>}
                  </div>
                  <ul className="lista">
                    {(estado?.posts ?? []).map((p) => (
                      <li key={p.id} className="item justify-between">
                        <span>{p.titulo} <span className="text-xs text-texto-3">· {p.fecha} · /blog/{p.slug}.html</span></span>
                        <span className="flex gap-2">
                          <button onClick={() => void editarArticulo(p.id)} disabled={ocupado} className="btn btn-sec btn-sm">Editar</button>
                          <button onClick={() => void borrarArticulo(p.id, p.titulo)} disabled={ocupado} className="btn btn-fantasma btn-sm">borrar</button>
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
              modelo={nombreModelo(modeloOrg)}
              onUsar={usarBorrador}
              onSalir={() => { setVista("lista"); void cargar(); }}
            />
          )}

          {vista === "plantillas" && (
            <div className="space-y-2">
              {ocupado && !tplPost && <p className="text-sm text-texto-2">Generando la plantilla con IA (puede tardar un minuto)…</p>}
              {tplPost && (
                <>
                  <label className="block text-xs font-medium">Plantilla de artículo</label>
                  <textarea value={tplPost} onChange={(e) => setTplPost(e.target.value)} rows={8} className="campo font-mono" />
                  <label className="block text-xs font-medium">Plantilla del índice</label>
                  <textarea value={tplIndex} onChange={(e) => setTplIndex(e.target.value)} rows={8} className="campo font-mono" />
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => void guardarPlantillas()} disabled={ocupado} className="btn btn-primario btn-sm">Guardar plantillas</button>
                    <button onClick={() => void verPreview("post")} disabled={ocupado} className="btn btn-sec btn-sm">Vista previa artículo</button>
                    <button onClick={() => void verPreview("index")} disabled={ocupado} className="btn btn-sec btn-sm">Vista previa índice</button>
                    <button onClick={() => void generarPlantillas()} disabled={ocupado} className="btn btn-sec btn-sm">Volver a generar</button>
                    <button onClick={() => setVista("lista")} className="btn btn-sec btn-sm">Cancelar</button>
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
                className="campo" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-texto-2">/blog/</span>
                <input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTocado(true); }}
                  className="campo w-64" />
                <span className="text-xs text-texto-2">.html</span>
              </div>
              <div>
                <input value={meta} placeholder="Meta descripción (para Google)"
                  onChange={(e) => setMeta(e.target.value)} className="campo" />
                <span className={"text-xs " + (meta.length > 160 ? "text-peligro-texto" : "text-texto-3")}>{meta.length}/160</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-texto-2">Imagen de portada:</span>
                {imagenUrl && <img src={imagenUrl} alt="" className="h-8 w-14 rounded object-cover" />}
                <button onClick={() => void generarPortadaAuto("diseno")} disabled={ocupado || !titulo.trim()}
                  title="Gratis: un diseño con el título y los colores de tu web"
                  className="btn btn-sec btn-sm">Generar diseño</button>
                <button onClick={() => void generarPortadaAuto("ia")} disabled={ocupado || !titulo.trim()}
                  title="Imagen generada con IA (céntimos por imagen, a tu cuenta de OpenRouter)"
                  className="btn btn-sec btn-sm">Generar con IA</button>
                <BotonSubir texto={imagenAssetId ? "Cambiar imagen" : "Subir imagen"} ocupado={ocupado} onFile={(f) => void subirPortada(f)} />
                {!titulo.trim() && <span className="text-xs text-texto-3">(escribe el título para generarla)</span>}
              </div>
              <textarea value={md} onChange={(e) => setMd(e.target.value)} rows={14}
                placeholder="Escribe o pega aquí el artículo en markdown (por ejemplo, el que te escribió tu IA)…"
                className="campo font-mono" />
              <div className="flex gap-2">
                <button onClick={() => void guardarArticulo()} disabled={ocupado} className="btn btn-primario btn-sm">Guardar artículo</button>
                <button onClick={() => void verPreviewArticulo()} disabled={ocupado} className="btn btn-sec btn-sm">Vista previa</button>
                <button onClick={() => setVista("lista")} className="btn btn-sec btn-sm">Cancelar</button>
              </div>
              {!postId && (
                <div className="flex flex-wrap items-center gap-2 border-t pt-2">
                  <span className="text-xs text-texto-2">O deja que se publique solo (artículo y sitio):</span>
                  <input type="datetime-local" value={progFecha} onChange={(e) => setProgFecha(e.target.value)}
                    className="campo w-auto" />
                  <button onClick={() => void programarArticulo()} disabled={ocupado || !progFecha}
                    className="btn btn-sec btn-sm">Programar publicación</button>
                </div>
              )}
              {previewArt && <IframePreview html={previewArt} />}
            </div>
          )}

          {error && <p className="error-campo">{error}</p>}
        </div>
      )}
    </details>
  );
}
