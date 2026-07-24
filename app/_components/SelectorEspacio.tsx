"use client";
import { useEffect, useState } from "react";

type Esp = { orgId: string; nombre: string; rol: string };

// Selector de espacio activo en la cabecera. Solo aparece si perteneces a más de
// uno. Se carga solo (así la cabecera sirve tanto en páginas server como client).
export function SelectorEspacio() {
  const [espacios, setEspacios] = useState<Esp[]>([]);
  const [activa, setActiva] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/espacios");
        if (r.ok) { const d = (await r.json()) as { espacios: Esp[]; activa: string }; setEspacios(d.espacios); setActiva(d.activa); }
      } catch { /* silencioso */ }
    })();
  }, []);

  if (espacios.length <= 1) return null;

  async function cambiar(orgId: string) {
    await fetch("/api/espacio/activar", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    window.location.href = "/";
  }

  return (
    <select className="selector-espacio" value={activa} onChange={(e) => void cambiar(e.target.value)} aria-label="Espacio activo">
      {espacios.map((s) => <option key={s.orgId} value={s.orgId}>{s.nombre}</option>)}
    </select>
  );
}
