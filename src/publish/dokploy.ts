import type { DeployTarget } from "./deploy-target";
import { esDominioRaiz } from "./domain";

type DokployConfig = {
  url: string;             // p. ej. "https://dok.example" (sin barra final)
  apiKey: string;
  applicationId: string;   // id de la app Wordclicks dentro de Dokploy
  sitesBaseDomain: string; // base de los subdominios publicados, p. ej. "estrenala.com"
  appPort?: number;        // puerto interno de la app (default 3000)
  /** Hay un certificado comodín + regla comodín cubriendo los subdominios. */
  comodinSubdominios?: boolean;
  /** Techo por llamada. Se puede bajar en los tests para no esperar de verdad. */
  limiteMs?: number;
  fetchImpl?: typeof fetch;
};

type DokployDomain = { domainId: string; host: string };

/** Techo por llamada. Registrar un dominio es escribir un archivo y recargar
 *  Traefik: si en 15 segundos no ha contestado, no va a contestar. */
const LIMITE_MS = 15_000;

// Registra en el Traefik del VPS, vía la API REST de Dokploy, TODOS los hosts que
// tiene que atender la plataforma: el subdominio de cada web publicada y los
// dominios propios de los clientes. Traefik crea la ruta y emite el certificado
// de Let's Encrypt (reto HTTP-01).
//
// Por qué también los subdominios: sin una ruta que case con el Host, Traefik ni
// siquiera entrega la petición a la aplicación. No es solo el certificado, es el
// enrutado. La alternativa era un certificado comodín, que exige el reto DNS-01 y
// mover el DNS a un proveedor con API; se descartó el 2026-07-27 para no tocar el
// Traefik donde ya corre producción de Quantiva (el CRM y los agentes).
//
// Coste a tener presente: Let's Encrypt limita a 50 certificados NUEVOS por semana
// y dominio registrado, o sea 50 webs nuevas por semana. Las renovaciones no
// cuentan. El día que se quede corto, toca migrar al comodín.
//
// Ese día ya está preparado: con `DOKPLOY_COMODIN=1` se dejan de registrar los
// SUBDOMINIOS (los cubre la regla comodín) y el cupo deja de gastarse. Los
// dominios propios de los clientes se siguen registrando igual, a propósito: no
// los cubre ningún comodín nuestro, y además gastan el cupo de SU dominio
// registrado, no el nuestro. El runbook completo está en
// docs/COMODIN-CLOUDFLARE.md — encender la bandera es su último paso, y no antes
// de haber comprobado que un subdominio nuevo responde sin darlo de alta.
export class DokployDeploy implements DeployTarget {
  private f: typeof fetch;
  constructor(private cfg: DokployConfig) {
    this.f = cfg.fetchImpl ?? fetch;
  }

  /**
   * Toda llamada a Dokploy va con reloj.
   *
   * Sin él, una API que acepta la conexión y luego no contesta deja colgada la
   * petición del usuario hasta que la corta un proxy de por medio — y entonces
   * lo que le llega al navegador es la página de error del proxy, en HTML, sin
   * el JSON con el mensaje. O sea: «Algo ha fallado» y a adivinar. Pasó el
   * 2026-08-05 conectando quantivatechnology.com.
   *
   * Mejor rendirse en 15 segundos y DECIR por qué.
   */
  private async pedir(url: string, init: RequestInit, que: string): Promise<Response> {
    let res: Response;
    try {
      const limite = this.cfg.limiteMs ?? LIMITE_MS;
      res = await this.f(url, { ...init, signal: AbortSignal.timeout(limite) });
    } catch (e) {
      // Se distingue «no contesta» de «contesta que no»: el arreglo no es el mismo.
      const causa = e instanceof Error && e.name === "TimeoutError"
        ? `no contestó en ${(this.cfg.limiteMs ?? LIMITE_MS) / 1000}s`
        : e instanceof Error ? e.message : "error de red";
      throw new Error(`Dokploy ${que}: ${causa}`);
    }
    if (!res.ok) {
      // El cuerpo del error de Dokploy suele decir exactamente qué falta (clave
      // caducada, id de aplicación que no existe). Tirarlo era quedarse solo con
      // un número.
      const detalle = (await res.text().catch(() => "")).slice(0, 200);
      throw new Error(`Dokploy ${que} → ${res.status}${detalle ? ` · ${detalle}` : ""}`);
    }
    return res;
  }

