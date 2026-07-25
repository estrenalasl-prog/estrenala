"use client";
import { useEffect } from "react";

// Único JS de la landing: revelar al hacer scroll. Se desactiva con
// prefers-reduced-motion (entonces todo se muestra ya visible).
export function Reveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".landing .reveal"));
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducido || !("IntersectionObserver" in window)) {
      for (const e of els) e.classList.add("visible");
      return;
    }
    const io = new IntersectionObserver(
      (entradas) => {
        for (const en of entradas) {
          if (en.isIntersecting) {
            en.target.classList.add("visible");
            io.unobserve(en.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    for (const e of els) io.observe(e);
    return () => io.disconnect();
  }, []);
  return null;
}
