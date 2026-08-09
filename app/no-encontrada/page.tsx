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
export const metadata: Metadata = {
  title: "Página no encontrada · Estrénala",
  robots: { index: false, follow: false },
};

export default function PaginaNoEncontrada() {
  return <NoEncontrada />;
}
