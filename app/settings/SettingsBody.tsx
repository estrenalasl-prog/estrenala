"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MODELOS, nombreModelo } from "../_components/modelos";
import { useDialogo } from "../_components/Dialogo";
import { IDIOMAS, LOCALE_INTL, NOMBRE_IDIOMA, type Idioma } from "@/src/i18n/idiomas";
import type { TextosAjustes } from "@/src/i18n/ajustes";
import { conFormato, conValores } from "@/src/i18n/formato";
import { rellenar } from "@/src/i18n/rellenar";

// Cada espacio usa SU clave. Hubo un origen "env" —«usando la del servidor»—
// que se quitó: significaba que la IA del cliente la pagaba la plataforma.
type EstadoClave = { origen: "ui" | null; sufijo: string };
type EstadoClaves = { openrouter: EstadoClave; serpapi: EstadoClave; modeloIa: string };

/** Lo que responde el botón de probar: si valió, y qué contar. */
type Prueba = { ok: boolean; detalle: string };

type TClaves = TextosAjustes["claves"];

function textoEstado(e: EstadoClave, t: TClaves): string {
  return e.origen === "ui" ? rellenar(t.usandoTuClave, { sufijo: e.sufijo }) : t.sinConfigurar;
}

function BadgeClave({ estado, t }: { estado: EstadoClave | null; t: TClaves }) {
  if (!estado) return <span className="badge badge-neutro"><span className="punto" />{t.cargando}</span>;
  const clase = estado.origen === "ui" ? "badge badge-exito" : "badge badge-neutro";
  return <span className={clase}><span className="punto" />{textoEstado(estado, t)}</span>;
}

