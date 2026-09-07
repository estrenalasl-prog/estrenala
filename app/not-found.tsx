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
/**
 * El título es «404», un número: se lee igual en los cinco idiomas.
 *
 * Estaba fijo en español («Página no encontrada») mientras el cuerpo SÍ se
 * traduce, así que con el navegador en inglés salía la pestaña en español y el
 * <h1> en inglés, en la misma pantalla. Un número no tiene ese problema y no
 * hace falta resolver el idioma para pintarlo.
 */
export const metadata: Metadata = {
  title: "404 · Estrénala",
  // Una dirección que no existe no tiene por qué acabar en el índice de nadie.
  robots: { index: false, follow: false },
};

export default function NoEncontradaRuta() {
  return <NoEncontrada />;
}
