import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import {
  RUTAS_PUBLICAS, ARCHIVOS_PUBLICOS, RUTAS_PRIVADAS, RUTA_NO_ENCONTRADA, bajoAlgunPrefijo,
} from "@/src/config/rutas-plataforma";
import { PREFIJOS_PUBLICOS } from "@/src/i18n/idiomas";

/**
 * Hasta el 2026-08-09 el middleware no necesitaba saber qué páginas existen:
 * todo lo que no fuera público acababa en el 307 a /login. Eso incluía las
 * direcciones que NO existen —una letra de más, un enlace mal copiado—, y
 * mandar a alguien al login por eso se lee como «esta web es privada».
 *
 * Ahora se distingue una puerta cerrada de una dirección que no lleva a ninguna
 * parte, y para eso hay una lista de rutas privadas. Una lista de rutas se queda
 * vieja sola: esto la compara contra las páginas que hay de verdad en `app/`.
 */
const APP = resolve(process.cwd(), "app");

/** Las rutas que `app/` publica de verdad, con los comodines ya sustituidos. */
function rutasDeApp(dir = APP): string[] {
  const rutas: string[] = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    if (entrada.isDirectory()) {
      // `_loquesea` es carpeta privada de Next: no crea ruta.
      if (entrada.name.startsWith("_")) continue;
      rutas.push(...rutasDeApp(resolve(dir, entrada.name)));
    } else if (entrada.name === "page.tsx" || entrada.name === "route.ts") {
      const rel = relative(APP, dir).split(/[\\/]/).filter(Boolean);
      const segmentos = rel
        .filter((s) => !s.startsWith("(")) // grupos de rutas: no salen en la URL
        // Un comodín se sustituye por algo concreto: lo que se comprueba es cómo
        // responde el middleware a una dirección real, no al patrón.
        .map((s) => (s.startsWith("[") ? "x" : s));
      rutas.push("/" + segmentos.join("/"));
    }
  }
  return rutas;
}

/**
 * Las que a propósito no están en ninguna lista, con su motivo. Si alguna deja
 * de tenerlo, se quita de aquí y el test vuelve a exigirla.
 */
const EXCLUIDAS: Record<string, string> = {
  "/": "la raíz se resuelve aparte en el middleware: sin sesión, la landing",
  "/x": "app/[idioma]: son /en /pt /fr /it, y van por coincidencia exacta",
  "/sites/x/x": "solo se alcanza por reescritura desde el host de un cliente",
  [RUTA_NO_ENCONTRADA]: "es la 404: no tiene que estar abierta ni cerrada, tiene que decir que no existe",
};

describe("las rutas de la plataforma están clasificadas", () => {
  const rutas = [...new Set(rutasDeApp())].sort();

  it("hay rutas que mirar (si esto falla, el recorrido dejó de encontrar nada)", () => {
    expect(rutas.length).toBeGreaterThan(15);
  });

  // El fallo que esto para: una página nueva que no aparece en ninguna lista.
  // Si es pública, hoy quedaría escondida tras el login sin que nadie lo note;
  // si es privada, sus visitantes sin sesión verían un 404 en vez del login.
  it("cada página de app/ es pública, privada, o está excluida con motivo", () => {
    const idiomas = new Set<string>(PREFIJOS_PUBLICOS);
    const huerfanas = rutas.filter((r) =>
      !Object.hasOwn(EXCLUIDAS, r) &&
      !idiomas.has(r) &&
      !ARCHIVOS_PUBLICOS.has(r) &&
      !bajoAlgunPrefijo(r, RUTAS_PUBLICAS) &&
      !bajoAlgunPrefijo(r, RUTAS_PRIVADAS)
    );
    expect(huerfanas, `sin clasificar: ${huerfanas.join(", ")}`).toEqual([]);
  });

  // Y al revés: una ruta que esté en las dos listas es una contradicción, y
  // gana la que el middleware mire primero — o sea, se abre.
  it("ninguna está en las dos listas a la vez", () => {
    const ambas = rutas.filter((r) => bajoAlgunPrefijo(r, RUTAS_PUBLICAS) && bajoAlgunPrefijo(r, RUTAS_PRIVADAS));
    // Las excepciones públicas DENTRO de /api son legítimas y deliberadas
    // (Stripe, los cron, el healthcheck): ahí la más específica es la pública.
    const inesperadas = ambas.filter((r) => !r.startsWith("/api/"));
    expect(inesperadas, `en las dos listas: ${inesperadas.join(", ")}`).toEqual([]);
  });
});

describe("qué recibe cada tipo de dirección", () => {
  const clasificar = (p: string) =>
    ARCHIVOS_PUBLICOS.has(p) || bajoAlgunPrefijo(p, RUTAS_PUBLICAS) ? "abierta"
      : bajoAlgunPrefijo(p, RUTAS_PRIVADAS) ? "candado"
      : "no existe";

  it("una dirección inventada no existe: no es una puerta cerrada", () => {
    expect(clasificar("/loquesea")).toBe("no existe");
    expect(clasificar("/en/blog")).toBe("no existe"); // el blog solo está en español
    expect(clasificar("/projectos")).toBe("no existe"); // una letra de más
  });

  it("el panel sigue con candado", () => {
    expect(clasificar("/settings")).toBe("candado");
    expect(clasificar("/projects")).toBe("candado");
  });

  /**
   * EL punto delicado de separar 404 y login: que la respuesta no dependa de si
   * el proyecto existe. Si un UUID de verdad diera login y uno inventado diera
   * 404, cualquiera podría ir probando hasta encontrar proyectos ajenos.
   *
   * No puede pasar porque la comparación es por PREFIJO y no toca la base de
   * datos, pero es exactamente lo que hay que fijar por escrito.
   */
  it("un proyecto que existe y uno inventado responden igual", () => {
    expect(clasificar("/projects/9f8c1d2e-0000-4000-8000-abcdefabcdef")).toBe("candado");
    expect(clasificar("/projects/esto-no-es-un-uuid")).toBe("candado");
    expect(clasificar("/api/projects/9f8c1d2e-0000-4000-8000-abcdefabcdef/edits")).toBe("candado");
  });

  // El API entero va con candado, también lo que no existe: así desde fuera no
  // se puede ir probando nombres para dibujar el mapa del servidor.
  it("una ruta de API inventada responde como una real: 401, no 404", () => {
    expect(clasificar("/api/loquesea")).toBe("candado");
  });

  it("lo que tiene que estar abierto, sigue abierto", () => {
    for (const p of ["/login", "/registro", "/legal/cookies", "/blog", "/blog/publicar-web-hecha-con-ia",
      "/robots.txt", "/sitemap.xml", "/icon.png", "/.well-known/security.txt",
      "/api/stripe/webhook", "/api/salud"]) {
      expect(clasificar(p), p).toBe("abierta");
    }
  });

  // El prefijo no puede colarse por parecido: "/blogotro" no es "/blog".
  it("el prefijo compara segmentos, no letras", () => {
    expect(clasificar("/blogotro")).toBe("no existe");
    expect(clasificar("/icon.png/loquesea")).toBe("no existe");
  });
});
