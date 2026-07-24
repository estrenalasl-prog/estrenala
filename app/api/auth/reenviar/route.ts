import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { accountStore } from "@/src/repositories/accounts";
import { enviarVerificacion } from "@/src/auth/verificacion";
import { baseApp } from "@/src/auth/url";

export const runtime = "nodejs";

// Reenvía el correo de verificación al usuario en sesión (si aún no lo confirmó).
// Autenticada: NO está en las rutas públicas del middleware.
export async function POST(req: Request) {
  try {
    const { userId } = await getContexto();
    const user = await accountStore.getUserById(userId);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!user.emailVerificadoAt) {
      await enviarVerificacion(accountStore, {
        userId, email: user.email, nombre: user.nombre, base: baseApp(req),
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}
