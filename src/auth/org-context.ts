import { AsyncLocalStorage } from "node:async_hooks";

// Organización activa de la operación en curso. La identidad de las peticiones
// del panel viaja por cookie (getContexto), pero las claves BYOK viven por
// organización y las leen TAMBIÉN trabajos de fondo sin cookie (piloto,
// programados). En vez de enhebrar orgId por toda la API de IA, se fija aquí
// como contexto ambiental: cada entrada de trabajo (ruta o tick) envuelve su
// ejecución en `conOrg(orgId, …)`, y `claves.ts` lee de aquí.
//
// Ámbito por async-context: dos trabajos concurrentes de orgs distintas NO se
// pisan (cada `run` tiene su propio store). Si no hay contexto, `orgActual()`
// devuelve null y las claves caen al entorno (.env.local).
const als = new AsyncLocalStorage<{ orgId: string }>();

// Ejecuta `fn` con la organización fijada (scope estricto por callback).
export function conOrg<T>(orgId: string, fn: () => Promise<T>): Promise<T> {
  return als.run({ orgId }, fn);
}

// Fija la organización para el resto de la cadena async actual, sin envolver.
// Se llama al entrar en cada función de dominio que dispara IA: cada petición
// (o cada iteración del tick, secuencial) tiene su propia cadena async, así que
// no hay fuga entre orgs.
export function entrarOrg(orgId: string): void {
  als.enterWith({ orgId });
}

export function orgActual(): string | null {
  return als.getStore()?.orgId ?? null;
}
