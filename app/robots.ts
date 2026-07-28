import type { MetadataRoute } from "next";
import { plataformaOculta, reglasRobots } from "@/src/config/robots-plataforma";

// Dinámico a propósito: PLATAFORMA_NOINDEX se decide en el servidor (Dokploy),
// no al construir la imagen. Estático se quedaría congelado el valor del build.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return reglasRobots(plataformaOculta());
}
