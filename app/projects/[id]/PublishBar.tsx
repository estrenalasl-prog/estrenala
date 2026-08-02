"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** El TXT alternativo que devuelve la API cuando no ve el dominio apuntando aquí. */
type RegistroTxt = { nombre: string; valor: string };

/**
 * El sitemap del cliente manda a Google a otro dominio.
 *
 * Se avisa y NO se corrige solo, a propósito: reescribir el dominio de otro es
 * peor que dejarlo mal, porque puede ser un sitio suyo que sí existe (el porqué
 * largo, en src/publish/seo.ts).
 *
 * Dice dónde SÍ se sirve la web, no solo dónde no. Los dos dominios suelen
 * parecerse muchísimo —normalmente uno es subdominio del otro, como
 * `prueba.suempresa.com` frente a `suempresa.com`— y sin la dirección buena
 * delante hay que adivinar cuál es cuál. Lo pidió Sebas al verlo en su web.
 *
 * Va en su propio componente para poder comprobar el TEXTO que sale: los
 * espacios en JSX se cuelan con una facilidad pasmosa y esto solo aparece en una
 * situación rara, así que nadie lo volvería a mirar.
 */
export function AvisoSitemapAjeno({ host, dominios }: { host: string | null; dominios: string[] }) {
  if (dominios.length === 0) return null;
  const varios = dominios.length > 1;
  return (
    <div className="aviso-bloque">
      <span className="icono" aria-hidden="true">⚠</span>
      <span>
        {host ? <>Tu web se sirve en <b>{host}</b>, pero tu </> : <>Tu </>}
        <code>sitemap.xml</code> le dice a Google que tus páginas están en{" "}
        {dominios.map((d, i) => (
          <span key={d}>{i > 0 && (i === dominios.length - 1 ? " y " : ", ")}<b>{d}</b></span>
        ))}
        . Google irá a buscarlas allí en vez de aquí.
        <br />
        Si {varios ? "esos dominios son tuyos, conéctalos" : "ese dominio es tuyo, conéctalo"} en
        «Dirección y dominio». Si no, borra el <code>sitemap.xml</code> de tu web y te generamos uno
        correcto.
      </span>
    </div>
  );
}

