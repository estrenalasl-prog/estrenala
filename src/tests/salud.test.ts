import { describe, it, expect, beforeEach } from "vitest";
import { comprobarSalud, olvidarSalud } from "@/src/salud/comprobar";

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
