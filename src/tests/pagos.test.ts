import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { verificarFirmaStripe } from "@/src/pagos/stripe";
import { interpretarEvento, ESTADO_CANCELANDO } from "@/src/pagos/suscripcion";
import { planDePriceId, priceIdDe, pagosConfigurados } from "@/src/pagos/precios";

const ENV = { ...process.env };
beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
  process.env.STRIPE_PRICE_PERSONAL_MES = "price_pm";
  process.env.STRIPE_PRICE_PERSONAL_ANUAL = "price_pa";
  process.env.STRIPE_PRICE_AGENCIA_MES = "price_am";
  process.env.STRIPE_PRICE_AGENCIA_ANUAL = "price_aa";
});
afterEach(() => { process.env = { ...ENV }; });

describe("precios ↔ planes", () => {
  it("del plan y periodo al price id", () => {
    expect(priceIdDe("personal", "mes")).toBe("price_pm");
    expect(priceIdDe("personal", "anual")).toBe("price_pa");
    expect(priceIdDe("agencia", "mes")).toBe("price_am");
    expect(priceIdDe("agencia", "anual")).toBe("price_aa");
  });

  it("del price id al plan (ida y vuelta)", () => {
    expect(planDePriceId("price_pm")).toBe("personal");
    expect(planDePriceId("price_aa")).toBe("agencia");
  });

  it("un precio ajeno no mapea a ningún plan", () => {
    expect(planDePriceId("price_de_otro")).toBeNull();
    expect(planDePriceId("")).toBeNull();
  });

  it("pagosConfigurados exige clave y precios", () => {
    expect(pagosConfigurados()).toBe(true);
    delete process.env.STRIPE_SECRET_KEY;
    expect(pagosConfigurados()).toBe(false);
  });
});

// ---- Firma del webhook: sin esto cualquiera se regalaría un plan ----
function firmar(payload: string, secreto: string, tSegundos: number): string {
  const firma = createHmac("sha256", secreto).update(`${tSegundos}.${payload}`).digest("hex");
  return `t=${tSegundos},v1=${firma}`;
}

describe("verificarFirmaStripe", () => {
  const SECRETO = "whsec_prueba";
  const AHORA = 1_800_000_000_000; // ms
  const T = Math.floor(AHORA / 1000);
  const PAYLOAD = '{"type":"customer.subscription.created"}';

  it("acepta una firma válida y reciente", () => {
    expect(verificarFirmaStripe(PAYLOAD, firmar(PAYLOAD, SECRETO, T), SECRETO, AHORA)).toBe(true);
  });

  it("rechaza si el secreto no coincide", () => {
    expect(verificarFirmaStripe(PAYLOAD, firmar(PAYLOAD, "otro", T), SECRETO, AHORA)).toBe(false);
  });

  it("rechaza si el cuerpo cambió (aunque la firma sea bien formada)", () => {
    const cab = firmar(PAYLOAD, SECRETO, T);
    expect(verificarFirmaStripe('{"type":"hackeado"}', cab, SECRETO, AHORA)).toBe(false);
  });

  it("rechaza firmas viejas (antirreplay, tolerancia 5 min)", () => {
    const viejo = T - 6 * 60;
    expect(verificarFirmaStripe(PAYLOAD, firmar(PAYLOAD, SECRETO, viejo), SECRETO, AHORA)).toBe(false);
  });

  it("acepta dentro de la tolerancia", () => {
    const casi = T - 4 * 60;
    expect(verificarFirmaStripe(PAYLOAD, firmar(PAYLOAD, SECRETO, casi), SECRETO, AHORA)).toBe(true);
  });

  it("acepta si una de varias firmas v1 es válida (rotación de secreto)", () => {
    const buena = createHmac("sha256", SECRETO).update(`${T}.${PAYLOAD}`).digest("hex");
    expect(verificarFirmaStripe(PAYLOAD, `t=${T},v1=deadbeef,v1=${buena}`, SECRETO, AHORA)).toBe(true);
  });

  it("rechaza cabeceras vacías o mal formadas", () => {
    for (const cab of ["", "loquesea", `t=${T}`, "v1=abc"]) {
      expect(verificarFirmaStripe(PAYLOAD, cab, SECRETO, AHORA)).toBe(false);
    }
    expect(verificarFirmaStripe("", firmar("", SECRETO, T), SECRETO, AHORA)).toBe(false);
  });
});

// ---- Interpretación de eventos ----
const sub = (over: Record<string, unknown> = {}) => ({
  type: "customer.subscription.updated",
  data: {
    object: {
      id: "sub_1", customer: "cus_1", status: "active",
      current_period_end: 1_800_000_000,
      metadata: { orgId: "org-1" },
      items: { data: [{ price: { id: "price_pm" } }] },
      ...over,
    },
  },
});

