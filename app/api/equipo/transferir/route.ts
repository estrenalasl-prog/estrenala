import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { exigirOwner } from "@/src/auth/roles";
import { transferirPropiedad } from "@/src/auth/equipo";
import { accountStore } from "@/src/repositories/accounts";
import { errorJson } from "@/src/auth/http";

export const runtime = "nodejs";

// Ceder la propiedad del espacio a otro miembro (quien la cede queda como editor).
// Solo un propietario puede iniciarla.
export async function POST(req: Request) {
  try {
    const { orgId, userId, rol } = await getContexto();
    exigirOwner(rol);
    const body = (await req.json().catch(() => ({}))) as { userId?: unknown };
    const nuevoUserId = typeof body.userId === "string" ? body.userId : "";
    await transferirPropiedad(accountStore, { orgId, actualUserId: userId, nuevoUserId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorJson(e);
  }
}
