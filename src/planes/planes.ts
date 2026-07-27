import { EditorError } from "@/src/editor/errors";

// Planes de Estrénala. La palanca de conversión es el DOMINIO PROPIO (como en
// WordPress.com/Wix/Squarespace): publicar y editar a mano es gratis para siempre.
// Ojo: las funciones de IA van con la clave del propio usuario, así que NO son
// una palanca de precio (no nos cuestan) — el blog es de pago por el valor que
// aporta, no por su coste.
export type Plan = "free" | "personal" | "agencia";

export type Limites = {
  id: Plan;
  nombre: string;
  precioMes: number; // euros/mes pagando mes a mes
  precioAnual: number; // euros/año (2 meses gratis)
  webs: number;
  dominioPropio: boolean;
  sinMarca: boolean;
  blog: boolean;
  equipo: boolean;
};

export const PLANES: Record<Plan, Limites> = {
  free: {
    id: "free", nombre: "Gratis", precioMes: 0, precioAnual: 0,
    webs: 1, dominioPropio: false, sinMarca: false, blog: false, equipo: false,
  },
  personal: {
    id: "personal", nombre: "Personal", precioMes: 9, precioAnual: 90,
    webs: 3, dominioPropio: true, sinMarca: true, blog: true, equipo: false,
  },
  agencia: {
    id: "agencia", nombre: "Agencia", precioMes: 29, precioAnual: 290,
    webs: 25, dominioPropio: true, sinMarca: true, blog: true, equipo: true,
  },
};

export const ORDEN: Plan[] = ["free", "personal", "agencia"];

// Planes que incluyen blog. Derivado de PLANES para que no se quede desfasado:
// lo usa el cron del piloto para no generar artículos a quien ya no paga.
export const PLANES_CON_BLOG: Plan[] = ORDEN.filter((p) => PLANES[p].blog);

// Cualquier valor desconocido (o vacío) cae a "free": ante la duda, el plan que
// menos concede.
export function planDe(valor: unknown): Plan {
  return valor === "personal" || valor === "agencia" ? valor : "free";
}

export function limitesDe(valor: unknown): Limites {
  return PLANES[planDe(valor)];
}

export type Capacidad = "dominioPropio" | "sinMarca" | "blog" | "equipo";

export function puede(valor: unknown, capacidad: Capacidad): boolean {
  return limitesDe(valor)[capacidad];
}

export function alcanzoLimiteWebs(valor: unknown, websActuales: number): boolean {
  return websActuales >= limitesDe(valor).webs;
}

// Mensajes byte-exactos (los fijan los tests). Tono: qué se puede hacer, no un
// muro; siempre dicen a dónde ir.
export function msgLimiteWebs(valor: unknown): string {
  const l = limitesDe(valor);
  return l.webs === 1
    ? "Tu plan incluye 1 web. Mejora de plan para publicar más."
    : `Tu plan incluye ${l.webs} webs. Mejora de plan para publicar más.`;
}
export const MSG_DOMINIO_PLAN = "Conectar tu propio dominio está disponible en los planes de pago";
export const MSG_BLOG_PLAN = "El blog automático está disponible en los planes de pago";
export const MSG_EQUIPO_PLAN = "Invitar a tu equipo está disponible en el plan Agencia";

const MSG: Record<Capacidad, string> = {
  dominioPropio: MSG_DOMINIO_PLAN,
  sinMarca: MSG_DOMINIO_PLAN, // no se exige por ruta; la marca se aplica al publicar
  blog: MSG_BLOG_PLAN,
  equipo: MSG_EQUIPO_PLAN,
};

// Lanza 402 (Payment Required) si el plan no incluye la capacidad. El 402 permite
// que la interfaz distinga «te falta plan» de «no tienes permiso» (403).
export function exigirCapacidad(valor: unknown, capacidad: Capacidad): void {
  if (!puede(valor, capacidad)) throw new EditorError(MSG[capacidad], 402);
}

export function exigirHuecoDeWeb(valor: unknown, websActuales: number): void {
  if (alcanzoLimiteWebs(valor, websActuales)) throw new EditorError(msgLimiteWebs(valor), 402);
}
