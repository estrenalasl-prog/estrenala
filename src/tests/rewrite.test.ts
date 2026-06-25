import { describe, it, expect } from "vitest";
import { rewriteHtml } from "@/src/preview/rewrite";

const BASE = "/api/projects/p1/preview/";

describe("rewriteHtml", () => {
  it("inyecta <base> dentro del head", () => {
    const out = rewriteHtml("<html><head><title>x</title></head><body></body></html>", BASE);
    expect(out).toContain(`<head><base href="${BASE}">`);
  });

  it("reescribe href/src root-absolutos", () => {
    const html = `<link href="/css/app.css"><img src="/img/x.png"><a href="/about.html">`;
    const out = rewriteHtml(html, BASE);
    expect(out).toContain(`href="${BASE}css/app.css"`);
    expect(out).toContain(`src="${BASE}img/x.png"`);
    expect(out).toContain(`href="${BASE}about.html"`);
  });

  it("no toca rutas relativas, externas, protocolo-relativas ni anclas", () => {
    const html = `<img src="img/y.png"><a href="https://x.com"><a href="//cdn/a.js"><a href="#top"><a href="mailto:a@b.c">`;
    const out = rewriteHtml(html, BASE);
    expect(out).toContain(`src="img/y.png"`);
    expect(out).toContain(`href="https://x.com"`);
    expect(out).toContain(`href="//cdn/a.js"`);
    expect(out).toContain(`href="#top"`);
    expect(out).toContain(`href="mailto:a@b.c"`);
  });

  it("reescribe url(/...) en estilos", () => {
    const html = `<div style="background:url(/img/bg.jpg)"></div>`;
    const out = rewriteHtml(html, BASE);
    expect(out).toContain(`url(${BASE}img/bg.jpg)`);
  });

  it("documento sin head: inyecta base al inicio", () => {
    const out = rewriteHtml("<body><p>x</p></body>", BASE);
    expect(out.startsWith(`<base href="${BASE}">`)).toBe(true);
  });
});
