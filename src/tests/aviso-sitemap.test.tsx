import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AvisoSitemapAjeno } from "@/app/projects/[id]/PublishBar";

// El texto de verdad, sin etiquetas: es lo único que lee una persona, y los
// espacios en JSX se cuelan con una facilidad pasmosa (un `{" "}` de menos y sale
// «páginas están enquantivatechnology.com»).
function texto(html: string): string {
  return html
    // El ⚠ va en su propio elemento y lo separa el `gap` del CSS, no un espacio.
    // Si se dejara, al quitar las etiquetas quedaría pegado al texto («⚠Tu web»)
    // y este test estaría midiendo una separación que la pantalla no usa.
    .replace(/<span class="icono"[^>]*>[\s\S]*?<\/span>/, "")
    .replace(/<br\/?>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
const pinta = (host: string | null, dominios: string[]) =>
  texto(renderToStaticMarkup(<AvisoSitemapAjeno host={host} dominios={dominios} />));

describe("aviso del sitemap ajeno", () => {
  // El caso de Sebas: la web de Quantiva, hecha para el dominio pelado, publicada
  // en un subdominio de pruebas. Los dos nombres se parecen tantísimo que sin la
  // dirección buena delante hay que adivinar cuál es cuál.
  it("dice dónde SÍ se sirve y dónde apunta el sitemap", () => {
    expect(pinta("prueba.quantivatechnology.com", ["quantivatechnology.com"])).toBe(
      "Tu web se sirve en prueba.quantivatechnology.com, pero tu sitemap.xml le dice a Google " +
      "que tus páginas están en quantivatechnology.com. Google irá a buscarlas allí en vez de aquí. " +
      "Si ese dominio es tuyo, conéctalo en «Dirección y dominio». Si no, borra el sitemap.xml de " +
      "tu web y te generamos uno correcto."
    );
  });

  it("con varios dominios, la lista y el plural cuadran", () => {
    const t = pinta("micafe.estrenala.com", ["alfa.com", "beta.com", "zeta.com"]);
    expect(t).toContain("están en alfa.com, beta.com y zeta.com.");
    expect(t).toContain("Si esos dominios son tuyos, conéctalos en");
  });

  // Publicar sin dirección no debería poder pasar, pero si pasa el aviso sigue
  // teniendo sentido: se cae la primera frase y no se queda una frase coja.
  it("sin dirección propia, la frase sigue estando bien escrita", () => {
    expect(pinta(null, ["suempresa.com"])).toBe(
      "Tu sitemap.xml le dice a Google que tus páginas están en suempresa.com. " +
      "Google irá a buscarlas allí en vez de aquí. Si ese dominio es tuyo, conéctalo en " +
      "«Dirección y dominio». Si no, borra el sitemap.xml de tu web y te generamos uno correcto."
    );
  });

  it("sin dominios ajenos no se pinta nada", () => {
    expect(renderToStaticMarkup(<AvisoSitemapAjeno host="x.com" dominios={[]} />)).toBe("");
  });
});
