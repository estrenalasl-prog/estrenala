/**
 * `datos` viaja tal cual al JSON de la respuesta, junto al mensaje.
 *
 * Existe para que la ruta no tenga que adivinar QUÉ ha fallado comparando el
 * texto del error. Eso es lo que hacía con el dominio sin verificar, y es una
 * costura que se rompe en silencio: basta con retocar una coma del mensaje para
 * que la pantalla deje de enseñar la ayuda, sin que falle nada ni salte ningún
 * test. Lo que se mira ahora es una clave, no una frase.
 */
export class PublishError extends Error {
  constructor(message: string, public status: number, public datos?: Record<string, unknown>) {
    super(message);
    this.name = "PublishError";
  }
}
