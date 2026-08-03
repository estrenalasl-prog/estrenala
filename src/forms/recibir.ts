import { CAMPO_TRAMPA, CAMPO_PAGINA, CAMPO_INDICE } from "./conectar";

/**
 * Lo que llega cuando alguien rellena el formulario de la web de un cliente.
 *
 * Aquí entra texto de CUALQUIERA de internet, sin cuenta y sin sesión. Todo lo
 * que salga de esta función se guarda en la base y se le manda por correo al
 * dueño, así que este es el sitio donde se acota: cuántos campos, cómo de largos,
 * y qué se tira sin contemplaciones.
 */

/** Tope de campos. Un contacto normal tiene 3 o 4; 40 ya es alguien probando. */
export const MAX_CAMPOS = 40;

/** Tope por campo. Un «mensaje» largo cabe de sobra; una novela pegada, no. */
export const MAX_LARGO_VALOR = 5000;

/** Tope del nombre de un campo. */
export const MAX_LARGO_NOMBRE = 100;

/** Tope del cuerpo entero, antes de mirar nada. */
export const MAX_BYTES = 100 * 1024;

export type EnvioValido = {
  pagina: string;
  formIndice: number;
  datos: Record<string, string>;
};

export type Resultado =
  | { ok: true; envio: EnvioValido }
  /**
   * `descartar` = no es un envío bueno pero se le contesta como si lo fuera.
   * A un robot no se le dice nunca por qué ha fallado: sabiéndolo, prueba otra
   * cosa. Y a una persona que se cruce con esto no se la deja preocupada.
   */
  | { ok: false; motivo: string; descartar: true };

/** Los nuestros: no son datos del visitante, son cableado. No se guardan. */
const CAMPOS_NUESTROS = new Set([CAMPO_TRAMPA, CAMPO_PAGINA, CAMPO_INDICE]);

/**
 * La ruta en la que se envió, tal como la mandó el formulario.
 *
 * Se exige que empiece por `/` y no tenga `..`: llega del HTML servido, pero un
 * robot puede mandar lo que quiera y esto acaba enseñándose en el panel del
 * dueño y dentro de un correo.
 */
function paginaValida(v: string): boolean {
  return v.startsWith("/") && !v.includes("..") && v.length <= 512;
}

export function leerEnvio(form: FormData): Resultado {
  // La trampa: un humano no la ve, un robot la rellena porque rellena todo.
  const trampa = form.get(CAMPO_TRAMPA);
  if (typeof trampa === "string" && trampa.trim() !== "") {
    return { ok: false, motivo: "trampa", descartar: true };
  }

  const pagina = String(form.get(CAMPO_PAGINA) ?? "");
  if (!paginaValida(pagina)) return { ok: false, motivo: "página no válida", descartar: true };

  // Solo dígitos, y no `parseInt`: `parseInt("1e5", 10)` devuelve 1 sin
  // quejarse, así que una basura se convertiría en silencio en un índice válido
  // y el mensaje quedaría archivado bajo el formulario equivocado.
  const indiceCrudo = String(form.get(CAMPO_INDICE) ?? "");
  if (!/^\d{1,3}$/.test(indiceCrudo)) {
    return { ok: false, motivo: "formulario no válido", descartar: true };
  }
  const formIndice = Number(indiceCrudo);

  const datos: Record<string, string> = {};
  let cuantos = 0;
  for (const [nombre, valor] of form.entries()) {
    if (CAMPOS_NUESTROS.has(nombre)) continue;
    // Un archivo no se guarda: la recogida es de texto. Se ignora en silencio
    // para no tirar el resto del mensaje, que sí sirve.
    if (typeof valor !== "string") continue;
    if (nombre.length > MAX_LARGO_NOMBRE) continue;
    if (++cuantos > MAX_CAMPOS) return { ok: false, motivo: "demasiados campos", descartar: true };
    // Un campo repetido (casillas, selección múltiple) se junta en uno.
    const yaEsta = Object.prototype.hasOwnProperty.call(datos, nombre);
    const texto = yaEsta ? `${datos[nombre]}, ${valor}` : valor;
    datos[nombre] = texto.slice(0, MAX_LARGO_VALOR);
  }

  // Todo en blanco: o es un robot o es alguien que le dio a enviar sin querer.
  // En los dos casos, mandarle un correo al dueño no le sirve de nada.
  if (Object.values(datos).every((v) => v.trim() === "")) {
    return { ok: false, motivo: "vacío", descartar: true };
  }

  return { ok: true, envio: { pagina, formIndice, datos } };
}

/**
 * Freno por web, en memoria.
 *
 * En memoria y no en la base a propósito: es un freno, no una auditoría, y una
 * consulta por cada envío para contarlos sería pagar más por defenderse que por
 * atender. Si el contenedor se reinicia se olvida, y no pasa nada.
 *
 * Es POR PROYECTO y no por IP: lo que hay que proteger es la bandeja del dueño y
 * su cuota de correo. Cien mensajes en una hora desde cien IPs distintas le
 * revientan igual la bandeja, y contando por IP no se enteraría nadie.
 */
const VENTANA_MS = 60 * 60 * 1000;
export const MAX_POR_HORA = 60;

const contador = new Map<string, { desde: number; cuantos: number }>();

export function cabeElEnvio(projectId: string, ahora = Date.now()): boolean {
  const v = contador.get(projectId);
  if (!v || ahora - v.desde > VENTANA_MS) {
    contador.set(projectId, { desde: ahora, cuantos: 1 });
    return true;
  }
  if (v.cuantos >= MAX_POR_HORA) return false;
  v.cuantos++;
  return true;
}

/** Solo para los tests: deja el contador como recién arrancado. */
export function olvidarFrenos(): void {
  contador.clear();
}
