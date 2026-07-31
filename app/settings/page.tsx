"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "../_components/AppHeader";
import { MODELOS, nombreModelo } from "../_components/modelos";

// Cada espacio usa SU clave. Hubo un origen "env" —«usando la del servidor»—
// que se quitó: significaba que la IA del cliente la pagaba la plataforma.
type EstadoClave = { origen: "ui" | null; sufijo: string };
type EstadoClaves = { openrouter: EstadoClave; serpapi: EstadoClave; modeloIa: string };

function textoEstado(e: EstadoClave): string {
  return e.origen === "ui" ? `Usando tu clave (…${e.sufijo})` : "Sin configurar";
}

function BadgeClave({ estado }: { estado: EstadoClave | null }) {
  if (!estado) return <span className="badge badge-neutro"><span className="punto" />cargando…</span>;
  if (estado.origen === "ui") return <span className="badge badge-exito"><span className="punto" />{textoEstado(estado)}</span>;
  return <span className="badge badge-neutro"><span className="punto" />{textoEstado(estado)}</span>;
}

// Tarjeta del modelo de IA con el que se redacta (lista curada + slug libre).
// A NIVEL DE MÓDULO (regla de foco del proyecto).
function TarjetaModelo({ modeloActual, ocupado, onGuardar }: {
  modeloActual: string;
  ocupado: boolean;
  onGuardar: (modelo: string) => Promise<boolean>;
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
    if (await onGuardar(modelo)) setMsg("Modelo guardado.");
  }

  return (
    <div className="fila-conf" style={{ display: "block" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b style={{ fontWeight: 600, fontSize: 14 }}>Modelo de IA para redactar</b>
        <span className="badge badge-neutro"><span className="punto" />Actual: {nombreModelo(modeloActual)}</span>
      </div>
      <p className="ayuda-campo">
        Con este modelo se redactan los artículos del blog. Los económicos gastan menos crédito
        (los «:free» nada); si uno da error al generar, prueba otro. La puntuación del radar de temas
        usa siempre el modelo por defecto de la plataforma (es 1 llamada al día y necesita criterio fino).
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={sel} onChange={(e) => { setSel(e.target.value); setMsg(null); }} className="campo">
          {MODELOS.map((m) => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
          <option value="otro">Otro…</option>
        </select>
        {sel === "otro" && (
          <input value={custom} placeholder="identificador de openrouter.ai/models, p. ej. deepseek/deepseek-chat:free"
            onChange={(e) => { setCustom(e.target.value); setMsg(null); }}
            className="campo" style={{ maxWidth: 380 }} />
        )}
        <button onClick={() => void guardar()} disabled={ocupado} className="btn btn-sec btn-sm">Guardar</button>
      </div>
      {msg && <p className="ayuda-campo" style={{ color: "var(--color-exito-texto)" }}>{msg}</p>}
    </div>
  );
}

// Tarjeta de un servicio: estado, input de clave, guardar/probar/quitar.
// A NIVEL DE MÓDULO (regla de foco del proyecto).
function TarjetaServicio({ titulo, descripcion, enlace, estado, ocupado, onGuardar, onProbar, onQuitar }: {
  titulo: string;
  descripcion: string;
  enlace: { href: string; texto: string };
  estado: EstadoClave | null;
  ocupado: boolean;
  onGuardar: (clave: string) => Promise<boolean>;
  onProbar: () => Promise<string | null>;
  onQuitar: () => Promise<boolean>;
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
    const detalle = await onProbar();
    if (detalle === null) { setMsg("Clave guardada."); setMsgError(false); return; }
    const valida = detalle.startsWith("Clave válida");
    setMsg(valida ? `Clave guardada. ${detalle}` : `Clave guardada, pero la prueba falló: ${detalle}. Revisa que la copiaste entera.`);
    setMsgError(!valida);
  }
  async function probar() {
    setMsg(null);
    const detalle = await onProbar();
    if (detalle !== null) { setMsg(detalle); setMsgError(!detalle.startsWith("Clave válida")); }
  }
  async function quitar() {
    setMsg(null);
    if (await onQuitar()) { setMsg("Clave quitada. Sin una clave, las funciones de IA quedan desactivadas."); setMsgError(false); }
  }

  return (
    <div className="fila-conf" style={{ display: "block" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b style={{ fontWeight: 600, fontSize: 14 }}>{titulo}</b>
        <BadgeClave estado={estado} />
      </div>
      <p className="ayuda-campo">
        {descripcion}{" "}
        <a href={enlace.href} target="_blank" rel="noreferrer">{enlace.texto}</a>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input type="password" value={clave} placeholder="Pega aquí tu clave"
          onChange={(e) => { setClave(e.target.value); setMsg(null); }}
          className="campo" style={{ maxWidth: 320 }} />
        <button onClick={() => void guardar()} disabled={ocupado || !clave.trim()} className="btn btn-sec btn-sm">Guardar</button>
        <button onClick={() => void probar()} disabled={ocupado || estado?.origen == null} className="btn btn-sec btn-sm">Probar conexión</button>
        {estado?.origen === "ui" && (
          <button onClick={() => void quitar()} disabled={ocupado} className="btn btn-fantasma btn-sm">Quitar</button>
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

function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

function EstadoSuscripcion({ estado }: { estado: string }) {
  if (estado === "cancelando") return <span className="badge badge-aviso"><span className="punto" />Cancelada</span>;
  if (estado === "past_due" || estado === "unpaid") return <span className="badge badge-aviso"><span className="punto" />Pago pendiente</span>;
  if (estado === "trialing") return <span className="badge badge-exito"><span className="punto" />De prueba</span>;
  if (estado === "canceled" || !estado) return null;
  return <span className="badge badge-exito"><span className="punto" />Activo</span>;
}

function ExplicacionSuscripcion({ estado, hasta }: { estado: string; hasta: string | null }) {
  const dias = diasHasta(hasta);
  if (estado === "cancelando" && hasta) {
    return (
      <div className="aviso-ok" role="status" style={{ marginTop: 12, fontSize: 13.5 }}>
        <span>
          Has cancelado la renovación. <b>Sigues con tu plan hasta el {fechaLarga(hasta)}</b>
          {dias !== null && <> — te quedan <b>{dias} {dias === 1 ? "día" : "días"}</b></>}, y no se te
          cobrará nada más. Después pasarás al plan Gratis. Si cambias de idea, puedes reactivarla desde
          «Gestionar suscripción» antes de esa fecha.
        </span>
      </div>
    );
  }
  if (estado === "past_due" || estado === "unpaid") {
    return (
      <div className="aviso-error" role="alert" style={{ marginTop: 12, fontSize: 13.5 }}>
        <span>
          No hemos podido cobrar tu último pago. Tu plan sigue activo mientras se reintenta; actualiza la
          tarjeta en «Gestionar suscripción» para no perderlo.
        </span>
      </div>
    );
  }
  if (estado === "active" && hasta) {
    return (
      <p className="ayuda-campo" style={{ marginTop: 10 }}>
        Se renueva solo el {fechaLarga(hasta)}.
      </p>
    );
  }
  return null;
}

// Sección «Plan y uso»: qué plan tiene el espacio, cuánto lleva usado y qué
// incluye cada plan. Pagar y cancelar se hace en Stripe (Checkout y portal): la
// plataforma nunca ve la tarjeta.
function SeccionPlan() {
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
    const t = setTimeout(() => {
      void (async () => {
        try { const r = await fetch("/api/plan"); if (r.ok) setD((await r.json()) as EstadoPlan); } catch { /* silencioso */ }
      })();
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  async function ir(url: string, body?: unknown) {
    setOcupado(true); setError(null);
    try {
      const r = await fetch(url, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!r.ok || !j.url) { setError(j.error ?? "No se pudo continuar"); return; }
      window.location.href = j.url; // Checkout / portal alojados por Stripe
    } catch {
      setError("Error de conexión");
    } finally { setOcupado(false); }
  }

  const marca = (v: boolean) => (v ? "✓" : "—");
  const esOwner = d?.rol === "owner";

  return (
    <section className="card-conf" id="plan">
      <header>
        <div className="tit">
          <h2>Plan y uso</h2>
          <p>Qué incluye tu plan y cuánto llevas usado en este espacio.</p>
        </div>
      </header>
      <div className="cuerpo">
        {!d ? (
          <p className="ayuda-campo" style={{ marginTop: 10 }}>Cargando…</p>
        ) : (
          <>
            <div className="fila-conf">
              <div className="info">
                <b>Tu plan: {d.limites.nombre}</b>
                <small>
                  {d.limites.precioMes === 0
                    ? "Gratis para siempre."
                    : `${d.limites.precioMes} €/mes · ${d.limites.precioAnual} €/año (2 meses gratis)`}
                </small>
              </div>
              <div className="control">
                <EstadoSuscripcion estado={d.estado} />
              </div>
            </div>
            <ExplicacionSuscripcion estado={d.estado} hasta={d.hasta} />

            <div className="fila-conf">
              <div className="info">
                <b>Webs</b>
                <small>Publicadas en este espacio.</small>
              </div>
              <div className="control">
                <span className={d.uso.webs >= d.limites.webs ? "badge badge-aviso" : "badge badge-neutro"}>
                  <span className="punto" />{d.uso.webs} de {d.limites.webs}
                </span>
              </div>
            </div>

            {!d.limites.sinMarca && (
              <div className="fila-conf">
                <div className="info">
                  <b>Marca «Hecho con Estrénala»</b>
                  <small>Tus webs publicadas llevan una insignia discreta abajo a la derecha. Desaparece al mejorar de plan.</small>
                </div>
                <div className="control"><span className="badge badge-neutro"><span className="punto" />Visible</span></div>
              </div>
            )}

            <div className="fila-conf">
              <div className="info">
                <b>Personas en el espacio</b>
                <small>{d.limites.equipo ? "Tu plan permite invitar a tu equipo." : "Invitar a más gente es del plan Agencia."}</small>
              </div>
              <div className="control"><span className="badge badge-neutro"><span className="punto" />{d.uso.miembros}</span></div>
            </div>

            <p className="ayuda-campo" style={{ marginTop: 18, marginBottom: 8 }}>Comparativa de planes</p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "8px 10px" }}> </th>
                    {d.catalogo.map((p) => (
                      <th key={p.id} style={{ textAlign: "left", padding: "8px 10px" }}>
                        {p.nombre}{p.id === d.plan ? " ·  tú" : ""}
                        <br />
                        <span style={{ fontWeight: 400, color: "var(--color-texto-3)" }}>
                          {p.precioMes === 0 ? "0 €" : `${p.precioMes} €/mes`}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {([
                    ["Webs", (p: LimitesPlan) => String(p.webs)],
                    ["Editor y historial", () => "✓"],
                    ["Actualizar desde ZIP", () => "✓"],
                    ["Asistente de IA (tu clave)", () => "✓"],
                    ["Tu propio dominio", (p: LimitesPlan) => marca(p.dominioPropio)],
                    ["Sin marca de Estrénala", (p: LimitesPlan) => marca(p.sinMarca)],
                    ["Blog automático", (p: LimitesPlan) => marca(p.blog)],
                    ["Equipo e invitaciones", (p: LimitesPlan) => marca(p.equipo)],
                  ] as [string, (p: LimitesPlan) => string][]).map(([etq, val]) => (
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
              <p className="ayuda-campo" style={{ marginTop: 14 }}>
                Los pagos no están configurados en este servidor: los planes se asignan a mano.
              </p>
            ) : !esOwner ? (
              <p className="ayuda-campo" style={{ marginTop: 14 }}>
                Solo el propietario del espacio puede cambiar el plan.
              </p>
            ) : d.suscrito ? (
              <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button className="btn btn-sec btn-sm" disabled={ocupado} onClick={() => void ir("/api/plan/portal")}>
                  {ocupado ? "Abriendo…" : "Gestionar suscripción"}
                </button>
                <small style={{ color: "var(--color-texto-3)" }}>
                  Cambia de plan, actualiza la tarjeta o cancela. Se abre en Stripe.
                </small>
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: "var(--color-texto-2)" }}>Cómo quieres pagar:</span>
                  <select className="campo select-conf" value={periodo}
                    onChange={(e) => setPeriodo(e.target.value === "anual" ? "anual" : "mes")}>
                    <option value="mes">Mes a mes</option>
                    <option value="anual">Anual (2 meses gratis)</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {d.catalogo.filter((p) => p.id !== "free" && p.id !== d.plan).map((p) => (
                    <button key={p.id} className="btn btn-primario btn-sm" disabled={ocupado}
                      onClick={() => void ir("/api/plan/checkout", { plan: p.id, periodo })}>
                      {ocupado ? "Abriendo…" : `Pasar a ${p.nombre} · ${periodo === "anual" ? `${p.precioAnual} €/año` : `${p.precioMes} €/mes`}`}
                    </button>
                  ))}
                </div>
                <p className="ayuda-campo" style={{ marginTop: 10 }}>
                  El pago se hace en una página segura de Stripe. Puedes cancelar cuando quieras.
                </p>
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
function SeccionPeligro() {
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
      if (!r.ok) { const d = (await r.json().catch(() => ({}))) as { error?: string }; setError(d.error ?? "No se pudo borrar la cuenta"); return; }
      window.location.href = "/login";
    } catch {
      setError("Error de conexión");
    } finally { setOcupado(false); }
  }

  const coincide = texto.trim().toLowerCase() === (email ?? "").toLowerCase() && !!email;

  return (
    <section className="card-conf peligro" id="peligro">
      <header><div className="tit"><h2>Zona de peligro</h2><p>Acciones que no se pueden deshacer.</p></div></header>
      <div className="cuerpo">
        <p className="ayuda-campo" style={{ marginTop: 10 }}>
          Al eliminar tu cuenta se borran los espacios de los que eres <b>único propietario</b>, con todas sus
          webs, su historial y su blog. De los espacios que compartes con otras personas, simplemente saldrás.
          <b> No se puede deshacer.</b>
        </p>
        {error && <div className="aviso-error" role="alert" style={{ marginTop: 10 }}><span className="ico">!</span><span>{error}</span></div>}
        {!confirmando ? (
          <button className="btn btn-sm" style={{ ...botonPeligro, marginTop: 12 }} onClick={() => setConfirmando(true)} disabled={!email}>
            Eliminar mi cuenta…
          </button>
        ) : (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13 }}>Para confirmar, escribe tu correo <b>{email}</b>:</label>
            <input className="campo" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={email ?? ""} style={{ maxWidth: 300 }} disabled={ocupado} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-sm" style={botonPeligro} disabled={!coincide || ocupado} onClick={() => void borrar()}>
                {ocupado ? "Borrando…" : "Borrar mi cuenta definitivamente"}
              </button>
              <button className="btn btn-fantasma btn-sm" onClick={() => { setConfirmando(false); setTexto(""); }} disabled={ocupado}>Cancelar</button>
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
function SeccionEquipo() {
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
      if (!res.ok) { setError(d.error ?? "Error"); return; }
      setMsg(`Invitación enviada a ${email}.`); setEmail("");
    } finally { setOcupado(false); }
  }

  async function cambiarRol(userId: string, nuevo: string) {
    setError(null); setMsg(null);
    const res = await fetch("/api/equipo/miembro", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, rol: nuevo }),
    });
    if (!res.ok) { const d = (await res.json().catch(() => ({}))) as { error?: string }; setError(d.error ?? "Error"); }
    await cargar();
  }

  async function quitar(userId: string) {
    setError(null); setMsg(null);
    const res = await fetch(`/api/equipo/miembro?userId=${encodeURIComponent(userId)}`, { method: "DELETE" });
    if (!res.ok) { const d = (await res.json().catch(() => ({}))) as { error?: string }; setError(d.error ?? "Error"); }
    await cargar();
  }

  async function ceder(userId: string, nombre: string) {
    if (!window.confirm(`¿Ceder la propiedad de «${data?.orgNombre ?? "este espacio"}» a ${nombre}? Tú pasarás a ser editor y ${nombre} tomará el mando.`)) return;
    setError(null); setMsg(null);
    const res = await fetch("/api/equipo/transferir", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) { const d = (await res.json().catch(() => ({}))) as { error?: string }; setError(d.error ?? "Error"); return; }
    setMsg(`Ahora ${nombre} es el propietario del espacio.`);
    await cargar();
  }

  return (
    <section className="card-conf" id="equipo">
      <header>
        <div className="tit">
          <h2>Equipo</h2>
          <p>Quién puede trabajar en {data?.orgNombre || "tu espacio"}. El editor edita y publica; el propietario además gestiona claves, dirección y equipo.</p>
        </div>
      </header>
      <div className="cuerpo">
        {error && <div className="aviso-error" role="alert"><span className="ico">!</span><span>{error}</span></div>}
        {msg && <div className="aviso-ok" style={{ marginBottom: 14 }}>{msg}</div>}

        {soyOwner && (
          <form onSubmit={invitar} className="fila-conf" style={{ gap: 8, flexWrap: "wrap" }}>
            <input className="campo" type="email" required placeholder="correo@de-tu-socio.com"
              value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
            <select className="campo select-conf" value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="editor">Editor</option>
              <option value="owner">Propietario</option>
            </select>
            <button className="btn btn-primario btn-sm" disabled={ocupado}>{ocupado ? "Enviando…" : "Invitar"}</button>
          </form>
        )}

        {(data?.miembros ?? []).map((m) => (
          <div key={m.userId} className="fila-conf">
            <div className="info"><b>{m.nombre}{m.userId === data?.yo ? " (tú)" : ""}</b><small>{m.email}</small></div>
            <div className="control">
              {soyOwner && m.userId !== data?.yo ? (
                <>
                  <select className="campo select-conf" value={m.rol} onChange={(e) => void cambiarRol(m.userId, e.target.value)}>
                    <option value="owner">Propietario</option>
                    <option value="editor">Editor</option>
                  </select>
                  <button className="btn btn-fantasma btn-sm" title="Hacer propietario a esta persona y bajarte tú a editor" onClick={() => void ceder(m.userId, m.nombre)}>Ceder propiedad</button>
                  <button className="btn btn-fantasma btn-sm" onClick={() => void quitar(m.userId)}>Quitar</button>
                </>
              ) : (
                <span className="rol">{m.rol === "owner" ? "Propietario" : "Editor"}</span>
              )}
            </div>
          </div>
        ))}

        {!soyOwner && <p className="ayuda-campo" style={{ marginTop: 12 }}>Solo el propietario del espacio puede invitar o cambiar roles.</p>}
      </div>
    </section>
  );
}

type Cuenta = { nombre: string; email: string; tienePassword: boolean; google: boolean; verificado: boolean };

// Sección Tu cuenta: nombre, contraseña (pide la actual) y correo (doble confirmación).
function SeccionCuenta() {
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
      if (!r.ok) { setError(d.error ?? "Error"); return false; }
      setMsg(exito); await cargar(); return true;
    } catch { setError("Error de conexión"); return false; }
  }

  return (
    <section className="card-conf" id="cuenta">
      <header><div className="tit"><h2>Tu cuenta</h2><p>Tu nombre, tu contraseña y tu correo de acceso.</p></div></header>
      <div className="cuerpo">
        {error && <div className="aviso-error" role="alert"><span className="ico">!</span><span>{error}</span></div>}
        {msg && <div className="aviso-ok" style={{ marginBottom: 14 }}>{msg}</div>}

        <form className="fila-conf" style={{ gap: 8, flexWrap: "wrap" }}
          onSubmit={(e) => { e.preventDefault(); void pedir("/api/cuenta", { nombre }, "Nombre guardado."); }}>
          <div className="info"><b>Nombre</b><small>Como te llamamos en la plataforma.</small></div>
          <div className="control">
            <input className="campo" value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ minWidth: 180 }} />
            <button className="btn btn-sec btn-sm">Guardar</button>
          </div>
        </form>

        <form className="fila-conf" style={{ gap: 8, flexWrap: "wrap" }}
          onSubmit={(e) => { e.preventDefault(); void pedir("/api/cuenta/password", { actual, nueva }, "Contraseña cambiada.").then((ok) => { if (ok) { setActual(""); setNueva(""); } }); }}>
          <div className="info"><b>Contraseña</b><small>{c && !c.tienePassword ? "Entras con Google. Puedes ponerte también una contraseña." : "Cambia tu contraseña."}</small></div>
          <div className="control" style={{ gap: 8, flexWrap: "wrap" }}>
            {c?.tienePassword && <input className="campo" type="password" placeholder="Actual" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} />}
            <input className="campo" type="password" placeholder="Nueva (mín. 8)" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
            <button className="btn btn-sec btn-sm">Cambiar</button>
          </div>
        </form>

        <form className="fila-conf" style={{ gap: 8, flexWrap: "wrap" }}
          onSubmit={(e) => { e.preventDefault(); void pedir("/api/cuenta/email", { nuevoEmail }, `Te enviamos un correo a ${nuevoEmail} para confirmarlo.`).then((ok) => { if (ok) setNuevoEmail(""); }); }}>
          <div className="info"><b>Correo</b><small>Ahora: {c?.email ?? "…"}. Te enviaremos un enlace al nuevo para confirmarlo.</small></div>
          <div className="control">
            <input className="campo" type="email" placeholder="nuevo@correo.com" value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} style={{ minWidth: 180 }} />
            <button className="btn btn-sec btn-sm">Cambiar</button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const [estados, setEstados] = useState<EstadoClaves | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) setEstados((await res.json()) as EstadoClaves);
    } catch { setError("Error de conexión"); }
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
      if (!res.ok) { setError(d.error ?? "Error"); return false; }
      await cargar();
      return true;
    } catch { setError("Error de conexión"); return false; }
    finally { setOcupado(false); }
  }

  async function probar(cual: "openrouter" | "serpapi"): Promise<string | null> {
    setOcupado(true); setError(null);
    try {
      const res = await fetch("/api/settings/probar", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ cual }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; detalle?: string; error?: string };
      if (d.ok && d.detalle) return d.detalle;
      return d.error ?? "No se pudo probar la conexión";
    } catch { setError("Error de conexión"); return null; }
    finally { setOcupado(false); }
  }

  return (
    <>
      <AppHeader />
      <main className="conf">
        <p className="miga"><Link href="/">← Tus webs</Link></p>
        <h1>Configuración</h1>
        <p className="lead">Ajustes de tu cuenta y de la plataforma.</p>

        <div className="conf-zona">
          <nav className="nav-sec">
            <a href="#claves" className="activa"><span className="ic">◉</span> Conexiones y claves</a>
            <a href="#herramientas"><span className="ic">⚙</span> Herramientas del sitio</a>
            <a href="#equipo"><span className="ic">◑</span> Equipo</a>
            <a href="#plan"><span className="ic">◈</span> Plan y uso</a>
            <a href="#cuenta"><span className="ic">◐</span> Tu cuenta</a>
            <a href="#peligro" style={{ color: "var(--color-peligro-texto)" }}><span className="ic">△</span> Zona de peligro</a>
          </nav>

          <div className="conf-panel">
            <section className="card-conf" id="claves">
              <header>
                <div className="tit">
                  <h2>Conexiones y claves</h2>
                  <p>
                    Todo lo que genera la IA (artículos, plantillas, radar de temas) va con <b>tu propia clave</b> y
                    corre a tu cuenta: pagas el consumo real, sin recargo nuestro. Sin clave, esas funciones quedan
                    desactivadas; el resto de la plataforma funciona igual.
                  </p>
                </div>
              </header>
              <div className="cuerpo">
                <TarjetaModelo
                  modeloActual={estados?.modeloIa ?? ""}
                  ocupado={ocupado}
                  onGuardar={async (modelo) => {
                    setOcupado(true); setError(null);
                    try {
                      const res = await fetch("/api/settings", {
                        method: "PUT", headers: { "content-type": "application/json" },
                        body: JSON.stringify({ modeloIa: modelo }),
                      });
                      const d = (await res.json().catch(() => ({}))) as { error?: string };
                      if (!res.ok) { setError(d.error ?? "Error"); return false; }
                      await cargar();
                      return true;
                    } catch { setError("Error de conexión"); return false; }
                    finally { setOcupado(false); }
                  }}
                />
                <TarjetaServicio
                  titulo="OpenRouter (IA)"
                  descripcion="Redacta los artículos del blog y genera las plantillas. Crea tu clave en"
                  enlace={{ href: "https://openrouter.ai/keys", texto: "openrouter.ai/keys" }}
                  estado={estados?.openrouter ?? null}
                  ocupado={ocupado}
                  onGuardar={(c) => guardar("openrouterKey", c)}
                  onProbar={() => probar("openrouter")}
                  onQuitar={() => guardar("openrouterKey", "")}
                />
                <TarjetaServicio
                  titulo="SerpAPI (Google Trends)"
                  // Sin cifra a mano: decía «100 búsquedas/mes» y SerpAPI ya va por 250.
                  // Es dato de un tercero, cambia cuando quieren y nadie se entera de que
                  // aquí quedó una mentira. Al probar la conexión se enseña el cupo REAL
                  // que devuelve su API («quedan 250 búsquedas este mes»), que además es
                  // el del plan de cada uno y no el del folleto.
                  descripcion="Alimenta el radar de temas en tendencia del blog. Tiene plan gratuito; crea tu clave en"
                  enlace={{ href: "https://serpapi.com", texto: "serpapi.com" }}
                  estado={estados?.serpapi ?? null}
                  ocupado={ocupado}
                  onGuardar={(c) => guardar("serpapiKey", c)}
                  onProbar={() => probar("serpapi")}
                  onQuitar={() => guardar("serpapiKey", "")}
                />
              </div>
            </section>

            <section className="card-conf" id="herramientas">
              <header>
                <div className="tit">
                  <h2>Herramientas del sitio</h2>
                  <p>Favicon, imagen al compartir, Google Search Console y analítica de visitas.</p>
                </div>
              </header>
              <div className="cuerpo">
                <p className="ayuda-campo" style={{ marginTop: 10 }}>
                  Estas herramientas son <b>de cada web</b>, no de la cuenta: se configuran dentro del proyecto,
                  en el desplegable «Herramientas del sitio». Abre una de <Link href="/">tus webs</Link> para ajustarlas.
                </p>
              </div>
            </section>

            <SeccionEquipo />
            <SeccionPlan />
            <SeccionCuenta />

            <SeccionPeligro />
          </div>
        </div>

        {error && <p className="error-campo">{error}</p>}
      </main>
    </>
  );
}
