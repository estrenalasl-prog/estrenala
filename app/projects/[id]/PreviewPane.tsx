"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDialogo } from "@/app/_components/Dialogo";
import type { TextosPanel } from "@/src/i18n/panel";
import { rellenar } from "@/src/i18n/rellenar";

type Textos = TextosPanel["proyecto"];

type EditOp =
  | { page: string; nodeId: number; kind: "text"; value: string }
  | { page: string; nodeId: number; kind: "href"; value: string }
  | { page: string; nodeId: number; kind: "src"; value: string; assetId: string }
  | { page: string; nodeId: number; kind: "insertImage"; value: string; assetId: string; alt: string; posicion: "antes" | "despues" }
  | { page: string; nodeId: number; kind: "align"; value: "izquierda" | "centro" | "derecha" }
  | { page: string; nodeId: number; kind: "textAlign"; value: "izquierda" | "centro" | "derecha" }
  | { page: string; nodeId: number; kind: "size"; value: number }
  | { page: string; nodeId: number; kind: "margen"; value: number; lado?: "ambos" | "arriba" | "abajo" }
  | { page: string; nodeId: number; kind: "recuadro"; value: "ninguno" | "suave" | "borde" | "lateral" }
  | { page: string; nodeId: number; kind: "style"; property: "color"; value: string }
  | { page: string; nodeId: number; kind: "textNode"; index: number; value: string };
type SnapshotInfo = { id: string; tipo: string; parentId: string | null; createdAt: string; esActual: boolean };

function opKey(op: EditOp): string {
  // Las imágenes NUEVAS se distinguen además por cuál es y dónde va: si no, poner
  // dos fotos distintas debajo del mismo párrafo dejaría solo la última. Mismo
  // criterio que en `applyEdits`, y tiene que seguir siéndolo.
  const extra =
    op.kind === "style" ? op.property
      : op.kind === "textNode" ? String(op.index)
      : op.kind === "insertImage" ? `${op.posicion}#${op.value}`
      : op.kind === "margen" ? (op.lado ?? "ambos")
      : "";
  return `${op.page}#${op.nodeId}#${op.kind}#${extra}`;
}

/**
 * Texto alternativo por defecto, sacado del nombre del archivo. No es perfecto,
 * pero una imagen sin `alt` es invisible para Google y para quien use lector de
 * pantalla, y nadie lo escribe si hay que escribirlo a mano.
 */
function altDeNombre(nombre: string): string {
  return nombre.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim().slice(0, 300);
}

