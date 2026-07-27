import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { accountStore } from "@/src/repositories/accounts";
import { projectStore } from "@/src/repositories/projects";
import { PLANES, ORDEN, planDe } from "@/src/planes/planes";
import { errorJson } from "@/src/auth/http";

export const runtime = "nodejs";

// Plan del espacio, su uso y el catálogo (para pintar la comparativa sin
// duplicar los números en el cliente).
export async function GET() {
  try {
    const { orgId, rol } = await getContexto();
    const plan = planDe(await accountStore.getPlan(orgId));
    const webs = (await projectStore.listProjects(orgId)).length;
    const miembros = (await accountStore.listMiembros(orgId)).length;
    return NextResponse.json({
      plan,
      rol,
      uso: { webs, miembros },
      limites: PLANES[plan],
      catalogo: ORDEN.map((p) => PLANES[p]),
    });
  } catch (e) {
    return errorJson(e);
  }
}
