// A quién avisar, cuándo, y con qué palabras, de un certificado que se acaba.
//
// Módulo puro: no habla con la red ni con la base. Lo que hace es decidir, y por
// eso se puede comprobar entero sin montar nada.

/** Lo que se sabe de un dominio conectado y de su certificado. */
export type Vigilado = {
  dominio: string;
  proyecto: string;
  /** El dueño del espacio: es su web. */
  email: string;
  /** Cuándo caduca. `null` = no se ha podido leer (ver abajo). */
  caduca: Date | null;
};

/**
 * Cuándo se avisa, en días que quedan.
 *
 * NO se empieza a los 30 a propósito: Traefik renueva justamente a los 30 días
 * restantes, así que un aviso ahí sería ruido — el certificado está a punto de
 * renovarse solo y todo va bien. Si a los 15 sigue sin renovarse, es que ya han
 * fallado varios intentos, y eso sí es una señal de que algo va mal.
 *
 * Después se aprieta: 7, 3 y 1. Y una vez caducado, todos los días, porque a
 * partir de ahí la web está rota para cualquiera que entre.
 */
export const UMBRALES = [15, 7, 3, 1];

/** Días enteros que quedan. Negativo si ya caducó. */
export function diasHasta(caduca: Date, ahora: Date): number {
  return Math.floor((caduca.getTime() - ahora.getTime()) / 86_400_000);
}

/**
 * Se avisa en los umbrales exactos, no en «15 o menos».
 *
 * Comprobando a diario, cada umbral salta UNA vez, así que el dueño recibe
 * cuatro correos en dos semanas y no quince. Un aviso que llega todos los días
 * se convierte en un aviso que nadie lee.
 */
export function tocaAvisar(dias: number): boolean {
  return dias <= 0 || UMBRALES.includes(dias);
}

const fecha = (d: Date) =>
  d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/**
 * El correo, escrito para quien NO sabe qué es un certificado.
 *
 * Dice tres cosas y en este orden: qué pasa, qué significa para su web, y qué
 * tiene que hacer él — que es nada, porque esto lo arregla la plataforma. Un
 * aviso que asusta y no dice quién se encarga es peor que no avisar.
 */
export function correoAviso(
  v: Vigilado & { caduca: Date },
  dias: number
): { asunto: string; html: string; texto: string } {
  const caducado = dias <= 0;
  const cuando = caducado
    ? `caducó el ${fecha(v.caduca)}`
    : dias === 1
      ? "caduca mañana"
      : `caduca en ${dias} días (el ${fecha(v.caduca)})`;

  const asunto = caducado
    ? `Tu web ${v.dominio} no se ve: su certificado ha caducado`
    : `El certificado de ${v.dominio} ${cuando}`;

  const queEs = caducado
    ? `Ahora mismo, quien entre en <strong>${v.dominio}</strong> ve un aviso de seguridad del navegador en vez de tu web.`
    : `Es el candado que hace que tu web salga como segura. Si llega a caducar, quien entre verá un aviso de seguridad en vez de tu web.`;

  const html =
    `<p>Hola,</p>` +
    `<p>El certificado de seguridad de <strong>${v.dominio}</strong> ${cuando}.</p>` +
    `<p>${queEs}</p>` +
    `<p><strong>No tienes que hacer nada.</strong> Los certificados se renuevan solos y de eso nos encargamos ` +
    `nosotros. Te escribimos porque es tu web y creemos que tienes que saberlo, y porque si algo se nos ` +
    `atasca prefiere enterarte por nosotros que por un cliente tuyo.</p>` +
    `<p>Si en unos días sigues recibiendo este aviso, contéstanos a este correo.</p>` +
    `<p>— Estrénala</p>`;

  const texto =
    `El certificado de seguridad de ${v.dominio} ${cuando}.\n\n` +
    `${queEs.replace(/<[^>]+>/g, "")}\n\n` +
    `No tienes que hacer nada: se renuevan solos y de eso nos encargamos nosotros. ` +
    `Te escribimos porque es tu web y creemos que tienes que saberlo.\n\n` +
    `Si en unos días sigues recibiendo este aviso, contéstanos a este correo.\n\n— Estrénala`;

  return { asunto, html, texto };
}
