import { NextResponse } from "next/server";
import { importProject, importarArchivos } from "@/src/import/import-project";
import { ImportError } from "@/src/import/unzip";
import { getContexto } from "@/src/auth/contexto";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";

export const runtime = "nodejs";

// Acepta tres formas de subir una web:
//  - un .zip (lo habitual cuando la IA lo entrega comprimido),
//  - un .html suelto,
//  - una carpeta entera (el cliente manda cada archivo con su ruta relativa en
//    el campo "rutas", en el mismo orden que los "file").
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const entradas = form.getAll("file").filter((x): x is File => x instanceof File);
    const nombre = (form.get("nombre") as string | null) ?? undefined;
    if (entradas.length === 0) {
      return NextResponse.json({ error: "Falta el archivo ZIP" }, { status: 400 });
    }

    // Rutas relativas paralelas (carpeta). Si no vienen, se usa el nombre del archivo.
    let rutas: string[] = [];
    const rutasRaw = form.get("rutas");
    if (typeof rutasRaw === "string") {
      try {
        const parsed: unknown = JSON.parse(rutasRaw);
        if (Array.isArray(parsed)) rutas = parsed.map((x) => String(x));
      } catch { /* sin rutas: se cae al nombre del archivo */ }
    }
    const rutaDe = (f: File, i: number) => (rutas[i] || f.name || `archivo-${i}`);

    const { orgId } = await getContexto();
    const deps = { store: projectStore, storage: getStorage(), orgId };

    const esZipUnico = entradas.length === 1 && /\.zip$/i.test(rutaDe(entradas[0], 0));
    const { projectId } = esZipUnico
      ? await importProject(deps, { zip: Buffer.from(await entradas[0].arrayBuffer()), nombre })
      : await importarArchivos(deps, {
          archivos: await Promise.all(
            entradas.map(async (f, i) => ({ path: rutaDe(f, i), bytes: Buffer.from(await f.arrayBuffer()) }))
          ),
          nombre,
        });

    return NextResponse.json({ projectId }, { status: 201 });
  } catch (e) {
    if (e instanceof ImportError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