// `Object.hasOwn` y no `??`: con la búsqueda directa, un tipo llamado
// "constructor" devolvería la función Object en vez del nombre. Mismo fallo que
// ya mordió en contentTypeFor.
function etiquetaTipo(tipo: string, t: Textos["historial"]): string {
  const nombres: Record<string, string> = {
    import: t.tipoImport,
    edit: t.tipoEdit,
    "edit-ia": t.tipoEditIa,
    blog: t.tipoBlog,
    restore: t.tipoRestore,
    publish: t.tipoPublish,
    actualizacion: t.tipoActualizacion,
  };
  return Object.hasOwn(nombres, tipo) ? nombres[tipo] : tipo;
}
// La hora que se enseña tiene que ser LA DEL USUARIO. Antes se cortaba el ISO en
// crudo (`iso.slice(0, 16)`), que viene en UTC: en España en verano el Historial
// iba DOS HORAS atrasado, así que nada parecía reciente y un cambio recién hecho
// no se reconocía. Y aquí es donde se decide qué versión restaurar, o sea que la
// hora no es decoración: es el dato con el que se elige.
function cuando(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16).replace("T", " ");
  return d.toLocaleString(undefined, {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export function PreviewPane({
  projectId, entryPath, pages, t,
}: { projectId: string; entryPath: string; pages: string[]; t: Textos }) {
  const { avisar } = useDialogo();
  const [actual, setActual] = useState(entryPath);
  const [guardando, setGuardando] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const [ops, setOps] = useState<Map<string, EditOp>>(new Map());
  const [snapshots, setSnapshots] = useState<SnapshotInfo[] | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // `posicion` null = se está CAMBIANDO la imagen de un <img> que ya existe;
  // "antes"/"despues" = se está metiendo una nueva junto al elemento elegido.
  const pendingImg = useRef<{ nodeId: number; page: string; posicion: "antes" | "despues" | null } | null>(null);
  const router = useRouter();

  const relPath = actual === entryPath ? "" : actual;
  const src = `/api/projects/${projectId}/preview/${relPath}${editMode ? "?edit=1" : ""}#${recarga}`;

  const cargarHistorial = useCallback(async () => {
    const d = await fetch(`/api/projects/${projectId}/snapshots`).then((r) => r.json()).catch(() => ({}));
    setSnapshots(d.snapshots ?? []);
  }, [projectId]);
  useEffect(() => { void cargarHistorial(); }, [cargarHistorial]);

  // Pantalla completa: salir con Esc y bloquear el scroll del fondo mientras dura.
  // El Esc de dentro del iframe (cancelar edición de texto) no llega aquí: los eventos
  // del documento del iframe no burbujean al padre, así que no se pisan.
  useEffect(() => {
    if (!expandido) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setExpandido(false); }
    window.addEventListener("keydown", onKey);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previo;
    };
  }, [expandido]);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      const data = e.data as {
        type?: string; op?: EditOp; nodeId?: number; page?: string; posicion?: "antes" | "despues";
      };
      if (data?.type === "wc-edit" && data.op) {
        setOps((prev) => {
          const next = new Map(prev);
          next.set(opKey(data.op!), data.op!);
          return next;
        });
      } else if (data?.type === "wc-image-request" && typeof data.nodeId === "number" && data.page) {
        pendingImg.current = { nodeId: data.nodeId, page: data.page, posicion: null };
        fileInputRef.current?.click();
      } else if (
        data?.type === "wc-image-insert-request" && typeof data.nodeId === "number" && data.page &&
        (data.posicion === "antes" || data.posicion === "despues")
      ) {
        // Igual que cambiar una imagen, pero recordando ADEMÁS dónde va la nueva.
        pendingImg.current = { nodeId: data.nodeId, page: data.page, posicion: data.posicion };
        fileInputRef.current?.click();
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const pend = pendingImg.current;
    pendingImg.current = null;
    if (!file || !pend) return;
    setGuardando(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/projects/${projectId}/assets`, { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        await avisar({ titulo: t.previo.errorImagen, cuerpo: d.error });
        return;
      }
      const { assetId, ext, url } = (await res.json()) as { assetId: string; ext: string; url: string };
      // Dos direcciones para la misma imagen: `url` es la del panel, que existe YA
      // y sirve para que se vea al momento; la de `/wc-uploads/` es la que tendrá
      // en la web publicada, y es la que se guarda en la op. El archivo viaja
      // dentro del snapshot al guardar (ver save-edits).
      const valor = `/wc-uploads/${assetId}.${ext}`;
      let op: EditOp;
      if (pend.posicion) {
        const alt = altDeNombre(file.name);
        iframeRef.current?.contentWindow?.postMessage(
          { type: "wc-image-insert-set", nodeId: pend.nodeId, posicion: pend.posicion, previewUrl: url, alt },
          "*"
        );
        op = { page: pend.page, nodeId: pend.nodeId, kind: "insertImage", value: valor, assetId, alt, posicion: pend.posicion };
      } else {
        iframeRef.current?.contentWindow?.postMessage({ type: "wc-image-set", nodeId: pend.nodeId, previewUrl: url }, "*");
        op = { page: pend.page, nodeId: pend.nodeId, kind: "src", value: valor, assetId };
      }
      setOps((prev) => {
        const next = new Map(prev);
        next.set(opKey(op), op);
        return next;
      });
    } finally {
      setGuardando(false);
    }
  }

  // Mirar una página y DECIDIR cuál es la portada son dos cosas distintas, y
  // durante mucho tiempo aquí fueron la misma: el desplegable guardaba
  // `entryPath` al cambiarlo. O sea que asomarse a Contacto para verlo —lo
  // primero que hace cualquiera— reasignaba en silencio la portada de la web
  // publicada. A Sebas le pasó con quantiva.estrenala.com: la dirección abría
  // Contacto y parecía que la plataforma «se volvía loca».
  //
  // Ahora el desplegable solo navega. Cambiar la portada es un botón aparte,
  // que solo aparece cuando estás viendo otra página, y dice lo que hace.
  function verPagina(nuevo: string) {
    setActual(nuevo);
  }

  async function marcarComoInicio() {
    setGuardando(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ entryPath: actual }),
      });
      if (res.ok) router.refresh();
      else { const d = await res.json().catch(() => ({})); await avisar({ titulo: t.previo.errorPortada, cuerpo: d.error }); }
    } finally {
      setGuardando(false);
    }
  }

  function entrarEdicion() { setOps(new Map()); setEditMode(true); }
  function cancelarEdicion() { setOps(new Map()); setEditMode(false); setRecarga((n) => n + 1); }
  function alternarEdicion() { if (editMode) cancelarEdicion(); else entrarEdicion(); }

  async function guardarEdicion() {
    setGuardando(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/edits`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ops: [...ops.values()] }),
      });
      if (res.ok) { setOps(new Map()); setEditMode(false); setRecarga((n) => n + 1); await cargarHistorial(); router.refresh(); }
      else { const d = await res.json().catch(() => ({})); await avisar({ titulo: t.previo.errorGuardar, cuerpo: d.error }); }
    } finally {
      setGuardando(false);
    }
  }

  // Restaurar iba a pelo: un solo clic y la web volvía atrás, sin preguntar y
  // sin decir qué implicaba. Es la acción más destructiva del panel a ojos del
  // usuario, y estaba a un resbalón del ratón.
  //
  // El aviso además aclara dos cosas que no son evidentes y que Sebas preguntó:
  // restaurar solo mueve el puntero de la versión actual —no borra nada, se
  // puede volver a cualquier otra de la lista— y NO toca la web publicada
  // hasta que se le dé a «Publicar cambios».
  async function restaurar(snapshotId: string) {
    setConfirmando(null);
    await fetch(`/api/projects/${projectId}/snapshots/${snapshotId}/restore`, { method: "POST" });
    setRecarga((n) => n + 1); await cargarHistorial(); router.refresh();
  }

  return (
    <div className="area">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/svg+xml"
        className="hidden"
        onChange={(e) => void onFileChange(e)}
      />

      <div className={expandido ? "previo expandido" : "previo"}>
        <div className="previo-barra">
          <select
            className="previo-select"
            value={actual}
            onChange={(e) => verPagina(e.target.value)}
            disabled={editMode}
            title={editMode ? t.previo.selectBloqueado : t.previo.selectTitulo}
          >
            {/* Dentro de un <option> solo cabe texto: se rellena en crudo. */}
            {pages.map((p) => (
              <option key={p} value={p}>{p === entryPath ? rellenar(t.previo.portada, { pagina: p }) : p}</option>
            ))}
          </select>

          {actual !== entryPath && (
            <button
              className="btn btn-sec btn-sm"
              onClick={() => void marcarComoInicio()}
              disabled={editMode || guardando}
              title={t.previo.hacerPortadaTitulo}
            >
              {guardando ? <><span className="cargador" /> {t.previo.guardando}</> : t.previo.hacerPortada}
            </button>
          )}

          <button
            type="button"
            role="switch"
            aria-checked={editMode}
            className="interruptor"
            onClick={alternarEdicion}
            aria-label={t.previo.modoEdicion}
          />
          <span className="conmutador" onClick={alternarEdicion} style={{ userSelect: "none" }}>{t.previo.modoEdicion}</span>

          <div className="derecha">
            {editMode ? (
              <>
                <span style={{ fontSize: 13, color: "var(--color-texto-2)" }}>
                  {rellenar(ops.size === 1 ? t.previo.unCambio : t.previo.variosCambios, { n: String(ops.size) })}
                </span>
                <button className="btn btn-fantasma btn-sm" onClick={cancelarEdicion} disabled={guardando}>{t.previo.descartar}</button>
                {/* Guardar copia el sitio entero a una versión nueva, así que en
                    una web con muchos archivos tarda entre cinco y diez segundos.
                    Sin reloj, el botón solo se apaga —que se lee como «no ha
                    pasado nada»— y uno vuelve a pulsarlo pensando que se ha
                    colgado. Le pasó a Sebas el 2026-08-02. El botón de al lado ya
                    lo hacía bien; este se quedó sin él. */}
                <button className="btn btn-primario btn-sm" onClick={() => void guardarEdicion()} disabled={ops.size === 0 || guardando}>
                  {guardando ? <><span className="cargador" /> {t.previo.guardando}</> : t.previo.guardarCambios}
                </button>
              </>
            ) : (
              guardando && <span style={{ fontSize: 13, color: "var(--color-texto-3)" }}>{t.previo.guardandoSuelto}</span>
            )}
            <button
              className="btn btn-sec btn-sm"
              onClick={() => setExpandido(!expandido)}
              title={expandido ? t.previo.salirTitulo : t.previo.expandirTitulo}
            >
              {expandido ? t.previo.salir : t.previo.expandir}
            </button>
          </div>
        </div>

        <iframe
          key={src}
          ref={iframeRef}
          src={src}
          sandbox="allow-scripts"
          // El sandbox crea un origen opaco (cross-origin): sin delegar autoplay, los
          // vídeos de fondo de las webs (hero videos) no arrancan dentro del preview.
          allow="autoplay"
          className="lienzo-web"
          title="preview"
        />
      </div>

      <aside className="historial">
        <header>{t.historial.titulo}</header>
        {snapshots === null ? (
          <p className="vacio-hist">{t.historial.cargando}</p>
        ) : snapshots.length === 0 ? (
          <p className="vacio-hist">{t.historial.vacio}</p>
        ) : (
          <ul>
            {snapshots.map((s) => (
              <li key={s.id}>
                <span className={s.esActual ? "tipo actual" : "tipo"} />
                <span className="detalle">
                  {etiquetaTipo(s.tipo, t.historial)}
                  <br />
                  {/* El servidor va en UTC y el navegador en la zona del usuario,
                      así que este texto es distinto en cada lado a propósito. */}
                  <span className="cuando" suppressHydrationWarning>{s.esActual ? t.historial.actual : ""}{cuando(s.createdAt)}</span>
                  {confirmando === s.id && (
                    <>
                      <br />
                      <span style={{ fontSize: 12, color: "var(--color-texto-3)", lineHeight: 1.45 }}>
                        {t.historial.confirmar}
                      </span>
                    </>
                  )}
                </span>
                {!s.esActual && (
                  confirmando === s.id ? (
                    <span style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button className="btn btn-peligro-sutil btn-sm" onClick={() => void restaurar(s.id)}>{t.historial.si}</button>
                      <button className="btn btn-fantasma btn-sm" onClick={() => setConfirmando(null)}>{t.historial.no}</button>
                    </span>
                  ) : (
                    <button
                      className="btn btn-sec btn-sm"
                      onClick={() => setConfirmando(s.id)}
                      title={t.historial.restaurarTitulo}
                    >
                      {t.historial.restaurar}
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
