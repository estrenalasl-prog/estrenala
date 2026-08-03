import { enviarCorreo } from "@/src/email/enviar";
import { urlPlataforma } from "@/src/config/sitio";
import type { EnvioValido } from "./recibir";

/**
 * El correo que le llega al dueño cuando alguien escribe por su web.
 *
 * Va en español y a propósito: lo lee NUESTRO cliente, no su visitante, y el
 * idioma de su cuenta ya lo tenemos… pero traerlo aquí obliga a una consulta más
 * dentro de una ruta pública sin sesión. Pendiente de decidir si compensa; hoy el
 * cuerpo del correo es casi todo el mensaje del visitante, que no se traduce.
 */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Un valor de una línea para el asunto, sin saltos y cortito. */
function unaLinea(s: string, max = 60): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * De qué va el mensaje, para el asunto.
 *
 * Se mira el nombre del campo y no su contenido. No es infalible —el campo puede
 * llamarse cualquier cosa— y por eso hay respaldo: si no se reconoce ninguno, se
 * coge el primer valor que tenga algo escrito. Nunca se queda sin asunto útil.
 */
const CAMPOS_ASUNTO = ["asunto", "subject", "oggetto", "objet", "titulo", "title"];
const CAMPOS_NOMBRE = ["nombre", "name", "nome", "nom"];

function resumen(datos: Record<string, string>): string {
  const claves = Object.keys(datos);
  const buscar = (lista: string[]) =>
    claves.find((k) => lista.includes(k.trim().toLowerCase()) && datos[k].trim() !== "");
  const asunto = buscar(CAMPOS_ASUNTO);
  if (asunto) return unaLinea(datos[asunto]);
  const nombre = buscar(CAMPOS_NOMBRE);
  if (nombre) return `de ${unaLinea(datos[nombre], 40)}`;
  const primero = claves.find((k) => datos[k].trim() !== "");
  return primero ? unaLinea(datos[primero]) : "sin asunto";
}

export async function avisarDelEnvio(input: {
  para: string;
  nombreWeb: string;
  projectId: string;
  envio: EnvioValido;
}): Promise<void> {
  const { datos, pagina } = input.envio;
  const filas = Object.entries(datos)
    .map(([k, v]) =>
      `<tr>` +
      `<td style="padding:6px 14px 6px 0;vertical-align:top;color:#55584C;white-space:nowrap">${esc(k)}</td>` +
      `<td style="padding:6px 0;vertical-align:top;color:#141509;white-space:pre-wrap">${esc(v)}</td>` +
      `</tr>`
    )
    .join("");

  const enlace = `${urlPlataforma()}/projects/${input.projectId}#mensajes`;

  await enviarCorreo({
    para: input.para,
    asunto: `Nuevo mensaje en ${input.nombreWeb}: ${resumen(datos)}`,
    html:
      `<div style="font:16px/1.6 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#141509">` +
      `<p>Alguien ha escrito desde <b>${esc(input.nombreWeb)}</b>, en la página <code>${esc(pagina)}</code>:</p>` +
      `<table style="border-collapse:collapse;margin:18px 0">${filas}</table>` +
      `<p><a href="${esc(enlace)}" style="color:#5E7300">Ver todos los mensajes de esta web</a></p>` +
      `<p style="color:#9A9C8F;font-size:13px;margin-top:26px">` +
      `Lo recibes porque tienes encendida la recogida de formularios en esta web. ` +
      `Puedes apagarla desde su pantalla en Estrénala.</p>` +
      `</div>`,
    // El texto plano se escribe A MANO y no se saca del HTML: el mensaje del
    // visitante puede llevar saltos de línea que importan, y convertir el HTML a
    // texto los aplasta todos en un párrafo.
    texto:
      `Alguien ha escrito desde ${input.nombreWeb}, en la página ${pagina}:\n\n` +
      Object.entries(datos).map(([k, v]) => `${k}:\n${v}`).join("\n\n") +
      `\n\nVer todos los mensajes: ${enlace}\n`,
  });
}
