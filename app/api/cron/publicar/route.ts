import { NextResponse } from "next/server";
import { getStorage } from "@/src/storage/factory";
import { getDeploy } from "@/src/publish/deploy-factory";
import { projectStore } from "@/src/repositories/projects";
import { blogStore } from "@/src/repositories/blog";
import { publicarVencidos } from "@/src/blog/programados";

export const runtime = "nodejs";

// Publica las programaciones vencidas de TODAS las organizaciones: sin candado
// de org (solo dispara publicaciones ya aprobadas por sus dueños). Para cron
// externo; con CRON_SECRET en el entorno exige Authorization: Bearer <secret>.
export async function POST(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const r = await publicarVencidos({
      store: projectStore, blog: blogStore, storage: getStorage(), deploy: getDeploy(),
    });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}
