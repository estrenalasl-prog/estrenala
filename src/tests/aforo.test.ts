import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ocuparSitio, subidasEnCurso, _vaciarAforo, SUBIDAS_A_LA_VEZ, MSG_AFORO,
} from "@/src/import/aforo";
import { EditorError } from "@/src/editor/errors";
import { ERRORES } from "@/src/i18n/errores";

/**
 * El aforo de subidas.
 *
 * Lo que protege: cada subida se trae su archivo entero a memoria, así que el
 * gasto no lo marca el tamaño máximo de UNA sino ese tamaño por cuánta gente
 * sube a la vez. Medido el 2026-09-03: una subida de 40 MB cuesta 130 MB de RSS,
 * o sea que un VPS de 4 GB se queda sin memoria alrededor de las veinte
 * simultáneas. Veinte a la vez no es un ataque, es una tarde buena.
 */
describe("aforo de subidas", () => {
  beforeEach(() => _vaciarAforo());

  it("deja entrar hasta el tope", () => {
    for (let i = 1; i <= SUBIDAS_A_LA_VEZ; i++) {
      ocuparSitio();
      expect(subidasEnCurso()).toBe(i);
    }
  });

  it("la siguiente se va con un 503 y su mensaje", () => {
    for (let i = 0; i < SUBIDAS_A_LA_VEZ; i++) ocuparSitio();
    try {
      ocuparSitio();
      throw new Error("debería haber rechazado");
    } catch (e) {
      expect(e).toBeInstanceOf(EditorError);
      expect((e as EditorError).status).toBe(503);
      expect((e as EditorError).message).toBe(MSG_AFORO);
    }
  });

  it("al soltar uno, entra el siguiente", () => {
    const salidas = [];
    for (let i = 0; i < SUBIDAS_A_LA_VEZ; i++) salidas.push(ocuparSitio());
    expect(() => ocuparSitio()).toThrow(EditorError);

    salidas[0]();
    expect(subidasEnCurso()).toBe(SUBIDAS_A_LA_VEZ - 1);
    expect(() => ocuparSitio()).not.toThrow();
  });

  /**
   * EL fallo que cierra la puerta para siempre.
   *
   * Si una ruta llama a su salida dos veces —dos `finally` anidados, un `catch`
   * que suelta y luego el `finally` otra vez—, el contador baja de más y deja
   * hueco donde no lo hay. Al revés es peor todavía: una ruta que NO suelte deja
   * el contador alto y a la sexta subida nadie más puede subir hasta que se
   * reinicie el servidor.
   */
  it("soltar dos veces no abre un hueco de más", () => {
    const salir = ocuparSitio();
    salir();
    salir();
    salir();
    expect(subidasEnCurso()).toBe(0);
  });

  it("un rechazo NO ocupa sitio", () => {
    const salidas = [];
    for (let i = 0; i < SUBIDAS_A_LA_VEZ; i++) salidas.push(ocuparSitio());
    expect(() => ocuparSitio()).toThrow();
    expect(() => ocuparSitio()).toThrow();
    // Si el rechazo hubiera contado, al soltar los seis quedaría el contador en 2.
    for (const salir of salidas) salir();
    expect(subidasEnCurso()).toBe(0);
  });

  it("el tope deja sitio de sobra en 4 GB", () => {
    // 60 MB de cuerpo × 3,25 (medido) + 50 MB descomprimido ≈ 245 MB por subida.
    const peorCaso = SUBIDAS_A_LA_VEZ * 245;
    expect(peorCaso, `${peorCaso} MB en el peor caso: no cabe con holgura`).toBeLessThan(2048);
  });

  it("el mensaje está traducido a los cinco idiomas", () => {
    const t = ERRORES[MSG_AFORO];
    expect(t, "el mensaje del aforo no está en el mapa de traducciones").toBeTruthy();
    for (const idioma of ["en", "pt", "fr", "it"] as const) {
      expect(t[idioma], `falta ${idioma}`).toBeTruthy();
    }
  });
});

/**
 * Las DOS puertas por las que entra un ZIP tienen que estar cerradas igual.
 *
 * El 2026-09-02 se reforzó `POST /api/projects` y se quedó fuera
 * `POST /api/projects/[id]/actualizar`, que es la más expuesta de las dos:
 * crear proyectos lo frena el plan (una web en el gratuito), pero actualizar el
 * ZIP se puede repetir sin límite sobre el mismo proyecto.
 */
describe("las dos rutas que reciben un ZIP", () => {
  const RUTAS = [
    "app/api/projects/route.ts",
    "app/api/projects/[id]/actualizar/route.ts",
  ];

  it("las dos miran el tamaño, frenan por IP, ocupan aforo y sueltan", () => {
    for (const ruta of RUTAS) {
      const fuente = readFileSync(resolve(process.cwd(), ruta), "utf8");
      expect(fuente, `${ruta}: no mira Content-Length`).toContain("content-length");
      expect(fuente, `${ruta}: sin freno por IP`).toContain("permitirIntento");
      expect(fuente, `${ruta}: sin aforo`).toContain("ocuparSitio");
      // Sin el finally el contador nunca baja y la puerta se cierra para siempre.
      expect(fuente, `${ruta}: ocupa aforo y no lo suelta en un finally`).toMatch(/finally\s*\{\s*(\/\/[^\n]*\n\s*)*soltar\(\);/);
    }
  });

  it("ninguna devuelve al navegador el mensaje crudo de una excepción", () => {
    for (const ruta of RUTAS) {
      const fuente = readFileSync(resolve(process.cwd(), ruta), "utf8");
      expect(fuente, `${ruta}: filtra e.message al cliente`)
        .not.toMatch(/error:\s*e instanceof Error \? e\.message/);
    }
  });
});
