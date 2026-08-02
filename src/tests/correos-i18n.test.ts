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
