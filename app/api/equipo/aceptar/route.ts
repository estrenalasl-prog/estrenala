import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { aceptarInvitacion } from "@/src/auth/equipo";
import { accountStore } from "@/src/repositories/accounts";
import { fijarOrgActiva } from "@/src/auth/cookie-http";
import { errorJson } from "@/src/auth/http";

export const runtime = "nodejs";

// Acepta una invitación (requiere sesión). Al entrar en el espacio, lo activa.
export async function POST(req: Request) {
  try {
    const { userId } = await getContexto();
    const body = (await req.json().catch(() => ({}))) as { token?: unknown };
    const { orgId } = await aceptarInvitacion(accountStore, {
      tokenPlano: typeof body.token === "string" ? body.token : "", userId,
    });
    const res = NextResponse.json({ ok: true });
    fijarOrgActiva(res, orgId);
    return res;
  } catch (e) {
    return errorJson(e);
  }
}
