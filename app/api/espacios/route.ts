import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { accountStore } from "@/src/repositories/accounts";
import { errorJson } from "@/src/auth/http";

export const runtime = "nodejs";

// Espacios (organizaciones) a los que pertenece el usuario + cuál está activo.
export async function GET() {
  try {
    const { userId, orgId } = await getContexto();
    const espacios = await accountStore.listOrgsDeUsuario(userId);
    return NextResponse.json({ espacios, activa: orgId });
  } catch (e) {
    return errorJson(e);
  }
}
