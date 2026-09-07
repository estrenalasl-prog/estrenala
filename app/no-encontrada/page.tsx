import type { Metadata } from "next";
import { NoEncontrada } from "../_components/NoEncontrada";

/**
 * Adonde el middleware reescribe las direcciones que no encajan con ninguna
 * ruta. Es una página de verdad —y no el `not-found` de Next— para que el HTML
 * salga hecho del servidor; el porqué está en `_components/NoEncontrada.tsx`.
 *
 * El estado 404 lo pone el middleware en la propia reescritura: esta página no
 * puede, y devolver un 200 diciendo «no existe» es justo lo que hace que Google
 * indexe direcciones que no llevan a ninguna parte.
 *
 * Es alcanzable por su nombre (`/no-encontrada`), y no pasa nada: lo que enseña
 * es exactamente lo que dice.
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
  robots: { index: false, follow: false },
};

export default function PaginaNoEncontrada() {
  return <NoEncontrada />;
}
