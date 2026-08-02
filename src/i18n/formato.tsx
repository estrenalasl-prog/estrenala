import { Fragment, type ReactNode } from "react";

/**
 * Marcas mínimas para el formato QUE VA DENTRO de una frase.
 *
 *   **así**  → negrita
 *   [[así]]  → la palabra resaltada en lima (class "hl")
 *   ~~así~~  → tachado (class "tach")
 *   `así`    → nombre de archivo o de campo (<code>)
 *   _así_    → énfasis (<i>)
 *
 * El porqué: media landing tiene el formato en mitad de la oración («Nosotros la
 * ponemos [[en el mundo]].»). Partir cada una de esas frases en tres campos
 * —antes, resaltado, después— deja un catálogo ilegible y, peor, impone el orden
 * del español: en otro idioma la palabra resaltada cae en otro sitio de la frase,
 * o son dos palabras, o ninguna. Con la marca dentro del texto, cada traducción
 * la coloca donde le toca.
 *
 * Las dos últimas llegaron con el panel, donde hay frases que nombran archivos
 * («borra el `sitemap.xml` de tu web») en mitad de un párrafo. El aviso del
 * sitemap era JSX partido en seis trozos con `{" "}` entre medias, y ya se coló
 * un espacio de menos una vez.
 *
 * Se devuelven elementos de React, NUNCA `dangerouslySetInnerHTML`: aunque estos
 * textos son nuestros y no del usuario, no hay razón para abrir esa puerta y
 * dejarla abierta para el día que alguien meta ahí un nombre de cliente.
 */
const MARCAS = /(\*\*[^*]+\*\*|\[\[[^\]]+\]\]|~~[^~]+~~|`[^`]+`|_[^_]+_)/g;

export function conFormato(texto: string): ReactNode {
  const trozos = texto.split(MARCAS);
  // Sin marcas, se devuelve la cadena pelada: así el caso normal —la inmensa
  // mayoría— no llena el árbol de React de fragmentos que no pintan nada.
  if (trozos.length === 1) return texto;

  return trozos.map((t, i) => {
    if (t.startsWith("**") && t.endsWith("**")) return <b key={i}>{t.slice(2, -2)}</b>;
    if (t.startsWith("[[") && t.endsWith("]]")) return <span key={i} className="hl">{t.slice(2, -2)}</span>;
    if (t.startsWith("~~") && t.endsWith("~~")) return <span key={i} className="tach">{t.slice(2, -2)}</span>;
    if (t.startsWith("`") && t.endsWith("`")) return <code key={i}>{t.slice(1, -1)}</code>;
    if (t.startsWith("_") && t.endsWith("_")) return <i key={i}>{t.slice(1, -1)}</i>;
    return <Fragment key={i}>{t}</Fragment>;
  });
}

/**
 * Como `conFormato`, pero los huecos `{clave}` se cambian por ELEMENTOS en vez de
 * por texto.
 *
 * Existe porque hay frases que llevan dentro algo que ha escrito el usuario —el
 * nombre de su web, su dominio— y eso NO puede pasar por el intérprete de marcas.
 * Media gente llama a su carpeta `mi_web_v2`, y con `rellenar` + `conFormato` esa
 * web saldría como «mi<i>web</i>v2» en mitad del aviso de borrarla.
 *
 * La regla que impone: una marca no puede quedar a caballo de un hueco. En el
 * catálogo se escribe `{nombre}` a secas y la negrita la pone quien llama, que es
 * donde toca — resaltar un dato es una decisión de la pantalla, no de la
 * traducción. Hay un test que lo vigila.
 */
const HUECOS = /(\{[a-zA-Z]+\})/g;

export function conValores(texto: string, valores: Record<string, ReactNode>): ReactNode {
  return texto.split(HUECOS).map((trozo, i) => {
    const hueco = /^\{([a-zA-Z]+)\}$/.exec(trozo);
    const clave = hueco?.[1];
    if (clave !== undefined && Object.prototype.hasOwnProperty.call(valores, clave)) {
      return <Fragment key={i}>{valores[clave]}</Fragment>;
    }
    return <Fragment key={i}>{conFormato(trozo)}</Fragment>;
  });
}

/**
 * El mismo texto sin nada de formato, para donde no cabe un elemento: un `title`,
 * un `aria-label`, un `<meta description>`. Si se olvidara, al usuario de un
 * lector de pantalla le leerían los asteriscos.
 */
export function sinFormato(texto: string): string {
  return texto
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/_([^_]+)_/g, "$1");
}
