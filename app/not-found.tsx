import type { Metadata } from "next";
import { NoEncontrada } from "./_components/NoEncontrada";

/**
 * La 404 de cuando una página que SÍ existe decide que lo que le piden no está
 * —un artículo del blog con un slug inventado, por ejemplo—. Las direcciones que
 * no encajan con ninguna ruta las desvía el middleware a `/no-encontrada`; el
 * porqué de que sean dos caminos está en `_components/NoEncontrada.tsx`.
 *
 * Antes de esto salía la pantalla que Next trae de fábrica: fondo blanco, «404
 * This page could not be found» en inglés, sin logo y sin forma de volver.
 */
export const metadata: Metadata = {
  title: "Página no encontrada · Estrénala",
  // Una dirección que no existe no tiene por qué acabar en el índice de nadie.
  robots: { index: false, follow: false },
};

export default function NoEncontradaRuta() {
  return <NoEncontrada />;
}
