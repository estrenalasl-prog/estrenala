"use client";

import { useState } from "react";
import { cookieDecision, type Decision } from "@/src/legal/consentimiento";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Banner de consentimiento. Solo lo monta `app/layout.tsx`, y solo cuando hay
 * identificador de Google Ads configurado y el visitante no ha decidido todavía
 * (ver `haceFaltaBanner`). Nunca aparece en las webs de los clientes: esas se
 * sirven desde un manejador de ruta que no pasa por el layout.
 *
 * Los dos botones son IGUALES a propósito —mismo tamaño, mismo peso, uno al lado
 * del otro—. Rechazar tiene que costar lo mismo que aceptar; poner «Aceptar» en
 * verde grande y «Rechazar» en gris pequeño es lo que multan.
 */
export function Cookies({ seguro }: { seguro: boolean }) {
  const [visible, setVisible] = useState(true);

  function decidir(decision: Decision) {
    document.cookie = cookieDecision(decision, seguro);
    // Si aceptan, se le dice a Google en el acto y sin recargar: los scripts ya
    // están cargados en modo denegado y esto los desbloquea. Si rechazan no hay
    // nada que actualizar —arrancaron denegados— y basta con guardar la decisión.
    if (decision === "aceptado" && typeof window.gtag === "function") {
      window.gtag("consent", "update", {
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
        analytics_storage: "granted",
      });
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookies" role="dialog" aria-live="polite" aria-label="Cookies">
      <div className="cookies-texto">
        <p>
          Usamos cookies propias necesarias para que funcione la plataforma, y cookies de
          Google para medir si nuestros anuncios sirven de algo. Las segundas solo si tú
          quieres.
        </p>
        <p className="cookies-mas">
          Puedes cambiar de idea cuando quieras desde la <a href="/legal/cookies">política de
          cookies</a>.
        </p>
      </div>
      {/* Los dos con la MISMA clase, a propósito. Poner «Aceptar todas» con el
          verde de marca sería defendible, pero en cuanto uno de los dos destaca ya
          estás empujando, y esto no es una pantalla de conversión. */}
      <div className="cookies-botones">
        <button className="btn btn-sec" onClick={() => decidir("rechazado")}>
          Solo las necesarias
        </button>
        <button className="btn btn-sec" onClick={() => decidir("aceptado")}>
          Aceptar todas
        </button>
      </div>
    </div>
  );
}
