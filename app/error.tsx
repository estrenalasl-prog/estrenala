"use client";
import { useEffect } from "react";
import { Reventado } from "./_components/Reventado";

/**
 * Lo que se ve cuando una página revienta. Hasta hoy no había nada y salía la
 * pantalla de Next de fábrica, en inglés y sin salida.
 *
 * Next exige que sea un componente de CLIENTE, por eso los textos viven dentro
 * de `Reventado` y no en el catálogo (el porqué, allí).
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Al log del navegador, no a la pantalla: el mensaje de una excepción trae
    // nombres de dentro de casa. El `digest` es lo que permite cruzarlo con el
    // log del servidor sin enseñarle nada a nadie.
    console.error("Fallo en la página", error.digest ?? error.message);
  }, [error]);

  return <Reventado reset={reset} />;
}
