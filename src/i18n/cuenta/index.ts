import type { Idioma } from "../idiomas";
import type { TextosCuenta } from "./tipos";
import { es } from "./es";
import { en } from "./en";
import { pt } from "./pt";
import { fr } from "./fr";
import { it } from "./it";

export type { TextosCuenta };

const CATALOGO: Record<Idioma, TextosCuenta> = { es, en, pt, fr, it };

export function textosCuenta(idioma: Idioma): TextosCuenta {
  return CATALOGO[idioma];
}

export { CATALOGO as CATALOGO_CUENTA };
