import Image from "next/image";

// Firma del fabricante. Quantiva Technology es el paraguas y cada app (Estrénala,
// el CRM, los agentes de WhatsApp) es un producto suyo: la MISMA firma en todas,
// para que con el tiempo se reconozca quién está detrás.
//
// Dónde va: en los bordes del producto (pie de la landing, panel de marca de
// login y registro), nunca metida en medio del trabajo del usuario. Y NUNCA en
// las webs publicadas de los clientes: ahí ya está la insignia «Hecho con
// Estrénala», y el cliente no compró una web firmada por Quantiva.
//
// Mismo criterio que <Logo>: `tono` es el FONDO sobre el que se pinta.
const FUENTES = {
  claro: { src: "/brand/quantiva-negro.png", w: 2234, h: 424 },   // wordmark oscuro
  oscuro: { src: "/brand/quantiva-blanco.png", w: 3326, h: 648 }, // wordmark blanco
} as const;

export function FirmaQuantiva({ tono = "claro", alto = 15 }: { tono?: "claro" | "oscuro"; alto?: number }) {
  const f = FUENTES[tono];
  return (
    <a
      className="firma-quantiva"
      href="https://quantivatechnology.com"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="etq">By</span>
      <Image
        src={f.src}
        alt="Quantiva Technology"
        width={f.w}
        height={f.h}
        style={{ height: alto, width: "auto" }}
        // Sin el optimizador de next/image, igual que el logo: su petición interna
        // llega con Host vacío y el middleware la reescribiría a /sites/... → 404.
        unoptimized
      />
    </a>
  );
}
