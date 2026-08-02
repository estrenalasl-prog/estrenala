import type { Idioma } from "../idiomas";
import type { TextosPanel } from "./tipos";
import { es } from "./es";
import { en } from "./en";
import { pt } from "./pt";
import { fr } from "./fr";
import { it } from "./it";

export type { TextosPanel };

const CATALOGO: Record<Idioma, TextosPanel> = { es, en, pt, fr, it };

export function textosPanel(idioma: Idioma): TextosPanel {
  return CATALOGO[idioma];
}

export { CATALOGO as CATALOGO_PANEL };