// Tarjeta del modelo de IA con el que se redacta (lista curada + slug libre).
// A NIVEL DE MÓDULO (regla de foco del proyecto).
function TarjetaModelo({ modeloActual, ocupado, onGuardar, t }: {
  modeloActual: string;
  ocupado: boolean;
  onGuardar: (modelo: string) => Promise<boolean>;
  t: TClaves;
}) {
  const [sel, setSel] = useState("");
  const [custom, setCustom] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  // Sincroniza el selector con lo guardado cuando llega del GET.
  useEffect(() => {
    if (MODELOS.some((m) => m.valor === modeloActual)) { setSel(modeloActual); setCustom(""); }
    else { setSel("otro"); setCustom(modeloActual); }
  }, [modeloActual]);

  async function guardar() {
    setMsg(null);
    const modelo = sel === "otro" ? custom.trim() : sel;
    if (await onGuardar(modelo)) setMsg(t.modeloGuardado);
  }

  return (
    <div className="fila-conf" style={{ display: "block" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b style={{ fontWeight: 600, fontSize: 14 }}>{t.modeloTitulo}</b>
        <span className="badge badge-neutro">
          <span className="punto" />{rellenar(t.modeloActual, { modelo: nombreModelo(modeloActual) })}
        </span>
      </div>
      <p className="ayuda-campo">{t.modeloAyuda}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={sel} onChange={(e) => { setSel(e.target.value); setMsg(null); }} className="campo">
          {MODELOS.map((m) => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
          <option value="otro">{t.modeloOtro}</option>
        </select>
        {sel === "otro" && (
          <input value={custom} placeholder={t.modeloOtroEjemplo}
            onChange={(e) => { setCustom(e.target.value); setMsg(null); }}
            className="campo" style={{ maxWidth: 380 }} />
        )}
        <button onClick={() => void guardar()} disabled={ocupado} className="btn btn-sec btn-sm">{t.guardar}</button>
      </div>
      {msg && <p className="ayuda-campo" style={{ color: "var(--color-exito-texto)" }}>{msg}</p>}
    </div>
  );
}

// Tarjeta de un servicio: estado, input de clave, guardar/probar/quitar.
// A NIVEL DE MÓDULO (regla de foco del proyecto).
function TarjetaServicio({ titulo, descripcion, enlace, estado, ocupado, onGuardar, onProbar, onQuitar, t }: {
  titulo: string;
  descripcion: string;
  enlace: { href: string; texto: string };
  estado: EstadoClave | null;
  ocupado: boolean;
  onGuardar: (clave: string) => Promise<boolean>;
  onProbar: () => Promise<Prueba | null>;
  onQuitar: () => Promise<boolean>;
  t: TClaves;
}) {
  const [clave, setClave] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [msgError, setMsgError] = useState(false);

  async function guardar() {
    if (!clave.trim()) return;
    setMsg(null);
    if (!(await onGuardar(clave))) return;
    setClave("");
    // Prueba automática: detecta al momento una clave mal copiada.
    //
    // Si valió o no lo dice la API con un booleano. Antes se adivinaba mirando si
    // el texto del servidor empezaba por «Clave válida», lo que ataba esta
    // pantalla a la primera palabra de un mensaje de otro sitio: el día que ese
    // mensaje se traduzca, TODAS las claves buenas pasarían a darse por malas.
    const prueba = await onProbar();
    if (prueba === null) { setMsg(t.claveGuardada); setMsgError(false); return; }
    setMsg(rellenar(prueba.ok ? t.claveGuardadaYProbada : t.claveGuardadaPeroFallo, { detalle: prueba.detalle }));
    setMsgError(!prueba.ok);
  }
  async function probar() {
    setMsg(null);
    const prueba = await onProbar();
    if (prueba !== null) { setMsg(prueba.detalle); setMsgError(!prueba.ok); }
  }
  async function quitar() {
    setMsg(null);
    if (await onQuitar()) { setMsg(t.claveQuitada); setMsgError(false); }
  }

  return (
    <div className="fila-conf" style={{ display: "block" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b style={{ fontWeight: 600, fontSize: 14 }}>{titulo}</b>
        <BadgeClave estado={estado} t={t} />
      </div>
      <p className="ayuda-campo">
        {descripcion}{" "}
        <a href={enlace.href} target="_blank" rel="noreferrer">{enlace.texto}</a>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input type="password" value={clave} placeholder={t.pegaClave}
          onChange={(e) => { setClave(e.target.value); setMsg(null); }}
          className="campo" style={{ maxWidth: 320 }} />
        <button onClick={() => void guardar()} disabled={ocupado || !clave.trim()} className="btn btn-sec btn-sm">{t.guardar}</button>
        <button onClick={() => void probar()} disabled={ocupado || estado?.origen == null} className="btn btn-sec btn-sm">{t.probar}</button>
        {estado?.origen === "ui" && (
          <button onClick={() => void quitar()} disabled={ocupado} className="btn btn-fantasma btn-sm">{t.quitar}</button>
        )}
      </div>
      {msg && (
        <p className="ayuda-campo" style={msgError ? { color: "var(--color-peligro-texto)" } : { color: "var(--color-exito-texto)" }}>{msg}</p>
      )}
    </div>
  );
}

type LimitesPlan = {
  id: string; nombre: string; precioMes: number; precioAnual: number;
  webs: number; dominioPropio: boolean; sinMarca: boolean; blog: boolean; equipo: boolean;
};
type EstadoPlan = {
  plan: string; rol: string;
  uso: { webs: number; miembros: number };
  limites: LimitesPlan; catalogo: LimitesPlan[];
  pagos: boolean; suscrito: boolean; estado: string; hasta: string | null;
};

type TPlan = TextosAjustes["plan"];

// Cómo se le cuenta al usuario el estado de su suscripción.
//
// El badge estaba escrito a fuego a «Activo», así que decía lo mismo tras darse
// de baja (Stripe deja el status en `active` hasta que vence) y también con un
// pago fallido mientras Stripe reintenta. Justo los dos momentos en los que hay
// que hablar claro.
function diasHasta(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Number.isNaN(ms) ? null : Math.max(0, Math.ceil(ms / 86400000));
}

// La fecha, en el idioma de la cuenta. Antes iba con `undefined`, que es el del
// navegador: alguien con el panel en francés y Chrome en inglés veía «August 3»
// en mitad de una frase en francés. Y es la fecha en la que se le cobra.
function fechaLarga(iso: string, idioma: Idioma): string {
  return new Date(iso).toLocaleDateString(LOCALE_INTL[idioma], { day: "numeric", month: "long", year: "numeric" });
}

function EstadoSuscripcion({ estado, t }: { estado: string; t: TPlan }) {
  if (estado === "cancelando") return <span className="badge badge-aviso"><span className="punto" />{t.estadoCancelada}</span>;
  if (estado === "past_due" || estado === "unpaid") return <span className="badge badge-aviso"><span className="punto" />{t.estadoPagoPendiente}</span>;
  if (estado === "trialing") return <span className="badge badge-exito"><span className="punto" />{t.estadoPrueba}</span>;
  if (estado === "canceled" || !estado) return null;
  return <span className="badge badge-exito"><span className="punto" />{t.estadoActivo}</span>;
}

function ExplicacionSuscripcion({ estado, hasta, idioma, t }: {
  estado: string; hasta: string | null; idioma: Idioma; t: TPlan;
}) {
  const dias = diasHasta(hasta);
  if (estado === "cancelando" && hasta) {
    return (
      <div className="aviso-ok" role="status" style={{ marginTop: 12, fontSize: 13.5 }}>
        <span>
          {conValores(t.cancelando, { fecha: <b>{fechaLarga(hasta, idioma)}</b> })}
          {dias !== null && (
            <> {conValores(t.teQuedan, {
              dias: <b>{rellenar(dias === 1 ? t.unDia : t.variosDias, { n: String(dias) })}</b>,
            })}</>
          )}
        </span>
      </div>
    );
  }
  if (estado === "past_due" || estado === "unpaid") {
    return (
      <div className="aviso-error" role="alert" style={{ marginTop: 12, fontSize: 13.5 }}>
        <span>{t.pagoFallido}</span>
      </div>
    );
  }
  if (estado === "active" && hasta) {
    return <p className="ayuda-campo" style={{ marginTop: 10 }}>{rellenar(t.seRenueva, { fecha: fechaLarga(hasta, idioma) })}</p>;
  }
  return null;
}

// Sección «Plan y uso»: qué plan tiene el espacio, cuánto lleva usado y qué
// incluye cada plan. Pagar y cancelar se hace en Stripe (Checkout y portal): la
// plataforma nunca ve la tarjeta.
function SeccionPlan({ idioma, t, errores }: {
  idioma: Idioma; t: TPlan; errores: TextosAjustes["errores"];
}) {
  const [d, setD] = useState<EstadoPlan | null>(null);
  const [periodo, setPeriodo] = useState<"mes" | "anual">("mes");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try { const r = await fetch("/api/plan"); if (r.ok) setD((await r.json()) as EstadoPlan); }
      catch { /* silencioso */ }
    })();
  }, []);

  // Tras volver de Stripe el plan lo activa el webhook: puede tardar un instante.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("pago") !== "ok") return;
    const tm = setTimeout(() => {
      void (async () => {
        try { const r = await fetch("/api/plan"); if (r.ok) setD((await r.json()) as EstadoPlan); } catch { /* silencioso */ }
      })();
    }, 2500);
    return () => clearTimeout(tm);
  }, []);

  async function ir(url: string, body?: unknown) {
    setOcupado(true); setError(null);
    try {
      const r = await fetch(url, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!r.ok || !j.url) { setError(j.error ?? errores.continuar); return; }
      window.location.href = j.url; // Checkout / portal alojados por Stripe
    } catch {
      setError(errores.conexion);
    } finally { setOcupado(false); }
  }

  const marca = (v: boolean) => (v ? "✓" : "—");
  const precioMes = (n: number) => rellenar(t.porMes, { n: String(n) });
  const precioAnual = (n: number) => rellenar(t.porAnual, { n: String(n) });
  const esOwner = d?.rol === "owner";

  const filas: [string, (p: LimitesPlan) => string][] = [
    [t.filaWebs, (p) => String(p.webs)],
    [t.filaEditor, () => "✓"],
    [t.filaZip, () => "✓"],
    [t.filaAsistente, () => "✓"],
    [t.filaDominio, (p) => marca(p.dominioPropio)],
    [t.filaSinMarca, (p) => marca(p.sinMarca)],
    [t.filaBlog, (p) => marca(p.blog)],
    [t.filaEquipo, (p) => marca(p.equipo)],
  ];

  return (
    <section className="card-conf" id="plan">
      <header>
        <div className="tit">
          <h2>{t.titulo}</h2>
          <p>{t.lead}</p>
        </div>
      </header>
      <div className="cuerpo">
        {!d ? (
          <p className="ayuda-campo" style={{ marginTop: 10 }}>{t.cargando}</p>
        ) : (
          <>
            <div className="fila-conf">
              <div className="info">
                <b>{rellenar(t.tuPlan, { nombre: d.limites.nombre })}</b>
                <small>
                  {d.limites.precioMes === 0
                    ? t.gratisSiempre
                    : rellenar(t.precios, { mes: String(d.limites.precioMes), anual: String(d.limites.precioAnual) })}
                </small>
              </div>
              <div className="control">
                <EstadoSuscripcion estado={d.estado} t={t} />
              </div>
            </div>
            <ExplicacionSuscripcion estado={d.estado} hasta={d.hasta} idioma={idioma} t={t} />

            <div className="fila-conf">
              <div className="info">
                <b>{t.websTitulo}</b>
                <small>{t.websTexto}</small>
              </div>
              <div className="control">
                <span className={d.uso.webs >= d.limites.webs ? "badge badge-aviso" : "badge badge-neutro"}>
                  <span className="punto" />{rellenar(t.websUso, { usadas: String(d.uso.webs), total: String(d.limites.webs) })}
                </span>
              </div>
            </div>

            {!d.limites.sinMarca && (
              <div className="fila-conf">
                <div className="info">
                  <b>{t.marcaTitulo}</b>
                  <small>{t.marcaTexto}</small>
                </div>
                <div className="control"><span className="badge badge-neutro"><span className="punto" />{t.marcaVisible}</span></div>
              </div>
            )}

            <div className="fila-conf">
              <div className="info">
                <b>{t.personasTitulo}</b>
                <small>{d.limites.equipo ? t.personasSi : t.personasNo}</small>
              </div>
              <div className="control"><span className="badge badge-neutro"><span className="punto" />{d.uso.miembros}</span></div>
            </div>

            <p className="ayuda-campo" style={{ marginTop: 18, marginBottom: 8 }}>{t.comparativa}</p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "8px 10px" }}> </th>
                    {d.catalogo.map((p) => (
                      <th key={p.id} style={{ textAlign: "left", padding: "8px 10px" }}>
                        {p.nombre}{p.id === d.plan ? t.columnaTuya : ""}
                        <br />
                        <span style={{ fontWeight: 400, color: "var(--color-texto-3)" }}>
                          {p.precioMes === 0 ? t.gratis : precioMes(p.precioMes)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filas.map(([etq, val]) => (
                    <tr key={etq}>
                      <td style={{ padding: "8px 10px", borderTop: "1px solid var(--color-borde)", color: "var(--color-texto-2)" }}>{etq}</td>
                      {d.catalogo.map((p) => (
                        <td key={p.id} style={{ padding: "8px 10px", borderTop: "1px solid var(--color-borde)" }}>{val(p)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {error && <div className="aviso-error" role="alert" style={{ marginTop: 14 }}><span className="ico">!</span><span>{error}</span></div>}

            {!d.pagos ? (
              <p className="ayuda-campo" style={{ marginTop: 14 }}>{t.sinPagos}</p>
            ) : !esOwner ? (
              <p className="ayuda-campo" style={{ marginTop: 14 }}>{t.soloOwner}</p>
            ) : d.suscrito ? (
              <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button className="btn btn-sec btn-sm" disabled={ocupado} onClick={() => void ir("/api/plan/portal")}>
                  {ocupado ? t.abriendo : t.gestionar}
                </button>
                <small style={{ color: "var(--color-texto-3)" }}>{t.gestionarTexto}</small>
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: "var(--color-texto-2)" }}>{t.comoPagar}</span>
                  <select className="campo select-conf" value={periodo}
                    onChange={(e) => setPeriodo(e.target.value === "anual" ? "anual" : "mes")}>
                    <option value="mes">{t.mesAMes}</option>
                    <option value="anual">{t.anual}</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {d.catalogo.filter((p) => p.id !== "free" && p.id !== d.plan).map((p) => (
                    <button key={p.id} className="btn btn-primario btn-sm" disabled={ocupado}
                      onClick={() => void ir("/api/plan/checkout", { plan: p.id, periodo })}>
                      {ocupado ? t.abriendo : rellenar(t.pasarA, {
                        plan: p.nombre,
                        precio: periodo === "anual" ? precioAnual(p.precioAnual) : precioMes(p.precioMes),
                      })}
                    </button>
                  ))}
                </div>
                <p className="ayuda-campo" style={{ marginTop: 10 }}>{t.pagoSeguro}</p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

const botonPeligro = { background: "var(--color-peligro-texto, #b91c1c)", color: "#fff", borderColor: "transparent" };

// Zona de peligro: eliminar la cuenta, con confirmación (escribir el correo).
function SeccionPeligro({ t, errores }: { t: TextosAjustes["peligro"]; errores: TextosAjustes["errores"] }) {
  const [email, setEmail] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try { const r = await fetch("/api/cuenta"); if (r.ok) setEmail(((await r.json()) as { email: string }).email); } catch { /* silencioso */ }
    })();
  }, []);

  async function borrar() {
    setOcupado(true); setError(null);
    try {
      const r = await fetch("/api/cuenta", { method: "DELETE" });
      if (!r.ok) { const d = (await r.json().catch(() => ({}))) as { error?: string }; setError(d.error ?? errores.borrarCuenta); return; }
      window.location.href = "/login";
    } catch {
      setError(errores.conexion);
    } finally { setOcupado(false); }
  }

  const coincide = texto.trim().toLowerCase() === (email ?? "").toLowerCase() && !!email;

  return (
    <section className="card-conf peligro" id="peligro">
      <header><div className="tit"><h2>{t.titulo}</h2><p>{t.lead}</p></div></header>
      <div className="cuerpo">
        <p className="ayuda-campo" style={{ marginTop: 10 }}>{conFormato(t.texto)}</p>
        {error && <div className="aviso-error" role="alert" style={{ marginTop: 10 }}><span className="ico">!</span><span>{error}</span></div>}
        {!confirmando ? (
          <button className="btn btn-sm" style={{ ...botonPeligro, marginTop: 12 }} onClick={() => setConfirmando(true)} disabled={!email}>
            {t.boton}
          </button>
        ) : (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13 }}>{conValores(t.escribe, { email: <b>{email}</b> })}</label>
            <input className="campo" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={email ?? ""} style={{ maxWidth: 300 }} disabled={ocupado} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-sm" style={botonPeligro} disabled={!coincide || ocupado} onClick={() => void borrar()}>
                {ocupado ? t.borrando : t.borrar}
              </button>
              <button className="btn btn-fantasma btn-sm" onClick={() => { setConfirmando(false); setTexto(""); }} disabled={ocupado}>{t.cancelar}</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

type Miembro = { userId: string; email: string; nombre: string; rol: string };
type Equipo = { miembros: Miembro[]; rol: string; yo: string; orgNombre: string };

// Sección Equipo: miembros del espacio + invitar/rol/quitar (solo propietario).
function SeccionEquipo({ t, errores }: { t: TextosAjustes["equipo"]; errores: TextosAjustes["errores"] }) {
  const { confirmar } = useDialogo();
  const [data, setData] = useState<Equipo | null>(null);
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState("editor");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function cargar() {
    try { const res = await fetch("/api/equipo"); if (res.ok) setData((await res.json()) as Equipo); } catch { /* silencioso */ }
  }
  useEffect(() => { void cargar(); }, []);

  const soyOwner = data?.rol === "owner";

  async function invitar(e: React.FormEvent) {
    e.preventDefault(); setOcupado(true); setError(null); setMsg(null);
    try {
      const res = await fetch("/api/equipo/invitar", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, rol }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? errores.generico); return; }
      setMsg(rellenar(t.invitacionEnviada, { email })); setEmail("");
    } finally { setOcupado(false); }
  }

  async function cambiarRol(userId: string, nuevo: string) {
    setError(null); setMsg(null);
    const res = await fetch("/api/equipo/miembro", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, rol: nuevo }),
    });
    if (!res.ok) { const d = (await res.json().catch(() => ({}))) as { error?: string }; setError(d.error ?? errores.generico); }
    await cargar();
  }

  async function quitar(userId: string) {
    setError(null); setMsg(null);
    const res = await fetch(`/api/equipo/miembro?userId=${encodeURIComponent(userId)}`, { method: "DELETE" });
    if (!res.ok) { const d = (await res.json().catch(() => ({}))) as { error?: string }; setError(d.error ?? errores.generico); }
    await cargar();
  }

  async function ceder(userId: string, nombre: string) {
    // Rojo porque es grave, pero la etiqueta NO dice «no se puede deshacer»:
    // sería mentira, el nuevo propietario puede devolvértela.
    const espacio = data?.orgNombre ?? t.esteEspacio;
    if (!(await confirmar({
      titulo: rellenar(t.cederPregunta, { nombre }),
      cuerpo: rellenar(t.cederCuerpo, { nombre, espacio }),
      etiqueta: t.cederEtiqueta,
      tono: "peligro",
      aceptar: t.cederAceptar,
    }))) return;
    setError(null); setMsg(null);
    const res = await fetch("/api/equipo/transferir", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) { const d = (await res.json().catch(() => ({}))) as { error?: string }; setError(d.error ?? errores.generico); return; }
    setMsg(rellenar(t.cedido, { nombre }));
    await cargar();
  }

  return (
    <section className="card-conf" id="equipo">
      <header>
        <div className="tit">
          <h2>{t.titulo}</h2>
          <p>{rellenar(t.lead, { espacio: data?.orgNombre || t.tuEspacio })}</p>
        </div>
      </header>
      <div className="cuerpo">
        {error && <div className="aviso-error" role="alert"><span className="ico">!</span><span>{error}</span></div>}
        {msg && <div className="aviso-ok" style={{ marginBottom: 14 }}>{msg}</div>}

        {soyOwner && (
          <form onSubmit={invitar} className="fila-conf" style={{ gap: 8, flexWrap: "wrap" }}>
            <input className="campo" type="email" required placeholder={t.correoEjemplo}
              value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
            <select className="campo select-conf" value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="editor">{t.editor}</option>
              <option value="owner">{t.propietario}</option>
            </select>
            <button className="btn btn-primario btn-sm" disabled={ocupado}>{ocupado ? t.enviando : t.invitar}</button>
          </form>
        )}

        {(data?.miembros ?? []).map((m) => (
          <div key={m.userId} className="fila-conf">
            <div className="info"><b>{m.nombre}{m.userId === data?.yo ? t.tu : ""}</b><small>{m.email}</small></div>
            <div className="control">
              {soyOwner && m.userId !== data?.yo ? (
                <>
                  <select className="campo select-conf" value={m.rol} onChange={(e) => void cambiarRol(m.userId, e.target.value)}>
                    <option value="owner">{t.propietario}</option>
                    <option value="editor">{t.editor}</option>
                  </select>
                  <button className="btn btn-fantasma btn-sm" title={t.cederTitulo} onClick={() => void ceder(m.userId, m.nombre)}>{t.ceder}</button>
                  <button className="btn btn-fantasma btn-sm" onClick={() => void quitar(m.userId)}>{t.quitar}</button>
                </>
              ) : (
                <span className="rol">{m.rol === "owner" ? t.propietario : t.editor}</span>
              )}
            </div>
          </div>
        ))}

        {!soyOwner && <p className="ayuda-campo" style={{ marginTop: 12 }}>{t.soloOwner}</p>}
      </div>
    </section>
  );
}

type Cuenta = {
  nombre: string; email: string; tienePassword: boolean; google: boolean; verificado: boolean;
  /** Nulo = no lo ha elegido a mano; manda su navegador o la landing por la que entró. */
  idioma: string | null;
};

// Sección Tu cuenta: nombre, contraseña (pide la actual) y correo (doble confirmación).
function SeccionCuenta({ t, errores }: { t: TextosAjustes["cuenta"]; errores: TextosAjustes["errores"] }) {
  const [c, setC] = useState<Cuenta | null>(null);
  const [nombre, setNombre] = useState("");
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    try { const r = await fetch("/api/cuenta"); if (r.ok) { const d = (await r.json()) as Cuenta; setC(d); setNombre(d.nombre); } } catch { /* silencioso */ }
  }
  useEffect(() => { void cargar(); }, []);

  async function pedir(url: string, body: unknown, exito: string) {
    setError(null); setMsg(null);
    try {
      const r = await fetch(url, { method: url === "/api/cuenta" ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) { setError(d.error ?? errores.generico); return false; }
      setMsg(exito); await cargar(); return true;
    } catch { setError(errores.conexion); return false; }
  }

  return (
    <section className="card-conf" id="cuenta">
      <header><div className="tit"><h2>{t.titulo}</h2><p>{t.lead}</p></div></header>
      <div className="cuerpo">
        {error && <div className="aviso-error" role="alert"><span className="ico">!</span><span>{error}</span></div>}
        {msg && <div className="aviso-ok" style={{ marginBottom: 14 }}>{msg}</div>}

        <form className="fila-conf" style={{ gap: 8, flexWrap: "wrap" }}
          onSubmit={(e) => { e.preventDefault(); void pedir("/api/cuenta", { nombre }, t.nombreGuardado); }}>
          <div className="info"><b>{t.nombre}</b><small>{t.nombreTexto}</small></div>
          <div className="control">
            <input className="campo" value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ minWidth: 180 }} />
            <button className="btn btn-sec btn-sm">{t.guardar}</button>
          </div>
        </form>

        {/* Se guarda al elegir, sin botón: no hay nada que confirmar y el
            resultado se ve al instante —la página se recarga en el idioma nuevo—,
            así que un «Guardar» solo sería un paso de más. */}
        <div className="fila-conf" style={{ gap: 8, flexWrap: "wrap" }}>
          <div className="info">
            <b>{t.idioma}</b>
            <small>{t.idiomaTexto}</small>
          </div>
          <div className="control">
            <select
              className="campo"
              style={{ minWidth: 180 }}
              value={c?.idioma ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                void pedir("/api/cuenta/idioma", { idioma: v }, t.idiomaGuardado)
                  .then((ok) => { if (ok) window.location.reload(); });
              }}
            >
              {/* Mientras no elija, se enseña que va en automático. Poner
                  «Español» aquí sería enseñarle una decisión que no ha tomado. */}
              {!c?.idioma && <option value="">{t.idiomaAutomatico}</option>}
              {IDIOMAS.map((i) => <option key={i} value={i}>{NOMBRE_IDIOMA[i]}</option>)}
            </select>
          </div>
        </div>

        <form className="fila-conf" style={{ gap: 8, flexWrap: "wrap" }}
          onSubmit={(e) => { e.preventDefault(); void pedir("/api/cuenta/password", { actual, nueva }, t.passwordCambiada).then((ok) => { if (ok) { setActual(""); setNueva(""); } }); }}>
          <div className="info"><b>{t.password}</b><small>{c && !c.tienePassword ? t.passwordConGoogle : t.passwordTexto}</small></div>
          <div className="control" style={{ gap: 8, flexWrap: "wrap" }}>
            {c?.tienePassword && <input className="campo" type="password" placeholder={t.passwordActual} autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} />}
            <input className="campo" type="password" placeholder={t.passwordNueva} autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
            <button className="btn btn-sec btn-sm">{t.cambiar}</button>
          </div>
        </form>

        <form className="fila-conf" style={{ gap: 8, flexWrap: "wrap" }}
          onSubmit={(e) => { e.preventDefault(); void pedir("/api/cuenta/email", { nuevoEmail }, rellenar(t.correoEnviado, { email: nuevoEmail })).then((ok) => { if (ok) setNuevoEmail(""); }); }}>
          <div className="info"><b>{t.correo}</b><small>{rellenar(t.correoTexto, { email: c?.email ?? "…" })}</small></div>
          <div className="control">
            <input className="campo" type="email" placeholder={t.correoEjemplo} value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} style={{ minWidth: 180 }} />
            <button className="btn btn-sec btn-sm">{t.cambiar}</button>
          </div>
        </form>
      </div>
    </section>
  );
}

