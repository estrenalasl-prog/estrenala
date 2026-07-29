// Cuántas veces al día puede un espacio estrenar dirección.
//
// Cada dirección nueva (subdominio o dominio propio) se da de alta en Traefik
// pidiendo su certificado a Let's Encrypt, y ese cupo semanal va POR DOMINIO
// REGISTRADO: es decir, es el mismo para todos los clientes de Estrénala. Sin
// freno, una sola cuenta renombrando su web en bucle deja a todo el mundo sin
// poder emitir certificados durante días.
//
// AVISO: esto acota el daño, no lo elimina. El arreglo de fondo sería un
// certificado comodín (*.estrenala.com por DNS-01) en vez de uno por web.

export const LIMITE_DIARIO = 10;

export const MSG_CUPO_DIRECCIONES =
  "Has cambiado de dirección demasiadas veces hoy. Vuelve a intentarlo mañana.";

/** Día en AAAA-MM-DD y en UTC, que es como se guarda el contador. */
export function diaDe(ahora: Date = new Date()): string {
  return ahora.toISOString().slice(0, 10);
}
