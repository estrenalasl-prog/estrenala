import { NextResponse } from "next/server";
import { verificarFirmaStripe } from "@/src/pagos/stripe";
import { interpretarEvento } from "@/src/pagos/suscripcion";
import { accountStore } from "@/src/repositories/accounts";

export const runtime = "nodejs";

// Webhook de Stripe: la ÚNICA vía por la que se activa o se retira un plan.
// No lleva cookie (lo llama Stripe, no el navegador): la autenticidad se
// comprueba con la firma HMAC del cuerpo. Sin firma válida → 400 y nada se toca.
export async function POST(req: Request) {
  const secreto = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secreto) return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 });

  // El cuerpo se lee EN CRUDO: la firma se calcula sobre estos bytes exactos.
  const payload = await req.text();
  const firma = req.headers.get("stripe-signature") ?? "";
  if (!verificarFirmaStripe(payload, firma, secreto)) {
    return NextResponse.json({ error: "Firma no válida" }, { status: 400 });
  }

  let evento: unknown;
  try {
    evento = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const cambio = interpretarEvento(evento);
  // Un 200 aunque el evento no nos incumba: si respondiéramos error, Stripe lo
  // reintentaría eternamente.
  if (!cambio) return NextResponse.json({ ok: true, aplicado: false });

  try {
    await accountStore.setSuscripcion(cambio.orgId, {
      plan: cambio.plan,
      estado: cambio.estado,
      customerId: cambio.customerId,
      subscriptionId: cambio.subscriptionId,
      hasta: cambio.hasta,
    });
  } catch {
    // Fallo nuestro (BD): 500 para que Stripe reintente el evento.
    return NextResponse.json({ error: "No se pudo aplicar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, aplicado: true });
}
