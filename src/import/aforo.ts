import { EditorError } from "@/src/editor/errors";

/**
 * Cuántas subidas se atienden A LA VEZ.
 *
 * El límite de 50 MB dice cuánto puede pesar UNA subida. No decía nada de
 * cuántas caben a la vez, y ahí estaba el agujero de verdad: cada petición se
 * trae su archivo entero a memoria, así que el gasto no lo marca el tamaño
 * máximo sino el tamaño máximo MULTIPLICADO por cuánta gente sube al mismo
 * tiempo. Sin nadie contando, ese número no tiene techo.
 *
 * Medido el 2026-09-03 con las primitivas exactas de la ruta (`Request.formData`
 * y `File.arrayBuffer`, las de Node): una subida de 40 MB cuesta 130 MB de RSS
 * —3,25 veces el archivo, porque el cuerpo se parsea entero y luego se copia—, y
 * eso ANTES de descomprimir. O sea que en un VPS de 4 GB el servidor se queda sin
 * memoria alrededor de las veinte subidas simultáneas. Veinte personas a la vez
 * no es un ataque: es una tarde buena.
 *
 * La cuenta del seis: el cuerpo se corta en 60 MB, que por 3,25 son unos 195 MB,
 * más los 50 MB que puede ocupar descomprimido son ~245 MB en el peor caso. Seis
 * de esas son 1,5 GB, que caben de sobra en 4 GB dejando sitio para todo lo
 * demás. Es deliberadamente conservador: el coste de rechazar de más es que
 * alguien reintente en un minuto; el de rechazar de menos es que se caiga la web
 * de todo el mundo, incluidas las de los clientes.
 *
 * AVISO, y es el mismo que el del rate limit: esto vive en la memoria del
 * proceso. Se pone a cero al reiniciar y no se comparte si algún día hay más de
 * una réplica. No es un arreglo definitivo —ese es no traerse el archivo entero a
 * memoria—, es el que cabía sin reescribir la subida entera.
 */
export const SUBIDAS_A_LA_VEZ = 6;

/** Byte-exacto: lo fijan los tests, y se traduce en la frontera HTTP. */
export const MSG_AFORO = "Estamos recibiendo muchas subidas a la vez. Prueba dentro de un minuto.";

/** Segundos que se le piden al cliente que espere (cabecera `Retry-After`). */
export const ESPERA_SEGUNDOS = 30;

let dentro = 0;

/**
 * Pide sitio para una subida. Devuelve la función que hay que llamar al
 * terminar, pase lo que pase — va en un `finally`.
 *
 * Devolver la salida en vez de un booleano es a propósito: con un `salir()`
 * suelto es cuestión de tiempo que alguien devuelva antes de tiempo en una rama
 * de error y el contador se quede alto para siempre, con la puerta cerrada hasta
 * el siguiente reinicio. Así solo puede soltar quien entró.
 */
export function ocuparSitio(): () => void {
  if (dentro >= SUBIDAS_A_LA_VEZ) throw new EditorError(MSG_AFORO, 503);
  dentro++;
  let soltado = false;
  return () => {
    // Idempotente: soltar dos veces dejaría hueco donde no lo hay.
    if (soltado) return;
    soltado = true;
    dentro--;
  };
}

/** Solo para los tests y para diagnosticar. */
export function subidasEnCurso(): number {
  return dentro;
}

/** Solo para los tests: deja el contador a cero entre casos. */
export function _vaciarAforo(): void {
  dentro = 0;
}
