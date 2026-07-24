import { NextResponse } from "next/server";
import { importProject } from "@/src/import/import-project";
import { ImportError } from "@/src/import/unzip";
import { getContexto } from "@/src/auth/contexto";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const nombre = (form.get("nombre") as string | null) ?? undefined;
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Falta el archivo ZIP" }, { status: 400 });
    }
    const zip = Buffer.from(await file.arrayBuffer());
    const { orgId } = await getContexto();
    const { projectId } = await importProject(
      { store: projectStore, storage: getStorage(), orgId },
      { zip, nombre }
    );
    return NextResponse.json({ projectId }, { status: 201 });
  } catch (e) {
    if (e instanceof ImportError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
