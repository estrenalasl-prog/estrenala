import type { Metadata } from "next";
import { PaginaLegal } from "../PaginaLegal";
import { TITULAR, direccionCompleta } from "@/src/legal/titular";

export const metadata: Metadata = {
  title: "Política de privacidad · Estrénala",
  description: "Qué datos trata Estrénala, para qué, con qué base legal, con quién se comparten y cómo ejercer tus derechos.",
};

export default function Privacidad() {
  return (
    <PaginaLegal titulo="Política de privacidad">
      <p>
        Esta política explica qué datos personales tratamos en <b>{TITULAR.marca}</b>, para qué,
        durante cuánto tiempo y qué derechos tienes. Está redactada conforme al Reglamento (UE)
        2016/679 (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD).
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <div className="datos">
        <p><b>Responsable:</b> {TITULAR.nombre}</p>
        <p><b>NIF:</b> {TITULAR.nif || "— (pendiente)"}</p>
        <p><b>Domicilio:</b> {direccionCompleta()}</p>
        <p><b>Contacto:</b> <a href={`mailto:${TITULAR.email}`}>{TITULAR.email}</a></p>
      </div>

      <h2>2. Qué datos tratamos y para qué</h2>
      <div className="tabla-scroll">
        <table>
          <thead>
            <tr><th>Datos</th><th>Para qué</th><th>Base legal</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Nombre y correo electrónico; contraseña (guardada <b>cifrada</b>, nunca en claro)</td>
              <td>Crear y mantener tu cuenta, identificarte y darte soporte</td>
              <td>Ejecución del contrato (art. 6.1.b RGPD)</td>
            </tr>
            <tr>
              <td>Identificador de tu cuenta de Google (solo si eliges «Continuar con Google»)</td>
              <td>Permitirte entrar sin contraseña</td>
              <td>Ejecución del contrato</td>
            </tr>
            <tr>
              <td>Correos transaccionales (verificación, recuperar contraseña, invitaciones)</td>
              <td>Confirmar tu identidad y el funcionamiento de la cuenta</td>
              <td>Ejecución del contrato</td>
            </tr>
            <tr>
              <td>Los archivos de tu web y su historial de versiones</td>
              <td>Alojarla, publicarla y permitirte editarla y revertir cambios</td>
              <td>Ejecución del contrato</td>
            </tr>
            <tr>
              <td>Claves de API que conectes voluntariamente (p. ej. de IA)</td>
              <td>Usar, solo cuando tú lo pidas, las funciones de IA con tu propia clave</td>
              <td>Consentimiento (art. 6.1.a RGPD); puedes borrarlas cuando quieras</td>
            </tr>
            <tr>
              <td>Datos técnicos mínimos de funcionamiento y registros del servidor</td>
              <td>Seguridad, prevención de abusos y diagnóstico de incidencias</td>
              <td>Interés legítimo (art. 6.1.f RGPD)</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <b>No hacemos perfilado ni publicidad</b>, no vendemos datos a terceros y no usamos cookies
        de seguimiento (ver la <a href="/legal/cookies">política de cookies</a>).
      </p>

      <h2>3. Contenido que publicas</h2>
      <p>
        Si tu web incluye formularios u otras funciones que recojan datos de tus visitantes,{" "}
        <b>el responsable de ese tratamiento eres tú</b>, no {TITULAR.marca}. Deberás informar a
        tus visitantes y cumplir la normativa que te corresponda.
      </p>

      <h2>4. Con quién compartimos datos</h2>
      <p>
        Solo con proveedores que nos prestan servicios como <b>encargados del tratamiento</b>, con
        contrato firmado y sin usar tus datos para fines propios:
      </p>
      <ul>
        <li><b>Proveedor de base de datos y alojamiento</b> — guarda tu cuenta y los archivos de tu web.</li>
        <li><b>Resend</b> (envío de correos transaccionales), con procesamiento en la Unión Europea.</li>
        <li><b>Google</b>, únicamente si eliges entrar con tu cuenta de Google.</li>
        <li><b>Proveedores de IA</b> (por ejemplo OpenRouter) y de datos de búsqueda, <b>solo si tú
          conectas tu clave</b> y únicamente cuando usas esas funciones. En ese caso, el texto que
          la función necesite se envía a ese proveedor bajo las condiciones que tengas con él.</li>
      </ul>
      <p>
        Si algún proveedor trata datos fuera del Espacio Económico Europeo, la transferencia se
        ampara en las <b>cláusulas contractuales tipo</b> de la Comisión Europea u otra garantía
        adecuada.
      </p>
      <p>
        También podremos comunicar datos a autoridades cuando exista una obligación legal.
      </p>

      <h2>5. Cuánto tiempo conservamos los datos</h2>
      <ul>
        <li>Los datos de tu cuenta y tus webs, <b>mientras la cuenta esté activa</b>.</li>
        <li>Si eliminas tu cuenta, se borran los espacios de los que seas único propietario, con
          sus webs y archivos. El borrado es <b>irreversible</b>.</li>
        <li>Los tokens de verificación e invitación caducan solos (de 1 hora a 7 días según el tipo).</li>
        <li>Conservaremos lo estrictamente necesario para atender obligaciones legales o
          responsabilidades derivadas del servicio.</li>
      </ul>

      <h2>6. Tus derechos</h2>
      <p>
        Puedes ejercer los derechos de <b>acceso, rectificación, supresión, oposición, limitación
        y portabilidad</b>, así como retirar tu consentimiento en cualquier momento, escribiendo a{" "}
        <a href={`mailto:${TITULAR.email}`}>{TITULAR.email}</a>. Buena parte puedes ejercerlos tú
        mismo desde <b>Configuración</b> (cambiar nombre o correo, y eliminar la cuenta).
      </p>
      <p>
        Si consideras que no hemos atendido bien tu solicitud, puedes reclamar ante la{" "}
        <b>Agencia Española de Protección de Datos</b> (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">aepd.es</a>).
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas razonables: contraseñas guardadas con funciones
        de derivación (nunca en texto claro), sesiones firmadas criptográficamente, conexiones
        cifradas (HTTPS) y control de acceso por espacio y rol. Ningún sistema es infalible; si se
        produjera una brecha con riesgo para tus derechos, te informaríamos conforme al RGPD.
      </p>

      <h2>8. Menores</h2>
      <p>
        El servicio está dirigido a mayores de edad. No recogemos conscientemente datos de menores.
      </p>

      <h2>9. Cambios en esta política</h2>
      <p>
        Si la modificamos de forma relevante, te avisaremos por correo o dentro de la plataforma.
        La fecha de la última actualización aparece al principio de esta página.
      </p>
    </PaginaLegal>
  );
}
