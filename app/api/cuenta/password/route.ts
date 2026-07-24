import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { accountStore } from "@/src/repositories/accounts";
import { cambiarPassword } from "@/src/auth/cuenta";
import { errorJson } from "@/src/auth/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { userId } = await getContexto();
    const body = (await req.json().catch(() => ({}))) as { actual?: unknown; nueva?: unknown };
    await cambiarPassword(accountStore, { userId, actual: body.actual, nueva: body.nueva });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorJson(e);
  }
}
