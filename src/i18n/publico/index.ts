import type { Idioma } from "../idiomas";
import type { TextosPublico } from "./tipos";
import { es } from "./es";
import { en } from "./en";
import { pt } from "./pt";
import { fr } from "./fr";
import { it } from "./it";

export type { TextosPublico };

// Record<Idioma, …>: si mañana se añade un idioma a IDIOMAS y no se pone aquí,
// no compila. Un idioma a medias es peor que no tenerlo.
const CATALOGO: Record<Idioma, TextosPublico> = { es, en, pt, fr, it };

export function textosPublico(idioma: Idioma): TextosPublico {
  return CATALOGO[idioma];
}

export { CATALOGO as CATALOGO_PUBLICO };
