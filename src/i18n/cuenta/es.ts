// Todo lo que ve alguien que todavía no está dentro: registro, entrada,
// recuperar contraseña, y los cuatro correos.
//
// El español es el original y de aquí sale la FORMA (ver tipos.ts): los otros
// cuatro idiomas no pueden dejarse una clave sin que falle el typecheck.
//
// En los correos, `{nombre}` y `{org}` se rellenan al enviar (ver ../rellenar.ts).

export const es = {
  registro: {
    claim: "Empieza a estrenar tus webs hoy.",
    sub: "Crea tu cuenta gratis: sube tu web, edítala con un clic y déjale el blog a la IA.",
    titulo: "Crea tu cuenta",
    lead: "En un minuto tienes tu espacio listo.",
    google: "Regístrate con Google",
    nombre: "Tu nombre",
    nombrePh: "Como quieres que te llamemos",
    correo: "Correo",
    correoPh: "tu@correo.com",
    password: "Contraseña",
    passwordPh: "Mínimo 8 caracteres",
    passwordAyuda: "Usa al menos 8 caracteres. Cuanto más larga, mejor.",
    crear: "Crear cuenta",
    creando: "Creando…",
    yaTienes: "¿Ya tienes cuenta?",
    entra: "Entra",
  },

  login: {
    claim: "Tu web hecha con IA, por fin en directo.",
    sub: "Súbela online, edítala con un clic y deja que el blog escriba solo.",
    titulo: "Entra",
    lead: "Bienvenido de nuevo. Vamos a tu web.",
    google: "Continuar con Google",
    errorGoogle: "No se pudo entrar con Google. Prueba de nuevo o usa tu correo.",
    correo: "Correo",
    correoPh: "tu@correo.com",
    password: "Contraseña",
    passwordPh: "Tu contraseña",
    entrar: "Entrar",
    entrando: "Entrando…",
    olvidaste: "¿Olvidaste tu contraseña?",
    aunNo: "¿Aún no tienes cuenta?",
    creaUna: "Crea una gratis",
  },

  recuperar: {
    claim: "Recupera el acceso a tus webs.",
    titulo: "¿Olvidaste tu contraseña?",
    lead: "Escribe tu correo y te enviamos un enlace para cambiarla.",
    correo: "Correo",
    correoPh: "tu@correo.com",
    enviar: "Enviar enlace",
    enviando: "Enviando…",
    // A propósito no dice si ese correo tiene cuenta o no: si lo dijera, sería
    // una forma de averiguar quién está registrado aquí.
    mensaje: "Si ese correo tiene cuenta, te hemos enviado un enlace",
    volver: "Volver a entrar",
  },

  restablecer: {
    claim: "Un paso y vuelves a tus webs.",
    titulo: "Elige una nueva contraseña",
    lead: "Escríbela y guárdala. Con eso vuelves a tener acceso.",
    nueva: "Nueva contraseña",
    nuevaPh: "Mínimo 8 caracteres",
    ayuda: "Usa al menos 8 caracteres.",
    guardar: "Guardar contraseña",
    guardando: "Guardando…",
    hechaTitulo: "Contraseña cambiada",
    hechaLead: "Ya puedes entrar con tu nueva contraseña. Te llevamos…",
    irEntrar: "Ir a entrar",
    cargando: "Cargando…",
  },

  verificar: {
    claim: "Tu web hecha con IA, por fin en directo.",
    okTitulo: "¡Correo confirmado!",
    okLead: "Tu cuenta está verificada. Ya puedes publicar tus webs sin límites.",
    okBoton: "Ir a mi panel",
    malTitulo: "Este enlace ya no vale",
    malLead: "El enlace ha caducado o ya se usó. Entra y pide uno nuevo desde el aviso del panel.",
    malBoton: "Ir a entrar",
  },

  correos: {
    verificacion: {
      asunto: "Confirma tu correo en Estrénala",
      titulo: "Hola {nombre}, confirma tu correo",
      cuerpo: "Toca el botón para activar tu cuenta de Estrénala y empezar a publicar tus webs.",
      boton: "Confirmar mi correo",
      texto: "Hola {nombre}, confirma tu correo en Estrénala abriendo este enlace:\n{enlace}\n\nSi no fuiste tú, ignora este correo.",
      pie: "Si no fuiste tú, ignora este correo. El enlace deja de funcionar solo.",
    },
    reset: {
      asunto: "Restablece tu contraseña en Estrénala",
      titulo: "¿Olvidaste tu contraseña?",
      cuerpo: "Toca el botón para elegir una nueva. El enlace caduca en una hora.",
      boton: "Cambiar mi contraseña",
      texto: "Para cambiar tu contraseña en Estrénala, abre este enlace (caduca en 1 hora):\n{enlace}\n\nSi no fuiste tú, ignora este correo.",
      pie: "Si no fuiste tú, ignora este correo. El enlace deja de funcionar solo.",
    },
    cambioEmail: {
      asunto: "Confirma tu nuevo correo en Estrénala",
      titulo: "Confirma tu nuevo correo",
      cuerpo: "Toca el botón para usar esta dirección como tu correo en Estrénala. Hasta que lo confirmes, seguirá el anterior.",
      boton: "Confirmar este correo",
      texto: "Confirma tu nuevo correo en Estrénala abriendo este enlace (caduca en 1 hora):\n{enlace}",
      pie: "Si no fuiste tú, ignora este correo. El enlace caduca en una hora.",
    },
    invitacion: {
      asunto: "Te han invitado a «{org}» en Estrénala",
      titulo: "Únete a «{org}»",
      cuerpo: "Te han invitado a colaborar en un espacio de Estrénala como {rol}.",
      boton: "Aceptar la invitación",
      texto: "Te han invitado a «{org}» en Estrénala como {rol}. Únete abriendo este enlace (caduca en 7 días):\n{enlace}",
      pie: "Si no esperabas esto, ignora el correo. El enlace caduca en 7 días.",
      propietario: "propietario",
      editor: "editor",
    },
  },
};
