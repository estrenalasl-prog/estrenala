import { NextResponse } from "next/server";
import { EditorError } from "@/src/editor/errors";
import { traducirError } from "@/src/i18n/errores";
import { idiomaDeSesion } from "@/src/i18n/servidor";

/**
 * Un error, en JSON y en el idioma de quien lo va a leer.
 *
 * La traducción ocurre AQUÍ y no donde se lanza. El mensaje que viaja por dentro
 * sigue siendo el español de siempre, palabra por palabra, que es lo que fijan
 * los tests; este es el único punto en el que se convierte en algo que lee una
 * persona (el porqué largo, en src/i18n/errores/index.ts).
 *
 * `idiomaDeSesion` está memorizado por petición, así que llamarlo aquí no añade
 * una consulta más aunque la pantalla ya lo hubiera pedido.
 */
export async function jsonError(mensaje: string, status: number, extra?: Record<string, unknown>) {
  const error = traducirError(mensaje, await idiomaDeSesion());
  return NextResponse.json({ error, ...extra }, { status });
}

// EditorError conserva su código y su mensaje (byte-exacto por dentro);
// cualquier otro se oculta como 500 genérico para no filtrar las tripas.
export function errorJson(e: unknown) {
  if (e instanceof EditorError) return jsonError(e.message, e.status);
  return jsonError("Error interno", 500);
}
