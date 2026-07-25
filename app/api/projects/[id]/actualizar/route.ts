import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { actualizarProyecto } from "@/src/projects/actualizar";
import { ImportError } from "@/src/import/unzip";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

// Actualiza la web con un ZIP nuevo (crea un snapshot y lo deja como actual). Es
// trabajo de edición → lo pueden hacer editor y propietario (getContexto basta).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo ZIP" }, { status: 400 });
    const zip = Buffer.from(await file.arrayBuffer());
    const { snapshotId } = await actualizarProyecto(
      { store: projectStore, storage: getStorage() },
      { orgId, projectId: id, zip }
    );
    return NextResponse.json({ snapshotId }, { status: 201 });
  } catch (e) {
    if (e instanceof ImportError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
