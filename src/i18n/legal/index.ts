import type { Idioma } from "../idiomas";
import type { TextosLegal } from "./tipos";
import { es } from "./es";
import { en } from "./en";
import { pt } from "./pt";
import { fr } from "./fr";
import { it } from "./it";

export type { TextosLegal };

const CATALOGO: Record<Idioma, TextosLegal> = { es, en, pt, fr, it };

export function textosLegal(idioma: Idioma): TextosLegal {
  return CATALOGO[idioma];
}

export { CATALOGO as CATALOGO_LEGAL };
