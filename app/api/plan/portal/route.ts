import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { accountStore } from "@/src/repositories/accounts";
import { exigirOwner } from "@/src/auth/roles";
import { crearSesionPortal, StripeError } from "@/src/pagos/stripe";
import { baseApp } from "@/src/auth/url";
import { errorJson } from "@/src/auth/http";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

// Portal de cliente de Stripe: cambiar de plan, actualizar la tarjeta o cancelar.
export async function POST(req: Request) {
  try {
    const { orgId, rol } = await getContexto();
    exigirOwner(rol);
    const sus = await accountStore.getSuscripcion(orgId);
    if (!sus?.customerId) throw new EditorError("Este espacio todavía no tiene ninguna suscripción", 400);
    const { url } = await crearSesionPortal({
      customerId: sus.customerId,
      volverUrl: `${baseApp(req)}/settings`,
    });
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof StripeError) {
      return NextResponse.json({ error: "No se pudo abrir la gestión de tu suscripción." }, { status: 502 });
    }
    return errorJson(e);
  }
}
