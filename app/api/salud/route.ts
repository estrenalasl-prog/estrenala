import { sql } from "drizzle-orm";
import { db } from "@/src/db/client";
import { comprobarSalud } from "@/src/salud/comprobar";

export const runtime = "nodejs";
// Nunca precalculada: una salud congelada al construir la imagen diría «ok»
// eternamente, que es peor que no tener vigilancia — creerías estar cubierto.
export const dynamic = "force-dynamic";

/**
 * Para el vigilante externo. Pública sin sesión: el vigilante no tiene cuenta.
 *
 * 200 = todo bien · 503 = la base de datos no responde. Se responde con el
 * código HTTP y no solo con el cuerpo porque los vigilantes miran el código:
 * un 200 diciendo `{"ok":false}` no dispara ningún aviso.
 */
export async function GET() {
  const salud = await comprobarSalud({
    pingBaseDeDatos: async () => {
      await db.execute(sql`select 1`);
    },
  });
  return Response.json(salud, {
    status: salud.ok ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}
