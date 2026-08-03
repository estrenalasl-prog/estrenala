import type { Metadata } from "next";
import { PaginaLegal } from "../PaginaLegal";
import { TITULAR } from "@/src/legal/titular";

export const metadata: Metadata = {
  title: "Términos y condiciones · Estrénala",
  description: "Condiciones del servicio de Estrénala: cuenta, contenidos, uso de IA con tu propia clave, planes y responsabilidades.",
};

export default function Terminos() {
  return (
    <PaginaLegal titulo="Términos y condiciones" soloEspanol>
      <p>
        Estas condiciones regulan el uso de <b>{TITULAR.marca}</b> ({TITULAR.sitio}), titularidad
        de {TITULAR.nombre} (ver <a href="/legal/aviso-legal">aviso legal</a>). Al crear una cuenta
        aceptas lo que sigue.
      </p>

      <h2>1. Qué es el servicio</h2>
      <p>
        {TITULAR.marca} te permite <b>publicar en internet</b> una web en HTML que ya tengas
        (normalmente creada con una IA), <b>editarla</b> sin programar y, si quieres, mantener un
        <b> blog</b>. Cada web se publica en un subdominio de {TITULAR.sitio} o en un dominio
        propio que conectes tú.
      </p>

      <h2>2. Tu cuenta</h2>
      <ul>
        <li>Debes ser mayor de edad y facilitar datos veraces.</li>
        <li>Eres responsable de custodiar tu contraseña y de lo que ocurra en tu cuenta.</li>
        <li>Puedes invitar a otras personas a tu espacio con los roles disponibles (propietario o
          editor). Quien sea propietario responde del uso que haga su equipo.</li>
        <li>Puedes eliminar tu cuenta cuando quieras desde Configuración. El borrado es
          <b> irreversible</b> y elimina las webs de los espacios de los que seas único propietario.</li>
      </ul>

      <h2>3. Tus contenidos</h2>
      <p>
        Las webs, textos e imágenes que subas <b>siguen siendo tuyos</b>. Nos concedes únicamente
        la autorización necesaria para alojarlos, procesarlos y mostrarlos públicamente con el fin
        de prestarte el servicio (por ejemplo, servir tu web a quien la visite). Esa autorización
        termina cuando eliminas el contenido o tu cuenta.
      </p>
      <p>
        <b>Eres responsable de lo que publicas:</b> de tener los derechos sobre ello y de que
        cumpla la ley. Si tu web recoge datos de terceros (formularios, por ejemplo), eres tú quien
        responde como responsable de ese tratamiento.
      </p>

      <h2>4. Uso aceptable</h2>
      <p>No puedes usar {TITULAR.marca} para:</p>
      <ul>
        <li>publicar contenido ilícito, que infrinja derechos de terceros o que sea manifiestamente
          ofensivo;</li>
        <li>suplantar a personas o marcas, ni montar páginas de phishing o fraude;</li>
        <li>distribuir malware, ni intentar vulnerar la seguridad o disponibilidad del servicio;</li>
        <li>hacer un uso que degrade el servicio para el resto (por ejemplo, abuso de recursos).</li>
      </ul>
      <p>
        Si detectamos un incumplimiento grave podemos suspender o cerrar la cuenta, avisándote
        cuando sea razonablemente posible.
      </p>

      <h2>5. Funciones de inteligencia artificial</h2>
      <p>
        Las funciones de IA (el asistente de edición y el blog) funcionan <b>con tu propia clave</b>
        de un proveedor externo y son <b>opcionales</b>: solo se usan si la conectas y cuando tú lo
        pides. El consumo lo facturas directamente con tu proveedor; {TITULAR.marca} no revende
        ni marca esos costes.
      </p>
      <p>
        Los resultados generados por IA <b>pueden contener errores</b>. Revísalos antes de
        publicarlos: cada cambio queda en el historial y puedes revertirlo.
      </p>

      <h2>6. Planes y pagos</h2>
      <p>
        Existe un <b>plan gratuito</b> con el que puedes publicar y editar tu web. Las funciones de
        pago, sus precios y sus condiciones de facturación se detallarán en la página de precios
        cuando estén disponibles; hasta entonces, el uso del servicio es gratuito.
      </p>

      <h2>7. Disponibilidad</h2>
      <p>
        Trabajamos para que el servicio esté siempre disponible, pero no podemos garantizar un
        funcionamiento ininterrumpido: puede haber paradas por mantenimiento, incidencias o causas
        ajenas a nosotros. Te recomendamos <b>conservar una copia</b> de tu web en tu ordenador.
      </p>

      <h2>8. Responsabilidad</h2>
      <p>
        El servicio se presta «tal cual». En la medida en que lo permita la ley, {TITULAR.marca} no
        responde de daños indirectos, lucro cesante ni pérdida de datos derivados del uso del
        servicio. Nada de lo anterior limita los derechos que te reconozca la normativa de
        consumidores si actúas como tal.
      </p>

      <h2>9. Cambios y terminación</h2>
      <p>
        Podemos modificar estas condiciones o el servicio; si el cambio es relevante, te avisaremos
        por correo o dentro de la plataforma con antelación razonable. Puedes dejar de usar el
        servicio y eliminar tu cuenta en cualquier momento.
      </p>

      <h2>10. Ley aplicable</h2>
      <p>
        Estas condiciones se rigen por la legislación española. Si eres consumidor, conservas el
        derecho a acudir a los tribunales de tu domicilio y a los sistemas de resolución
        extrajudicial de conflictos que correspondan.
      </p>

      <h2>11. Contacto</h2>
      <p>
        Para cualquier duda sobre estas condiciones:{" "}
        <a href={`mailto:${TITULAR.email}`}>{TITULAR.email}</a>.
      </p>
    </PaginaLegal>
  );
}
