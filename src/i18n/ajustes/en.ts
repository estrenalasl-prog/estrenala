import type { TextosAjustes } from "./tipos";

export const en: TextosAjustes = {
  miga: "Your sites",
  titulo: "Settings",
  lead: "Your account and platform settings.",

  nav: {
    claves: "Connections and keys",
    herramientas: "Site tools",
    equipo: "Team",
    plan: "Plan and usage",
    cuenta: "Your account",
    peligro: "Danger zone",
  },

  claves: {
    titulo: "Connections and keys",
    texto:
      "Everything the AI generates (articles, templates, topic radar) runs on **your own key** and " +
      "goes on your account: you pay what it actually costs, with no markup from us. Without a key " +
      "those features are switched off; the rest of the platform works just the same.",

    cargando: "loading…",
    sinConfigurar: "Not set up",
    usandoTuClave: "Using your key (…{sufijo})",

    modeloTitulo: "AI model for writing",
    modeloActual: "Current: {modelo}",
    modeloAyuda:
      "This is the model that writes your blog articles. The cheap ones spend less credit (the " +
      "«:free» ones spend nothing); if one fails while generating, try another. Scoring in the topic " +
      "radar always uses the platform's default model (it's 1 call a day and it needs fine judgement).",
    modeloOtro: "Other…",
    modeloOtroEjemplo: "identifier from openrouter.ai/models, e.g. deepseek/deepseek-chat:free",
    modeloGuardado: "Model saved.",

    pegaClave: "Paste your key here",
    guardar: "Save",
    probar: "Test connection",
    quitar: "Remove",
    claveGuardada: "Key saved.",
    claveGuardadaYProbada: "Key saved. {detalle}",
    claveGuardadaPeroFallo: "Key saved, but the test failed: {detalle}. Check you copied all of it.",
    claveQuitada: "Key removed. Without a key, the AI features are switched off.",

    openrouterTitulo: "OpenRouter (AI)",
    openrouterTexto: "Writes your blog articles and generates the templates. Create your key at",
    serpapiTitulo: "SerpAPI (Google Trends)",
    serpapiTexto: "Feeds the blog's trending-topic radar. It has a free plan; create your key at",
  },

  herramientas: {
    titulo: "Site tools",
    lead: "Favicon, sharing image, Google Search Console and visitor analytics.",
    texto:
      "These tools belong to **each site**, not to the account: you set them up inside the project, " +
      "under «Site tools». Open one of {enlace} to adjust them.",
    enlace: "your sites",
  },

  equipo: {
    titulo: "Team",
    lead:
      "Who can work on {espacio}. An editor edits and publishes; the owner also manages keys, " +
      "addresses and the team.",
    tuEspacio: "your space",
    esteEspacio: "this space",

    correoEjemplo: "email@your-partner.com",
    editor: "Editor",
    propietario: "Owner",
    enviando: "Sending…",
    invitar: "Invite",
    invitacionEnviada: "Invitation sent to {email}.",

    tu: " (you)",
    cederTitulo: "Make this person the owner and step down to editor yourself",
    ceder: "Hand over ownership",
    quitar: "Remove",
    soloOwner: "Only the space's owner can invite people or change roles.",

    cederPregunta: "Hand ownership over to {nombre}?",
    cederCuerpo:
      "{nombre} takes charge of «{espacio}» and you stay on as an editor. Only that person can hand " +
      "it back to you.",
    cederEtiqueta: "You lose control of the space",
    cederAceptar: "Yes, hand it over",
    cedido: "{nombre} is now the owner of the space.",
  },

  plan: {
    titulo: "Plan and usage",
    lead: "What your plan includes and how much you've used in this space.",
    cargando: "Loading…",

    tuPlan: "Your plan: {nombre}",
    gratisSiempre: "Free forever.",
    precios: "€{mes}/month · €{anual}/year (2 months free)",
    porMes: "€{n}/month",
    porAnual: "€{n}/year",
    gratis: "€0",

    estadoCancelada: "Cancelled",
    estadoPagoPendiente: "Payment pending",
    estadoPrueba: "Trial",
    estadoActivo: "Active",

    cancelando:
      "You've cancelled the renewal. You keep your plan until {fecha} and you won't be charged " +
      "again. After that you'll move to the Free plan. If you change your mind, you can reactivate " +
      "it under «Manage subscription» before that date.",
    teQuedan: "You have {dias} left.",
    unDia: "{n} day",
    variosDias: "{n} days",
    pagoFallido:
      "We couldn't take your last payment. Your plan stays active while we retry; update the card " +
      "under «Manage subscription» so you don't lose it.",
    seRenueva: "It renews on its own on {fecha}.",

    websTitulo: "Sites",
    websTexto: "Published in this space.",
    websUso: "{usadas} of {total}",

    marcaTitulo: "«Made with Estrénala» badge",
    marcaTexto:
      "Your published sites carry a discreet badge in the bottom right. It disappears when you upgrade.",
    marcaVisible: "Visible",

    personasTitulo: "People in the space",
    personasSi: "Your plan lets you invite your team.",
    personasNo: "Inviting more people is part of the Agency plan.",

    comparativa: "Plans side by side",
    columnaTuya: " ·  you",
    filaWebs: "Sites",
    filaEditor: "Editor and history",
    filaZip: "Update from a ZIP",
    filaAsistente: "AI assistant (your key)",
    filaDominio: "Your own domain",
    filaSinMarca: "No Estrénala badge",
    filaBlog: "Automatic blog",
    filaEquipo: "Team and invitations",

    sinPagos: "Payments aren't set up on this server: plans are assigned by hand.",
    soloOwner: "Only the space's owner can change the plan.",
    abriendo: "Opening…",
    gestionar: "Manage subscription",
    gestionarTexto: "Change plan, update the card or cancel. It opens in Stripe.",
    comoPagar: "How you'd like to pay:",
    mesAMes: "Month by month",
    anual: "Yearly (2 months free)",
    pasarA: "Move to {plan} · {precio}",
    pagoSeguro: "Payment happens on a secure Stripe page. You can cancel whenever you want.",
  },

  cuenta: {
    titulo: "Your account",
    lead: "Your name, your password and the email you sign in with.",

    nombre: "Name",
    nombreTexto: "What we call you on the platform.",
    guardar: "Save",
    nombreGuardado: "Name saved.",

    idioma: "Language",
    idiomaTexto: "The one we speak to you in: the panel and the emails we send you.",
    idiomaAutomatico: "Automatic (your browser's)",
    idiomaGuardado: "Language saved.",

    password: "Password",
    passwordConGoogle: "You sign in with Google. You can set a password as well.",
    passwordTexto: "Change your password.",
    passwordActual: "Current",
    passwordNueva: "New (min. 8)",
    cambiar: "Change",
    passwordCambiada: "Password changed.",

    correo: "Email",
    correoTexto: "Right now: {email}. We'll send a link to the new one to confirm it.",
    correoEjemplo: "new@email.com",
    correoEnviado: "We've sent an email to {email} to confirm it.",
  },

  peligro: {
    titulo: "Danger zone",
    lead: "Things that cannot be undone.",
    texto:
      "Deleting your account deletes the spaces you are the **sole owner** of, with all their sites, " +
      "their history and their blog. From spaces you share with other people, you simply leave. " +
      "**This cannot be undone.**",
    boton: "Delete my account…",
    escribe: "To confirm, type your email {email}:",
    borrando: "Deleting…",
    borrar: "Delete my account permanently",
    cancelar: "Cancel",
  },

  errores: {
    conexion: "Connection error",
    generico: "Something went wrong",
    continuar: "We couldn't carry on",
    borrarCuenta: "The account couldn't be deleted",
    probar: "The connection couldn't be tested",
  },
};
