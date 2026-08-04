import { describe, it, expect } from "vitest";
import { suplanta, sinMarcas, trozosDelSlug, PROTEGIDOS, CEBOS } from "@/src/publish/suplantacion";

/**
 * Lo que se protege aquí no es a la marca: es a los DEMÁS CLIENTES. Si alguien
 * monta una web de phishing en `bbva.estrenala.com` y Google marca el dominio,
 * la pantalla roja de «sitio peligroso» sale en la web de todo el mundo.
 */
describe("subdominios que suplantan a alguien", () => {
  it("la marca a pelo", () => {
    for (const s of ["bbva", "santander", "correos", "paypal", "hacienda", "dgt"]) {
      expect(suplanta(s)?.marca, s).toBe(s);
    }
  });

  it("la marca con un cebo pegado, en cualquier orden", () => {
    expect(suplanta("bbva-clientes")).toEqual({ marca: "bbva", cebo: "clientes" });
    expect(suplanta("acceso-santander")).toEqual({ marca: "santander", cebo: "acceso" });
    expect(suplanta("correos-pago-pendiente")).toEqual({ marca: "correos", cebo: "pago" });
  });

  it("la marca pegada a números, que se lee igual", () => {
    expect(suplanta("bbva2026")?.marca).toBe("bbva");
    expect(suplanta("2026correos")?.marca).toBe("correos");
  });

  /**
   * Buscar la marca por «contiene» convertiría esto en una fuente de falsos
   * positivos absurdos: `apple` está dentro de `grapples`, y `bbva` dentro de
   * `bbvana`. Se compara por PALABRAS.
   */
  it("no salta dentro de una palabra más larga", () => {
    for (const s of ["bbvana", "grapples", "santanderina", "correosidad", "clavel"]) {
      expect(suplanta(s), s).toBeNull();
    }
  });

  it("un cebo SOLO no es suplantación: hay negocios que se llaman así", () => {
    for (const s of ["seguridad", "facturacion", "soporte-tecnico", "mi-cuenta", "clientes"]) {
      expect(suplanta(s), s).toBeNull();
    }
  });

  it("un nombre normal pasa sin más", () => {
    for (const s of ["clinica-sonrisa", "panaderia-la-espiga", "quantiva-web", "sitio", "abc123"]) {
      expect(suplanta(s), s).toBeNull();
    }
  });

  it("da igual cómo esté escrito de mayúsculas", () => {
    expect(suplanta("BBVA-Clientes")?.marca).toBe("bbva");
  });

  it("las dos listas no se pisan entre sí", () => {
    expect(PROTEGIDOS.filter((p) => CEBOS.includes(p))).toEqual([]);
  });

  it("ninguna entrada de las listas está repetida ni mal escrita", () => {
    for (const lista of [PROTEGIDOS, CEBOS]) {
      expect(new Set(lista).size).toBe(lista.length);
      // Todas en minúsculas y sin acentos: es contra lo que se compara un slug,
      // que solo puede llevar `[a-z0-9-]`. Una con tilde no casaría nunca.
      for (const t of lista) expect(t, t).toMatch(/^[a-z0-9]+$/);
    }
  });
});

describe("trozos de un slug", () => {
  it("parte por guiones y por el salto entre letras y números", () => {
    expect(trozosDelSlug("bbva-clientes2026")).toEqual(["bbva", "clientes", "2026"]);
  });
});

/**
 * EL AGUJERO QUE ESTO TAPA: el subdominio se genera SOLO a partir del nombre del
 * proyecto, y por esa rama no pasaba ninguna comprobación. Llamar al proyecto
 * «BBVA Clientes» daba `bbva-clientes` sin que nadie mirase nada.
 */
describe("generar un nombre limpio a partir del del proyecto", () => {
  it("le quita la marca y deja lo demás", () => {
    expect(sinMarcas("BBVA Clientes")).toBe("Clientes");
    expect(sinMarcas("Clínica Apple")).toBe("Clínica");
    expect(sinMarcas("Gestoría Hacienda y Renta")).toBe("Gestoría y");
  });

  it("un nombre sin marcas sale intacto", () => {
    expect(sinMarcas("Clínica Sonrisa")).toBe("Clínica Sonrisa");
  });

  it("si no queda nada, no devuelve basura", () => {
    expect(sinMarcas("BBVA")).toBe("");
  });

  /**
   * Las dos funciones tienen que ver las MISMAS palabras. Si `sinMarcas` dejara
   * pasar algo que `suplanta` sí detecta, el subdominio generado se rechazaría
   * más adelante y el usuario se quedaría sin publicar sin entender por qué.
   */
  it("lo que sale de sinMarcas nunca vuelve a saltar en suplanta", () => {
    const nombres = [
      "BBVA Clientes", "Clínica Apple", "Correos Express 2026", "Mi tienda Amazon",
      "Santander de Cantabria", "Hacienda Los Olivos", "PayPal", "DGT Autoescuela",
    ];
    for (const n of nombres) {
      const limpio = sinMarcas(n).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (limpio === "") continue;
      expect(suplanta(limpio), `${n} → ${limpio}`).toBeNull();
    }
  });
});
