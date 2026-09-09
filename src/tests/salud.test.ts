import { describe, it, expect, beforeEach } from "vitest";
import { comprobarSalud, olvidarSalud } from "@/src/salud/comprobar";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

beforeEach(() => olvidarSalud());

describe("la comprobación de salud", () => {
  it("con la base de datos respondiendo, dice que sí", async () => {
    expect(await comprobarSalud({ pingBaseDeDatos: async () => {} })).toEqual({ ok: true });
  });

  /**
   * ES EL MOTIVO DE QUE ESTO EXISTA. Vigilar la portada solo dice que Node
   * contesta: con la base de datos caída, la landing se pinta entera y el
   * vigilante sigue en verde mientras nadie puede entrar ni publicar.
   */
  it("con la base de datos caída, dice que no", async () => {
    const salud = await comprobarSalud({
      pingBaseDeDatos: async () => { throw new Error("connection refused"); },
    });
    expect(salud).toEqual({ ok: false });
  });

  /** El motivo se registra, pero NO sale por la respuesta: es pública. */
  it("no cuenta nada de lo que ha fallado", async () => {
    const salud = await comprobarSalud({
      pingBaseDeDatos: async () => { throw new Error("password authentication failed for user postgres"); },
    });
    expect(Object.keys(salud)).toEqual(["ok"]);
    expect(JSON.stringify(salud)).not.toContain("password");
  });

  /**
   * Sin ventana, esta ruta sería una forma cómoda de hacernos consultar la base
   * de datos tantas veces por segundo como aguante la red.
   */
  it("mil visitas seguidas son UNA consulta", async () => {
    let consultas = 0;
    const deps = { pingBaseDeDatos: async () => { consultas++; } };
    for (let i = 0; i < 1000; i++) await comprobarSalud(deps, 1_000 + i);
    expect(consultas).toBe(1);
  });

  it("pasada la ventana, se vuelve a preguntar", async () => {
    let consultas = 0;
    const deps = { pingBaseDeDatos: async () => { consultas++; } };
    await comprobarSalud(deps, 0);
    await comprobarSalud(deps, 4_999);
    expect(consultas).toBe(1);
    await comprobarSalud(deps, 5_000);
    expect(consultas).toBe(2);
  });

  /**
   * Una caída no se queda pegada: en cuanto la base vuelve, la siguiente
   * comprobación pasada la ventana dice que sí y el aviso se cierra solo.
   */
  it("cuando la base vuelve, la salud vuelve", async () => {
    let cae = true;
    const deps = { pingBaseDeDatos: async () => { if (cae) throw new Error("caída"); } };
    expect((await comprobarSalud(deps, 0)).ok).toBe(false);
    cae = false;
    expect((await comprobarSalud(deps, 5_000)).ok).toBe(true);
  });
});

/**
 * El healthcheck del contenedor, que es lo que decide cuándo entra tráfico.
 *
 * Puesto el 2026-09-09. Antes no había ninguno: el contenedor se daba por vivo
 * en cuanto arrancaba `node server.js`, que es antes de que Next escuche, y
 * Traefik ya le mandaba visitas en esa ventana. Search Console lo cazó el
 * 2026-09-07 con un «Error de servidor (5xx)» en una página, después de los seis
 * despliegues del 2 y el 3.
 *
 * Lo que vigila este test es la parte que se rompe sola: que apunte a
 * `/api/health` y NUNCA a `/api/salud`. Parece un cambio inofensivo —«mejor,
 * así también mira la base de datos»— y es el peor posible: salud responde 503
 * cuando Postgres no contesta, así que un hipo de la base de datos marcaría el
 * contenedor enfermo y Docker lo reiniciaría, tirando también las webs de los
 * clientes que se estaban sirviendo bien. Reiniciar no arregla Postgres.
 */
describe("el healthcheck del contenedor", () => {
  const dockerfile = readFileSync(resolve(process.cwd(), "Dockerfile"), "utf8");
  /**
   * Las órdenes, sin los comentarios.
   *
   * Hace falta porque el comentario del propio HEALTHCHECK explica que NO se usa
   * `/api/salud` y por qué. Mirando el archivo entero, esa explicación hacía
   * fallar al test que comprueba justo eso: el aviso escrito para que nadie se
   * equivoque contaba como la equivocación.
   */
  const ordenes = dockerfile
    .split("\n")
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");

  it("existe: sin él el contenedor recibe tráfico antes de estar listo", () => {
    expect(ordenes, "el Dockerfile se quedó sin HEALTHCHECK").toContain("HEALTHCHECK");
  });

  it("pregunta por /api/health, que no viaja a la base de datos", () => {
    expect(ordenes).toContain("/api/health");
  });

  /**
   * Se miran TODAS las órdenes, no la línea del HEALTHCHECK.
   *
   * Buscar en esa línea fue el primer intento y era un falso verde: la orden
   * ocupa dos líneas —la de `--interval` y la del `CMD`—, y la primera no lleva
   * ninguna ruta dentro, así que el test pasaba aunque el chequeo apuntara a
   * `/api/salud`. Comprobado quitándolo y viéndolo fallar.
   */
  it("NO usa /api/salud: un Postgres caído reiniciaría el contenedor", () => {
    expect(ordenes, "el healthcheck pasó a mirar la base de datos").not.toContain("/api/salud");
  });

  it("da margen de arranque: sin start-period se declara enfermo al nacer", () => {
    expect(ordenes).toMatch(/--start-period=\d+s/);
  });
});
