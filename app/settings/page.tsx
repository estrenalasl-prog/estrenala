"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "../_components/AppHeader";
import { MODELOS, nombreModelo } from "../_components/modelos";

type EstadoClave = { origen: "ui" | "env" | null; sufijo: string };
type EstadoClaves = { openrouter: EstadoClave; serpapi: EstadoClave; modeloIa: string };

function textoEstado(e: EstadoClave): string {
  if (e.origen === "ui") return `Usando tu clave (…${e.sufijo})`;
  if (e.origen === "env") return `Usando la del servidor (…${e.sufijo})`;
  return "Sin configurar";
}

function BadgeClave({ estado }: { estado: EstadoClave | null }) {
  if (!estado) return <span className="badge badge-neutro"><span className="punto" />cargando…</span>;
  if (estado.origen === "ui") return <span className="badge badge-exito"><span className="punto" />{textoEstado(estado)}</span>;
  if (estado.origen === "env") return <span className="badge badge-aviso"><span className="punto" />{textoEstado(estado)}</span>;
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
    if (await onQuitar()) { setMsg("Clave quitada: se usa la del servidor si existe."); setMsgError(false); }
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

// Sección diseñada pero aún no construida: se ve para saber adónde vamos, sin fingir
// que funciona. Multiusuario y facturación son un salto de arquitectura aparte.
function SeccionProximamente({ id, titulo, descripcion, porQue }: {
  id: string; titulo: string; descripcion: string; porQue: string;
}) {
  return (
    <section className="card-conf proximamente" id={id}>
      <header>
        <div className="tit">
          <h2>{titulo} <span className="badge badge-neutro"><span className="punto" />Próximamente</span></h2>
          <p>{descripcion}</p>
        </div>
      </header>
      <div className="cuerpo">
        <p className="ayuda-campo" style={{ marginTop: 10 }}>{porQue}</p>
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
                    Con tus propias claves, todo lo que genera la plataforma (artículos, plantillas, radar de temas)
                    corre a tu cuenta. Si dejas una vacía, se usa la del servidor cuando exista.
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
                  descripcion="Alimenta el radar de temas en tendencia del blog. Clave gratuita (100 búsquedas/mes) en"
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
            <SeccionProximamente
              id="plan"
              titulo="Plan y uso"
              descripcion="Tu plan y el consumo de IA del mes, con facturas."
              porQue="Llegará cuando la plataforma se monetice. Mientras tanto, el gasto de IA va con tus propias claves y lo controlas desde «Conexiones y claves»."
            />
            <SeccionProximamente
              id="cuenta"
              titulo="Tu cuenta"
              descripcion="Correo, contraseña y avisos por correo cuando el piloto publica."
              porQue="Depende de que existan cuentas de usuario reales; hoy el acceso es una contraseña única del panel."
            />

            <section className="card-conf peligro" id="peligro">
              <header>
                <div className="tit">
                  <h2>Zona de peligro <span className="badge badge-neutro"><span className="punto" />Próximamente</span></h2>
                  <p>Acciones que no se pueden deshacer.</p>
                </div>
              </header>
              <div className="cuerpo">
                <p className="ayuda-campo" style={{ marginTop: 10 }}>
                  Eliminar una web (con su historial y su blog) es una acción de cada proyecto, no de la cuenta.
                  Aún no está construida: al ser destructiva y sin vuelta atrás, prefiero hacerla con su
                  confirmación en dos pasos y sus pruebas antes de darte el botón.
                </p>
              </div>
            </section>
          </div>
        </div>

        {error && <p className="error-campo">{error}</p>}
      </main>
    </>
  );
}
