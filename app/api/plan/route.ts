import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { accountStore } from "@/src/repositories/accounts";
import { projectStore } from "@/src/repositories/projects";
import { PLANES, ORDEN, planDe } from "@/src/planes/planes";
import { pagosConfigurados } from "@/src/pagos/precios";
import { errorJson } from "@/src/auth/http";

export const runtime = "nodejs";

// Plan del espacio, su uso y el catálogo (para pintar la comparativa sin
// duplicar los números en el cliente).
export async function GET() {
  try {
    const { orgId, rol } = await getContexto();
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
