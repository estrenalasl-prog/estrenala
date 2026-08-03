import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { accountStore } from "@/src/repositories/accounts";
import { exigirOwner } from "@/src/auth/roles";
import { crearSesionCheckout, StripeError } from "@/src/pagos/stripe";
import { priceIdDe, type Periodo } from "@/src/pagos/precios";
import { planDe } from "@/src/planes/planes";
import { baseApp } from "@/src/auth/url";
import { errorJson, jsonError } from "@/src/auth/http";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

// Arranca el pago: crea la sesión de Checkout y devuelve su URL. Solo el
// propietario del espacio puede contratar.
export async function POST(req: Request) {
  try {
    const { orgId, userId, rol } = await getContexto();
    exigirOwner(rol);

    const body = (await req.json().catch(() => ({}))) as { plan?: unknown; periodo?: unknown };
    const plan = planDe(body.plan);
    if (plan === "free") throw new EditorError("Elige un plan de pago", 400);
    const periodo: Periodo = body.periodo === "anual" ? "anual" : "mes";

    const priceId = priceIdDe(plan, periodo);
    if (!priceId) throw new EditorError("Los pagos no están configurados", 503);

    const user = await accountStore.getUserById(userId);
    const sus = await accountStore.getSuscripcion(orgId);
    const base = baseApp(req);

    const { url } = await crearSesionCheckout({
      priceId,
      orgId,
      email: user?.email ?? "",
      customerId: sus?.customerId ?? null,
      exitoUrl: `${base}/settings?pago=ok`,
      cancelUrl: `${base}/settings?pago=cancelado`,
    });
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof StripeError) {
      return jsonError("No se pudo iniciar el pago. Inténtalo de nuevo.", 502);
    }
    return errorJson(e);
  }
}
