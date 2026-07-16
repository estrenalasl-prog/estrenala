import { NextResponse } from "next/server";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { blogStore } from "@/src/repositories/blog";
import { pilotoTick } from "@/src/blog/piloto";

export const runtime = "nodejs";

// Ejecuta el piloto automático de TODOS los proyectos que lo tengan activo:
// sin candado de org (solo hace lo que sus dueños dejaron configurado). Para
// cron externo; con CRON_SECRET en el entorno exige Authorization: Bearer.
export async function POST(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const r = await pilotoTick({ store: projectStore, blog: blogStore, storage: getStorage() });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}
