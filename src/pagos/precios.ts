import type { Plan } from "@/src/planes/planes";

// Los identificadores de precio de Stripe viven en el entorno porque CAMBIAN al
// pasar de modo prueba a modo real (los price_… de test no valen en producción).
// No son secretos: identifican un precio público del catálogo.
export type Periodo = "mes" | "anual";

export function priceIdDe(plan: Plan, periodo: Periodo): string {
  const clave =
    plan === "personal"
      ? periodo === "mes" ? "STRIPE_PRICE_PERSONAL_MES" : "STRIPE_PRICE_PERSONAL_ANUAL"
      : periodo === "mes" ? "STRIPE_PRICE_AGENCIA_MES" : "STRIPE_PRICE_AGENCIA_ANUAL";
  return process.env[clave] ?? "";
}

// Camino inverso: de lo que nos cuenta Stripe en el webhook al plan interno.
// Si el precio no es ninguno de los nuestros, devuelve null (y no tocamos nada).
export function planDePriceId(priceId: string): Plan | null {
  if (!priceId) return null;
  const mapa: [string, Plan][] = [
    [process.env.STRIPE_PRICE_PERSONAL_MES ?? "", "personal"],
    [process.env.STRIPE_PRICE_PERSONAL_ANUAL ?? "", "personal"],
    [process.env.STRIPE_PRICE_AGENCIA_MES ?? "", "agencia"],
    [process.env.STRIPE_PRICE_AGENCIA_ANUAL ?? "", "agencia"],
  ];
  for (const [id, plan] of mapa) if (id && id === priceId) return plan;
  return null;
}

export function pagosConfigurados(): boolean {
  return (
    !!process.env.STRIPE_SECRET_KEY &&
    !!process.env.STRIPE_PRICE_PERSONAL_MES &&
    !!process.env.STRIPE_PRICE_AGENCIA_MES
  );
}
