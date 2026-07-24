import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { exigirOwner } from "@/src/auth/roles";
import { invitar } from "@/src/auth/equipo";
import { accountStore } from "@/src/repositories/accounts";
import { baseApp } from "@/src/auth/url";
import { errorJson } from "@/src/auth/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { orgId, rol } = await getContexto();
    exigirOwner(rol);
    const org = await accountStore.getOrg(orgId);
    const body = (await req.json().catch(() => ({}))) as { email?: unknown; rol?: unknown };
    await invitar(accountStore, {
      orgId, orgNombre: org?.nombre ?? "tu espacio",
      email: typeof body.email === "string" ? body.email : "",
      rol: body.rol, base: baseApp(req),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorJson(e);
  }
}
