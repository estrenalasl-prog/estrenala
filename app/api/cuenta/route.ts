import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { accountStore } from "@/src/repositories/accounts";
import { cambiarNombre } from "@/src/auth/cuenta";
import { errorJson } from "@/src/auth/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await getContexto();
    const u = await accountStore.getUserById(userId);
    if (!u) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    return NextResponse.json({
      nombre: u.nombre, email: u.email,
      tienePassword: !!u.passwordHash, google: !!u.googleSub, verificado: !!u.emailVerificadoAt,
    });
  } catch (e) {
    return errorJson(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await getContexto();
    const body = (await req.json().catch(() => ({}))) as { nombre?: unknown };
    await cambiarNombre(accountStore, userId, body.nombre);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorJson(e);
  }
}
