import { NextResponse } from "next/server";
import { jsonError } from "@/src/auth/http";
import { getContexto } from "@/src/auth/contexto";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { uploadAsset } from "@/src/editor/assets";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Se esperaba multipart/form-data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("Falta el archivo", 400);
  }
  if (file.size > MAX_BYTES) {
    return jsonError("Imagen demasiado grande (máx. 10 MB)", 400);
  }
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const r = await uploadAsset(
      { store: projectStore, storage: getStorage() },
      { orgId, projectId: id, filename: file.name, bytes }
    );
    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    if (e instanceof EditorError) return jsonError(e.message, e.status);
    const msg = e instanceof Error ? e.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