export function SettingsBody({ idioma, t }: { idioma: Idioma; t: TextosAjustes }) {
  const [estados, setEstados] = useState<EstadoClaves | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) setEstados((await res.json()) as EstadoClaves);
    } catch { setError(t.errores.conexion); }
  }
  useEffect(() => { void cargar(); }, []);

  async function guardar(campo: "openrouterKey" | "serpapiKey", clave: string): Promise<boolean> {
    setOcupado(true); setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ [campo]: clave }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? t.errores.generico); return false; }
      await cargar();
      return true;
    } catch { setError(t.errores.conexion); return false; }
    finally { setOcupado(false); }
  }

  // `ok` viene de la API, que ya distingue «la clave vale» de «el proveedor dijo
  // que no». El detalle es suyo y se enseña tal cual: dice el crédito o el cupo
  // que le queda a ESA cuenta, que es el dato por el que uno pulsa el botón.
  async function probar(cual: "openrouter" | "serpapi"): Promise<Prueba | null> {
    setOcupado(true); setError(null);
    try {
      const res = await fetch("/api/settings/probar", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ cual }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; detalle?: string; error?: string };
      if (d.ok && d.detalle) return { ok: true, detalle: d.detalle };
      return { ok: false, detalle: d.error ?? t.errores.probar };
    } catch { setError(t.errores.conexion); return null; }
    finally { setOcupado(false); }
  }

  return (
    <>
      <main className="conf">
        <p className="miga"><Link href="/">← {t.miga}</Link></p>
        <h1>{t.titulo}</h1>
        <p className="lead">{t.lead}</p>

        <div className="conf-zona">
          <nav className="nav-sec">
            <a href="#claves" className="activa"><span className="ic">◉</span> {t.nav.claves}</a>
            <a href="#herramientas"><span className="ic">⚙</span> {t.nav.herramientas}</a>
            <a href="#equipo"><span className="ic">◑</span> {t.nav.equipo}</a>
            <a href="#plan"><span className="ic">◈</span> {t.nav.plan}</a>
            <a href="#cuenta"><span className="ic">◐</span> {t.nav.cuenta}</a>
            <a href="#peligro" style={{ color: "var(--color-peligro-texto)" }}><span className="ic">△</span> {t.nav.peligro}</a>
          </nav>

          <div className="conf-panel">
            <section className="card-conf" id="claves">
              <header>
                <div className="tit">
                  <h2>{t.claves.titulo}</h2>
                  <p>{conFormato(t.claves.texto)}</p>
                </div>
              </header>
              <div className="cuerpo">
                <TarjetaModelo
                  modeloActual={estados?.modeloIa ?? ""}
                  ocupado={ocupado}
                  t={t.claves}
                  onGuardar={async (modelo) => {
                    setOcupado(true); setError(null);
                    try {
                      const res = await fetch("/api/settings", {
                        method: "PUT", headers: { "content-type": "application/json" },
                        body: JSON.stringify({ modeloIa: modelo }),
                      });
                      const d = (await res.json().catch(() => ({}))) as { error?: string };
                      if (!res.ok) { setError(d.error ?? t.errores.generico); return false; }
                      await cargar();
                      return true;
                    } catch { setError(t.errores.conexion); return false; }
                    finally { setOcupado(false); }
                  }}
                />
                <TarjetaServicio
                  titulo={t.claves.openrouterTitulo}
                  descripcion={t.claves.openrouterTexto}
                  enlace={{ href: "https://openrouter.ai/keys", texto: "openrouter.ai/keys" }}
                  estado={estados?.openrouter ?? null}
                  ocupado={ocupado}
                  t={t.claves}
                  onGuardar={(c) => guardar("openrouterKey", c)}
                  onProbar={() => probar("openrouter")}
                  onQuitar={() => guardar("openrouterKey", "")}
                />
                <TarjetaServicio
                  titulo={t.claves.serpapiTitulo}
                  descripcion={t.claves.serpapiTexto}
                  enlace={{ href: "https://serpapi.com", texto: "serpapi.com" }}
                  estado={estados?.serpapi ?? null}
                  ocupado={ocupado}
                  t={t.claves}
                  onGuardar={(c) => guardar("serpapiKey", c)}
                  onProbar={() => probar("serpapi")}
                  onQuitar={() => guardar("serpapiKey", "")}
                />
              </div>
            </section>

            <section className="card-conf" id="herramientas">
              <header>
                <div className="tit">
                  <h2>{t.herramientas.titulo}</h2>
                  <p>{t.herramientas.lead}</p>
                </div>
              </header>
              <div className="cuerpo">
                <p className="ayuda-campo" style={{ marginTop: 10 }}>
                  {conValores(t.herramientas.texto, { enlace: <Link href="/">{t.herramientas.enlace}</Link> })}
                </p>
              </div>
            </section>

            <SeccionEquipo t={t.equipo} errores={t.errores} />
            <SeccionPlan idioma={idioma} t={t.plan} errores={t.errores} />
            <SeccionCuenta t={t.cuenta} errores={t.errores} />

            <SeccionPeligro t={t.peligro} errores={t.errores} />
          </div>
        </div>

        {error && <p className="error-campo">{error}</p>}
      </main>
    </>
  );
}
