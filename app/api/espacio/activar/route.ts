import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { accountStore } from "@/src/repositories/accounts";
import { fijarOrgActiva } from "@/src/auth/cookie-http";
import { EditorError } from "@/src/editor/errors";
import { errorJson } from "@/src/auth/http";

export const runtime = "nodejs";

// Cambia de espacio activo. Solo si el usuario pertenece a esa organización.
export async function POST(req: Request) {
  try {
    const { userId } = await getContexto();
    const body = (await req.json().catch(() => ({}))) as { orgId?: unknown };
    const orgId = typeof body.orgId === "string" ? body.orgId : "";
    const m = await accountStore.getMembership(orgId, userId);
    if (!m) throw new EditorError("No perteneces a ese espacio", 403);
    const res = NextResponse.json({ ok: true });
    fijarOrgActiva(res, orgId);
    return res;
  } catch (e) {
    return errorJson(e);
  }
}
