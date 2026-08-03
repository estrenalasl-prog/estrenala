import { describe, it, expect, beforeEach } from "vitest";
import {
  leerEnvio, cabeElEnvio, olvidarFrenos, MAX_CAMPOS, MAX_LARGO_VALOR, MAX_POR_HORA,
} from "@/src/forms/recibir";
import { CAMPO_TRAMPA, CAMPO_PAGINA, CAMPO_INDICE } from "@/src/forms/conectar";

function envio(campos: Record<string, string>, extra?: { pagina?: string; indice?: string }) {
  const f = new FormData();
  f.set(CAMPO_PAGINA, extra?.pagina ?? "/contacto.html");
  f.set(CAMPO_INDICE, extra?.indice ?? "0");
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return f;
}

describe("leer un envío", () => {
  it("un mensaje normal pasa, y los campos nuestros no se guardan", () => {
    const r = leerEnvio(envio({ nombre: "Ana", email: "ana@ejemplo.com", mensaje: "Hola" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.envio.datos).toEqual({ nombre: "Ana", email: "ana@ejemplo.com", mensaje: "Hola" });
    expect(r.envio.pagina).toBe("/contacto.html");
    expect(r.envio.formIndice).toBe(0);
    expect(Object.keys(r.envio.datos)).not.toContain(CAMPO_PAGINA);
    expect(Object.keys(r.envio.datos)).not.toContain(CAMPO_INDICE);
  });

  it("si la trampa viene rellena, se descarta", () => {
    const f = envio({ nombre: "Robot" });
    f.set(CAMPO_TRAMPA, "http://spam.example");
    const r = leerEnvio(f);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.descartar).toBe(true);
  });

  it("la trampa vacía —que es lo normal— no estorba", () => {
    const f = envio({ nombre: "Ana" });
    f.set(CAMPO_TRAMPA, "");
    expect(leerEnvio(f).ok).toBe(true);
  });

  it("una página inventada se descarta", () => {
    for (const pagina of ["", "sin-barra", "/../../etc/passwd", "https://otro.com/x"]) {
      expect(leerEnvio(envio({ a: "1" }, { pagina })).ok, pagina).toBe(false);
    }
  });

  it("un índice de formulario que no es un número se descarta", () => {
    for (const indice of ["", "abc", "-1", "1e5", "99999"]) {
      expect(leerEnvio(envio({ a: "1" }, { indice })).ok, indice).toBe(false);
    }
  });

  it("un envío todo en blanco no llega al dueño", () => {
    expect(leerEnvio(envio({ nombre: "", mensaje: "   " })).ok).toBe(false);
  });

  it("los campos repetidos (casillas) se juntan en uno", () => {
    const r = leerEnvio(envio({}, {}));
    expect(r.ok).toBe(false); // el de arriba va vacío; el de verdad, abajo
    const f = envio({});
    f.append("intereses", "web");
    f.append("intereses", "blog");
    const r2 = leerEnvio(f);
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.envio.datos.intereses).toBe("web, blog");
  });

  it("un valor larguísimo se corta, no tumba el envío", () => {
    const r = leerEnvio(envio({ mensaje: "a".repeat(MAX_LARGO_VALOR + 5000) }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.envio.datos.mensaje).toHaveLength(MAX_LARGO_VALOR);
  });

  it("demasiados campos se descarta entero", () => {
    const campos: Record<string, string> = {};
    for (let i = 0; i <= MAX_CAMPOS + 1; i++) campos[`c${i}`] = "x";
    expect(leerEnvio(envio(campos)).ok).toBe(false);
  });

  it("un archivo no se guarda, pero no tira el resto del mensaje", () => {
    const f = envio({ nombre: "Ana" });
    f.append("adjunto", new File(["contenido"], "cv.pdf"));
    const r = leerEnvio(f);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.envio.datos).toEqual({ nombre: "Ana" });
  });
});

describe("el freno por web", () => {
  beforeEach(() => olvidarFrenos());

  it("deja pasar hasta el tope y luego corta", () => {
    for (let i = 0; i < MAX_POR_HORA; i++) {
      expect(cabeElEnvio("p1"), `envío ${i + 1}`).toBe(true);
    }
    expect(cabeElEnvio("p1")).toBe(false);
  });

  it("cada web lleva su cuenta: una llena no calla a las demás", () => {
    for (let i = 0; i < MAX_POR_HORA; i++) cabeElEnvio("p1");
    expect(cabeElEnvio("p1")).toBe(false);
    expect(cabeElEnvio("p2")).toBe(true);
  });

  it("pasada la hora vuelve a contar desde cero", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < MAX_POR_HORA; i++) cabeElEnvio("p1", t0);
    expect(cabeElEnvio("p1", t0)).toBe(false);
    expect(cabeElEnvio("p1", t0 + 61 * 60 * 1000)).toBe(true);
  });
});
