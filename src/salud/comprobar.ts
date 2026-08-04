/**
 * ¿Está viva la plataforma DE VERDAD?
 *
 * Existe para que un vigilante externo (UptimeRobot y compañía) avise al móvil
 * cuando algo se cae, que es lo único que tenemos en lugar del equipo de guardia
 * que sí tienen Wix o Squarespace.
 *
 * LA CLAVE ES QUÉ SE COMPRUEBA. Vigilar la portada solo dice que Node contesta:
 * con la base de datos caída, la landing seguiría pintándose entera y el
 * vigilante seguiría en verde mientras nadie puede entrar ni publicar. Por eso
 * aquí se hace un viaje de verdad a Postgres.
 *
 * NO se dice nada de lo que hay dentro: ni versión, ni nombres, ni cuántos
 * usuarios. Es pública sin sesión —tiene que serlo, el vigilante no tiene
 * cuenta—, así que solo devuelve «sí» o «no». Un endpoint de salud hablador es
 * un mapa gratis para quien busca por dónde entrar.
 */

export type Salud = { ok: boolean };

/**
 * Cuánto vale una comprobación antes de repetirla.
 *
 * Sin esto, la ruta sería una forma cómoda de hacernos consultar la base de
 * datos tantas veces por segundo como aguante la red. Con la ventana puesta, mil
 * peticiones en un segundo siguen siendo UNA consulta. Un vigilante pregunta
 * cada minuto o cada cinco: no nota la caché, y quien quiera hacer daño tampoco
 * consigue nada.
 */
const VENTANA_MS = 5_000;

let ultima: { cuando: number; salud: Salud } | null = null;

export function olvidarSalud(): void {
  ultima = null;
}

export async function comprobarSalud(
  deps: { pingBaseDeDatos: () => Promise<void> },
  ahora: number = Date.now()
): Promise<Salud> {
  if (ultima && ahora - ultima.cuando < VENTANA_MS) return ultima.salud;

  let ok = true;
  try {
    await deps.pingBaseDeDatos();
  } catch (e) {
    // El motivo NO se devuelve, pero sí se registra: quien mira los registros
    // somos nosotros; quien recibe la respuesta puede ser cualquiera.
    console.error("[salud] la base de datos no responde:", e instanceof Error ? e.message : e);
    ok = false;
  }

  const salud: Salud = { ok };
  ultima = { cuando: ahora, salud };
  return salud;
}
