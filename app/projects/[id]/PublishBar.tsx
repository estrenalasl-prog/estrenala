"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { TextosPanel } from "@/src/i18n/panel";
import type { Veredicto } from "@/src/publish/verificar-dominio";
import { conFormato, conValores } from "@/src/i18n/formato";

/** El TXT alternativo que devuelve la API cuando no ve el dominio apuntando aquí. */
type RegistroTxt = { nombre: string; valor: string };

type Textos = TextosPanel["proyecto"];

/**
 * Lo que el DNS del dominio dice AHORA MISMO, contado en cristiano.
 *
 * Antes esta pantalla solo sabía decir «todavía no veo que ese dominio apunte
 * aquí», y con eso el dueño se quedaba mirando un registro A que estaba
 * perfecto sin entender nada. Los dos casos que lo provocan de verdad son
 * invisibles desde el panel de cualquier proveedor:
 *
 *   · AAAA que se quedaron del hosting anterior. El registro A está bien, pero
 *     los navegadores prefieren IPv6 y siguen yendo a la web vieja.
 *   · el `www` sin apuntar, que no rompe el dominio pelado y por eso nadie mira.
 *
 * Se decide por el campo `tipo` y NUNCA por el texto del mensaje: al traducirlo
 * a los otros cuatro idiomas, cualquier comparación de cadenas se rompería sin
 * hacer ruido.
 */
export function Diagnostico({
  dns, t,
}: { dns: Veredicto | null; t: Textos["direccion"] }) {
  // Todo en orden y sin nada que contar: no se dice nada. Una pantalla que
  // felicita cada vez que algo va bien acaba siendo ruido que no se lee.
  if (!dns || (dns.ok && dns.estorbos.length === 0)) return null;

  return (
    <div className="grupo" style={{ marginTop: 10 }}>
      <p style={{ marginTop: 0, fontWeight: 600 }}>{t.dnsTitulo}</p>

      {dns.proveedor && (
        <p className="ayuda-campo" style={{ marginTop: 4 }}>
          {conValores(t.dnsProveedor, { proveedor: <b>{dns.proveedor}</b> })}
        </p>
      )}

      {dns.apuntaA.length > 0 ? (
        <div className="bloque-codigo" style={{ marginTop: 8 }}>
          <div className="linea">
            <span className="etiqueta-dns">{t.dnsApuntaA}</span>
            <span>{dns.apuntaA.join(", ")}</span>
          </div>
        </div>
      ) : (
        <p className="ayuda-campo" style={{ marginTop: 8 }}>{t.dnsNoApunta}</p>
      )}

      {dns.estorbos.map((e) => (
        <div key={e.tipo} style={{ marginTop: 12 }}>
          <p style={{ margin: "0 0 4px", fontWeight: 600 }}>
            {conFormato(e.tipo === "ipv6" ? t.dnsIpv6Titulo : t.dnsWwwTitulo)}
          </p>
          {e.tipo === "ipv6" && (
            <div className="bloque-codigo" style={{ marginBottom: 6 }}>
              {e.valores.map((v) => (
                <div className="linea" key={v}><span className="etiqueta-dns">AAAA</span><span>{v}</span></div>
              ))}
            </div>
          )}
          <small style={{ display: "block", color: "var(--color-texto-3)", lineHeight: 1.5 }}>
            {conFormato(e.tipo === "ipv6" ? t.dnsIpv6Texto : t.dnsWwwTexto)}
          </small>
        </div>
      ))}
    </div>
  );
}

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
 * situación rara, así que nadie lo volvería a mirar. Era justo eso —seis trozos
 * de JSX con `{" "}` entre medias— hasta que hubo que traducirlo: ahora es UNA
 * frase por idioma, que además es lo único con lo que un traductor puede
 * reordenarla sin romper nada.
 */
