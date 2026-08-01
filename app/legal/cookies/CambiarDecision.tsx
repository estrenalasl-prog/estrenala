"use client";

import { useState } from "react";
import { cookieOlvidar } from "@/src/legal/consentimiento";

/**
 * «Retirar el consentimiento tiene que ser tan fácil como darlo.» Sin esto, quien
 * acepta un día no tiene forma de cambiar de idea, y eso sí es incumplir.
 *
 * Borra la cookie de la decisión y recarga: al no haber decisión, el banner vuelve
 * a salir y se elige otra vez. Se recarga a propósito en vez de actualizar el
 * consentimiento a mano — así el estado del navegador y el de Google vuelven a
 * partir del mismo sitio, sin quedarse a medias.
 */
export function CambiarDecision() {
  const [hecho, setHecho] = useState(false);

  function olvidar() {
    document.cookie = cookieOlvidar(location.protocol === "https:");
    setHecho(true);
    location.reload();
  }

  return (
    <p>
      <button className="btn btn-sec btn-sm" onClick={olvidar} disabled={hecho}>
        Cambiar mi decisión sobre las cookies
      </button>
    </p>
  );
}
