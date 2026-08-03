import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { accountStore } from "@/src/repositories/accounts";
import { cookieIdioma, esIdioma } from "@/src/i18n/idiomas";
import { errorJson, jsonError } from "@/src/auth/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { userId } = await getContexto();
    const body = (await req.json().catch(() => ({}))) as { idioma?: unknown };
    // Se rechaza lo que no sea uno de los cinco en vez de caer al español: este
    // valor acaba decidiendo en qué idioma se le escribe a esta persona, y
    // guardar en silencio algo distinto de lo que pidió es peor que un error.
    if (!esIdioma(body.idioma)) {
      return jsonError("Ese idioma no existe", 400);
    }
    await accountStore.setIdioma(userId, body.idioma);

    // Y también en la cookie: es lo que hace que el cambio se note ANTES de
    // volver a consultar la cuenta, y lo que ve el middleware.
    const seguro = new URL(req.url).protocol === "https:";
    const res = NextResponse.json({ ok: true });
    res.headers.append("set-cookie", cookieIdioma(body.idioma, seguro));
    return res;
  } catch (e) {
    return errorJson(e);
  }
}
