// Rate limit en memoria por clave (p. ej. IP+email). Freno básico
// anti-fuerza-bruta para login/registro. Aviso: se reinicia con el proceso y no
// se comparte entre instancias; suficiente como primera barrera, no como
// defensa distribuida. Devuelve true si el intento se permite.
type Registro = { conteo: number; desde: number };
const mapa = new Map<string, Registro>();

const LIMITE = 10;
const VENTANA_MS = 15 * 60 * 1000;

export function permitirIntento(clave: string, ahora: number = Date.now()): boolean {
  const r = mapa.get(clave);
  if (!r || ahora - r.desde > VENTANA_MS) {
    mapa.set(clave, { conteo: 1, desde: ahora });
    return true;
  }
  if (r.conteo >= LIMITE) return false;
  r.conteo++;
  return true;
}

// Solo para tests: vacía el contador.
export function _resetRateLimit(): void {
  mapa.clear();
}

// IP del cliente para la clave del rate limit (detrás de Traefik/Dokploy viene
// en x-forwarded-for). No es identidad de seguridad, solo un cubo de conteo.
export function ipDe(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff ? xff.split(",")[0] : "").trim() || "local";
}