export function PublishBar({
  projectId, subdominio, dominio, publishedSnapshotId, currentSnapshotId, sitesBaseDomain, dnsTargetIp, noIndexar,
  sitemapAjeno,
}: {
  projectId: string;
  subdominio: string | null;
  dominio: string | null;
  publishedSnapshotId: string | null;
  currentSnapshotId: string | null;
  sitesBaseDomain: string;
  dnsTargetIp: string;
  noIndexar: boolean;
  /** Dominios que anuncia su sitemap y que no son suyos aquí (ver seo.ts). */
  sitemapAjeno: string[];
}) {
  const router = useRouter();
  const [sub, setSub] = useState(subdominio ?? "");
  const [dom, setDom] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [confirmandoDom, setConfirmandoDom] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [txt, setTxt] = useState<RegistroTxt | null>(null);
  const [proto, setProto] = useState("http:");
  useEffect(() => { setProto(window.location.protocol); }, []);

  const publicado = !!publishedSnapshotId;
  const sinPublicar = publicado && currentSnapshotId !== publishedSnapshotId;
  // Manda el dominio propio: en cuanto hay uno, ESA es la dirección de la web y
  // la que uno copia para mandarla. Antes esto solo miraba el subdominio, así que
  // con un dominio conectado y activo la píldora seguía enseñando la dirección
  // gratuita. La de `.estrenala.com` no desaparece: sigue a la vista (y viva) en
  // «Dirección y dominio», justo debajo.
  const host = dominio ?? (subdominio ? `${subdominio}.${sitesBaseDomain}` : null);
  const url = host ? `${proto}//${host}` : null;

  const estadoDom = dominio
    ? "Dominio propio activo"
    : subdominio
      ? "Subdominio activo · sin dominio propio"
      : "Sin dirección";

  // `ocupado` apaga TODOS los botones de la barra a la vez, así que no sirve
  // para saber cuál se pulsó. Publicar es la acción principal del panel y la que
  // más tarda (copia el sitio y mueve el puntero público): sin señal, uno cree
  // que no ha pasado nada y vuelve a darle.
  const [publicando, setPublicando] = useState(false);

  async function llamar(metodo: "POST" | "DELETE") {
    setOcupado(true); setPublicando(metodo === "POST"); setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/publish`, { method: metodo });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); setConfirmando(false); return; }
      setConfirmando(false);
      router.refresh();
    } finally {
      setOcupado(false); setPublicando(false);
    }
  }

  async function patch(body: unknown): Promise<boolean> {
    setOcupado(true); setError(null); setTxt(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string; txt?: RegistroTxt };
      if (!res.ok) {
        setError(d.error ?? "Error");
        // Solo llega cuando falla la comprobación de propiedad del dominio.
        if (d.txt) setTxt(d.txt);
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setOcupado(false);
    }
  }

  function copiar() {
    if (!host) return;
    void navigator.clipboard?.writeText(host).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    });
  }

  // Los registros dependen de QUÉ se haya conectado: un dominio pelado necesita
  // `@` y `www`; un subdominio (blog.tudominio.com) solo su primera parte. Antes
  // se enseñaba siempre `@` y `www`, así que a quien conectaba un subdominio se
  // le daban instrucciones equivocadas — y seguir esas al pie de la letra tira su
  // web principal, porque `@` es justo la raíz del dominio.
  //
  // No se adivina cuál es cuál: `midominio.co.uk` tiene tres etiquetas y sigue
  // siendo un dominio pelado. Así que con uno ya conectado se enseña la dirección
  // exacta que tiene que resolver a nuestra IP, y aparte se explica el campo
  // «Nombre», que es donde cada proveedor hace lo suyo.
  // Lo que el usuario teclea puede venir pegado del navegador («https://x.com/»).
  // Se limpia solo para ENSEÑAR los registros; lo que se envía al conectar sigue
  // siendo lo que escribió, que ya valida el servidor.
  const paraDns = (v: string): string | null => {
    const limpio = v.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    return limpio.includes(".") ? limpio : null;
  };

  const dns = (d: string | null) => (
    <>
      <div className="bloque-codigo">
        {d ? (
          <div className="linea"><span className="etiqueta-dns">Tipo A</span><span>{d} &nbsp;→&nbsp; {dnsTargetIp}</span></div>
        ) : (
          <>
            <div className="linea"><span className="etiqueta-dns">Tipo A</span><span>@ &nbsp;→&nbsp; {dnsTargetIp}</span></div>
            <div className="linea"><span className="etiqueta-dns">Tipo A</span><span>www &nbsp;→&nbsp; {dnsTargetIp}</span></div>
          </>
        )}
      </div>
      <small style={{ display: "block", marginTop: 6, color: "var(--color-texto-3)", lineHeight: 1.5 }}>
        En el campo <b>Nombre</b> de tu proveedor va solo la parte de delante: <code>@</code> si es tu
        dominio pelado, o <code>blog</code> si conectas <code>blog.tudominio.com</code>. Con el dominio
        pelado, añade además <code>www</code> apuntando a la misma IP.
      </small>
    </>
  );

  return (
    <div>
      {/* Barra de publicar: LA acción */}
      <div className="publicar">
        <span className="pastilla-url">
          {host ? (publicado && url
            ? <a href={url} target="_blank" rel="noreferrer">{host}</a>
            : <span>{host}</span>
          ) : <span style={{ color: "var(--color-texto-3)" }}>Sin dirección aún</span>}
          {host && <button className="copiar" onClick={copiar}>{copiado ? "Copiado" : "Copiar"}</button>}
        </span>
        <div className="derecha">
          {/* Bien visible: es fácil olvidarse el interruptor puesto y no entender
              nunca por qué la web no sale en Google. */}
          {publicado && noIndexar && (
            <span className="badge badge-aviso" title="Nadie la encontrará buscando en Google. Se cambia en «Dirección y dominio».">
              <span className="punto" />Oculta en Google
            </span>
          )}
          {!publicado && <span className="badge badge-neutro"><span className="punto" />Sin publicar</span>}
          {publicado && !sinPublicar && <span className="exito-inline"><span className="punto" />Publicado</span>}
          {sinPublicar && <span className="aviso-inline"><span className="punto" />Tienes cambios sin publicar</span>}
          <button className="btn btn-primario" onClick={() => void llamar("POST")} disabled={ocupado}>
            {publicando
              ? <><span className="cargador" /> Publicando…</>
              : !publicado ? "Publicar" : sinPublicar ? "Publicar cambios" : "Republicar"}
          </button>
        </div>
      </div>

      {/* Su sitemap manda a Google a otro sitio. Solo una vez publicada: antes de
          publicar nadie lo está leyendo, y el orden natural es publicar primero y
          conectar el dominio después — avisar antes sería enseñarle a ignorar
          los avisos. NO se corrige solo, a propósito: el porqué, en seo.ts. */}
      {publicado && <AvisoSitemapAjeno host={host} dominios={sitemapAjeno} />}

      {/* Dirección y dominio: plegado y ordenado */}
      <details className="direccion">
        <summary><span className="flecha">▸</span> Dirección y dominio <span className="estado-dom">{estadoDom}</span></summary>
        <div className="direccion-cuerpo">
          {/* SIEMPRE visible, tenga dirección o no. Estuvo condicionado a
              `subdominio !== null`, y como una web recién creada nace sin
              subdominio, el campo para ponerle la primera dirección no aparecía
              nunca: lo único que se veía era «Dominio propio», que es de pago.
              O sea que nadie del plan gratuito podía publicar. */}
          <div className="grupo">
            <h4>Subdominio</h4>
            <p>La dirección gratuita de tu web en Estrénala.</p>
            <div className="fila">
              <input className="campo" style={{ width: 240, maxWidth: "100%" }} value={sub}
                onChange={(e) => setSub(e.target.value)} placeholder="mi-subdominio" />
              <span style={{ color: "var(--color-texto-3)", fontSize: 13 }}>.{sitesBaseDomain}</span>
              <button className="btn btn-sec btn-sm" onClick={() => void patch({ subdominio: sub })} disabled={ocupado}>
                {subdominio ? "Cambiar" : "Guardar"}
              </button>
            </div>
          </div>

          <div className="grupo">
            <h4>Dominio propio <span className="quees" title="Los registros DNS son como la dirección postal de tu dominio.">?</span></h4>
            {dominio ? (
              <>
                <p>Conectado a <a href={`https://${dominio}`} target="_blank" rel="noreferrer">{dominio}</a>. Mantén este registro en tu proveedor:</p>
                {dns(dominio)}
                {!confirmandoDom ? (
                  <div className="fila">
                    <button className="btn btn-peligro-sutil btn-sm" onClick={() => setConfirmandoDom(true)} disabled={ocupado}>Quitar dominio</button>
                  </div>
                ) : (
                  <div className="confirm2">
                    <span className="msg"><b>¿Seguro?</b> Se dejará de usar {dominio}; la web seguirá en el subdominio.</span>
                    <button className="btn btn-fantasma btn-sm" onClick={() => setConfirmandoDom(false)}>No, dejarlo</button>
                    <button className="btn btn-peligro-sutil btn-sm" onClick={() => void patch({ dominio: null }).then(() => setConfirmandoDom(false))} disabled={ocupado}>Sí, quitar</button>
                  </div>
                )}
              </>
            ) : (
              <>
                <p>Conecta tu dominio (p. ej. <b>tuempresa.com</b>) apuntando estos registros en tu proveedor:</p>
                {/* En vivo, según lo que va escribiendo. El arreglo anterior solo
                    acertaba DESPUÉS de conectar, y las instrucciones se leen
                    ANTES: quien iba a conectar un subdominio seguía viendo `@` y
                    `www`, que son los registros de su dominio principal. */}
                {dns(paraDns(dom))}
                <div className="fila">
                  <input className="campo" style={{ width: 240, maxWidth: "100%" }} value={dom}
                    onChange={(e) => setDom(e.target.value)} placeholder="tudominio.com" />
                  <button className="btn btn-sec btn-sm" onClick={() => void patch({ dominio: dom })} disabled={ocupado || !dom.trim()}>Conectar</button>
                </div>
              </>
            )}
          </div>

          <div className="grupo">
            <h4>Visibilidad en Google</h4>
            <div className="fila-conf">
              <div className="info">
                <b>Que Google no la encuentre todavía</b>
                <small>
                  {noIndexar
                    ? "Pedimos a los buscadores que no la muestren. Quítalo cuando la web esté lista."
                    : "Actívalo mientras la estás preparando. La web sigue online: solo se le pide a los buscadores que no la listen."}
                </small>
              </div>
              <div className="control">
                <button type="button" role="switch" aria-checked={noIndexar} className="interruptor"
                  aria-label="Que Google no la encuentre todavía"
                  onClick={() => void patch({ noIndexar: !noIndexar })} disabled={ocupado} />
              </div>
            </div>
            {noIndexar && (
              <p style={{ marginTop: 10 }}>
                No es un candado: quien tenga la dirección seguirá entrando. Si no quieres que la vea
                <b> nadie</b>, despublica la web.
              </p>
            )}
          </div>

          {publicado && (
            <div className="grupo zona-peligro">
              {!confirmando ? (
                <div className="fila" style={{ justifyContent: "space-between" }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <h4>Despublicar la web</h4>
                    <p style={{ margin: 0 }}>Dejará de verse en internet. Podrás volver a publicarla cuando quieras.</p>
                  </div>
                  <button className="btn btn-peligro-sutil btn-sm" onClick={() => setConfirmando(true)} disabled={ocupado}>Despublicar</button>
                </div>
              ) : (
                <div className="confirm2">
                  <span className="msg"><b>¿Seguro?</b> La web dejará de verse{host ? ` en ${host}` : ""} al momento.</span>
                  <button className="btn btn-fantasma btn-sm" onClick={() => setConfirmando(false)}>No, dejarla</button>
                  <button className="btn btn-peligro-sutil btn-sm" onClick={() => void llamar("DELETE")} disabled={ocupado}>Sí, despublicar</button>
                </div>
              )}
            </div>
          )}
        </div>
      </details>

      {error && <p className="error-campo" style={{ marginTop: 10 }}>{error}</p>}

      {/* Salida para quien tenga el dominio detrás de un proxy (Cloudflare en
          naranja): ahí el registro A resuelve al proxy y nunca a nosotros, así
          que hace falta otra forma de demostrar que el dominio es suyo. */}
      {txt && (
        <div className="grupo" style={{ marginTop: 10 }}>
          <p style={{ marginTop: 0 }}>
            Si acabas de tocar el DNS, dale unos minutos y vuelve a intentarlo. Y si tu dominio
            pasa por un proxy (por ejemplo Cloudflare), añade además este registro <b>TXT</b>:
          </p>
          <div className="bloque-codigo">
            <div className="linea"><span className="etiqueta-dns">Nombre</span><span>{txt.nombre}</span></div>
            <div className="linea"><span className="etiqueta-dns">Valor</span><span>{txt.valor}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