  private async post(ruta: string, body: unknown): Promise<void> {
    await this.pedir(
      `${this.cfg.url}/api/${ruta}`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": this.cfg.apiKey },
        body: JSON.stringify(body),
      },
      ruta
    );
  }

  private async listar(): Promise<DokployDomain[]> {
    const res = await this.pedir(
      `${this.cfg.url}/api/domain.byApplicationId?applicationId=${encodeURIComponent(this.cfg.applicationId)}`,
      { headers: { "x-api-key": this.cfg.apiKey } },
      "domain.byApplicationId"
    );
    return (await res.json()) as DokployDomain[];
  }

  // Alta IDEMPOTENTE: publicar dos veces es de lo más normal (cada vez que el
  // usuario pulsa «Publicar»), y dar de alta un host repetido dejaría rutas
  // duplicadas en Traefik.
  private async alta(hosts: string[]): Promise<void> {
    const ya = new Set((await this.listar()).map((d) => d.host));
    for (const host of hosts.filter((h) => !ya.has(h))) {
      await this.post("domain.create", {
        applicationId: this.cfg.applicationId,
        host,
        port: this.cfg.appPort ?? 3000,
        https: true,
        certificateType: "letsencrypt",
        domainType: "application",
      });
    }
  }

  private async baja(hosts: string[]): Promise<void> {
    const objetivo = new Set(hosts);
    for (const d of (await this.listar()).filter((x) => objetivo.has(x.host))) {
      await this.post("domain.delete", { domainId: d.domainId });
    }
  }

  private hostDe(subdominio: string): string {
    return `${subdominio}.${this.cfg.sitesBaseDomain}`;
  }

  /**
   * Con el comodín montado (ver docs/COMODIN-CLOUDFLARE.md), un subdominio nuevo
   * ya tiene ruta y certificado: los pone la regla comodín. Seguir dándolo de
   * alta pediría un certificado por web y el cupo de 50/semana se gastaría
   * igual — o sea que el comodín no ahorraría NADA hasta que se deja de pedir.
   *
   * Va por bandera y sin borrar el código: si el comodín falla, se apaga
   * `DOKPLOY_COMODIN` y se vuelve al comportamiento de siempre sin desplegar.
   */
  async publish(input: { projectId: string; subdominio: string }) {
    if (!this.cfg.comodinSubdominios) await this.alta([this.hostDe(input.subdominio)]);
    return { ok: true } as const;
  }

  /**
   * La baja se hace SIEMPRE, aunque el comodín esté activo. Las webs publicadas
   * antes de encenderlo sí tienen su ruta dada de alta, y dejarlas ahí mantendría
   * vivo un certificado que se renueva solo para un sitio que ya no existe.
   * `baja` solo borra lo que encuentra, así que sobra con llamarla.
   */
  async unpublish(input: { projectId: string; subdominio: string }): Promise<void> {
    await this.baja([this.hostDe(input.subdominio)]);
  }

  /**
   * El `www.` solo se da de alta cuando el cliente conecta su dominio PELADO,
   * que es donde la gente lo teclea. Con un subdominio (`web.suempresa.com`) no
   * lo teclea nadie y ese registro no existe en su DNS: Traefik se queda pidiendo
   * un certificado imposible, Let's Encrypt responde NXDOMAIN, y vuelta a empezar
   * cada pocos minutos para siempre.
   *
   * Se vio el 2026-08-01 en los registros de Traefik, con
   * `www.prueba.quantivatechnology.com` de una prueba. El daño no es el
   * certificado que falta —nadie lo pide— sino el registro lleno de rojos: el día
   * que se rompa algo de verdad, ya nadie mira ahí.
   */
  async connectDomain({ dominio }: { dominio: string }): Promise<void> {
    await this.alta(esDominioRaiz(dominio) ? [dominio, `www.${dominio}`] : [dominio]);
  }

  /**
   * La baja pide SIEMPRE los dos, sin mirar si es raíz. Los dominios conectados
   * antes de este arreglo tienen su `www.` dado de alta aunque fueran
   * subdominios; si la baja aplicase la regla nueva, esos se quedarían huérfanos
   * en Traefik renovando un certificado de un sitio que ya no existe. `baja` solo
   * borra lo que encuentra, así que pedir de más no cuesta nada.
   */
  async disconnectDomain({ dominio }: { dominio: string }): Promise<void> {
    await this.baja([dominio, `www.${dominio}`]);
  }
}
