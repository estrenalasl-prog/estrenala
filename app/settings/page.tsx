"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MODELOS, nombreModelo } from "../_components/modelos";

type EstadoClave = { origen: "ui" | "env" | null; sufijo: string };
type EstadoClaves = { openrouter: EstadoClave; serpapi: EstadoClave; modeloIa: string };

function textoEstado(e: EstadoClave): string {
  if (e.origen === "ui") return `Usando tu clave (…${e.sufijo})`;
  if (e.origen === "env") return `Usando la del servidor (…${e.sufijo})`;
  return "Sin configurar";
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
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">Modelo de IA para redactar</p>
        <span className="text-xs text-gray-500">Actual: {nombreModelo(modeloActual)}</span>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Con este modelo se redactan los artículos del blog y se puntúa el radar de temas.
        Los económicos gastan menos crédito (los «:free» nada); si uno da error al generar, prueba otro.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <select value={sel} onChange={(e) => { setSel(e.target.value); setMsg(null); }}
          className="rounded border px-2 py-1 text-sm">
          {MODELOS.map((m) => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
          <option value="otro">Otro…</option>
        </select>
        {sel === "otro" && (
          <input value={custom} placeholder="identificador de openrouter.ai/models, p. ej. deepseek/deepseek-chat:free"
            onChange={(e) => { setCustom(e.target.value); setMsg(null); }}
            className="w-full rounded border px-2 py-1 text-sm" />
        )}
        <button onClick={() => void guardar()} disabled={ocupado}
          className="shrink-0 rounded bg-indigo-600 px-3 py-1 text-sm text-white disabled:opacity-50">Guardar</button>
      </div>
      {msg && <p className="mt-1 text-xs text-green-700">{msg}</p>}
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
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">{titulo}</p>
        <span className="text-xs text-gray-500">{estado ? textoEstado(estado) : "cargando…"}</span>
      </div>
      <p className="mt-1 text-sm text-gray-500">{descripcion}{" "}
        <a href={enlace.href} target="_blank" rel="noreferrer" className="text-indigo-600 underline">{enlace.texto}</a>
      </p>
      <div className="mt-2 flex items-center gap-2">
        <input type="password" value={clave} placeholder="Pega aquí tu clave"
          onChange={(e) => { setClave(e.target.value); setMsg(null); }}
          className="w-full rounded border px-2 py-1 text-sm" />
        <button onClick={() => void guardar()} disabled={ocupado || !clave.trim()}
          className="shrink-0 rounded bg-indigo-600 px-3 py-1 text-sm text-white disabled:opacity-50">Guardar</button>
        <button onClick={() => void probar()} disabled={ocupado || estado?.origen == null}
          className="shrink-0 rounded border px-2 py-1 text-xs disabled:opacity-50">Probar conexión</button>
        {estado?.origen === "ui" && (
          <button onClick={() => void quitar()} disabled={ocupado}
            className="shrink-0 text-xs text-gray-500 underline">Quitar</button>
        )}
      </div>
      {msg && <p className={`mt-1 text-xs ${msgError ? "text-red-600" : "text-green-700"}`}>{msg}</p>}
    </div>
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
    <main className="mx-auto max-w-2xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configuración</h1>
        <Link href="/" className="text-sm text-gray-500 hover:underline">← Volver</Link>
      </div>

      <h2 className="mb-1 text-lg font-semibold">APIs y conexiones</h2>
      <p className="mb-4 text-sm text-gray-500">
        Con tus propias claves, todo lo que genera la plataforma (artículos, plantillas, radar de temas)
        corre a tu cuenta. Si dejas una vacía, se usa la del servidor cuando exista.
      </p>

      <div className="space-y-4">
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

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </main>
  );
}
