// Configuración: claves, herramientas, equipo, plan, cuenta y zona de peligro.
//
// El español es el original y de aquí sale la FORMA (ver tipos.ts): los otros
// cuatro no pueden dejarse una clave sin que falle el typecheck.
//
// Regla que vigila un test: una marca de formato (`**`, backtick, `_`) NO puede
// quedar a caballo de un hueco `{asi}`. Lo que va dentro de un hueco lo resalta
// la pantalla con `conValores`, no el catálogo (ver ../formato.tsx).

export const es = {
  miga: "Tus webs",
  titulo: "Configuración",
  lead: "Ajustes de tu cuenta y de la plataforma.",

  nav: {
    claves: "Conexiones y claves",
    herramientas: "Herramientas del sitio",
    equipo: "Equipo",
    plan: "Plan y uso",
    cuenta: "Tu cuenta",
    peligro: "Zona de peligro",
  },

  claves: {
    titulo: "Conexiones y claves",
    texto:
      "Todo lo que genera la IA (artículos, plantillas, radar de temas) va con **tu propia clave** y " +
      "corre a tu cuenta: pagas el consumo real, sin recargo nuestro. Sin clave, esas funciones quedan " +
      "desactivadas; el resto de la plataforma funciona igual.",

    cargando: "cargando…",
    sinConfigurar: "Sin configurar",
    // Del sufijo solo se enseñan los últimos caracteres, nunca la clave entera.
    usandoTuClave: "Usando tu clave (…{sufijo})",

    modeloTitulo: "Modelo de IA para redactar",
    modeloActual: "Actual: {modelo}",
    modeloAyuda:
      "Con este modelo se redactan los artículos del blog. Los económicos gastan menos crédito " +
      "(los «:free» nada); si uno da error al generar, prueba otro. La puntuación del radar de temas " +
      "usa siempre el modelo por defecto de la plataforma (es 1 llamada al día y necesita criterio fino).",
    modeloOtro: "Otro…",
    modeloOtroEjemplo: "identificador de openrouter.ai/models, p. ej. deepseek/deepseek-chat:free",
    modeloGuardado: "Modelo guardado.",

    pegaClave: "Pega aquí tu clave",
    guardar: "Guardar",
    probar: "Probar conexión",
    quitar: "Quitar",
    claveGuardada: "Clave guardada.",
    claveGuardadaYProbada: "Clave guardada. {detalle}",
    claveGuardadaPeroFallo: "Clave guardada, pero la prueba falló: {detalle}. Revisa que la copiaste entera.",
    claveQuitada: "Clave quitada. Sin una clave, las funciones de IA quedan desactivadas.",

    openrouterTitulo: "OpenRouter (IA)",
    openrouterTexto: "Redacta los artículos del blog y genera las plantillas. Crea tu clave en",
    // Sin cifras a mano: decía «100 búsquedas/mes» y SerpAPI ya va por 250. Es
    // dato de un tercero y aquí quedaría una mentira que nadie vuelve a mirar.
    serpapiTitulo: "SerpAPI (Google Trends)",
    serpapiTexto: "Alimenta el radar de temas en tendencia del blog. Tiene plan gratuito; crea tu clave en",
  },

  herramientas: {
    titulo: "Herramientas del sitio",
    lead: "Favicon, imagen al compartir, Google Search Console y analítica de visitas.",
    // «tus webs» es un enlace en medio de la frase: lo pone la pantalla.
    texto:
      "Estas herramientas son **de cada web**, no de la cuenta: se configuran dentro del proyecto, " +
      "en el desplegable «Herramientas del sitio». Abre una de {enlace} para ajustarlas.",
    enlace: "tus webs",
  },

  equipo: {
    titulo: "Equipo",
    lead:
      "Quién puede trabajar en {espacio}. El editor edita y publica; el propietario además gestiona " +
      "claves, dirección y equipo.",
    tuEspacio: "tu espacio",
    esteEspacio: "este espacio",

    correoEjemplo: "correo@de-tu-socio.com",
    editor: "Editor",
    propietario: "Propietario",
    enviando: "Enviando…",
    invitar: "Invitar",
    invitacionEnviada: "Invitación enviada a {email}.",

    tu: " (tú)",
    cederTitulo: "Hacer propietario a esta persona y bajarte tú a editor",
    ceder: "Ceder propiedad",
    quitar: "Quitar",
    soloOwner: "Solo el propietario del espacio puede invitar o cambiar roles.",

    // Rojo porque es grave, pero la etiqueta NO dice «no se puede deshacer»:
    // sería mentira, el nuevo propietario puede devolvértela.
    cederPregunta: "¿Ceder la propiedad a {nombre}?",
    cederCuerpo:
      "{nombre} pasa a mandar en «{espacio}» y tú te quedas como editor. Solo esa persona podrá " +
      "devolvértela.",
    cederEtiqueta: "Pierdes el mando del espacio",
    cederAceptar: "Sí, ceder",
    cedido: "Ahora {nombre} es el propietario del espacio.",
  },

  plan: {
    titulo: "Plan y uso",
    lead: "Qué incluye tu plan y cuánto llevas usado en este espacio.",
    cargando: "Cargando…",

    tuPlan: "Tu plan: {nombre}",
    gratisSiempre: "Gratis para siempre.",
    precios: "{mes} €/mes · {anual} €/año (2 meses gratis)",
    porMes: "{n} €/mes",
    porAnual: "{n} €/año",
    gratis: "0 €",

    // Cómo se le cuenta el estado de su suscripción. Estuvo escrito a fuego a
    // «Activo», así que decía lo mismo tras darse de baja (Stripe deja el status
    // en `active` hasta que vence) y con un pago fallido mientras reintenta —
    // justo los dos momentos en los que hay que hablar claro.
    estadoCancelada: "Cancelada",
    estadoPagoPendiente: "Pago pendiente",
    estadoPrueba: "De prueba",
    estadoActivo: "Activo",

    cancelando:
      "Has cancelado la renovación. Sigues con tu plan hasta el {fecha} y no se te cobrará nada más. " +
      "Después pasarás al plan Gratis. Si cambias de idea, puedes reactivarla desde «Gestionar " +
      "suscripción» antes de esa fecha.",
    teQuedan: "Te quedan {dias}.",
    unDia: "{n} día",
    variosDias: "{n} días",
    pagoFallido:
      "No hemos podido cobrar tu último pago. Tu plan sigue activo mientras se reintenta; actualiza " +
      "la tarjeta en «Gestionar suscripción» para no perderlo.",
    seRenueva: "Se renueva solo el {fecha}.",

    websTitulo: "Webs",
    websTexto: "Publicadas en este espacio.",
    websUso: "{usadas} de {total}",

    marcaTitulo: "Marca «Hecho con Estrénala»",
    marcaTexto:
      "Tus webs publicadas llevan una insignia discreta abajo a la derecha. Desaparece al mejorar de plan.",
    marcaVisible: "Visible",

    personasTitulo: "Personas en el espacio",
    personasSi: "Tu plan permite invitar a tu equipo.",
    personasNo: "Invitar a más gente es del plan Agencia.",

    comparativa: "Comparativa de planes",
    columnaTuya: " ·  tú",
    filaWebs: "Webs",
    filaEditor: "Editor y historial",
    filaZip: "Actualizar desde ZIP",
    filaAsistente: "Asistente de IA (tu clave)",
    filaDominio: "Tu propio dominio",
    filaSinMarca: "Sin marca de Estrénala",
    filaBlog: "Blog automático",
    filaEquipo: "Equipo e invitaciones",

    sinPagos: "Los pagos no están configurados en este servidor: los planes se asignan a mano.",
    soloOwner: "Solo el propietario del espacio puede cambiar el plan.",
    abriendo: "Abriendo…",
    gestionar: "Gestionar suscripción",
    gestionarTexto: "Cambia de plan, actualiza la tarjeta o cancela. Se abre en Stripe.",
    comoPagar: "Cómo quieres pagar:",
    mesAMes: "Mes a mes",
    anual: "Anual (2 meses gratis)",
    pasarA: "Pasar a {plan} · {precio}",
    pagoSeguro: "El pago se hace en una página segura de Stripe. Puedes cancelar cuando quieras.",
  },

  cuenta: {
    titulo: "Tu cuenta",
    lead: "Tu nombre, tu contraseña y tu correo de acceso.",

    nombre: "Nombre",
    nombreTexto: "Como te llamamos en la plataforma.",
    guardar: "Guardar",
    nombreGuardado: "Nombre guardado.",

    idioma: "Idioma",
    idiomaTexto: "En el que te hablamos a ti: el panel y los correos que te enviamos.",
    // Mientras no elija, se enseña que va en automático. Poner «Español» aquí
    // sería enseñarle una decisión que no ha tomado.
    idiomaAutomatico: "Automático (el de tu navegador)",
    idiomaGuardado: "Idioma guardado.",

    password: "Contraseña",
    passwordConGoogle: "Entras con Google. Puedes ponerte también una contraseña.",
    passwordTexto: "Cambia tu contraseña.",
    passwordActual: "Actual",
    passwordNueva: "Nueva (mín. 8)",
    cambiar: "Cambiar",
    passwordCambiada: "Contraseña cambiada.",

    correo: "Correo",
    correoTexto: "Ahora: {email}. Te enviaremos un enlace al nuevo para confirmarlo.",
    correoEjemplo: "nuevo@correo.com",
    correoEnviado: "Te enviamos un correo a {email} para confirmarlo.",
  },

  peligro: {
    titulo: "Zona de peligro",
    lead: "Acciones que no se pueden deshacer.",
    texto:
      "Al eliminar tu cuenta se borran los espacios de los que eres **único propietario**, con todas " +
      "sus webs, su historial y su blog. De los espacios que compartes con otras personas, " +
      "simplemente saldrás. **No se puede deshacer.**",
    boton: "Eliminar mi cuenta…",
    escribe: "Para confirmar, escribe tu correo {email}:",
    borrando: "Borrando…",
    borrar: "Borrar mi cuenta definitivamente",
    cancelar: "Cancelar",
  },

  errores: {
    conexion: "Error de conexión",
    generico: "Algo ha fallado",
    continuar: "No se pudo continuar",
    borrarCuenta: "No se pudo borrar la cuenta",
    probar: "No se pudo probar la conexión",
  },
};
