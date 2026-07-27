import { accountStore } from "@/src/repositories/accounts";
import { exigirCapacidad, type Capacidad } from "./planes";

// Guarda de plan para las rutas de API: consulta el plan del espacio y lanza 402
// si no llega. Vive aparte de planes.ts para que ese siga siendo puro (sin base
// de datos) y se pueda probar con tablas de valores.
export async function exigirPlanCon(orgId: string, capacidad: Capacidad): Promise<void> {
  exigirCapacidad(await accountStore.getPlan(orgId), capacidad);
}

// El blog completo (temas, borradores, artículos, plantillas, piloto y
// programaciones) es de los planes de pago. Se comprueba en TODAS sus rutas: la
// interfaz esconde el panel, pero la puerta de verdad está aquí.
export function exigirBlog(orgId: string): Promise<void> {
  return exigirPlanCon(orgId, "blog");
}
