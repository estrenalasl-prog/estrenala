import type { Metadata } from "next";
import { PaginaLegal } from "../PaginaLegal";
import { TITULAR, direccionCompleta } from "@/src/legal/titular";

export const metadata: Metadata = {
  title: "Aviso legal · Estrénala",
  description: "Datos identificativos del titular de estrenala.com y condiciones de uso del sitio.",
};

export default function AvisoLegal() {
  return (
    <PaginaLegal titulo="Aviso legal" soloEspanol>
      <p>
        Este aviso recoge los datos que exige el artículo 10 de la Ley 34/2002, de servicios de la
        sociedad de la información y de comercio electrónico (LSSI-CE), y las condiciones de uso
        del sitio web <b>{TITULAR.sitio}</b>.
      </p>

      <h2>1. Titular del sitio</h2>
      <div className="datos">
        <p><b>Titular:</b> {TITULAR.nombre}</p>
        <p><b>NIF:</b> {TITULAR.nif || "— (pendiente)"}</p>
        <p><b>Domicilio:</b> {direccionCompleta()}</p>
        <p><b>Correo de contacto:</b> <a href={`mailto:${TITULAR.email}`}>{TITULAR.email}</a></p>
        <p><b>Sitio web:</b> {TITULAR.sitio}</p>
      </div>

      <h2>2. Objeto</h2>
      <p>
        {TITULAR.marca} es una plataforma que permite publicar en internet páginas web en HTML
        —normalmente generadas con herramientas de inteligencia artificial—, editarlas sin
        conocimientos técnicos y, opcionalmente, mantener un blog. El uso del sitio implica la
        aceptación de este aviso legal y de los{" "}
        <a href="/legal/terminos">términos y condiciones del servicio</a>.
      </p>

      <h2>3. Condiciones de uso</h2>
      <p>
        Quien usa este sitio se compromete a hacerlo conforme a la ley, a la buena fe y a estas
        condiciones, y a no emplearlo con fines ilícitos o que puedan dañar los derechos de
        terceros o el funcionamiento del servicio. El titular podrá suspender el acceso a quien
        incumpla estas condiciones, en los términos del{" "}
        <a href="/legal/terminos">contrato de servicio</a>.
      </p>

      <h2>4. Propiedad intelectual e industrial</h2>
      <p>
        El software, el diseño, los textos y la marca {TITULAR.marca} pertenecen a su titular o se
        usan con la debida autorización. Queda prohibida su reproducción o transformación sin
        permiso expreso.
      </p>
      <p>
        <b>Contenido de las personas usuarias:</b> las webs, imágenes y textos que cada persona
        sube a la plataforma <b>siguen siendo suyos</b>. {TITULAR.marca} solo los almacena y los
        publica para prestar el servicio, según se detalla en los{" "}
        <a href="/legal/terminos">términos</a>.
      </p>

      <h2>5. Responsabilidad</h2>
      <p>
        El titular no se hace responsable del contenido que las personas usuarias publiquen a
        través de la plataforma, que es responsabilidad exclusiva de quien lo publica. Tampoco
        responde de los daños derivados de un uso indebido del servicio ni de las interrupciones
        que puedan producirse por causas ajenas a su control.
      </p>
      <p>
        Este sitio puede contener enlaces a páginas de terceros. El titular no controla ni asume
        responsabilidad sobre sus contenidos.
      </p>

      <h2>6. Protección de datos</h2>
      <p>
        El tratamiento de datos personales se explica en la{" "}
        <a href="/legal/privacidad">política de privacidad</a>, y el uso de cookies en la{" "}
        <a href="/legal/cookies">política de cookies</a>.
      </p>

      <h2>7. Ley aplicable y jurisdicción</h2>
      <p>
        Estas condiciones se rigen por la legislación española. Para cualquier controversia serán
        competentes los juzgados y tribunales que correspondan conforme a la normativa aplicable;
        cuando la persona usuaria tenga la condición de consumidora, los de su domicilio.
      </p>
    </PaginaLegal>
  );
}
