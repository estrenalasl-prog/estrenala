import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { accountStore } from "@/src/repositories/accounts";
import { projectStore } from "@/src/repositories/projects";
import { PLANES, ORDEN, planDe } from "@/src/planes/planes";
import { pagosConfigurados } from "@/src/pagos/precios";
import { leerSuscripcion } from "@/src/pagos/stripe";
import { interpretarEvento } from "@/src/pagos/suscripcion";
import { errorJson } from "@/src/auth/http";

export const runtime = "nodejs";

/**
 * Vuelve a preguntarle a Stripe cómo está la suscripción y guarda lo que diga.
 *
 * Los webhooks son el camino normal, pero uno que se pierda deja el estado
 * congelado hasta el evento siguiente —que en una suscripción mensual puede
 * tardar un mes— y mientras tanto esta pantalla afirma cosas que Stripe
 * desmiente. Aquí se habla de dinero: manda Stripe.
 *
 * Es BEST-EFFORT a propósito. Si Stripe no contesta se sigue con lo guardado,
 * que es viejo pero razonable; lo que no puede pasar es que la página del plan
 * reviente porque un tercero esté caído.
 *
 * Se reutiliza `interpretarEvento` envolviendo la suscripción como si fuera un
 * evento: así el webhook y este camino no pueden interpretar lo mismo de dos
 * formas distintas.
 */
async function sincronizar(subscriptionId: string | null | undefined): Promise<void> {
  if (!subscriptionId) return;
  try {
    const sub = await leerSuscripcion(subscriptionId);
    const cambio = interpretarEvento({ type: "customer.subscription.updated", data: { object: sub } });
    if (cambio) {
      await accountStore.setSuscripcion(cambio.orgId, {
        plan: cambio.plan, estado: cambio.estado,
        customerId: cambio.customerId, subscriptionId: cambio.subscriptionId, hasta: cambio.hasta,
      });
    }
  } catch (e) {
    console.error("[plan] no se pudo sincronizar con Stripe:", e instanceof Error ? e.message : e);
  }
}

// Plan del espacio, su uso y el catálogo (para pintar la comparativa sin
// duplicar los números en el cliente).
export async function GET() {
  try {
    const { orgId, rol } = await getContexto();
    // Antes de enseñar nada, que lo guardado coincida con Stripe.
    await sincronizar((await accountStore.getSuscripcion(orgId))?.subscriptionId);
    const sus = await accountStore.getSuscripcion(orgId);
    const plan = planDe(sus?.plan);
    const webs = (await projectStore.listProjects(orgId)).length;
    const miembros = (await accountStore.listMiembros(orgId)).length;
    return NextResponse.json({
      plan,
      rol,
      uso: { webs, miembros },
      limites: PLANES[plan],
      catalogo: ORDEN.map((p) => PLANES[p]),
      pagos: pagosConfigurados(),
      suscrito: !!sus?.customerId,
      estado: sus?.estado ?? "",
      // Hasta cuándo está pagado. Sin esto no se le puede decir a alguien que
      // acaba de darse de baja cuánto le queda de plan, y se le corta sin aviso.
      hasta: sus?.hasta ?? null,
    });
  } catch (e) {
    return errorJson(e);
  }
}
