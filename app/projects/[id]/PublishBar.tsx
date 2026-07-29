"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** El TXT alternativo que devuelve la API cuando no ve el dominio apuntando aquí. */
type RegistroTxt = { nombre: string; valor: string };

export function PublishBar({
  projectId, subdominio, dominio, publishedSnapshotId, currentSnapshotId, sitesBaseDomain, dnsTargetIp, noIndexar,
}: {
  projectId: string;
  subdominio: string | null;
  dominio: string | null;
  publishedSnapshotId: string | null;
  currentSnapshotId: string | null;
  sitesBaseDomain: string;
  dnsTargetIp: string;
  noIndexar: boolean;
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
  const host = subdominio ? `${subdominio}.${sitesBaseDomain}` : null;
  const url = subdominio ? `${proto}//${subdominio}.${sitesBaseDomain}` : null;

  const estadoDom = dominio
    ? "Dominio propio activo"
    : subdominio
      ? "Subdominio activo · sin dominio propio"
      : "Sin dirección";

  async function llamar(metodo: "POST" | "DELETE") {
    setOcupado(true); setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/publish`, { method: metodo });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); setConfirmando(false); return; }
      setConfirmando(false);
      router.refresh();
    } finally {
      setOcupado(false);
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

  const dns = (
    <div className="bloque-codigo">
      <div className="linea"><span className="etiqueta-dns">Tipo A</span><span>@ &nbsp;→&nbsp; {dnsTargetIp}</span></div>
      <div className="linea"><span className="etiqueta-dns">Tipo A</span><span>www &nbsp;→&nbsp; {dnsTargetIp}</span></div>
    </div>
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
            {!publicado ? "Publicar" : sinPublicar ? "Publicar cambios" : "Republicar"}
          </button>
        </div>
      </div>

      {/* Dirección y dominio: plegado y ordenado */}
      <details className="direccion">
        <summary><span className="flecha">▸</span> Dirección y dominio <span className="estado-dom">{estadoDom}</span></summary>
        <div className="direccion-cuerpo">
          {subdominio !== null && (
            <div className="grupo">
              <h4>Subdominio</h4>
              <p>La dirección gratuita de tu web en Estrénala.</p>
              <div className="fila">
                <input className="campo" style={{ width: 240, maxWidth: "100%" }} value={sub}
                  onChange={(e) => setSub(e.target.value)} placeholder="mi-subdominio" />
                <span style={{ color: "var(--color-texto-3)", fontSize: 13 }}>.{sitesBaseDomain}</span>
                <button className="btn btn-sec btn-sm" onClick={() => void patch({ subdominio: sub })} disabled={ocupado}>Cambiar</button>
              </div>
            </div>
          )}

          <div className="grupo">
            <h4>Dominio propio <span className="quees" title="Los registros DNS son como la dirección postal de tu dominio.">?</span></h4>
            {dominio ? (
              <>
                <p>Conectado a <a href={`https://${dominio}`} target="_blank" rel="noreferrer">{dominio}</a>. Mantén estos registros en tu proveedor:</p>
                {dns}
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
                <p>Conecta tu dominio (p. ej. <b>tuempresa.com</b>) apuntando estos dos registros en tu proveedor:</p>
                {dns}
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
