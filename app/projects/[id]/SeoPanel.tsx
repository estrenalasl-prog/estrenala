"use client";
import { useCallback, useEffect, useState } from "react";
import type { TextosPanel } from "@/src/i18n/panel";
import { rellenar } from "@/src/i18n/rellenar";
import type { ClaveFallo, Gravedad } from "@/src/seo/examen";

type Textos = TextosPanel["proyecto"]["seo"];

type Fallo = {
  clave: ClaveFallo;
  gravedad: Gravedad;
  arreglable: boolean;
  cuantos: number;
  ejemplos: string[];
  paginas: string[];
};
type Estado =
  | { sinPublicar: true }
  | { sinPublicar?: false; nota: number; examinadas: number; totales: number; fallos: Fallo[] };

/** Los cortes del veredicto. 90 es «no le falta nada»; por debajo de 50, Google va a ciegas. */
function veredicto(nota: number, t: Textos): string {
  if (nota >= 90) return t.veredictoExcelente;
  if (nota >= 70) return t.veredictoBien;
  if (nota >= 50) return t.veredictoRegular;
  return t.veredictoMal;
}

/**
 * Corta por palabras y pone puntos suspensivos.
 *
 * Los ejemplos son títulos y descripciones ENTEROS del cliente —el fallo es
 * justo que son largos—, así que sin cortar ocupan cuatro líneas cada uno y el
 * panel deja de leerse. Con ver el principio se reconoce cuál es, que es para lo
 * único que están.
 */
function corto(s: string, max = 56): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const corte = t.slice(0, max);
  const espacio = corte.lastIndexOf(" ");
  return (espacio > max * 0.6 ? corte.slice(0, espacio) : corte) + "…";
}

function colorNota(nota: number): string {
  if (nota >= 90) return "var(--color-exito)";
  if (nota >= 70) return "var(--color-aviso)";
  return "var(--color-peligro)";
}

/**
 * El examen de SEO de una web.
 *
 * Por qué está aquí y no escondido en una ayuda: el momento en que esto vale
 * algo es justo cuando alguien acaba de subir su web y la está mirando. Ahí se
 * le enseña, sin que lo pida, lo que tiene roto y no sabía —cosas que no se ven
 * mirando la web, porque no son de diseño— y por eso la nota se ve SIN abrir el
 * panel. Si hay que abrirlo para enterarse, no se entera nadie.
 */
export function SeoPanel({ projectId, textos }: { projectId: string; textos: Textos }) {
  const t = textos;
  const [d, setD] = useState<Estado | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`/api/projects/${projectId}/seo`);
      if (!r.ok) { setError(t.errorCargar); return; }
      setD((await r.json()) as Estado);
      setError(null);
    } catch {
      setError(t.errorCargar);
    }
  }, [projectId, t.errorCargar]);

  useEffect(() => { void cargar(); }, [cargar]);

  const examen = d && !d.sinPublicar ? d : null;
  const graves = examen ? examen.fallos.filter((f) => f.gravedad === "grave").length : 0;

  const resumen = !d ? t.cargando
    : d.sinPublicar ? t.sinPublicar
    : examen!.fallos.length === 0 ? t.resumenTodoBien
    : `${examen!.nota}/100`;

  return (
    <details className="direccion" id="seo" open={graves > 0}>
      <summary>
        <span className="flecha">▸</span> {t.titulo}
        <span className="estado-dom" style={examen ? { color: colorNota(examen.nota) } : undefined}>
          {resumen}
        </span>
      </summary>
      <div className="direccion-cuerpo" style={{ display: "block" }}>

      {!d ? <p className="ayuda-campo">{error ?? t.cargando}</p>
      : d.sinPublicar ? <p className="ayuda-campo">{t.sinPublicar}</p>
      : <>
        <div className="flex items-center gap-4 mb-3">
          <div
            aria-label={`${examen!.nota}/100`}
            style={{
              fontSize: 40, fontWeight: 700, lineHeight: 1,
              color: colorNota(examen!.nota), fontVariantNumeric: "tabular-nums",
            }}
          >
            {examen!.nota}
            <span style={{ fontSize: 18, fontWeight: 500, color: "var(--color-texto-3)" }}>/100</span>
          </div>
          <div>
            <b style={{ display: "block" }}>{veredicto(examen!.nota, t)}</b>
            {/* Cuántas se han mirado de cuántas hay. Solo cuando no son todas:
                decirle «5 de 5 páginas examinadas» es ruido. */}
            {examen!.totales > examen!.examinadas && (
              <small className="ayuda-campo" style={{ marginTop: 2 }}>
                {rellenar(t.examinadas, { n: String(examen!.examinadas), total: String(examen!.totales) })}
              </small>
            )}
          </div>
        </div>

        {examen!.fallos.length === 0 ? (
          <p className="ayuda-campo">{t.todoBien}</p>
        ) : (
          <div className="lista">
            {examen!.fallos.map((f) => {
              const texto = t.fallos[f.clave];
              return (
                <div key={f.clave} className="item" style={{ display: "block" }}>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`badge ${f.gravedad === "grave" ? "badge-peligro" : "badge-aviso"}`}>
                      <span className="punto" />
                      {f.gravedad === "grave" ? t.grave : t.aviso}
                    </span>
                    <b>{texto.que}</b>
                    <span className="ayuda-campo" style={{ marginTop: 0 }}>
                      {f.paginas.length === 1 ? t.enUnaPagina : rellenar(t.enPaginas, { n: String(f.paginas.length) })}
                    </span>
                    {f.arreglable && (
                      <span className="badge badge-exito"><span className="punto" />{t.arreglable}</span>
                    )}
                  </div>
                  <p className="ayuda-campo" style={{ marginTop: 0 }}>{texto.porque}</p>

                  {/* DÓNDE está. «En 21 páginas» sin decir cuáles no sirve para
                      ir a arreglarlo, que es lo único que se quiere hacer al
                      leer esto. */}
                  <p className="ayuda-campo" style={{ marginTop: 6 }}>
                    {f.paginas.slice(0, 3).map((p, i) => (
                      <span key={p}>
                        {i > 0 && <span style={{ opacity: 0.4 }}> · </span>}
                        <code style={{ fontSize: 12 }}>{p}</code>
                      </span>
                    ))}
                    {f.paginas.length > 3 && (
                      <span> {rellenar(t.yMas, { n: String(f.paginas.length - 3) })}</span>
                    )}
                  </p>

                  {f.ejemplos.length > 0 && (
                    // Uno por línea y recortados. Antes iban pegados con «·», y
                    // como los títulos del cliente llevan «|» y «·» dentro, no
                    // se veía dónde acababa uno y empezaba el siguiente.
                    //
                    // Texto plano SIEMPRE: son trozos del HTML del cliente, y
                    // pintarlos como marcado sería dejar que su web escriba en
                    // nuestro panel.
                    <div className="ayuda-campo" style={{ marginTop: 6 }}>
                      {t.ejemplos}
                      <ul style={{ margin: "3px 0 0", padding: 0, listStyle: "none" }}>
                        {f.ejemplos.slice(0, 3).map((e, i) => (
                          <li
                            key={i}
                            style={{
                              borderLeft: "2px solid var(--color-borde)",
                              paddingLeft: 8, marginTop: 2,
                            }}
                          >
                            <code style={{ fontSize: 12 }}>{corto(e)}</code>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>}

      {error && <p className="error-campo">{error}</p>}
      </div>
    </details>
  );
}
