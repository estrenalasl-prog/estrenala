import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { exigirOwner } from "@/src/auth/roles";
import { validarRol, MSG_ULTIMO_OWNER } from "@/src/auth/equipo";
import { accountStore } from "@/src/repositories/accounts";
import { EditorError } from "@/src/editor/errors";
import { errorJson } from "@/src/auth/http";

export const runtime = "nodejs";

// Cambiar el rol de un miembro. No se puede dejar el espacio sin propietarios.
export async function PATCH(req: Request) {
  try {
    const { orgId, rol } = await getContexto();
    exigirOwner(rol);
    const body = (await req.json().catch(() => ({}))) as { userId?: unknown; rol?: unknown };
    const objetivo = typeof body.userId === "string" ? body.userId : "";
    const nuevoRol = validarRol(body.rol);
    const actual = await accountStore.getMembership(orgId, objetivo);
    if (!actual) throw new EditorError("Esa persona no está en el espacio", 404);
    if (actual.rol === "owner" && nuevoRol !== "owner" && (await accountStore.contarPropietarios(orgId)) <= 1) {
      throw new EditorError(MSG_ULTIMO_OWNER, 400);
    }
    await accountStore.cambiarRol(orgId, objetivo, nuevoRol);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorJson(e);
  }
}

// Quitar a un miembro del espacio. Tampoco puede quedar sin propietarios.
export async function DELETE(req: Request) {
  try {
    const { orgId, rol } = await getContexto();
    exigirOwner(rol);
    const objetivo = new URL(req.url).searchParams.get("userId") ?? "";
    const actual = await accountStore.getMembership(orgId, objetivo);
    if (!actual) return NextResponse.json({ ok: true }); // ya no está: idempotente
    if (actual.rol === "owner" && (await accountStore.contarPropietarios(orgId)) <= 1) {
      throw new EditorError(MSG_ULTIMO_OWNER, 400);
    }
    await accountStore.quitarMiembro(orgId, objetivo);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorJson(e);
  }
}
