import { describe, it, expect } from "vitest";
import { mdAHtml } from "@/src/blog/markdown";

describe("mdAHtml", () => {
  it("convierte encabezados, listas, negritas y enlaces", () => {
    const html = mdAHtml("## Título\n\n- uno\n- dos\n\n**fuerte** y [enlace](https://x.com)");
    expect(html).toContain("<h2>Título</h2>");
    expect(html).toContain("<li>uno</li>");
    expect(html).toContain("<strong>fuerte</strong>");
    expect(html).toContain('<a href="https://x.com">enlace</a>');
  });
  it("respeta HTML embebido (enlaces <a> insertados por la etapa de links)", () => {
    expect(mdAHtml('Texto con <a href="/blog/x.html">ancla</a>.')).toContain('<a href="/blog/x.html">ancla</a>');
  });
});
