"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDialogo } from "@/app/_components/Dialogo";
import { PLANES } from "@/src/planes/planes";
import { slugify } from "@/src/blog/slug";
import { insertarImagen } from "@/src/blog/imagenes-cuerpo";
import { BotonSubir } from "./ToolsPanel";
import { ArticleAiWorkspace, type DraftDetalle } from "./ArticleAiWorkspace";
import { nombreModelo } from "../../_components/modelos";
import type { TextosBlog } from "@/src/i18n/blog";
import { conFormato, conValores } from "@/src/i18n/formato";
import { rellenar } from "@/src/i18n/rellenar";
import { LOCALE_INTL, type Idioma } from "@/src/i18n/idiomas";

type Textos = TextosBlog;

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

// La fecha y la hora, en el idioma de la cuenta. Iban con `undefined`, que es el
// del navegador: en una fecha de publicación programada eso puede leerse al
// revés (8/3 en vez de 3/8) sin que nada avise.
function cuando(iso: string, idioma: Idioma): string {
  return new Date(iso).toLocaleString(LOCALE_INTL[idioma]);
}

function estadoLegible(estado: string, t: Textos): string {
  if (estado === "revision") return t.borradorRevision;
  if (estado === "error") return t.borradorError;
  return t.borradorEnMarcha;
}

function estadoProgramadoLegible(estado: string, t: Textos): string {
  if (estado === "publicado") return t.programadoPublicado;
  if (estado === "error") return t.programadoError;
  return t.programadoPendiente; // pendiente | publicando
}

function BadgeRelevancia({ relevancia, titulo }: { relevancia: number; titulo: string }) {
  const clase = relevancia >= 70 ? "badge-exito" : relevancia >= 40 ? "badge-aviso" : "badge-neutro";
  return (
    <span className={`badge ${clase}`} title={titulo}>
      <span className="punto" />{relevancia}
    </span>
  );
}

// La vista previa, con pantalla completa como la del sitio: en un recuadro de
// 384 px no se puede juzgar si una plantilla de blog está bien, que es justo lo
// que se está mirando aquí.
function IframePreview({ html, t }: { html: string; t: Textos["previo"] }) {
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    if (!expandido) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setExpandido(false); }
    window.addEventListener("keydown", onKey);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // que no se mueva el fondo detrás
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previo;
    };
  }, [expandido]);

  return (
    <div className={expandido ? "previo-blog expandido" : "previo-blog"}>
      <div className="previo-blog-barra">
        <button
          type="button"
          className="btn btn-sec btn-sm"
          onClick={() => setExpandido(!expandido)}
          title={expandido ? t.salirTitulo : t.expandirTitulo}
        >
          {expandido ? t.salir : t.expandir}
        </button>
      </div>
      <iframe srcDoc={html} sandbox="" className="previo-blog-lienzo" title={t.titulo} />
    </div>
  );
}

// Carga un .html del disco a un textarea. Se lee en el navegador y no se sube a
// ningún sitio: hasta que no le dé a un botón, esto no sale de su ordenador.
function SubirHtml({ ocupado, onTexto, texto }: { ocupado: boolean; onTexto: (t: string) => void; texto: string }) {
  return (
    <label className={"btn btn-sec btn-sm" + (ocupado ? " pointer-events-none opacity-50" : "")} style={{ cursor: "pointer" }}>
      {texto}
      <input
        type="file"
        accept=".html,.htm,text/html"
        disabled={ocupado}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void f.text().then(onTexto);
        }}
      />
    </label>
  );
}

// Qué significa cada hueco. Sin esto, «traer tu plantilla» solo lo puede usar
// quien ya se sepa el sistema, y son justo los que quieren hacerlo a mano.
//
// El nombre del hueco NO se traduce: es lo que el sistema busca dentro del HTML
// del usuario. Lo que se traduce es la explicación.
function huecosAyuda(t: Textos["plantillas"]): [string, string][] {
  return [
    ["{{titulo}}", t.huecoTitulo],
    ["{{contenido}}", t.huecoContenido],
    ["{{meta_descripcion}}", t.huecoMeta],
    ["{{imagen}}", t.huecoImagen],
    ["{{fecha}}", t.huecoFecha],
    ["{{canonical}}", t.huecoCanonical],
    ["{{json_ld}}", t.huecoJsonLd],
  ];
}

// Sin plan que incluya blog no se monta el panel: se enseña qué se pierde y por
// dónde se consigue. El candado de verdad está en la API (402), esto es cortesía.
export function BlogDePago({ t }: { t: Textos }) {
  return (
    <details className="direccion">
      <summary>
        <span className="flecha">▸</span> {t.titulo}
        <span className="estado-dom">{t.dePago.resumen}</span>
      </summary>
      <div className="direccion-cuerpo" style={{ display: "block" }}>
        <div className="tarjeta p-3">
          <p className="text-sm font-medium">{t.dePago.titulo}</p>
          <p className="mb-2 text-xs text-texto-2">
            {rellenar(t.dePago.texto, {
              precio: String(PLANES.personal.precioMes),
              plan: PLANES.personal.nombre,
            })}
          </p>
          <Link href="/settings#plan" className="btn btn-primario btn-sm">{t.dePago.boton}</Link>
        </div>
      </div>
    </details>
  );
}

