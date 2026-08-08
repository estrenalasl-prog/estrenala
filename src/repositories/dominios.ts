import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/src/db/client";
import { memberships, projects, users } from "@/src/db/schema";

/**
 * Los dominios propios que están sirviendo ahora mismo, con el correo de su dueño.
 *
 * Va aparte de `ProjectStore` a propósito: esto cruza proyectos con equipo y
 * cuentas, que no es asunto del repositorio de proyectos, y meterlo en su
 * interfaz obligaría a inventarlo en todos los dobles de test que ya existen.
 *
 * Solo los PUBLICADOS: un dominio conectado a una web despublicada no sirve
 * nada, así que su certificado no le importa a nadie.
 *
 * Y solo los dominios PROPIOS: los subdominios de la plataforma van bajo el
 * certificado comodín, que se renueva de una vez para todos.
 */
export async function dominiosPublicados(): Promise<
  { dominio: string; proyecto: string; email: string }[]
> {
  const filas = await db
    .select({ dominio: projects.dominio, proyecto: projects.nombre, email: users.email })
    .from(projects)
    .innerJoin(memberships, and(eq(memberships.orgId, projects.orgId), eq(memberships.rol, "owner")))
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(isNotNull(projects.dominio), isNotNull(projects.publishedSnapshotId)));

  // Un espacio con dos propietarios devolvería el proyecto repetido y su dueño
  // recibiría el aviso dos veces. Se queda el primero de cada dominio.
  const vistos = new Set<string>();
  return filas
    .filter((f): f is { dominio: string; proyecto: string; email: string } => f.dominio !== null)
    .filter((f) => (vistos.has(f.dominio) ? false : (vistos.add(f.dominio), true)));
}
