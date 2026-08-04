import { NextResponse } from "next/server";

/**
 * «¿Está vivo el proceso?» — y NADA más. No mira la base de datos a propósito.
 *
 * Esta contesta a la pregunta de un supervisor de contenedores: *¿hay que
 * reiniciar esto?* Y la respuesta cuando se cae Postgres es NO: reiniciar no
 * arregla una base de datos caída, y mientras el contenedor se reinicia dejan de
 * servirse también las webs de los clientes que sí se estaban sirviendo de
 * caché. Un chequeo demasiado listo aquí convierte un problema en dos.
 *
 * La otra pregunta —*¿hay que despertar a Sebas?*— la contesta `/api/salud`,
 * que sí hace un viaje de verdad a la base de datos. Son dos endpoints porque
 * son dos preguntas, no por duplicado.
 */
export async function GET() {
  return NextResponse.json({ ok: true });
}
