import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { verificarFirmaStripe } from "@/src/pagos/stripe";
import { interpretarEvento } from "@/src/pagos/suscripcion";
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
