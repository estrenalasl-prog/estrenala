import type { Idioma } from "../idiomas";
import type { TextosAjustes } from "./tipos";
import { es } from "./es";
import { en } from "./en";
import { pt } from "./pt";
import { fr } from "./fr";
import { it } from "./it";

export type { TextosAjustes };

const CATALOGO: Record<Idioma, TextosAjustes> = { es, en, pt, fr, it };

export function textosAjustes(idioma: Idioma): TextosAjustes {
  return CATALOGO[idioma];
}

export { CATALOGO as CATALOGO_AJUSTES };
