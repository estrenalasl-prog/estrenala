import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { accountStore } from "@/src/repositories/accounts";
import { projectStore } from "@/src/repositories/projects";
import { getStorage } from "@/src/storage/factory";
import { cambiarNombre } from "@/src/auth/cuenta";
import { eliminarCuenta } from "@/src/auth/eliminar-cuenta";
import { cerrarSesion } from "@/src/auth/cookie-http";
import { errorJson, jsonError } from "@/src/auth/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await getContexto();
    const u = await accountStore.getUserById(userId);
    if (!u) return jsonError("No autorizado", 401);
    return NextResponse.json({
      nombre: u.nombre, email: u.email,
      tienePassword: !!u.passwordHash, google: !!u.googleSub, verificado: !!u.emailVerificadoAt,
      // El que tenga GUARDADO, no el que se le esté sirviendo ahora mismo. Nulo
      // significa «no lo ha elegido», y el selector lo enseña como «Automático»:
      // decir «Español» cuando nadie lo eligió sería inventarse una decisión.
      idioma: u.idioma,
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

// Borrar la cuenta entera. Borra los espacios donde eres único dueño (con sus webs)
// y te saca del resto; luego cierra la sesión.
export async function DELETE() {
  try {
    const { userId } = await getContexto();
    await eliminarCuenta(
      { cuentas: accountStore, proyectos: projectStore, storage: getStorage() },
      { userId }
    );
    const res = NextResponse.json({ ok: true });
    cerrarSesion(res);
    return res;
  } catch (e) {
    return errorJson(e);
  }
}
