import { connect } from "node:tls";

/**
 * Cuándo caduca el certificado que presenta un host. `null` si no se pudo leer.
 *
 * Se abre una conexión TLS y se cierra en cuanto contesta el saludo: no se pide
 * ninguna página, así que no cuenta como visita ni gasta ancho de banda de nadie.
 *
 * `servername` es obligatorio (SNI). Sin él, un servidor que aloja varios sitios
 * —el nuestro, sin ir más lejos— devuelve el certificado que le da la gana, casi
 * siempre el de por defecto de Traefik: estaríamos vigilando la caducidad de un
 * certificado que no es el del cliente.
 *
 * `rejectUnauthorized: false` a propósito: queremos leer la fecha INCLUSO de un
 * certificado ya caducado o mal emitido. Rechazarlo dejaría sin diagnóstico justo
 * el caso que más importa. No se confía en él para nada más que en su fecha.
 */
export function caducidadDelCertificado(host: string, limiteMs = 8_000): Promise<Date | null> {
  return new Promise((resolver) => {
    let hecho = false;
    const acabar = (v: Date | null) => {
      if (hecho) return;
      hecho = true;
      try { socket.destroy(); } catch { /* ya estaba cerrado */ }
      resolver(v);
    };

    const socket = connect(
      { host, port: 443, servername: host, rejectUnauthorized: false, timeout: limiteMs },
      () => {
        const cert = socket.getPeerCertificate();
        const hasta = cert && typeof cert.valid_to === "string" ? new Date(cert.valid_to) : null;
        acabar(hasta && !Number.isNaN(hasta.getTime()) ? hasta : null);
      }
    );
    socket.on("timeout", () => acabar(null));
    socket.on("error", () => acabar(null));
  });
}
