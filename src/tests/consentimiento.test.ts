import { describe, it, expect } from "vitest";
import {
  leerDecision, haceFaltaBanner, seCarganScripts, estadoConsentMode,
  cookieDecision, cookieOlvidar, COOKIE_CONSENTIMIENTO, DIAS_CONSENTIMIENTO,
} from "@/src/legal/consentimiento";

// Este valor acaba dentro de una URL de <script> y de una llamada a gtag, así que
// no vale cualquier cosa que venga del entorno.
describe("idAds", () => {
  it("acepta los formatos reales de Google", async () => {
    const { idAds } = await import("@/src/config/ads");
    expect(idAds({ GOOGLE_ADS_ID: "AW-123456789" })).toBe("AW-123456789");
    expect(idAds({ GOOGLE_ADS_ID: "g-abc1234567" })).toBe("G-ABC1234567");
    expect(idAds({ GOOGLE_ADS_ID: "  GT-ABC1234  " })).toBe("GT-ABC1234");
  });
  it("sin configurar → null, que es lo que apaga banner y scripts", async () => {
    const { idAds } = await import("@/src/config/ads");
    expect(idAds({})).toBeNull();
    expect(idAds({ GOOGLE_ADS_ID: "   " })).toBeNull();
  });
  it("rechaza lo que podría escaparse a la URL o al script", async () => {
    const { idAds } = await import("@/src/config/ads");
    for (const v of ['AW-1"></script><script>x', "AW-1 2", "../../x", "AW-", "SI", "AW-12"]) {
      expect(idAds({ GOOGLE_ADS_ID: v }), v).toBeNull();
    }
  });
});

describe("leerDecision", () => {
  it("acepta los dos valores buenos, en cualquier caja", () => {
    expect(leerDecision("aceptado")).toBe("aceptado");
    expect(leerDecision("  RECHAZADO ")).toBe("rechazado");
  });
  it("cualquier otra cosa es «no ha decidido», nunca un sí por defecto", () => {
    for (const v of ["", "  ", "si", "true", "1", "granted", null, undefined]) {
      expect(leerDecision(v), String(v)).toBeNull();
    }
  });
});

// La regla que evita el banner inútil: sin nada que consentir, no se pregunta.
describe("haceFaltaBanner", () => {
  it("sin identificador de Ads NO sale banner, aunque no haya decidido nada", () => {
    expect(haceFaltaBanner(undefined, null)).toBe(false);
    expect(haceFaltaBanner("", null)).toBe(false);
    expect(haceFaltaBanner("   ", null)).toBe(false);
  });
  it("con identificador y sin decisión, sale", () => {
    expect(haceFaltaBanner("AW-123", null)).toBe(true);
  });
  it("con decisión tomada ya no vuelve a salir, sea cual sea", () => {
    expect(haceFaltaBanner("AW-123", "aceptado")).toBe(false);
    expect(haceFaltaBanner("AW-123", "rechazado")).toBe(false);
  });
});

describe("seCarganScripts", () => {
  it("hacen falta las DOS cosas: identificador y aceptación", () => {
    expect(seCarganScripts("AW-123", "aceptado")).toBe(true);
    expect(seCarganScripts("AW-123", "rechazado")).toBe(false);
    expect(seCarganScripts("AW-123", null)).toBe(false);
    expect(seCarganScripts(undefined, "aceptado")).toBe(false);
  });
});

describe("estadoConsentMode", () => {
  // Arrancar en «concedido hasta que rechacen» es justo lo que la norma prohíbe.
  it("sin decisión, TODO denegado", () => {
    expect(estadoConsentMode(null)).toEqual({
      ad_storage: "denied", ad_user_data: "denied",
      ad_personalization: "denied", analytics_storage: "denied",
    });
  });
  it("rechazado se comporta igual que no haber decidido", () => {
    expect(estadoConsentMode("rechazado")).toEqual(estadoConsentMode(null));
  });
  it("aceptado concede las cuatro que pide el Consent Mode v2", () => {
    expect(estadoConsentMode("aceptado")).toEqual({
      ad_storage: "granted", ad_user_data: "granted",
      ad_personalization: "granted", analytics_storage: "granted",
    });
  });
});

describe("cookieDecision", () => {
  it("lleva ruta, caducidad y SameSite", () => {
    const c = cookieDecision("rechazado", true);
    expect(c).toContain(`${COOKIE_CONSENTIMIENTO}=rechazado`);
    expect(c).toContain("Path=/");
    expect(c).toContain(`Max-Age=${DIAS_CONSENTIMIENTO * 24 * 60 * 60}`);
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain("Secure");
  });
  // En localhost no hay https: con Secure el navegador la tiraría y el banner
  // volvería a salir en cada recarga.
  it("sin Secure cuando no es seguro (desarrollo)", () => {
    expect(cookieDecision("aceptado", false)).not.toContain("Secure");
  });
  it("olvidar la caduca en el acto", () => {
    expect(cookieOlvidar(true)).toContain("Max-Age=0");
  });
});
