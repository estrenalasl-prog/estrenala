import { describe, it, expect } from "vitest";
import { sanitizeInline } from "@/src/editor/sanitize-inline";

describe("sanitizeInline — permite el formato de la lista blanca", () => {
  it("conserva negrita, cursiva, subrayado y saltos", () => {
    expect(sanitizeInline("Hola <b>mundo</b> y <i>más</i> y <u>sub</u><br>fin")).toBe(
      "Hola <b>mundo</b> y <i>más</i> y <u>sub</u><br>fin"
    );
  });

  it("mantiene strong y em tal cual", () => {
    expect(sanitizeInline("<strong>x</strong> <em>y</em>")).toBe("<strong>x</strong> <em>y</em>");
  });

  it("enlace con href seguro conserva SOLO el href", () => {
    expect(sanitizeInline('<a href="https://x.com" onclick="mal()" target="_blank" class="c">ir</a>'))
      .toBe('<a href="https://x.com">ir</a>');
    expect(sanitizeInline('<a href="mailto:a@b.com">correo</a>')).toBe('<a href="mailto:a@b.com">correo</a>');
  });

  it("escapa el texto (nada de inyección por texto)", () => {
    expect(sanitizeInline("2 < 3 && 4 > 1")).toBe("2 &lt; 3 &amp;&amp; 4 &gt; 1");
  });
});

describe("sanitizeInline — bloquea XSS", () => {
  it("descarta <script> con su contenido", () => {
    expect(sanitizeInline('a<script>alert(1)</script>b')).toBe("ab");
  });

  it("descarta etiquetas no permitidas pero conserva su texto", () => {
    expect(sanitizeInline('<div onclick="x"><p>hola</p></div>')).toBe("hola");
    expect(sanitizeInline('<img src=x onerror=alert(1)>texto')).toBe("texto");
  });

  it("href javascript: (incluso con mayúsculas o espacios) se desenvuelve", () => {
    expect(sanitizeInline('<a href="javascript:alert(1)">x</a>')).toBe("x");
    expect(sanitizeInline('<a href="  JavaScript:alert(1)">x</a>')).toBe("x");
  });

  it("href con javascript: camuflado por entidades o tabs/newlines se desenvuelve", () => {
    expect(sanitizeInline('<a href="java&#09;script:alert(1)">x</a>')).toBe("x");
    expect(sanitizeInline('<a href="javascript&#58;alert(1)">x</a>')).toBe("x");
    expect(sanitizeInline('<a href="java\tscript:alert(1)">x</a>')).toBe("x");
  });

  it("data: y vbscript: se desenvuelven", () => {
    expect(sanitizeInline('<a href="data:text/html,<script>x</script>">x</a>')).toBe("x");
    expect(sanitizeInline('<a href="vbscript:msgbox">x</a>')).toBe("x");
  });

  it("comentarios y CDATA fuera", () => {
    expect(sanitizeInline("a<!-- <script>x</script> -->b")).toBe("ab");
  });

  it("atributos de evento en etiquetas permitidas se caen (no se copian)", () => {
    expect(sanitizeInline('<b onmouseover="alert(1)">x</b>')).toBe("<b>x</b>");
  });
});

describe("sanitizeInline — salida siempre bien formada", () => {
  it("cierra lo que quedó abierto", () => {
    expect(sanitizeInline("<b>sin cerrar")).toBe("<b>sin cerrar</b>");
  });

  it("arregla anidamiento cruzado", () => {
    expect(sanitizeInline("<b><i>x</b></i>")).toBe("<b><i>x</i></b>");
  });

  it("ignora cierres sobrantes", () => {
    expect(sanitizeInline("x</b></i>y")).toBe("xy");
  });

  it("entradas raras no rompen", () => {
    expect(sanitizeInline("")).toBe("");
    expect(sanitizeInline("<")).toBe("&lt;");
    expect(sanitizeInline("<>")).toBe("&lt;&gt;");
    expect(sanitizeInline("a < b")).toBe("a &lt; b");
    expect(sanitizeInline(null as unknown as string)).toBe("");
  });

  it("href legítimo con & se conserva round-trip", () => {
    expect(sanitizeInline('<a href="https://x.com/?a=1&amp;b=2">l</a>')).toBe('<a href="https://x.com/?a=1&amp;b=2">l</a>');
  });
});