export function AvisoSitemapAjeno({
  host, dominios, t,
}: { host: string | null; dominios: string[]; t: Textos["sitemap"] }) {
  if (dominios.length === 0) return null;
  const varios = dominios.length > 1;
  // «a.com, b.com y c.com», cada uno en negrita. Del idioma sale solo la
  // conjunción del final; los dominios van como elementos y no como texto, que
  // es lo que impide que un `_` o un `*` en uno de ellos se lea como formato.
  const lista = dominios.map((d, i) => (
    <span key={d}>{i > 0 && (i === dominios.length - 1 ? ` ${t.y} ` : ", ")}<b>{d}</b></span>
  ));

  return (
    <div className="aviso-bloque">
      <span className="icono" aria-hidden="true">⚠</span>
      <span>
        {host
          ? conValores(t.conHost, { host: <b>{host}</b>, dominios: lista })
          : conValores(t.sinHost, { dominios: lista })}
        <br />
        {conFormato(varios ? t.arreglaVarios : t.arreglaUno)}
      </span>
    </div>
  );
}

export function PublishBar({
  projectId, subdominio, dominio, publishedSnapshotId, currentSnapshotId, sitesBaseDomain, dnsTargetIp, noIndexar,
  sitemapAjeno, t,
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
  t: Textos;
}) {
  const router = useRouter();
  const [sub, setSub] = useState(subdominio ?? "");
  const [dom, setDom] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [confirmandoDom, setConfirmandoDom] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  /**
   * El fallo se guarda junto al sitio donde hay que enseñarlo.
   *
   * Publicar se hace desde fuera del desplegable y la dirección desde dentro.
   * Con un único hueco de error había que elegir, y el elegido —fuera— dejaba
   * los de la dirección por debajo de «Despublicar la web»: al conectar un
   * dominio, el mensaje aparecía fuera de la pantalla y parecía que el botón no
   * hacía nada. Costó una hora el 2026-08-05.
   */
  const [error, setError] = useState<{ texto: string; en: "publicar" | "direccion" } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [txt, setTxt] = useState<RegistroTxt | null>(null);
  const [diagnostico, setDiagnostico] = useState<Veredicto | null>(null);
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
    ? t.direccion.estadoDominio
    : subdominio
      ? t.direccion.estadoSubdominio
      : t.direccion.estadoNada;

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
      // Publicar es el botón de arriba; despublicar vive dentro del desplegable.
      if (!res.ok) {
        setError({ texto: d.error ?? t.errores.generico, en: metodo === "POST" ? "publicar" : "direccion" });
        setConfirmando(false); return;
      }
      setConfirmando(false);
      router.refresh();
    } finally {
      setOcupado(false); setPublicando(false);
    }
  }

  async function patch(body: unknown): Promise<boolean> {
    setOcupado(true); setError(null); setTxt(null); setDiagnostico(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await res.json().catch(() => ({}))) as {
        error?: string; txt?: RegistroTxt; dns?: Veredicto;
      };
      // El diagnóstico se guarda pase lo que pase: al fallar explica por qué, y
      // al conectar bien es lo único que avisa de que el `www` se quedó suelto.
      if (d.dns) setDiagnostico(d.dns);
      if (!res.ok) {
        // Sin mensaje nuestro, la respuesta NO viene de la aplicación: la ha
        // fabricado algo de por medio (un proxy que cortó por tiempo, una pasarela
        // caída). Sale el código, que es lo único que distingue un caso del otro.
        // Un «Algo ha fallado» a secas no se puede ni contar por teléfono.
        setError({ texto: d.error ?? `${t.errores.generico} (${res.status})`, en: "direccion" });
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
          <div className="linea"><span className="etiqueta-dns">{t.direccion.tipoA}</span><span>{d} &nbsp;→&nbsp; {dnsTargetIp}</span></div>
        ) : (
          <>
            <div className="linea"><span className="etiqueta-dns">{t.direccion.tipoA}</span><span>@ &nbsp;→&nbsp; {dnsTargetIp}</span></div>
            <div className="linea"><span className="etiqueta-dns">{t.direccion.tipoA}</span><span>www &nbsp;→&nbsp; {dnsTargetIp}</span></div>
          </>
        )}
      </div>
      <small style={{ display: "block", marginTop: 6, color: "var(--color-texto-3)", lineHeight: 1.5 }}>
        {conFormato(t.direccion.dnsAyuda)}
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
          ) : <span style={{ color: "var(--color-texto-3)" }}>{t.publicar.sinDireccion}</span>}
          {host && <button className="copiar" onClick={copiar}>{copiado ? t.publicar.copiado : t.publicar.copiar}</button>}
        </span>
        <div className="derecha">
          {/* Bien visible: es fácil olvidarse el interruptor puesto y no entender
              nunca por qué la web no sale en Google. */}
          {publicado && noIndexar && (
            <span className="badge badge-aviso" title={t.publicar.ocultaTitulo}>
              <span className="punto" />{t.publicar.oculta}
            </span>
          )}
          {!publicado && <span className="badge badge-neutro"><span className="punto" />{t.publicar.sinPublicar}</span>}
          {publicado && !sinPublicar && <span className="exito-inline"><span className="punto" />{t.publicar.publicado}</span>}
          {sinPublicar && <span className="aviso-inline"><span className="punto" />{t.publicar.tienesCambios}</span>}
          <button className="btn btn-primario" onClick={() => void llamar("POST")} disabled={ocupado}>
            {publicando
              ? <><span className="cargador" /> {t.publicar.publicando}</>
              : !publicado ? t.publicar.publicar : sinPublicar ? t.publicar.publicarCambios : t.publicar.republicar}
          </button>
        </div>
      </div>

      {/* Su sitemap manda a Google a otro sitio. Solo una vez publicada: antes de
          publicar nadie lo está leyendo, y el orden natural es publicar primero y
          conectar el dominio después — avisar antes sería enseñarle a ignorar
          los avisos. NO se corrige solo, a propósito: el porqué, en seo.ts. */}
      {publicado && <AvisoSitemapAjeno host={host} dominios={sitemapAjeno} t={t.sitemap} />}

      {/* Dirección y dominio: plegado y ordenado */}
      <details className="direccion">
        <summary><span className="flecha">▸</span> {t.direccion.titulo} <span className="estado-dom">{estadoDom}</span></summary>
        <div className="direccion-cuerpo">
          {/* SIEMPRE visible, tenga dirección o no. Estuvo condicionado a
              `subdominio !== null`, y como una web recién creada nace sin
              subdominio, el campo para ponerle la primera dirección no aparecía
              nunca: lo único que se veía era «Dominio propio», que es de pago.
              O sea que nadie del plan gratuito podía publicar. */}
          <div className="grupo">
            <h4>{t.direccion.subdominioTitulo}</h4>
            <p>{t.direccion.subdominioTexto}</p>
            <div className="fila">
              <input className="campo" style={{ width: 240, maxWidth: "100%" }} value={sub}
                onChange={(e) => setSub(e.target.value)} placeholder={t.direccion.subdominioEjemplo} />
              <span style={{ color: "var(--color-texto-3)", fontSize: 13 }}>.{sitesBaseDomain}</span>
              <button className="btn btn-sec btn-sm" onClick={() => void patch({ subdominio: sub })} disabled={ocupado}>
                {subdominio ? t.direccion.cambiar : t.direccion.guardar}
              </button>
            </div>
          </div>

          <div className="grupo">
            <h4>{t.direccion.dominioTitulo} <span className="quees" title={t.direccion.dominioQueEs}>?</span></h4>
            {dominio ? (
              <>
                <p>
                  {t.direccion.conectadoAntes}
                  <a href={`https://${dominio}`} target="_blank" rel="noreferrer">{dominio}</a>
                  {t.direccion.conectadoDespues}
                </p>
                {dns(dominio)}
                {!confirmandoDom ? (
                  <div className="fila">
                    <button className="btn btn-peligro-sutil btn-sm" onClick={() => setConfirmandoDom(true)} disabled={ocupado}>{t.direccion.quitarDominio}</button>
                  </div>
                ) : (
                  <div className="confirm2">
                    <span className="msg">{conValores(t.direccion.quitarSeguro, { dominio })}</span>
                    <button className="btn btn-fantasma btn-sm" onClick={() => setConfirmandoDom(false)}>{t.direccion.quitarNo}</button>
                    <button className="btn btn-peligro-sutil btn-sm" onClick={() => void patch({ dominio: null }).then(() => setConfirmandoDom(false))} disabled={ocupado}>{t.direccion.quitarSi}</button>
                  </div>
                )}
              </>
            ) : (
              <>
                <p>{conFormato(t.direccion.conecta)}</p>
                {/* En vivo, según lo que va escribiendo. El arreglo anterior solo
                    acertaba DESPUÉS de conectar, y las instrucciones se leen
                    ANTES: quien iba a conectar un subdominio seguía viendo `@` y
                    `www`, que son los registros de su dominio principal. */}
                {dns(paraDns(dom))}
                <div className="fila">
                  <input className="campo" style={{ width: 240, maxWidth: "100%" }} value={dom}
                    onChange={(e) => setDom(e.target.value)} placeholder={t.direccion.dominioEjemplo} />
                  <button className="btn btn-sec btn-sm" onClick={() => void patch({ dominio: dom })} disabled={ocupado || !dom.trim()}>{t.direccion.conectar}</button>
                </div>
              </>
            )}
          </div>

          {/* Pegado al grupo del dominio, que es el botón que falla de verdad
              (DNS, plan, servidor). Fuera del desplegable esto caía por debajo
              de la zona de peligro y no se veía. */}
          {error?.en === "direccion" && <p className="error-campo" style={{ marginTop: 10 }}>{error.texto}</p>}

          {/* Lo que el DNS dice AHORA MISMO. Sale tanto cuando falla como cuando
              se conecta bien: se puede haber conectado y seguir faltando el
              `www`. Es la diferencia entre «no puedo conectarlo» y «esto es lo
              que le falta y dónde tocarlo». */}
          <Diagnostico dns={diagnostico} t={t.direccion} />

          {/* Salida para quien tenga el dominio detrás de un proxy (Cloudflare en
              naranja): ahí el registro A resuelve al proxy y nunca a nosotros, así
              que hace falta otra forma de demostrar que el dominio es suyo. */}
          {txt && (
            <div className="grupo" style={{ marginTop: 10 }}>
              <p style={{ marginTop: 0 }}>{conFormato(t.direccion.txtIntro)}</p>
              <div className="bloque-codigo">
                <div className="linea"><span className="etiqueta-dns">{t.direccion.txtNombre}</span><span>{txt.nombre}</span></div>
                <div className="linea"><span className="etiqueta-dns">{t.direccion.txtValor}</span><span>{txt.valor}</span></div>
              </div>
            </div>
          )}

          <div className="grupo">
            <h4>{t.direccion.googleTitulo}</h4>
            <div className="fila-conf">
              <div className="info">
                <b>{t.direccion.googleEtiqueta}</b>
                <small>{noIndexar ? t.direccion.googleActivo : t.direccion.googleInactivo}</small>
              </div>
              <div className="control">
                <button type="button" role="switch" aria-checked={noIndexar} className="interruptor"
                  aria-label={t.direccion.googleEtiqueta}
                  onClick={() => void patch({ noIndexar: !noIndexar })} disabled={ocupado} />
              </div>
            </div>
            {noIndexar && <p style={{ marginTop: 10 }}>{conFormato(t.direccion.googleNoEsCandado)}</p>}
          </div>

          {publicado && (
            <div className="grupo zona-peligro">
              {!confirmando ? (
                <div className="fila" style={{ justifyContent: "space-between" }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <h4>{t.direccion.despublicarTitulo}</h4>
                    <p style={{ margin: 0 }}>{t.direccion.despublicarTexto}</p>
                  </div>
                  <button className="btn btn-peligro-sutil btn-sm" onClick={() => setConfirmando(true)} disabled={ocupado}>{t.direccion.despublicar}</button>
                </div>
              ) : (
                <div className="confirm2">
                  <span className="msg">
                    {host
                      ? conValores(t.direccion.despublicarSeguroConHost, { host })
                      : conFormato(t.direccion.despublicarSeguro)}
                  </span>
                  <button className="btn btn-fantasma btn-sm" onClick={() => setConfirmando(false)}>{t.direccion.despublicarNo}</button>
                  <button className="btn btn-peligro-sutil btn-sm" onClick={() => void llamar("DELETE")} disabled={ocupado}>{t.direccion.despublicarSi}</button>
                </div>
              )}
            </div>
          )}
        </div>
      </details>

      {error?.en === "publicar" && <p className="error-campo" style={{ marginTop: 10 }}>{error.texto}</p>}
    </div>
  );
}
