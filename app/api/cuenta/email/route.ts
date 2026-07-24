import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { accountStore } from "@/src/repositories/accounts";
import { solicitarCambioEmail } from "@/src/auth/cuenta";
import { baseApp } from "@/src/auth/url";
import { errorJson } from "@/src/auth/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { userId } = await getContexto();
    const body = (await req.json().catch(() => ({}))) as { nuevoEmail?: unknown };
    await solicitarCambioEmail(accountStore, { userId, nuevoEmail: body.nuevoEmail, base: baseApp(req) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorJson(e);
  }
}
