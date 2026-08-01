import { describe, it, expect } from "vitest";
import { imagenesDelCuerpo, insertarImagen } from "@/src/blog/imagenes-cuerpo";

const A = "11111111-2222-3333-4444-555555555555";
const B = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("imagenesDelCuerpo", () => {
  it("saca los assets que usa el artículo, en orden", () => {
    const md = `Hola\n\n![uno](/wc-uploads/${A}.webp)\n\ntexto\n\n![dos](/wc-uploads/${B}.png)`;
    expect(imagenesDelCuerpo(md)).toEqual([
      { assetId: A, ext: "webp", ruta: `/wc-uploads/${A}.webp` },
      { assetId: B, ext: "png", ruta: `/wc-uploads/${B}.png` },
    ]);
  });

  it("no repite el mismo asset aunque salga varias veces", () => {
    const md = `![a](/wc-uploads/${A}.png) y otra vez ![a](/wc-uploads/${A}.png)`;
    expect(imagenesDelCuerpo(md)).toHaveLength(1);
  });

  // Se busca la RUTA, no la sintaxis `![]()`: hay quien escribe <img> a mano dentro
  // del markdown, y esa imagen también hay que copiarla al snapshot.
  it("también encuentra las escritas como <img> a mano", () => {
    const md = `<img src="/wc-uploads/${A}.jpg" alt="x">`;
    expect(imagenesDelCuerpo(md)).toEqual([{ assetId: A, ext: "jpg", ruta: `/wc-uploads/${A}.jpg` }]);
  });

  it("ignora rutas que no son assets nuestros", () => {
    const md = `![x](/blog/img/post.png) ![y](https://otro.com/foto.jpg) ![z](/wc-uploads/no-es-uuid.png)`;
    expect(imagenesDelCuerpo(md)).toEqual([]);
  });

  it("sin imágenes, o sin texto, devuelve lista vacía", () => {
    expect(imagenesDelCuerpo("solo texto")).toEqual([]);
    expect(imagenesDelCuerpo("")).toEqual([]);
  });
});

describe("insertarImagen", () => {
  const R = `/wc-uploads/${A}.webp`;

  it("deja la imagen en su propio párrafo", () => {
    const r = insertarImagen("Primer párrafo.", 15, R, "Un gato");
    expect(r.md).toBe(`Primer párrafo.\n\n![Un gato](${R})\n`);
  });

  // Si no rompiera línea, markdown la metería EN MEDIO del párrafo, en línea con el
  // texto. Nadie espera eso al pulsar «insertar imagen».
  it("aunque el cursor caiga en mitad de una frase, rompe párrafo", () => {
    const r = insertarImagen("Hola mundo", 4, R, "x");
    expect(r.md).toBe(`Hola\n\n![x](${R})\n\n mundo`);
  });

  it("no mete líneas en blanco de más si ya las hay", () => {
    const r = insertarImagen("Uno.\n\nDos.", 6, R, "x");
    expect(r.md).toBe(`Uno.\n\n![x](${R})\n\nDos.`);
  });

  it("al principio del todo no deja un hueco delante", () => {
    const r = insertarImagen("Texto", 0, R, "x");
    expect(r.md).toBe(`![x](${R})\n\nTexto`);
  });

  it("deja el cursor justo detrás de lo insertado, listo para seguir", () => {
    const r = insertarImagen("Hola", 4, R, "x");
    expect(r.md.slice(0, r.cursor)).toBe(`Hola\n\n![x](${R})`);
  });

  // Un `]` en el texto alternativo cerraría el corchete antes de tiempo y el
  // markdown saldría escrito en crudo en el artículo publicado.
  it("un corchete en el texto alternativo no rompe el markdown", () => {
    const r = insertarImagen("", 0, R, "foto [1] del local");
    expect(r.md).toBe(`![foto 1 del local](${R})\n`);
  });

  it("un cursor imposible no revienta: se recorta a los límites", () => {
    expect(insertarImagen("abc", 999, R, "x").md).toBe(`abc\n\n![x](${R})\n`);
    expect(insertarImagen("abc", -5, R, "x").md).toBe(`![x](${R})\n\nabc`);
  });
});
