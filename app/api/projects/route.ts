import { NextResponse } from "next/server";
import { jsonError } from "@/src/auth/http";
import { importProject, importarArchivos } from "@/src/import/import-project";
import { ImportError } from "@/src/import/unzip";
import { getContexto } from "@/src/auth/contexto";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { accountStore } from "@/src/repositories/accounts";
import { exigirHuecoDeWeb } from "@/src/planes/planes";
import { EditorError } from "@/src/editor/errors";
import { permitirIntento, ipDe } from "@/src/auth/rate-limit";
import { ocuparSitio, ESPERA_SEGUNDOS } from "@/src/import/aforo";

export const runtime = "nodejs";

// Acepta tres formas de subir una web:
//  - un .zip (lo habitual cuando la IA lo entrega comprimido),
//  - un .html suelto,
//  - una carpeta entera (el cliente manda cada archivo con su ruta relativa en
//    el campo "rutas", en el mismo orden que los "file").
/**
 * Tope del CUERPO de la petición, mirado antes de leerlo.
 *
 * El límite del contenido son 50 MB (ver src/import/unzip.ts). Aquí se deja
 * margen para el envoltorio del formulario multiparte, que son unos cientos de
 * bytes por archivo: lo que pase de aquí lleva de sobra más de 50 MB dentro, así
 * que el mensaje que ve el usuario es el mismo y sigue siendo verdad.
 *
 * Importa que sea ANTES: `req.formData()` se trae el cuerpo entero a memoria, y
 * sin esta línea cualquiera podía hacer que el servidor cargara lo que quisiera
 * solo para acabar diciéndole que no.
 */
const MAX_CUERPO = 60 * 1024 * 1024;

export async function POST(req: Request) {
  const largo = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(largo) && largo > MAX_CUERPO) {
    return jsonError("Lo que has subido supera 50 MB", 413);
  }

  // Freno por IP. No había ninguno: con una cuenta se podían encadenar subidas
  // de 50 MB sin límite. El candado real de cuántas webs caben es el del plan;
  // esto solo evita que alguien use la puerta como ariete.
  if (!permitirIntento(`subir|${ipDe(req)}`)) {
    return jsonError("Demasiados intentos, espera un momento", 429);
  }

  // Aforo: cuántas subidas se atienden a la vez (ver src/import/aforo.ts). Va
  // ANTES del formData, que es justo lo que se trae el archivo a memoria.
  let soltar: () => void;
  try {
    soltar = ocuparSitio();
  } catch (e) {
    if (e instanceof EditorError) {
      // `Retry-After` va en la CABECERA, no en el cuerpo: el tercer argumento de
      // jsonError se mezcla con el JSON, y ahí no le sirve a nadie.
      const res = await jsonError(e.message, e.status);
      res.headers.set("retry-after", String(ESPERA_SEGUNDOS));
      return res;
    }
    throw e;
  }

  try {
    const form = await req.formData();
    const entradas = form.getAll("file").filter((x): x is File => x instanceof File);
    const nombre = (form.get("nombre") as string | null) ?? undefined;
    if (entradas.length === 0) {
      return jsonError("Falta el archivo ZIP", 400);
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
    // Límite de webs del plan (se cuenta antes de escribir nada).
    exigirHuecoDeWeb(
      await accountStore.getPlan(orgId),
      (await projectStore.listProjects(orgId)).length
    );
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
    if (e instanceof ImportError) return jsonError(e.message, 400);
    if (e instanceof EditorError) return jsonError(e.message, e.status);
    // Lo que llegue aquí NO es un fallo previsto: es la base de datos, el
    // almacenamiento o un bug. Su mensaje va al log del servidor, no al
    // navegador — traía dentro nombres de tabla y de bucket.
    console.error("subir: fallo inesperado", e instanceof Error ? e.message : e);
    return jsonError("No se pudo subir la web", 500);
  } finally {
    soltar();
  }
}
