import { planDePriceId } from "./precios";
import type { Plan } from "@/src/planes/planes";

// Qué hay que guardar tras un evento de Stripe. `null` = el evento no nos
// incumbe (otro tipo, sin orgId, o un precio que no es nuestro) → no se toca nada.
export type CambioSuscripcion = {
  orgId: string;
  plan: Plan;
  estado: string;
  customerId: string | null;
  subscriptionId: string | null;
  hasta: Date | null;
};

type Evento = {
  type?: string;
  data?: { object?: Record<string, unknown> };
};

function texto(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

// Traduce un evento de suscripción de Stripe al cambio que toca aplicar.
// Reglas:
//  - active / trialing        → el plan del precio contratado.
//  - past_due / unpaid        → se MANTIENE el plan (Stripe aún reintenta el cobro);
//                               solo queda marcado el estado.
//  - canceled / incomplete_expired / evento deleted → vuelta a gratuito.
//  - incomplete               → aún no ha pagado: no se toca nada.
export function interpretarEvento(evento: unknown): CambioSuscripcion | null {
  const ev = (evento ?? {}) as Evento;
  const tipo = ev.type ?? "";
  if (!tipo.startsWith("customer.subscription.")) return null;

  const obj = ev.data?.object ?? {};
  const metadata = (obj.metadata ?? {}) as Record<string, unknown>;
  const orgId = texto(metadata.orgId);
  if (!orgId) return null; // sin espacio al que aplicarlo, no hacemos nada

  const customerId = texto(obj.customer);
  const subscriptionId = texto(obj.id);
  const fin = typeof obj.current_period_end === "number" ? new Date(obj.current_period_end * 1000) : null;

  const base = { orgId, customerId, subscriptionId, hasta: fin };

  if (tipo === "customer.subscription.deleted") {
    return { ...base, plan: "free", estado: "canceled", subscriptionId: null };
  }

  const estado = texto(obj.status) ?? "";
  if (estado === "canceled" || estado === "incomplete_expired") {
    return { ...base, plan: "free", estado, subscriptionId: null };
  }
  if (estado === "incomplete") return null; // todavía no ha pagado

  const items = (obj.items ?? {}) as { data?: unknown[] };
  const primero = (items.data?.[0] ?? {}) as { price?: { id?: unknown } };
  const plan = planDePriceId(texto(primero.price?.id) ?? "");
  if (!plan) return null; // un precio que no es nuestro: no tocamos el plan

  return { ...base, plan, estado };
}
