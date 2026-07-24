import Image from "next/image";

// Logo de Estrénala. Dos variantes segun el fondo sobre el que se pinta:
//   claro  → wordmark en tinta   (fondos lienzo/superficie)
//   oscuro → wordmark en blanco  (fondos tinta, p. ej. el panel de marca del login)
// Los PNG son los originales de marca recortados a su contenido (sin el margen
// enorme que traian), por eso ambos tienen la misma proporcion ~4:1.
const FUENTES = {
  claro: { src: "/brand/logo-tinta.png", w: 451, h: 111 },
  oscuro: { src: "/brand/logo-blanco.png", w: 1038, h: 260 },
} as const;

export function Logo({ tono = "claro", alto = 26 }: { tono?: "claro" | "oscuro"; alto?: number }) {
  const f = FUENTES[tono];
  return (
    <span className="logo" style={{ height: alto }}>
      <Image
        src={f.src}
        alt="Estrénala"
        width={f.w}
        height={f.h}
        style={{ height: "100%", width: "auto" }}
        priority
      />
    </span>
  );
}
