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

type ObjetoSuscripcion = Record<string, unknown>;

type Evento = {
  type?: string;
  data?: { object?: ObjetoSuscripcion };
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
/**
 * Hasta cuándo está pagado el periodo en curso.
 *
 * Stripe MOVIÓ este dato de sitio: hasta la versión de API `2025-03-31` vivía en
 * la raíz de la suscripción (`current_period_end`), y a partir de ahí está en
 * cada línea (`items.data[].current_period_end`). Nuestra cuenta de producción
 * nació con una versión muy posterior (`2026-06-24`), así que leyendo solo la
 * raíz `plan_hasta` se guardaba VACÍO y el plan se cortaría antes de tiempo.
 *
 * Se miran los dos sitios, empezando por la raíz, para que dé igual la versión
 * que negocie cada webhook. Con varias líneas se coge la que vence más tarde:
 * mientras quede algo pagado, el plan sigue en pie.
 */
function finDelPeriodo(obj: ObjetoSuscripcion): Date | null {
  if (typeof obj.current_period_end === "number") return new Date(obj.current_period_end * 1000);
  const lineas = ((obj.items ?? {}) as { data?: unknown[] }).data ?? [];
  const finales = lineas
    .map((l) => (l as { current_period_end?: unknown }).current_period_end)
    .filter((v): v is number => typeof v === "number");
  return finales.length > 0 ? new Date(Math.max(...finales) * 1000) : null;
}

/**
 * Estado de una suscripción que sigue en pie pero ya no se va a renovar.
 *
 * Para Stripe, cancelar «al final del periodo» NO cambia el status: la
 * suscripción sigue `active` hasta que vence, y lo único que marca la baja es
 * `cancel_at_period_end`. Guardando solo el status, la plataforma no se entera
 * de que el cliente se ha ido: le sigue diciendo «Activo» hasta el día en que
 * se le corta de golpe, sin haberle avisado ni una vez.
 *
 * No se toca el `plan`: ha pagado el mes y lo tiene entero.
 */
export const ESTADO_CANCELANDO = "cancelando";

/**
 * ¿Esta suscripción ya no se va a renovar?
 *
 * Se miran DOS campos porque Stripe lo cuenta de dos formas según la versión de
 * API: el clásico `cancel_at_period_end` (booleano) y `cancel_at` (fecha), que
 * es como lo expresan las versiones nuevas —la cuenta de producción va con
 * `2026-06-24`, muy posterior a cuando se escribió esto—. Basta con cualquiera
 * de los dos: lo que no puede pasar es darle por renovada a alguien que se ha
 * dado de baja.
 */
function noSeRenueva(obj: ObjetoSuscripcion): boolean {
  if (obj.cancel_at_period_end === true) return true;
  return typeof obj.cancel_at === "number" && obj.cancel_at > 0;
}

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
  const base = { orgId, customerId, subscriptionId, hasta: finDelPeriodo(obj) };

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

  // Dada de baja pero con el periodo pagado por delante: conserva su plan y se
  // marca aparte para poder avisarle de hasta cuándo lo tiene.
  if (noSeRenueva(obj)) return { ...base, plan, estado: ESTADO_CANCELANDO };

  return { ...base, plan, estado };
}
