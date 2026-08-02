import type { Idioma } from "../idiomas";
import type { TextosBlog } from "./tipos";
import { es } from "./es";
import { en } from "./en";
import { pt } from "./pt";
import { fr } from "./fr";
import { it } from "./it";

export type { TextosBlog };

const CATALOGO: Record<Idioma, TextosBlog> = { es, en, pt, fr, it };

export function textosBlog(idioma: Idioma): TextosBlog {
  return CATALOGO[idioma];
}

export { CATALOGO as CATALOGO_BLOG };
