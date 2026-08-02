import { Fragment, type ReactNode } from "react";

/**
 * Marcas mínimas para el formato QUE VA DENTRO de una frase.
 *
 *   **así**  → negrita
 *   [[así]]  → la palabra resaltada en lima (class "hl")
 *   ~~así~~  → tachado (class "tach")
 *
 * El porqué: media landing tiene el formato en mitad de la oración («Nosotros la
 * ponemos [[en el mundo]].»). Partir cada una de esas frases en tres campos
 * —antes, resaltado, después— deja un catálogo ilegible y, peor, impone el orden
 * del español: en otro idioma la palabra resaltada cae en otro sitio de la frase,
 * o son dos palabras, o ninguna. Con la marca dentro del texto, cada traducción
 * la coloca donde le toca.
 *
 * Se devuelven elementos de React, NUNCA `dangerouslySetInnerHTML`: aunque estos
 * textos son nuestros y no del usuario, no hay razón para abrir esa puerta y
 * dejarla abierta para el día que alguien meta ahí un nombre de cliente.
 */
const MARCAS = /(\*\*[^*]+\*\*|\[\[[^\]]+\]\]|~~[^~]+~~)/g;

export function conFormato(texto: string): ReactNode {
  const trozos = texto.split(MARCAS);
  // Sin marcas, se devuelve la cadena pelada: así el caso normal —la inmensa
  // mayoría— no llena el árbol de React de fragmentos que no pintan nada.
  if (trozos.length === 1) return texto;

  return trozos.map((t, i) => {
    if (t.startsWith("**") && t.endsWith("**")) return <b key={i}>{t.slice(2, -2)}</b>;
    if (t.startsWith("[[") && t.endsWith("]]")) return <span key={i} className="hl">{t.slice(2, -2)}</span>;
    if (t.startsWith("~~") && t.endsWith("~~")) return <span key={i} className="tach">{t.slice(2, -2)}</span>;
    return <Fragment key={i}>{t}</Fragment>;
  });
}

/**
 * El mismo texto sin nada de formato, para donde no cabe un elemento: un `title`,
 * un `aria-label`, un `<meta description>`. Si se olvidara, al usuario de un
 * lector de pantalla le leerían los asteriscos.
 */
export function sinFormato(texto: string): string {
  return texto.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/~~([^~]+)~~/g, "$1");
}