describe("interpretarEvento", () => {
  it("suscripción activa → plan del precio contratado", () => {
    const c = interpretarEvento(sub())!;
    expect(c).toMatchObject({ orgId: "org-1", plan: "personal", estado: "active", customerId: "cus_1", subscriptionId: "sub_1" });
    expect(c.hasta?.getTime()).toBe(1_800_000_000 * 1000);
  });

  it("precio de agencia → plan agencia", () => {
    expect(interpretarEvento(sub({ items: { data: [{ price: { id: "price_aa" } }] } }))!.plan).toBe("agencia");
  });

  it("trialing también da acceso", () => {
    expect(interpretarEvento(sub({ status: "trialing" }))!.plan).toBe("personal");
  });

  it("past_due MANTIENE el plan (Stripe aún reintenta) pero marca el estado", () => {
    const c = interpretarEvento(sub({ status: "past_due" }))!;
    expect(c.plan).toBe("personal");
    expect(c.estado).toBe("past_due");
  });

  it("cancelada → vuelve a gratuito y suelta la suscripción", () => {
    const c = interpretarEvento(sub({ status: "canceled" }))!;
    expect(c.plan).toBe("free");
    expect(c.subscriptionId).toBeNull();
  });

  it("evento deleted → gratuito", () => {
    expect(interpretarEvento(sub({}) && { ...sub(), type: "customer.subscription.deleted" })!.plan).toBe("free");
  });

  it("incomplete (aún sin pagar) → no se toca nada", () => {
    expect(interpretarEvento(sub({ status: "incomplete" }))).toBeNull();
  });

  it("sin orgId en los metadatos → no se toca nada", () => {
    expect(interpretarEvento(sub({ metadata: {} }))).toBeNull();
  });

  it("precio que no es nuestro → no se toca nada", () => {
    expect(interpretarEvento(sub({ items: { data: [{ price: { id: "price_ajeno" } }] } }))).toBeNull();
  });

  it("otros tipos de evento se ignoran", () => {
    expect(interpretarEvento({ type: "invoice.paid", data: { object: {} } })).toBeNull();
    expect(interpretarEvento(null)).toBeNull();
    expect(interpretarEvento({})).toBeNull();
  });
});

// Stripe MOVIÓ `current_period_end` de la raíz de la suscripción a cada línea a
// partir de la versión de API 2025-03-31. La cuenta de producción nació con una
// muy posterior (2026-06-24), así que esta es la forma que llega DE VERDAD.
describe("interpretarEvento con la forma nueva de Stripe (sin current_period_end en la raíz)", () => {
  const nuevo = (over: Record<string, unknown> = {}) => ({
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub_1", customer: "cus_1", status: "active",
        metadata: { orgId: "org-1" },
        items: { data: [{ price: { id: "price_pm" }, current_period_end: 1_800_000_000 }] },
        ...over,
      },
    },
  });

  it("lee el fin del periodo de la línea de la suscripción", () => {
    const c = interpretarEvento(nuevo())!;
    expect(c.plan).toBe("personal");
    expect(c.hasta?.getTime()).toBe(1_800_000_000 * 1000);
  });

  it("con varias líneas se queda con la que vence más tarde", () => {
    const c = interpretarEvento(nuevo({
      items: { data: [
        { price: { id: "price_pm" }, current_period_end: 1_700_000_000 },
        { price: { id: "price_pm" }, current_period_end: 1_900_000_000 },
      ] },
    }))!;
    expect(c.hasta?.getTime()).toBe(1_900_000_000 * 1000);
  });

  it("la raíz sigue mandando si viene (versiones viejas)", () => {
    const c = interpretarEvento(nuevo({ current_period_end: 1_500_000_000 }))!;
    expect(c.hasta?.getTime()).toBe(1_500_000_000 * 1000);
  });

  it("si no viene por ningún lado, queda sin fecha en vez de romperse", () => {
    const c = interpretarEvento(nuevo({ items: { data: [{ price: { id: "price_pm" } }] } }))!;
    expect(c.hasta).toBeNull();
    expect(c.plan).toBe("personal"); // el plan se aplica igual
  });
});

// Para Stripe, cancelar «al final del periodo» NO cambia el status: la
// suscripción sigue `active` y lo único que marca la baja es
// `cancel_at_period_end`. Guardando solo el status, la plataforma le seguía
// diciendo «Activo» a alguien que ya se había ido, hasta cortarle de golpe el
// día del vencimiento sin haberle avisado ni una vez.
describe("baja programada (cancel_at_period_end)", () => {
  it("se distingue de una suscripción que sí se va a renovar", () => {
    expect(interpretarEvento(sub())!.estado).toBe("active");
    expect(interpretarEvento(sub({ cancel_at_period_end: true }))!.estado).toBe(ESTADO_CANCELANDO);
  });

  it("NO le quita el plan: ha pagado el periodo y lo tiene entero", () => {
    const c = interpretarEvento(sub({ cancel_at_period_end: true }))!;
    expect(c.plan).toBe("personal");
    expect(c.hasta?.getTime()).toBe(1_800_000_000 * 1000); // hasta cuándo lo tiene
  });

  it("se conserva el enlace con Stripe para poder reactivarla", () => {
    const c = interpretarEvento(sub({ cancel_at_period_end: true }))!;
    expect(c.customerId).toBe("cus_1");
    expect(c.subscriptionId).toBe("sub_1");
  });

  it("cuando de verdad vence, sí se cae a gratis", () => {
    const c = interpretarEvento(sub({ status: "canceled", cancel_at_period_end: true }))!;
    expect(c.plan).toBe("free");
    expect(c.estado).toBe("canceled");
  });

  it("false o ausente se comportan igual que siempre", () => {
    expect(interpretarEvento(sub({ cancel_at_period_end: false }))!.estado).toBe("active");
  });
});
