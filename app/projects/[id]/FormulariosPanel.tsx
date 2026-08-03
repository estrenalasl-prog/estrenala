"use client";
import { useCallback, useEffect, useState } from "react";
import type { TextosPanel } from "@/src/i18n/panel";
import { rellenar } from "@/src/i18n/rellenar";
import { LOCALE_INTL, type Idioma } from "@/src/i18n/idiomas";

type Textos = TextosPanel["proyecto"]["formularios"];

type Detectado = { indice: number; estado: string; campos: string[] };
type Envio = {
  id: string; pagina: string; formIndice: number;
  datos: Record<string, string>; leido: boolean; cuando: string;
};
type Estado = { recoge: boolean; detectados: Detectado[]; envios: Envio[] };

/**
 * Mensajes de los formularios de una web.
 *
 * El interruptor está apagado de fábrica. Encenderlo hace que la plataforma
 * empiece a guardar datos de TERCEROS —quien rellena el formulario es cliente de
 * nuestro cliente, no nuestro—, así que se le avisa ANTES de encenderlo, no
 * después, y se le recuerda que quien responde de esos datos es él.
 */
export function FormulariosPanel({
  projectId, textos, idioma,
}: { projectId: string; textos: Textos; idioma: Idioma }) {
  const t = textos;
  const [d, setD] = useState<Estado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`/api/projects/${projectId}/formularios`);
      if (!r.ok) { setError(t.errorCargar); return; }
      setD((await r.json()) as Estado);
      setError(null);
    } catch {
      setError(t.errorCargar);
    }
  }, [projectId, t.errorCargar]);

  // Se carga al montar y no al desplegar, al revés que Herramientas: el número
  // de mensajes sin leer tiene que verse en la cabecera SIN abrir el panel, que
  // es justo para lo que sirve. Es una consulta, no una web entera.
  useEffect(() => { void cargar(); }, [cargar]);

  async function cambiar(cuerpo: Record<string, unknown>) {
    setOcupado(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/formularios`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? t.errorCargar);
        return;
      }
      await cargar();
    } finally {
      setOcupado(false);
    }
  }

  const muertos = (d?.detectados ?? []).filter((f) => f.estado === "muerto" && f.campos.length > 0);
  const sinLeer = (d?.envios ?? []).filter((e) => !e.leido).length;
  const fecha = new Intl.DateTimeFormat(LOCALE_INTL[idioma], { dateStyle: "medium", timeStyle: "short" });

  // Lo que se ve SIN abrir el panel. El orden importa: primero lo que hay que
  // atender (mensajes sin leer), luego lo que hay roto, y solo si no hay ninguna
  // de las dos, el estado a secas.
  const resumen = !d ? t.cargando
    : sinLeer > 0 ? rellenar(t.sinLeer, { n: String(sinLeer) })
    : !d.recoge && muertos.length > 0
      ? rellenar(muertos.length === 1 ? t.rotos : t.rotosPlural, { n: String(muertos.length) })
      : d.recoge ? t.encendido : t.apagado;

  return (
    <details className="direccion" id="mensajes" open={sinLeer > 0 || (!!d && !d.recoge && muertos.length > 0)}>
      <summary>
        <span className="flecha">▸</span> {t.titulo}
        <span className="estado-dom">{resumen}</span>
      </summary>
      <div className="direccion-cuerpo" style={{ display: "block" }}>

      {!d ? <p className="ayuda-campo">{error ?? t.cargando}</p> : <>
      <div className="fila-conf">
        <div className="info">
          <b>
            {t.titulo}
            {d.recoge
              ? <span className="badge badge-exito"><span className="punto" />{t.encendido}</span>
              : <span className="badge badge-neutro"><span className="punto" />{t.apagado}</span>}
          </b>
          <small>{t.queEs}</small>
        </div>
        <div className="control">
          <button
            className="interruptor"
            role="switch"
            aria-checked={d.recoge}
            aria-label={d.recoge ? t.apagar : t.encender}
            disabled={ocupado}
            onClick={() => void cambiar({ recoge: !d.recoge })}
          />
        </div>
      </div>

      {/* El aviso de responsabilidad, solo mientras está APAGADO: es lo que hay
          que leer antes de decidir. Con la recogida ya encendida, repetirlo en
          cada visita es ruido — la decisión ya está tomada. */}
      {!d.recoge && (
        <div className="aviso-bloque">
          <span className="icono" aria-hidden="true">⚠️</span>
          <span>{t.avisoDatos}</span>
        </div>
      )}

      {/* Lo que de verdad convierte: enseñarle que tiene formularios rotos justo
          cuando está mirando la pantalla, no en una ayuda que nadie abre. */}
      {!d.recoge && muertos.length > 0 && (
        <div className="aviso-bloque">
          <span className="icono" aria-hidden="true">📭</span>
          <span>
            <b>{rellenar(muertos.length === 1 ? t.rotos : t.rotosPlural, { n: String(muertos.length) })}</b>
            <br />
            {t.rotosDetalle}
          </span>
        </div>
      )}
      {!d.recoge && muertos.length === 0 && d.detectados.length > 0 && (
        <p className="ayuda-campo">{t.ningunoRoto}</p>
      )}
      {!d.recoge && d.detectados.length === 0 && (
        <p className="ayuda-campo">{t.sinFormularios}</p>
      )}

      <div className="mt-3">
        {d.envios.length === 0 ? (
          <p className="ayuda-campo">{d.recoge ? t.vaciaEncendida : t.vacia}</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="ayuda-campo">
                {sinLeer > 0 ? rellenar(t.sinLeer, { n: String(sinLeer) }) : null}
              </span>
              {sinLeer > 0 && (
                <button className="btn btn-fantasma btn-sm" disabled={ocupado} onClick={() => void cambiar({ leidos: true })}>
                  {t.marcarLeidos}
                </button>
              )}
            </div>
            <div className="lista">
              {d.envios.map((e) => (
                <div key={e.id} className="item" style={{ display: "block" }}>
                  <div className="flex items-center gap-2 mb-2">
                    {!e.leido && <span className="badge badge-exito"><span className="punto" /></span>}
                    <span className="ayuda-campo" style={{ marginTop: 0 }}>
                      {fecha.format(new Date(e.cuando))} · {rellenar(t.en, { pagina: e.pagina })}
                    </span>
                  </div>
                  <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 14px", margin: 0 }}>
                    {Object.entries(e.datos).map(([k, v]) => (
                      <div key={k} style={{ display: "contents" }}>
                        <dt style={{ fontSize: 12.5, color: "var(--color-texto-3)", whiteSpace: "nowrap" }}>{k}</dt>
                        {/* Texto plano SIEMPRE. Lo escribe cualquiera de internet:
                            pintarlo como HTML sería dejar que quien rellena el
                            formulario de un cliente meta marcado en NUESTRO panel. */}
                        <dd style={{ margin: 0, fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {error && <p className="error-campo">{error}</p>}
      </>}
      </div>
    </details>
  );
}
