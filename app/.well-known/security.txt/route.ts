import { urlPlataforma } from "@/src/config/sitio";

export const runtime = "nodejs";

/**
 * `security.txt` (RFC 9116): dónde avisar si alguien encuentra un problema.
 *
 * Para qué sirve de verdad, que no es el postureo: cuando alguien monta una web
 * de phishing en un subdominio nuestro, quien lo detecta —un banco, un
 * investigador, el equipo de Safe Browsing de Google— busca este archivo para
 * avisar. Si no lo encuentra, el siguiente paso no es buscarnos por LinkedIn:
 * es marcar el dominio. Y marcado `estrenala.com`, la pantalla roja de «sitio
 * peligroso» sale en las webs de TODOS los clientes.
 *
 * O sea que esto no protege de que pase: acorta lo que tarda en arreglarse, que
 * es lo único que se puede controlar.
 *
 * Solo se sirve en el host de la plataforma. Las webs de los clientes las
 * reescribe el middleware a /sites/... antes de llegar aquí, así que si un
 * cliente pone su propio security.txt, sale el suyo — que es lo correcto: su
 * web es suya.
 */
export async function GET() {
  const base = urlPlataforma();

  // Se recalcula en cada visita a propósito. `Expires` es obligatorio en la RFC
  // y un archivo caducado se ignora entero; con una fecha fija, el día que
  // pasara nos quedaríamos sin buzón de avisos sin enterarnos.
  const expira = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");

  const cuerpo = [
    "# Estrénala — https://estrenala.com",
    "#",
    "# ¿Has encontrado un problema de seguridad, o una web que suplanta a alguien",
    "# en uno de nuestros subdominios? Escríbenos y lo miramos el mismo día.",
    "",
    "Contact: mailto:seguridad@estrenala.com",
    "Contact: mailto:abuso@estrenala.com",
    `Expires: ${expira}`,
    "Preferred-Languages: es, en",
    `Canonical: ${base}/.well-known/security.txt`,
    "",
  ].join("\n");

  return new Response(cuerpo, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      // Un día: si cambia el buzón, no queremos que medio internet siga con el
      // viejo durante un mes.
      "cache-control": "public, max-age=86400",
    },
  });
}
