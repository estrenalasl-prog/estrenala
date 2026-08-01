import type { Metadata } from "next";
import { PaginaLegal } from "../PaginaLegal";
import { TITULAR } from "@/src/legal/titular";
import { idAds } from "@/src/config/ads";
import { CambiarDecision } from "./CambiarDecision";

export const metadata: Metadata = {
  title: "Política de cookies · Estrénala",
  description: "Estrénala solo usa cookies técnicas necesarias para mantener tu sesión. Sin analítica ni publicidad.",
};

export default function Cookies() {
  // Esta página no puede AFIRMAR que no hay publicidad: dejaría de ser verdad el día
  // que se configure GOOGLE_ADS_ID, y una política de cookies que miente es peor que
  // no tenerla. Se redacta según lo que de verdad está activo en cada momento.
  const ads = Boolean(idAds());
  return (
    <PaginaLegal titulo="Política de cookies">
      <p>
        En <b>{TITULAR.marca}</b> usamos <b>cookies técnicas</b>, las imprescindibles para que
        puedas iniciar sesión y trabajar. Nuestra analítica de visitas es <b>sin cookies</b>:
        no guarda nada en tu equipo.
      </p>
      {ads ? (
        <p>
          Además usamos <b>cookies de Google</b> para medir si nuestros anuncios funcionan.
          Esas <b>solo se activan si las aceptas</b>: hasta entonces se cargan bloqueadas y no
          guardan nada. Por eso te mostramos el aviso la primera vez que entras, y rechazarlas
          cuesta exactamente lo mismo que aceptarlas.
        </p>
      ) : (
        <p>
          <b>No usamos cookies de analítica, publicidad ni seguimiento</b>, ni propias ni de
          terceros. Por eso no te mostramos un banner de consentimiento: la normativa no lo
          exige para las cookies estrictamente necesarias (art. 22.2 LSSI-CE).
        </p>
      )}
      {ads && <CambiarDecision />}

      <h2>Cookies que utilizamos</h2>
      <div className="tabla-scroll">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Para qué sirve</th><th>Duración</th><th>Tipo</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><code>__Host-wc_session</code></td>
              <td>Mantener tu sesión iniciada de forma segura (va firmada criptográficamente)</td>
              <td>30 días</td>
              <td>Técnica propia</td>
            </tr>
            <tr>
              <td><code>__Host-wc_org</code></td>
              <td>Recordar en qué espacio de trabajo estás, si perteneces a varios</td>
              <td>Hasta 400 días</td>
              <td>Técnica propia</td>
            </tr>
            <tr>
              <td><code>g_state</code></td>
              <td>Protegerte frente a ataques CSRF mientras inicias sesión con Google (solo si usas
                esa opción)</td>
              <td>10 minutos</td>
              <td>Técnica propia</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Todas son <b>HttpOnly</b> (no accesibles desde JavaScript) y viajan solo por conexiones
        seguras en producción.
      </p>

      <h2>Cómo eliminarlas</h2>
      <p>
        Puedes cerrar sesión desde la propia plataforma o borrar las cookies desde la configuración
        de tu navegador. Ten en cuenta que, si las bloqueas, <b>no podrás iniciar sesión</b>: son
        necesarias para el funcionamiento del servicio.
      </p>

      <h2>Las webs que publicas</h2>
      <p>
        Esta política cubre la plataforma {TITULAR.sitio}. <b>Las webs que tú publicas son tuyas</b>:
        si añades a tu web herramientas de analítica u otros servicios que usen cookies, serás tú
        quien deba informar a tus visitantes y recabar su consentimiento cuando proceda.
      </p>

      <h2>Contacto</h2>
      <p>
        Cualquier duda: <a href={`mailto:${TITULAR.email}`}>{TITULAR.email}</a>. Más información en
        nuestra <a href="/legal/privacidad">política de privacidad</a>.
      </p>
    </PaginaLegal>
  );
}
