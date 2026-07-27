import { createHmac, timingSafeEqual } from "node:crypto";
import { EditorError } from "@/src/editor/errors";

// Stripe por su API REST, sin librerías (mismo criterio que Google OAuth y
// Resend). Los datos de tarjeta NUNCA pasan por aquí: se usa Checkout alojado.
const API = "https://api.stripe.com/v1";

export class StripeError extends Error {
  constructor(public status: number, mensaje: string) {
    super(mensaje);
    this.name = "StripeError";
  }
}

function clave(): string {
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) throw new EditorError("Los pagos no están configurados", 503);
  return k;
}

async function pedir(ruta: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const r = await fetch(`${API}${ruta}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clave()}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) {
    const err = data.error as { message?: string } | undefined;
    throw new StripeError(r.status, err?.message ?? `Stripe HTTP ${r.status}`);
  }
  return data;
}

// Sesión de pago alojada por Stripe. `orgId` viaja en los metadatos de la
// suscripción para saber, en cada evento posterior, a qué espacio aplicarla.
export async function crearSesionCheckout(input: {
  priceId: string;
  orgId: string;
  email: string;
  customerId?: string | null;
  exitoUrl: string;
  cancelUrl: string;
}): Promise<{ url: string }> {
  const params: Record<string, string> = {
    mode: "subscription",
    "line_items[0][price]": input.priceId,
    "line_items[0][quantity]": "1",
    success_url: input.exitoUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.orgId,
    "metadata[orgId]": input.orgId,
    "subscription_data[metadata][orgId]": input.orgId,
    allow_promotion_codes: "true",
    // Recoge la dirección fiscal: hace falta para facturar dentro de la UE.
    "billing_address_collection": "required",
  };
  // Si el espacio ya es cliente, se reutiliza (así no se duplican clientes).
  if (input.customerId) params.customer = input.customerId;
  else params.customer_email = input.email;

  const d = await pedir("/checkout/sessions", params);
  const url = typeof d.url === "string" ? d.url : "";
  if (!url) throw new StripeError(502, "Stripe no devolvió la URL de pago");
  return { url };
}

// Portal de cliente: cambiar de plan, actualizar tarjeta o cancelar, sin que
// tengamos que construir nada de eso.
export async function crearSesionPortal(input: {
  customerId: string;
  volverUrl: string;
}): Promise<{ url: string }> {
  const d = await pedir("/billing_portal/sessions", {
    customer: input.customerId,
    return_url: input.volverUrl,
  });
  const url = typeof d.url === "string" ? d.url : "";
  if (!url) throw new StripeError(502, "Stripe no devolvió la URL del portal");
  return { url };
}

const TOLERANCIA_MS = 5 * 60 * 1000;

// Verifica la cabecera `Stripe-Signature` (t=<epoch>,v1=<hmac>). Sin esto,
// cualquiera podría inventarse un webhook y regalarse un plan.
export function verificarFirmaStripe(
  payload: string,
  cabecera: string,
  secreto: string,
  ahoraMs: number = Date.now()
): boolean {
  if (!payload || !cabecera || !secreto) return false;

  let t = "";
  const firmas: string[] = [];
  for (const parte of cabecera.split(",")) {
    const [k, v] = parte.trim().split("=");
    if (k === "t" && v) t = v;
    else if (k === "v1" && v) firmas.push(v); // puede haber varias durante una rotación
  }
  if (!t || firmas.length === 0) return false;

  // Antirreplay: la marca de tiempo debe ser reciente.
  const segundos = Number(t);
  if (!Number.isFinite(segundos)) return false;
  if (Math.abs(ahoraMs - segundos * 1000) > TOLERANCIA_MS) return false;

  const esperada = createHmac("sha256", secreto).update(`${t}.${payload}`).digest("hex");
  const esperadaBuf = Buffer.from(esperada, "utf8");
  return firmas.some((f) => {
    const buf = Buffer.from(f, "utf8");
    return buf.length === esperadaBuf.length && timingSafeEqual(buf, esperadaBuf);
  });
}