export function BlogPanel({ projectId, idioma, t }: { projectId: string; idioma: Idioma; t: Textos }) {
  const router = useRouter();
  const { confirmar } = useDialogo();
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<Vista>("lista");
  const [estado, setEstado] = useState<EstadoBlog | null>(null);
  const [ocupado, setOcupado] = useState(false);
  // QUÉ se está haciendo, no solo que hay algo en marcha. `ocupado` apaga todos
  // los botones a la vez, así que sin esto no hay forma de poner el relojito en
  // el que pulsaste sin ponerlo también en los otros seis. Y aquí hay esperas de
  // medio minuto (la IA, el radar): sin señal ninguna, uno da por hecho que la
  // página se ha quedado colgada y vuelve a pulsar.
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Qué acaba de pasar y qué falta para verlo online. Guardar un artículo NO lo
  // publica: reescribe el HTML, el índice y el sitemap, y eso queda como versión
  // actual sin publicar. Sin decirlo, uno guarda, vuelve a la lista, no ve
  // ningún cambio en su web y se pone a buscar un «publicar blog» que no existe
  // ni debe existir —el blog es parte de la web, no algo aparte—. El botón está
  // arriba del todo de la pantalla, lejos de aquí.
  const [aviso, setAviso] = useState<string | null>(null);
  // plantillas
  const [tplPost, setTplPost] = useState("");
  const [tplIndex, setTplIndex] = useState("");
  const [previewTpl, setPreviewTpl] = useState<string | null>(null);
  // «traigo la mía»: el HTML crudo del usuario, antes de que se le coloquen los
  // huecos. Va aparte de tplPost/tplIndex a propósito, que son la plantilla ya
  // buena: así se puede volver atrás sin haber pisado nada.
  const [traendo, setTraendo] = useState(false);
  const [miPost, setMiPost] = useState("");
  const [miIndex, setMiIndex] = useState("");
  const [avisosTpl, setAvisosTpl] = useState<string[]>([]);
  // editor de artículo
  const [postId, setPostId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTocado, setSlugTocado] = useState(false);
  const [meta, setMeta] = useState("");
  const [md, setMd] = useState("");
  const mdRef = useRef<HTMLTextAreaElement>(null);
  // Dónde ha dejado el cursor el usuario. `null` = todavía no ha pinchado dentro
  // del texto. Se guarda aparte porque un textarea recién pegado tiene
  // `selectionStart` en 0, y eso no significa «quiero la imagen arriba del todo»,
  // significa «no he elegido». Ver `insertarEnCuerpo`.
  const cursorMd = useRef<number | null>(null);
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
  // Si el radar dijo «ya se actualizó hoy». Va en su propio booleano y no se
  // adivina mirando cómo empieza `radarMsg`: ese texto se traduce, y el botón de
  // «Forzar» dejaría de aparecer en cuanto alguien cambiara de idioma.
  const [radarYaHoy, setRadarYaHoy] = useState(false);
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

  async function llamar(url: string, init: RequestInit, tarea?: string): Promise<Record<string, unknown> | null> {
    setOcupado(true); setEnCurso(tarea ?? null); setError(null); setAviso(null); // el aviso es de lo ÚLTIMO que pasó
    try {
      const res = await fetch(url, init);
      const d = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) { setError((d.error as string) ?? t.errores.generico); return null; }
      return d;
    } catch { setError(t.errores.conexion); return null; }
    finally { setOcupado(false); setEnCurso(null); }
  }

  /** Texto de un botón: con relojito mientras esa tarea concreta está en marcha. */
  function rotulo(tarea: string, reposo: string, trabajando: string) {
    return enCurso === tarea ? <><span className="cargador" /> {trabajando}</> : <>{reposo}</>;
  }

  async function generarPlantillas() {
    const d = await llamar(`/api/projects/${projectId}/blog/template`, { method: "POST" }, "plantilla");
    if (d) { setTplPost(d.tplPost as string); setTplIndex(d.tplIndex as string); setPreviewTpl(null); }
  }
  function abrirTraer() {
    setVista("plantillas"); setTraendo(true);
    setMiPost(""); setMiIndex(""); setAvisosTpl([]); setPreviewTpl(null); setError(null);
  }

  // Le pide al modelo que coloque los huecos en la plantilla del usuario, sin
  // rediseñar nada. Es mucho menos trabajo que diseñar de cero, así que sale
  // mejor y cuesta menos.
  async function colocarHuecos() {
    const d = await llamar(`/api/projects/${projectId}/blog/template`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ htmlPost: miPost, htmlIndex: miIndex }),
    }, "huecos");
    if (d) {
      setTplPost(d.tplPost as string); setTplIndex(d.tplIndex as string);
      setAvisosTpl((d.avisos as string[]) ?? []);
      setTraendo(false); setPreviewTpl(null);
    }
  }

  // Quien ya sabe dónde van los huecos los escribe él y no gasta ni un céntimo
  // de IA. Si se deja alguno, al guardar el servidor dice cuál falta.
  //
  // El índice es opcional SOLO en la vía de la IA, que lo construye a partir del
  // artículo. Por este camino no hay quien lo construya, así que sin él se
  // llegaba a la pantalla siguiente con un campo vacío y sin saber por qué no
  // dejaba guardar.
  async function usarTalCual() {
    // «Ya lleva los huecos» solo tiene sentido si de verdad los lleva, y eso se
    // ve mirando el HTML. Sin esto, quien pega una plantilla normal pulsa aquí
    // —es el botón que no cuesta dinero, así que atrae— y acaba atascado sin
    // entender por qué. Le pasó a Sebas con la plantilla de ejemplo.
    if (!/\{\{\s*[a-z_]+\s*\}\}/i.test(miPost)) {
      const construir = await confirmar({
        titulo: t.plantillas.sinHuecosTitulo,
        cuerpo: t.plantillas.sinHuecosCuerpo,
        tono: "coste",
        aceptar: t.plantillas.sinHuecosAceptar,
        cancelar: t.plantillas.sinHuecosCancelar,
      });
      if (construir) await colocarHuecos();
      return;
    }
    if (!miIndex.trim()) {
      // Un aviso que solo dice «te falta esto» es un callejón sin salida: te
      // deja leyendo y sin nada que pulsar. Las dos salidas van en los botones.
      const construir = await confirmar({
        titulo: t.plantillas.sinIndiceTitulo,
        cuerpo: t.plantillas.sinIndiceCuerpo,
        tono: "coste",
        aceptar: t.plantillas.sinIndiceAceptar,
        cancelar: t.plantillas.sinIndiceCancelar,
      });
      if (construir) await colocarHuecos();
      return;
    }
    setTplPost(miPost); setTplIndex(miIndex);
    setTraendo(false); setAvisosTpl([]); setPreviewTpl(null);
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
    }, "guardarPlantillas");
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
    cursorMd.current = null; // si no, se arrastraría la posición del artículo anterior
    setPostId(null); setTitulo(""); setSlug(""); setSlugTocado(false); setMeta(""); setMd("");
    setImagenAssetId(""); setImagenUrl(""); setPreviewArt(null); setProgFecha(""); setVista("editor");
  }
  async function editarArticulo(id: string) {
    const d = await llamar(`/api/projects/${projectId}/blog/posts/${id}`, { method: "GET" });
    if (!d) return;
    cursorMd.current = null;
    setPostId(id); setTitulo(d.titulo as string); setSlug(d.slug as string); setSlugTocado(true);
    setMeta(d.metaDescripcion as string); setMd(d.md as string);
    setImagenAssetId(d.imagenAssetId as string);
    setImagenUrl(`/api/projects/${projectId}/preview/blog/img/${d.slug}.${d.imagenExt}`);
    setPreviewArt(null); setProgFecha(""); setVista("editor");
  }
  /**
   * Sube una imagen y la mete en el markdown POR DONDE ESTÁ EL CURSOR.
   *
   * Se escribe la ruta pública (`/wc-uploads/…`), que es la que va a existir en el
   * blog publicado: los bytes se copian al snapshot al guardar. La vista previa la
   * traduce al asset del proyecto, porque ahí ese archivo todavía no existe.
   *
   * El texto alternativo sale del nombre del archivo. No es perfecto, pero una
   * imagen sin `alt` es invisible para Google y para quien use lector de pantalla,
   * y nadie lo escribe si hay que escribirlo a mano.
   */
  async function insertarEnCuerpo(f: File) {
    setOcupado(true); setError(null);
    try {
      const fd = new FormData(); fd.append("file", f);
      const res = await fetch(`/api/projects/${projectId}/assets`, { method: "POST", body: fd });
      const d = (await res.json().catch(() => ({}))) as { error?: string; assetId?: string; ext?: string };
      if (!res.ok || !d.assetId || !d.ext) { setError(d.error ?? t.errores.subirImagen); return; }
      const ta = mdRef.current;
      // Si todavía no ha pinchado dentro del texto, la imagen va AL FINAL, no al
      // principio. Lo normal es pegar el artículo entero e ir directo al botón: con
      // el cursor a cero, la foto se colaría delante del primer párrafo, que es lo
      // último que quiere nadie y encima parece un fallo del programa.
      const cursor = cursorMd.current ?? md.length;
      const alt = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
      const r = insertarImagen(md, cursor, `/wc-uploads/${d.assetId}.${d.ext}`, alt);
      setMd(r.md);
      // Devolver el foco y dejar el cursor justo detrás de lo insertado: si no, hay
      // que volver a pinchar y buscar por dónde ibas, y se pierde el hilo.
      cursorMd.current = r.cursor;
      requestAnimationFrame(() => {
        if (!ta) return;
        ta.focus();
        ta.setSelectionRange(r.cursor, r.cursor);
      });
    } finally { setOcupado(false); }
  }

  async function subirPortada(f: File) {
    setOcupado(true); setError(null);
    try {
      const fd = new FormData(); fd.append("file", f);
      const res = await fetch(`/api/projects/${projectId}/assets`, { method: "POST", body: fd });
      const d = (await res.json().catch(() => ({}))) as { error?: string; assetId?: string; url?: string };
      if (!res.ok || !d.assetId) { setError(d.error ?? t.errores.subirImagen); return; }
      setImagenAssetId(d.assetId); setImagenUrl(d.url ?? "");
    } catch { setError(t.errores.conexion); }
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
      ? await llamar(`/api/projects/${projectId}/blog/posts/${postId}`, { method: "PUT", headers: { "content-type": "application/json" }, body }, "guardarArticulo")
      : await llamar(`/api/projects/${projectId}/blog/posts`, { method: "POST", headers: { "content-type": "application/json" }, body }, "guardarArticulo");
    if (d) {
      if (draftOrigenId) {
        // El artículo ya está guardado: el borrador IA sobra. Si el DELETE
        // falla, el borrador queda visible en la lista y se puede borrar a mano.
        try { await fetch(`/api/projects/${projectId}/blog/drafts/${draftOrigenId}`, { method: "DELETE" }); } catch { /* silencioso */ }
        setDraftOrigenId(null);
      }
      setAviso(rellenar(t.lista.guardado, { aviso: t.avisoPublicar }));
      setVista("lista"); setEstado(null); await cargar(); router.refresh();
    }
  }
  async function borrarArticulo(id: string, tituloPost: string) {
    if (!(await confirmar({
      titulo: rellenar(t.lista.borrarPregunta, { titulo: tituloPost }),
      cuerpo: t.lista.borrarCuerpo,
      tono: "peligro",
      aceptar: t.lista.borrarAceptar,
    }))) return;
    const d = await llamar(`/api/projects/${projectId}/blog/posts/${id}`, { method: "DELETE" });
    // Borrarlo tampoco lo quita de la web publicada hasta que se publique.
    if (d) { setAviso(rellenar(t.lista.borrado, { aviso: t.avisoPublicar })); setEstado(null); await cargar(); router.refresh(); }
  }

  // --- piloto automático (4g) ---
  async function guardarPiloto() {
    if (!piloto) return;
    setPilotoMsg(null);
    const d = await llamar(`/api/projects/${projectId}/blog/piloto`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ activo: piloto.activo, cadaDias: piloto.cadaDias, hora: piloto.hora, portada: piloto.portada }),
    });
    if (d) setPilotoMsg(piloto.activo ? t.piloto.guardadoActivo : t.piloto.guardadoApagado);
  }

  // --- portada automática (4f) ---
  async function generarPortadaAuto(modo: "diseno" | "ia") {
    const d = await llamar(`/api/projects/${projectId}/blog/portada`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ titulo, modo }),
    }, `portada:${modo}`);
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
    setProgMsg(rellenar(t.programados.hecho, { fecha: cuando(new Date(progFecha).toISOString(), idioma) }));
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
    if (d) setNichoMsg(t.ia.guardado);
  }
  async function crearBorrador() {
    const d = await llamar(`/api/projects/${projectId}/blog/drafts`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ keyword: kw }),
    }, "borrador");
    if (d && d.draftId) {
      setKw(""); setMostrarKw(false);
      setDraftId(d.draftId as string); setVista("ia");
      void cargar();
    }
  }
  async function borrarBorrador(id: string, keyword: string) {
    if (!(await confirmar({
      titulo: rellenar(t.ia.borrarPregunta, { keyword }),
      cuerpo: t.ia.borrarCuerpo,
      tono: "peligro",
      aceptar: t.ia.borrarAceptar,
    }))) return;
    const d = await llamar(`/api/projects/${projectId}/blog/drafts/${id}`, { method: "DELETE" });
    if (d) await cargar();
  }
  // --- radar de temas (4c) ---
  async function buscarTemas(forzar: boolean) {
    setRadarMsg(null); setRadarYaHoy(false);
    const d = await llamar(`/api/projects/${projectId}/blog/keywords/radar`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ forzar }),
    }, "temas");
    if (!d) return;
    if (d.actualizado === false) { setRadarMsg(t.radar.yaHoy); setRadarYaHoy(true); }
    else {
      const rel = (d.relacionadas as number) ?? 0;
      setRadarMsg(
        rellenar(t.radar.actualizado, {
          candidatos: String((d.candidatos as number) ?? 0),
          tendencias: String((d.tendencias as number) ?? 0),
          relacionadas: String(rel),
        }) + (rel === 0 ? ` ${t.radar.sinSemillas}` : "")
      );
    }
    await cargar();
  }
  async function escribirDesdeTema(t: TemaItem) {
    const d = await llamar(`/api/projects/${projectId}/blog/drafts`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ keyword: t.keyword }),
    }, `tema:${t.id}`);
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
      <summary><span className="flecha">▸</span> {t.titulo}</summary>
      {abierto && (
        <div className="direccion-cuerpo" style={{ display: "block" }}>
          <p className="ayuda-campo" style={{ marginBottom: 12 }}>{t.aviso}</p>

          {aviso && (
            <div className="aviso-ok" role="status" style={{ marginBottom: 12 }}>
              <span>{aviso}</span>
            </div>
          )}

          {vista === "lista" && (
            <div>
              {estado && !estado.tienePlantilla ? (
                <div className="tarjeta p-3">
                  <p className="text-sm font-medium">{t.vacio.titulo}</p>
                  <p className="mb-2 text-xs text-texto-2">{t.vacio.texto}</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setVista("plantillas"); void generarPlantillas(); }} disabled={ocupado}
                      className="btn btn-primario btn-sm">
                      {rotulo("plantilla", t.vacio.crear, t.vacio.creando)}
                    </button>
                    <button onClick={abrirTraer} disabled={ocupado} className="btn btn-sec btn-sm">
                      {t.vacio.yaTengo}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="tarjeta p-3 mb-2">
                    <p className="text-sm font-medium">{t.ia.titulo}</p>
                    <label className="mt-1 block text-xs text-texto-2">{t.ia.nicho}</label>
                    <textarea value={nicho} rows={2}
                      placeholder={t.ia.nichoEjemplo}
                      onChange={(e) => { setNicho(e.target.value); setNichoMsg(null); }}
                      className="campo mt-1" />
                    <label className="mt-1 block text-xs text-texto-2">{t.ia.semillas}</label>
                    <input value={semillas}
                      placeholder={t.ia.semillasEjemplo}
                      onChange={(e) => { setSemillas(e.target.value); setNichoMsg(null); }}
                      className="campo mt-1" />
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => void guardarConfig()} disabled={ocupado}
                        className="btn btn-sec btn-sm">{t.ia.guardarConfig}</button>
                      {nichoMsg && <span className="text-xs text-exito-texto">{nichoMsg}</span>}
                    </div>
                    <p className="mt-1 text-xs text-texto-3">
                      {conValores(t.ia.modelo, {
                        modelo: nombreModelo(modeloOrg),
                        enlace: <a href="/settings" className="underline">{t.ia.modeloEnlace}</a>,
                      })}
                    </p>
                    {!mostrarKw ? (
                      <button onClick={() => setMostrarKw(true)} disabled={ocupado}
                        className="btn btn-primario btn-sm mt-2">{t.ia.escribir}</button>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        <input value={kw} placeholder={t.ia.keyword}
                          onChange={(e) => setKw(e.target.value)} className="campo" />
                        <button onClick={() => void crearBorrador()} disabled={ocupado}
                          className="btn btn-primario btn-sm shrink-0">
                          {rotulo("borrador", t.ia.crearBorrador, t.ia.creando)}
                        </button>
                        <button onClick={() => { setMostrarKw(false); setKw(""); }}
                          className="btn btn-sec btn-sm shrink-0">{t.ia.cancelar}</button>
                      </div>
                    )}
                    {borradores.length > 0 && (
                      <ul className="lista mt-2">
                        {borradores.map((b) => (
                          <li key={b.id} className="item justify-between">
                            <span>{b.titulo ?? b.keyword} <span className="text-xs text-texto-3">· {estadoLegible(b.estado, t)}</span></span>
                            <span className="flex gap-2">
                              <button onClick={() => { setDraftId(b.id); setVista("ia"); }} disabled={ocupado}
                                className="btn btn-sec btn-sm">{t.ia.abrir}</button>
                              <button onClick={() => void borrarBorrador(b.id, b.keyword)} disabled={ocupado}
                                className="btn btn-fantasma btn-sm">{t.ia.borrar}</button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-3 border-t pt-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{t.radar.titulo}</p>
                        <button onClick={() => void buscarTemas(false)} disabled={ocupado}
                          className="btn btn-sec btn-sm">
                          {rotulo("temas", t.radar.buscar, t.radar.buscando)}
                        </button>
                        {radarYaHoy && (
                          <button onClick={() => void buscarTemas(true)} disabled={ocupado}
                            className="btn btn-fantasma btn-sm">{t.radar.forzar}</button>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-texto-3">{t.radar.texto}</p>
                      {radarMsg && <p className="mt-1 text-xs text-texto-2">{radarMsg}</p>}
                      {temas.filter((x) => x.estado === "nueva").length > 0 && (
                        <ul className="lista mt-2">
                          {temas.filter((x) => x.estado === "nueva").map((tema) => (
                            <li key={tema.id} className="item justify-between">
                              <span className="flex items-center gap-2">
                                <BadgeRelevancia relevancia={tema.relevancia} titulo={t.radar.relevanciaTitulo} />
                                {tema.keyword}
                                <span className="text-xs text-texto-3">
                                  {tema.crecimientoPct != null ? `+${tema.crecimientoPct}% ` : ""}
                                  {tema.fuente === "trends" ? t.radar.deTendencias : t.radar.deSemillas}
                                </span>
                              </span>
                              <span className="flex shrink-0 gap-2">
                                <button onClick={() => void escribirDesdeTema(tema)} disabled={ocupado}
                                  className="btn btn-primario btn-sm">
                                  {rotulo(`tema:${tema.id}`, t.radar.escribir, t.radar.preparando)}
                                </button>
                                <button onClick={() => void descartarTema(tema)} disabled={ocupado}
                                  className="btn btn-fantasma btn-sm">{t.radar.descartar}</button>
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
                        <h3>{t.piloto.titulo}</h3>
                        <button type="button" role="switch" aria-checked={piloto.activo} className="interruptor"
                          aria-label={t.piloto.titulo}
                          onClick={() => { setPiloto({ ...piloto, activo: !piloto.activo }); setPilotoMsg(null); }} />
                      </div>
                      <p>{t.piloto.texto}</p>
                      <div className="relative mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <select value={piloto.cadaDias} onChange={(e) => { setPiloto({ ...piloto, cadaDias: Number(e.target.value) }); setPilotoMsg(null); }}
                          className="campo">
                          <option value={1}>{t.piloto.cadaDia}</option>
                          <option value={3}>{t.piloto.cada3Dias}</option>
                          <option value={7}>{t.piloto.cadaSemana}</option>
                        </select>
                        <select value={piloto.hora} onChange={(e) => { setPiloto({ ...piloto, hora: Number(e.target.value) }); setPilotoMsg(null); }}
                          className="campo">
                          {Array.from({ length: 24 }, (_, h) => (
                            <option key={h} value={h}>{rellenar(t.piloto.aPartirDeLas, { hora: String(h) })}</option>
                          ))}
                        </select>
                        <select value={piloto.portada} onChange={(e) => { setPiloto({ ...piloto, portada: e.target.value }); setPilotoMsg(null); }}
                          className="campo">
                          <option value="diseno">{t.piloto.portadaDiseno}</option>
                          <option value="ia">{t.piloto.portadaIa}</option>
                        </select>
                        <button onClick={() => void guardarPiloto()} disabled={ocupado}
                          className="btn btn-primario btn-sm">{t.piloto.guardar}</button>
                        {pilotoMsg && <span style={{ color: "#9BE0AC" }}>{pilotoMsg}</span>}
                      </div>
                      {piloto.ultimoMsg && (
                        <p className="ultima">
                          {piloto.ultimoDia
                            ? rellenar(t.piloto.ultimaConDia, { dia: piloto.ultimoDia, msg: piloto.ultimoMsg })
                            : rellenar(t.piloto.ultima, { msg: piloto.ultimoMsg })}
                        </p>
                      )}
                    </div>
                  )}
                  {(programados.length > 0 || progMsg) && (
                    <div className="tarjeta p-3 mb-2">
                      <p className="text-sm font-medium">{t.programados.titulo}</p>
                      {progMsg && <p className="mt-1 text-xs text-exito-texto">{progMsg}</p>}
                      <ul className="lista mt-1">
                        {programados.map((p) => (
                          <li key={p.id} className="item justify-between">
                            <span>
                              {p.titulo}{" "}
                              <span className="text-xs text-texto-3">· {cuando(p.publicarEn, idioma)} · {estadoProgramadoLegible(p.estado, t)}</span>
                              {p.estado === "error" && p.errorMsg && <span className="text-xs text-peligro-texto"> — {p.errorMsg}</span>}
                            </span>
                            <span className="flex shrink-0 gap-2">
                              {(p.estado === "pendiente" || p.estado === "error") && (
                                <button onClick={() => void editarProgramado(p)} disabled={ocupado}
                                  title={t.programados.editarTitulo}
                                  className="btn btn-sec btn-sm">{t.programados.editar}</button>
                              )}
                              {p.estado === "publicado" && (
                                <button onClick={() => void ocultarProgramado(p.id)} disabled={ocupado}
                                  title={t.programados.ocultarTitulo}
                                  className="btn btn-fantasma btn-sm">{t.programados.ocultar}</button>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mb-2 flex items-center gap-2">
                    <button onClick={nuevoArticulo} className="btn btn-primario btn-sm">{t.lista.nuevo}</button>
                    <button onClick={() => void abrirPlantillas()} className="btn btn-fantasma btn-sm">{t.lista.editarPlantillas}</button>
                    {ocupado && <span className="text-sm text-texto-3">{t.lista.cargando}</span>}
                  </div>
                  <ul className="lista">
                    {(estado?.posts ?? []).map((p) => (
                      <li key={p.id} className="item justify-between">
                        <span>{p.titulo} <span className="text-xs text-texto-3">· {p.fecha} · /blog/{p.slug}.html</span></span>
                        <span className="flex gap-2">
                          <button onClick={() => void editarArticulo(p.id)} disabled={ocupado} className="btn btn-sec btn-sm">{t.lista.editar}</button>
                          <button onClick={() => void borrarArticulo(p.id, p.titulo)} disabled={ocupado} className="btn btn-fantasma btn-sm">{t.lista.borrar}</button>
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
              t={t.taller}
              errores={t.errores}
            />
          )}

          {vista === "plantillas" && (
            <div className="space-y-2">
              {traendo ? (
                <>
                  <p className="text-sm font-medium">{t.plantillas.misTitulo}</p>
                  {/* «¿Por qué tengo que subir dos?» fue lo primero que preguntó
                      Sebas al verlo, y él conoce el sistema. Se explica aquí, que
                      es donde surge la duda: una guía aparte hay que ir a buscarla
                      y nadie sale del formulario a leerla. */}
                  <p className="text-xs text-texto-2">{conFormato(t.plantillas.misTexto)}</p>

                  <div className="flex items-center gap-2">
                    <label className="block text-xs font-medium">{t.plantillas.paso1}</label>
                    <SubirHtml ocupado={ocupado} onTexto={setMiPost} texto={t.plantillas.subirHtml} />
                  </div>
                  <p className="text-xs text-texto-3" style={{ margin: 0 }}>{t.plantillas.paso1Texto}</p>
                  <div className="rounded-c border border-borde p-2 text-xs text-texto-2">
                    {huecosAyuda(t.plantillas).map(([h, q]) => (
                      <div key={h}><code className="font-mono">{h}</code> — {q}</div>
                    ))}
                  </div>
                  <textarea value={miPost} onChange={(e) => setMiPost(e.target.value)} rows={8}
                    placeholder={t.plantillas.paso1Ejemplo} className="campo font-mono" />

                  <div className="flex items-center gap-2">
                    <label className="block text-xs font-medium">
                      {t.plantillas.paso2} <span className="font-normal text-texto-3">{t.plantillas.paso2Opcional}</span>
                    </label>
                    <SubirHtml ocupado={ocupado} onTexto={setMiIndex} texto={t.plantillas.subirHtml} />
                  </div>
                  <p className="text-xs text-texto-3" style={{ margin: 0 }}>{conFormato(t.plantillas.paso2Texto)}</p>
                  <textarea value={miIndex} onChange={(e) => setMiIndex(e.target.value)} rows={5}
                    placeholder={t.plantillas.paso2Ejemplo} className="campo font-mono" />

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => void colocarHuecos()} disabled={ocupado || !miPost.trim()}
                      className="btn btn-primario btn-sm">
                      {rotulo("huecos", t.plantillas.colocar, t.plantillas.colocando)}
                    </button>
                    <button onClick={() => void usarTalCual()} disabled={ocupado || !miPost.trim()}
                      title={t.plantillas.yaLlevaHuecosTitulo}
                      className="btn btn-sec btn-sm">{t.plantillas.yaLlevaHuecos}</button>
                    <button onClick={() => setTraendo(false)} disabled={ocupado} className="btn btn-sec btn-sm">{t.plantillas.volver}</button>
                  </div>
                  <p className="text-xs text-texto-3">{conFormato(t.plantillas.cual)}</p>
                </>
              ) : (
                <>
                  {ocupado && !tplPost && <p className="text-sm text-texto-2">{t.plantillas.preparando}</p>}
                  {!ocupado && !tplPost && (
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => void generarPlantillas()} className="btn btn-primario btn-sm">
                        {t.plantillas.crearConIa}
                      </button>
                      <button onClick={abrirTraer} className="btn btn-sec btn-sm">{t.plantillas.traerLaMia}</button>
                      <button onClick={() => setVista("lista")} className="btn btn-sec btn-sm">{t.plantillas.cancelar}</button>
                    </div>
                  )}
                  {tplPost && (
                    <>
                      {avisosTpl.map((a) => (
                        <p key={a} className="text-xs" style={{ color: "var(--color-peligro-texto)" }}>{a}</p>
                      ))}
                      <label className="block text-xs font-medium">{t.plantillas.tplPost}</label>
                      <textarea value={tplPost} onChange={(e) => setTplPost(e.target.value)} rows={8} className="campo font-mono" />
                      <label className="block text-xs font-medium">{t.plantillas.tplIndex}</label>
                      <textarea value={tplIndex} onChange={(e) => setTplIndex(e.target.value)} rows={8} className="campo font-mono" />
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => void guardarPlantillas()} disabled={ocupado} className="btn btn-primario btn-sm">
                          {rotulo("guardarPlantillas", t.plantillas.guardar, t.plantillas.guardando)}
                        </button>
                        <button onClick={() => void verPreview("post")} disabled={ocupado} className="btn btn-sec btn-sm">{t.plantillas.previoPost}</button>
                        <button onClick={() => void verPreview("index")} disabled={ocupado} className="btn btn-sec btn-sm">{t.plantillas.previoIndex}</button>
                        <button onClick={() => void generarPlantillas()} disabled={ocupado} className="btn btn-sec btn-sm">{t.plantillas.regenerar}</button>
                        <button onClick={abrirTraer} disabled={ocupado} className="btn btn-sec btn-sm">{t.plantillas.traerLaMia}</button>
                        <button onClick={() => setVista("lista")} className="btn btn-sec btn-sm">{t.plantillas.cancelar}</button>
                      </div>
                      {previewTpl && <IframePreview html={previewTpl} t={t.previo} />}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {vista === "editor" && (
            <div className="space-y-2">
              <input value={titulo} placeholder={t.editor.titulo}
                onChange={(e) => { setTitulo(e.target.value); if (!slugTocado) setSlug(slugify(e.target.value)); }}
                className="campo" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-texto-2">/blog/</span>
                <input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTocado(true); }}
                  className="campo w-64" />
                <span className="text-xs text-texto-2">.html</span>
              </div>
              <div>
                <input value={meta} placeholder={t.editor.meta}
                  onChange={(e) => setMeta(e.target.value)} className="campo" />
                <span className={"text-xs " + (meta.length > 160 ? "text-peligro-texto" : "text-texto-3")}>
                  {rellenar(t.editor.contadorMeta, { n: String(meta.length) })}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-texto-2">{t.editor.portada}</span>
                {imagenUrl && <img src={imagenUrl} alt="" className="h-8 w-14 rounded object-cover" />}
                <button onClick={() => void generarPortadaAuto("diseno")} disabled={ocupado || !titulo.trim()}
                  title={t.editor.generarDisenoTitulo}
                  className="btn btn-sec btn-sm">{rotulo("portada:diseno", t.editor.generarDiseno, t.editor.dibujando)}</button>
                <button onClick={() => void generarPortadaAuto("ia")} disabled={ocupado || !titulo.trim()}
                  title={t.editor.generarIaTitulo}
                  className="btn btn-sec btn-sm">{rotulo("portada:ia", t.editor.generarIa, t.editor.generando)}</button>
                <BotonSubir texto={imagenAssetId ? t.editor.cambiarImagen : t.editor.subirImagen} ocupado={ocupado} onFile={(f) => void subirPortada(f)} />
                {!titulo.trim() && <span className="text-xs text-texto-3">{t.editor.faltaTitulo}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <BotonSubir texto={t.editor.insertarImagen} ocupado={ocupado} onFile={(f) => void insertarEnCuerpo(f)} />
                <span className="text-xs text-texto-3">{t.editor.insertarTexto}</span>
              </div>
              <textarea ref={mdRef} value={md} rows={14}
                onChange={(e) => { setMd(e.target.value); cursorMd.current = e.target.selectionStart; }}
                onSelect={(e) => { cursorMd.current = e.currentTarget.selectionStart; }}
                placeholder={t.editor.cuerpoEjemplo}
                className="campo font-mono" />
              <div className="flex gap-2">
                <button onClick={() => void guardarArticulo()} disabled={ocupado} className="btn btn-primario btn-sm">
                  {rotulo("guardarArticulo", t.editor.guardar, t.editor.guardando)}
                </button>
                <button onClick={() => void verPreviewArticulo()} disabled={ocupado} className="btn btn-sec btn-sm">{t.editor.vistaPrevia}</button>
                <button onClick={() => setVista("lista")} className="btn btn-sec btn-sm">{t.editor.cancelar}</button>
              </div>
              {!postId && (
                <div className="flex flex-wrap items-center gap-2 border-t pt-2">
                  <span className="text-xs text-texto-2">{t.editor.programarTexto}</span>
                  <input type="datetime-local" value={progFecha} onChange={(e) => setProgFecha(e.target.value)}
                    className="campo w-auto" />
                  <button onClick={() => void programarArticulo()} disabled={ocupado || !progFecha}
                    className="btn btn-sec btn-sm">{t.editor.programar}</button>
                </div>
              )}
              {previewArt && <IframePreview html={previewArt} t={t.previo} />}
            </div>
          )}

          {error && <p className="error-campo">{error}</p>}
        </div>
      )}
    </details>
  );
}
