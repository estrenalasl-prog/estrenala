import Image from "next/image";

// Logo de Estrénala. Dos variantes segun el fondo sobre el que se pinta:
//   claro  → wordmark en tinta   (fondos lienzo/superficie)
//   oscuro → wordmark en blanco  (fondos tinta, p. ej. el panel de marca del login)
// Los PNG son los originales de marca recortados a su contenido (sin el margen
// enorme que traian), por eso ambos tienen la misma proporcion ~4:1.
const FUENTES = {
  claro: { src: "/brand/logo-tinta.png", w: 460, h: 115 },
  oscuro: { src: "/brand/logo-blanco.png", w: 461, h: 115 },
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
        // Logo estatico y pequeno: sin el optimizador de next/image. Evita la
        // peticion interna del optimizador (que llega con Host vacio y el middleware
        // reescribe a /sites/... -> 404). El navegador pide el PNG directo.
        unoptimized
      />
    </span>
  );
}
