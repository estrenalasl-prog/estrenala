import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Diagnostico } from "@/app/projects/[id]/PublishBar";
import { CATALOGO_PANEL } from "@/src/i18n/panel";
import { IDIOMAS, type Idioma } from "@/src/i18n/idiomas";
import type { Veredicto } from "@/src/publish/verificar-dominio";

const IP = "72.61.176.214";
const V6 = "2a02:4780:2a:9065::1";

function texto(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
const pinta = (dns: Veredicto | null, idioma: Idioma = "es") =>
  texto(renderToStaticMarkup(<Diagnostico dns={dns} t={CATALOGO_PANEL[idioma].proyecto.direccion} />));

const bien: Veredicto = { ok: true, via: "a", apuntaA: [IP], estorbos: [], proveedor: "Hostinger" };

describe("el diagnóstico del DNS", () => {
  it("cuando todo está en orden no dice nada", () => {
    expect(pinta(bien)).toBe("");
  });

  it("sin verificador (local) tampoco: no se inventa un diagnóstico", () => {
    expect(pinta(null)).toBe("");
  });

  /**
   * El caso que dejaba a la gente atascada: el registro A está perfecto, así que
   * el dueño lo mira, lo ve bien, y no tiene forma de saber qué pasa.
   */
  it("con AAAA de sobra, los enseña UNO A UNO para poder borrarlos", () => {
    const t = pinta({
      ok: false, motivo: "ipv6", apuntaA: [IP], proveedor: "Hostinger",
      estorbos: [{ tipo: "ipv6", valores: [V6, "2a02:4780:29:8154::2"] }],
    });
    expect(t).toContain(V6);
    expect(t).toContain("2a02:4780:29:8154::2");
    expect(t).toContain("Te sobran estos registros AAAA");
    // Lo importante no es que sobren, sino qué hacer con ellos.
    expect(t).toContain("Bórralos, no los cambies por otros");
  });

  it("dice de quién son los DNS, que es a dónde tiene que ir a tocarlos", () => {
    expect(pinta({ ...bien, estorbos: [{ tipo: "www", apuntaA: [] }] }))
      .toContain("Tus DNS los lleva Hostinger");
  });

  it("sin proveedor reconocido no se inventa ninguno", () => {
    const t = pinta({ ...bien, proveedor: null, estorbos: [{ tipo: "www", apuntaA: [] }] });
    expect(t).not.toContain("Tus DNS los lleva");
    expect(t).toContain("Al www le falta su registro");
  });

  it("enseña a dónde apunta hoy, para poder compararlo con lo que debería", () => {
    expect(pinta({
      ok: false, motivo: "no-apunta", apuntaA: ["77.37.50.191"], estorbos: [], proveedor: null,
    })).toContain("77.37.50.191");
  });

  it("y si no apunta a ninguna parte, lo dice en vez de dejar el hueco vacío", () => {
    const t = pinta({ ok: false, motivo: "no-apunta", apuntaA: [], estorbos: [], proveedor: null });
    expect(t).toContain("todavía no apunta a ninguna parte");
  });

  it("un dominio conectado con el www suelto SÍ avisa, aunque haya ido bien", () => {
    const t = pinta({ ...bien, estorbos: [{ tipo: "www", apuntaA: [] }] });
    expect(t).toContain("Al www le falta su registro");
    expect(t).toContain("apuntando a la misma dirección");
  });

  it("los dos estorbos a la vez salen los dos", () => {
    const t = pinta({
      ok: false, motivo: "ipv6", apuntaA: [IP], proveedor: null,
      estorbos: [{ tipo: "ipv6", valores: [V6] }, { tipo: "www", apuntaA: [] }],
    });
    expect(t).toContain("registros AAAA");
    expect(t).toContain("www");
  });

  /**
   * Nada de esto puede decidirse mirando el texto del mensaje: se decide por el
   * campo `tipo`. Si alguien lo cambiara por una comparación de cadenas, esto
   * saldría vacío en los otros cuatro idiomas sin que fallara nada más.
   */
  it.each(IDIOMAS)("en %s también sale, y traducido", (idioma) => {
    const t = pinta({
      ok: false, motivo: "ipv6", apuntaA: [IP], proveedor: "Hostinger",
      estorbos: [{ tipo: "ipv6", valores: [V6] }],
    }, idioma);
    expect(t).not.toBe("");
    expect(t).toContain(V6);
    expect(t).toContain("Hostinger");
    if (idioma !== "es") expect(t).not.toContain("Te sobran estos registros AAAA");
  });
});
