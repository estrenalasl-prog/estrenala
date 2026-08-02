import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Correo } from "@/src/email/enviar";
import { IDIOMAS, type Idioma } from "@/src/i18n/idiomas";
import { textosCuenta } from "@/src/i18n/cuenta";

// Se intercepta el envío para quedarse con el correo TAL Y COMO SALDRÍA. Los
// otros tests miran el catálogo; este mira el resultado, que es lo que llega.
const enviados: Correo[] = [];
vi.mock("@/src/email/enviar", () => ({
  enviarCorreo: async (c: Correo) => { enviados.push(c); },
  envioActivo: () => true,
}));

const { enviarVerificacion, solicitarReset } = await import("@/src/auth/verificacion");
const { invitar } = await import("@/src/auth/equipo");

// Lo mínimo que tocan estas funciones. Nada de base de datos.
const store = {
  crearToken: async () => {},
  invalidarTokens: async () => {},
  getUserByEmail: async (email: string) => ({ id: "u1", email, nombre: "Sebas" }),
  getMembership: async () => null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

const BASE = "https://estrenala.com";

beforeEach(() => { enviados.length = 0; });

describe.each(IDIOMAS)("los correos que salen de verdad · %s", (idioma: Idioma) => {
  const c = textosCuenta(idioma).correos;

  it("el de confirmar la cuenta", async () => {
    await enviarVerificacion(store, { userId: "u1", email: "hola@x.com", nombre: "Sebas", base: BASE, idioma });
    const [correo] = enviados;
    expect(correo.asunto).toBe(c.verificacion.asunto);
    // Lo que de verdad importa: que el enlace esté, y en las DOS versiones. Quien
    // lee el correo en texto plano no tiene botón que pulsar.
    expect(correo.html).toContain(`${BASE}/verificar?token=`);
    expect(correo.texto).toContain(`${BASE}/verificar?token=`);
    // Y que no se haya quedado ningún hueco sin rellenar a la vista.
    expect(correo.html).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(correo.texto).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(correo.html).toContain("Sebas");
  });

  it("el de la contraseña", async () => {
    await solicitarReset(store, "hola@x.com", BASE, idioma);
    const [correo] = enviados;
    expect(correo.asunto).toBe(c.reset.asunto);
    expect(correo.html).toContain(`${BASE}/restablecer?token=`);
    expect(correo.texto).toContain(`${BASE}/restablecer?token=`);
    expect(correo.texto).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("el de la invitación, con el nombre del espacio dentro", async () => {
    await invitar(store, { orgId: "o1", orgNombre: "Café Central", email: "otro@x.com", rol: "editor", base: BASE, idioma });
    const [correo] = enviados;
    expect(correo.asunto).toContain("Café Central");
    expect(correo.html).toContain("Café Central");
    expect(correo.html).toContain(`${BASE}/invitacion?token=`);
    expect(correo.texto).toContain(`${BASE}/invitacion?token=`);
    expect(correo.texto).not.toMatch(/\{[a-zA-Z]+\}/);
  });
});

/**
 * El idioma tiene que viajar DENTRO del enlace.
 *
 * Lo vio Sebas: se registró en francés, le llegó el correo en francés, pulsó el
 * botón y la pantalla de «correo confirmado» salió en español. El idioma iba en
 * una cookie del navegador, y un correo no se abre donde se pidió — se abre en el
 * móvil, en otro navegador, dentro de Gmail, días después. Allí no hay cookie.
 *
 * En la invitación es imposible de otra forma: quien la recibe no ha estado aquí
 * nunca.
 */
describe("el idioma viaja en el enlace, no en el navegador", () => {
  it.each(IDIOMAS)("verificación · %s", async (idioma: Idioma) => {
    await enviarVerificacion(store, { userId: "u1", email: "h@x.com", nombre: "S", base: BASE, idioma });
    expect(enviados[0].texto).toContain(`&lang=${idioma}`);
    expect(enviados[0].html).toContain(`&amp;lang=${idioma}`); // en el HTML el & va escapado
  });

  it.each(IDIOMAS)("contraseña · %s", async (idioma: Idioma) => {
    await solicitarReset(store, "h@x.com", BASE, idioma);
    expect(enviados[0].texto).toContain(`&lang=${idioma}`);
  });

  it.each(IDIOMAS)("invitación · %s", async (idioma: Idioma) => {
    await invitar(store, { orgId: "o1", orgNombre: "X", email: "o@x.com", rol: "editor", base: BASE, idioma });
    expect(enviados[0].texto).toContain(`&lang=${idioma}`);
  });

  // Sin idioma explícito sigue saliendo español, como antes de todo esto.
  it("sin idioma, español", async () => {
    await enviarVerificacion(store, { userId: "u1", email: "h@x.com", nombre: "S", base: BASE });
    expect(enviados[0].texto).toContain("&lang=es");
  });
});

describe("los correos no se dejan colar HTML por el nombre", () => {
  it("un nombre con etiquetas sale escapado, no interpretado", async () => {
    await enviarVerificacion(store, {
      userId: "u1", email: "hola@x.com", nombre: '<img src=x onerror=alert(1)>', base: BASE, idioma: "es",
    });
    const [correo] = enviados;
    expect(correo.html).not.toContain("<img src=x");
    expect(correo.html).toContain("&lt;img src=x");
  });

  // El nombre del espacio lo escribe un cliente y el correo lo recibe otra
  // persona: es el único de los cuatro que cruza de una cuenta a otra.
  it("el nombre del espacio también", async () => {
    await invitar(store, {
      orgId: "o1", orgNombre: '<b>jefe</b>', email: "otro@x.com", rol: "owner", base: BASE, idioma: "es",
    });
    const [correo] = enviados;
    expect(correo.html).toContain("&lt;b&gt;jefe&lt;/b&gt;");
  });

  // Alguien que se llame «{enlace}» no puede acabar con un enlace metido en su
  // propio nombre: los valores se ponen de una pasada y ya no se vuelven a mirar.
  it("un nombre que parece un hueco no se sustituye", async () => {
    await enviarVerificacion(store, {
      userId: "u1", email: "hola@x.com", nombre: "{enlace}", base: BASE, idioma: "es",
    });
    const [correo] = enviados;
    expect(correo.texto ?? "").toContain("{enlace}, confirma");   // el nombre, tal cual
    expect((correo.texto ?? "").split(`${BASE}/verificar?token=`).length - 1).toBe(1);
  });
});
