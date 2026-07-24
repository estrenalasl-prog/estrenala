import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { accountStore } from "@/src/repositories/accounts";
import { errorJson } from "@/src/auth/http";

export const runtime = "nodejs";

// Miembros del espacio activo + mi rol. Lo puede ver cualquier miembro.
export async function GET() {
  try {
    const { orgId, userId, rol } = await getContexto();
    const [miembros, org] = await Promise.all([
      accountStore.listMiembros(orgId),
      accountStore.getOrg(orgId),
    ]);
    return NextResponse.json({ miembros, rol, yo: userId, orgNombre: org?.nombre ?? "" });
  } catch (e) {
    return errorJson(e);
  }
}
