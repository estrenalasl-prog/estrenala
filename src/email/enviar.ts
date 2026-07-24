// Envío de correos enchufable. En desarrollo (sin RESEND_API_KEY) el correo se
// imprime en la consola del servidor, con el enlace incluido: cero cuentas y
// cero coste para probar el flujo. Al desplegar, con RESEND_API_KEY se envía de
// verdad por Resend. NUNCA se imprime aquí ningún material sensible que no sea
// el propio contenido del correo que el usuario va a recibir.
export type Correo = { para: string; asunto: string; html: string; texto?: string };

// Si hay proveedor real configurado. La verificación de email solo se EXIGE
// cuando esto es true (en dev no hay forma de recibir el correo).
export function envioActivo(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function aTexto(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function enviarCorreo(correo: Correo): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const desde = process.env.EMAIL_FROM ?? "Estrénala <no-responder@estrenala.com>";

  if (!apiKey) {
    // Transporte de desarrollo.
    console.log(
      `\n──────── correo (dev) ────────\n` +
      `Para:   ${correo.para}\n` +
      `Asunto: ${correo.asunto}\n\n` +
      `${correo.texto ?? aTexto(correo.html)}\n` +
      `──────────────────────────────\n`
    );
    return;
  }

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: desde, to: correo.para, subject: correo.asunto,
      html: correo.html, text: correo.texto ?? aTexto(correo.html),
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Resend HTTP ${r.status}: ${t.slice(0, 300)}`);
  }
}
