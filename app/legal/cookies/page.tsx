import type { Metadata } from "next";
import { PaginaLegal } from "../PaginaLegal";
import { TITULAR } from "@/src/legal/titular";
import { idAds } from "@/src/config/ads";
import { CambiarDecision } from "./CambiarDecision";
import { textosLegal } from "@/src/i18n/legal";
import { idiomaDeSesion } from "@/src/i18n/servidor";
import { conFormato, conValores } from "@/src/i18n/formato";

// Es el ÚNICO de los cuatro documentos traducido, y la razón es que es el único
// al que enlaza algo traducido: el banner de cookies sale en el idioma del
// visitante, y mandarlo desde un banner en francés a una página en español es una
// incoherencia que se ve. Los otros tres son el contrato (ver i18n/legal/tipos.ts).
export async function generateMetadata(): Promise<Metadata> {
  const t = textosLegal(await idiomaDeSesion()).politicaCookies;
  return { title: t.metaTitulo, description: t.metaDescripcion };
}

export default async function Cookies() {
  const textos = textosLegal(await idiomaDeSesion());
  const t = textos.politicaCookies;
  // Esta página no puede AFIRMAR que no hay publicidad: dejaría de ser verdad el día
  // que se configure GOOGLE_ADS_ID, y una política de cookies que miente es peor que
  // no tenerla. Se redacta según lo que de verdad está activo en cada momento.
  const ads = Boolean(idAds());

  return (
    <PaginaLegal titulo={t.titulo}>
      {/* El nombre de la marca entra por el hueco, no dentro de la frase: si se
          pusiera `**{marca}**` la negrita quedaría a caballo del hueco y saldrían
          los asteriscos a la vista (hay un test que lo vigila). */}
      <p>{conValores(t.intro, { marca: <b>{TITULAR.marca}</b> })}</p>
      <p>{conFormato(ads ? t.conAds : t.sinAds)}</p>
      {ads && <CambiarDecision texto={t.cambiarDecision} />}

      <h2>{t.tablaTitulo}</h2>
      <div className="tabla-scroll">
        <table>
          <thead>
            <tr><th>{t.thNombre}</th><th>{t.thPara}</th><th>{t.thDuracion}</th><th>{t.thTipo}</th></tr>
          </thead>
          <tbody>
            {/* Los nombres de las cookies NO se traducen: son literales que el
                usuario va a ver tal cual en su navegador. */}
            <tr>
              <td><code>__Host-wc_session</code></td>
              <td>{t.sesionPara}</td>
              <td>{t.sesionDuracion}</td>
              <td>{t.tecnicaPropia}</td>
            </tr>
            <tr>
              <td><code>__Host-wc_org</code></td>
              <td>{t.espacioPara}</td>
              <td>{t.espacioDuracion}</td>
              <td>{t.tecnicaPropia}</td>
            </tr>
            <tr>
              <td><code>g_state</code></td>
              <td>{t.googlePara}</td>
              <td>{t.googleDuracion}</td>
              <td>{t.tecnicaPropia}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>{conFormato(t.httpOnly)}</p>

      <h2>{t.eliminarTitulo}</h2>
      <p>{conFormato(t.eliminarTexto)}</p>

      <h2>{t.tusWebsTitulo}</h2>
      <p>{conValores(t.tusWebsTexto, { sitio: TITULAR.sitio })}</p>

      <h2>{t.contactoTitulo}</h2>
      <p>
        {conValores(t.contactoTexto, {
          email: <a href={`mailto:${TITULAR.email}`}>{TITULAR.email}</a>,
          // El destino está en español, pero la etiqueta va traducida: quien
          // llegue allí se encuentra el aviso del idioma en el suyo.
          privacidad: <a href="/legal/privacidad">{textos.paginas.privacidad}</a>,
        })}
      </p>
    </PaginaLegal>
  );
}
