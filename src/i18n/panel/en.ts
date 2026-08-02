import type { TextosPanel } from "./tipos";

export const en: TextosPanel = {
  cabecera: {
    inicio: "Estrénala — go to the panel",
    espacioActivo: "Active space",
    configuracion: "Settings",
    salir: "Sign out",
  },

  verifica: {
    antes: "We've sent an email to ",
    despues: " to confirm your account. Check your inbox (and the spam folder).",
    reenviado: "Sent again",
    enviando: "Sending…",
    reenviar: "Send it again",
  },

  subir: {
    arrastra: "Drag your site here",
    subiendo: "Uploading…",
    formatos: "a .zip, an .html or the whole folder",
    elegirArchivos: "Choose files",
    elegirCarpeta: "Choose folder",
    tienesCarpeta: "Got a folder?",
    error: "Something went wrong importing it",
  },

  panel: {
    vacioTitulo: "Let's get your site online.",
    vacioTexto:
      "Upload the site the AI made you. We host it, give it an address and HTTPS, and you can edit it without code.",
    paso1: "Upload it",
    paso2conClic: "in one click",
    paso2: "Edit it",
    paso3: "Publish it",

    tusWebs: "Your sites",
    unProyecto: "project",
    variosProyectos: "projects",

    empiezaAqui: "Start here",
    subeTuWeb: "Upload your AI-built site",
    subeTuWebTexto:
      "Drag in the .zip Claude, ChatGPT or v0 gave you. One click and it's online, with an address and HTTPS.",

    recientes: "Recent",
    miniaturaInicio: "Home",
    borrador: "Draft · {fecha}",
  },

  estado: {
    sinPublicar: "Not published",
    publicado: "Published",
    cambiosSinPublicar: "Unpublished changes",
  },

  proyecto: {
    publicar: {
      sinDireccion: "No address yet",
      copiar: "Copy",
      copiado: "Copied",
      oculta: "Hidden from Google",
      ocultaTitulo: "Nobody will find it by searching on Google. You can change this in «Address and domain».",
      sinPublicar: "Not published",
      publicado: "Published",
      tienesCambios: "You have unpublished changes",
      publicando: "Publishing…",
      publicar: "Publish",
      publicarCambios: "Publish changes",
      republicar: "Publish again",
    },

    sitemap: {
      conHost:
        "Your site is served at {host}, but your `sitemap.xml` tells Google your pages are at " +
        "{dominios}. Google will go looking for them there instead of here.",
      sinHost:
        "Your `sitemap.xml` tells Google your pages are at {dominios}. Google will go looking for " +
        "them there instead of here.",
      y: "and",
      arreglaUno:
        "If that domain is yours, connect it under «Address and domain». If it isn't, delete the " +
        "`sitemap.xml` from your site and we'll generate a correct one.",
      arreglaVarios:
        "If those domains are yours, connect them under «Address and domain». If they aren't, " +
        "delete the `sitemap.xml` from your site and we'll generate a correct one.",
    },

    direccion: {
      titulo: "Address and domain",
      estadoDominio: "Own domain active",
      estadoSubdominio: "Subdomain active · no domain of your own",
      estadoNada: "No address",

      subdominioTitulo: "Subdomain",
      subdominioTexto: "Your site's free address on Estrénala.",
      subdominioEjemplo: "my-subdomain",
      cambiar: "Change",
      guardar: "Save",

      dominioTitulo: "Your own domain",
      dominioQueEs: "DNS records are like your domain's postal address.",
      conectadoAntes: "Connected to ",
      conectadoDespues: ". Keep this record at your provider:",
      conecta: "Connect your domain (e.g. **yourcompany.com**) by pointing these records at your provider:",
      dominioEjemplo: "yourdomain.com",
      conectar: "Connect",
      quitarDominio: "Remove domain",
      quitarSeguro: "**Are you sure?** {dominio} will no longer be used; the site stays on the subdomain.",
      quitarNo: "No, keep it",
      quitarSi: "Yes, remove it",

      tipoA: "Type A",
      dnsAyuda:
        "Your provider's **Name** field takes only the front part: `@` for your bare domain, or " +
        "`blog` if you're connecting `blog.yourdomain.com`. With a bare domain, also add `www` " +
        "pointing at the same IP.",

      googleTitulo: "Visibility on Google",
      googleEtiqueta: "Keep Google from finding it yet",
      googleActivo: "We're asking search engines not to show it. Turn this off when the site is ready.",
      googleInactivo:
        "Turn it on while you're still preparing it. The site stays online: we just ask search " +
        "engines not to list it.",
      googleNoEsCandado:
        "This is not a lock: anyone with the address still gets in. If you want **nobody** to see " +
        "it, unpublish the site.",

      despublicarTitulo: "Unpublish the site",
      despublicarTexto: "It will stop being visible on the internet. You can publish it again whenever you want.",
      despublicar: "Unpublish",
      despublicarSeguroConHost: "**Are you sure?** The site will stop showing at {host} right away.",
      despublicarSeguro: "**Are you sure?** The site will stop showing right away.",
      despublicarNo: "No, leave it",
      despublicarSi: "Yes, unpublish",

      txtIntro:
        "If you've just changed your DNS, give it a few minutes and try again. And if your domain " +
        "goes through a proxy (Cloudflare, for instance), add this **TXT** record too:",
      txtNombre: "Name",
      txtValor: "Value",
    },

    asistente: {
      titulo: "AI assistant",
      resumen: "Tell it in your own words what to change and it does it for you",
      intro:
        "Write what you want to change on this page. The assistant **proposes** the changes and " +
        "you decide whether to apply them. Everything goes into the History, so you can always " +
        "roll back.",
      avisoTitulo: "You're about to use the AI assistant",
      aviso:
        "The assistant reads your page and uses AI with your OpenRouter key (it spends credit). " +
        "You'll review the changes before applying them.",
      avisoAceptar: "Continue",
      pagina: "Page:",
      paginaInicio: "{pagina} (home)",
      ejemplo: "E.g. «Make the headline punchier and fix the typos»",
      pensando: "Thinking…",
      proponer: "Propose changes",
      consumeCredito: "Spends OpenRouter credit (your key).",
      sinCambios: "The assistant didn't propose any changes.",
      unCambio: "{n} proposed change:",
      variosCambios: "{n} proposed changes:",
      avisoVaciados:
        "**Careful:** {n} of these changes leave a piece of text empty. That usually happens when " +
        "one sentence is split across several pieces with different styles and they get merged " +
        "into one: the text reads fine, but you can lose colours or gradients. Check it in the " +
        "preview after applying; if you don't like it, undo it from the History.",
      seQuedaVacio: "Left empty",
      aplicando: "Applying…",
      aplicarUno: "Apply {n} change",
      aplicarVarios: "Apply {n} changes",
      verComoQueda: "See how it looks",
      ocultarVistaPrevia: "Hide the preview",
      descartar: "Discard",
      asiQuedaria: "This is how it would look. Nothing has been saved yet.",
      aplicado: "✓ Changes applied. Check them in the preview below.",
      tipoTexto: "Text",
      tipoTextoFormato: "Formatted text",
      tipoEnlace: "Link",
      tipoColor: "Colour",
    },

    actualizar: {
      titulo: "Update from a ZIP",
      resumen: "Edited it in your own tool? Upload the new version",
      texto:
        "If you'd rather keep editing your site in your own tool (Claude Code, ChatGPT, v0…), " +
        "upload the **.zip** with the new version here and your live site will update. The " +
        "previous version stays in the **History**, so you can always roll back.",
      ojo:
        "Careful: the ZIP replaces the content; whatever you edited _inside_ Estrénala doesn't get " +
        "merged into it (your project in your own tool wins).",
      boton: "↻ Upload a ZIP and update",
      actualizando: "Updating…",
      hecho: "✓ Site updated. Check it in the preview below.",
      confirmarTitulo: "You're about to replace this site's content",
      confirmarCuerpo:
        "It gets replaced with the new ZIP's. Your current version stays in the History, so you " +
        "can go back to it whenever you want.",
      confirmarEtiqueta: "This can be undone from the History",
      confirmarAceptar: "Replace",
    },

    herramientas: {
      titulo: "Site tools",
      resumen: "Search Console · Analytics · Favicon · Sharing",
      configuradas: "{n} of 4 set up",
      sinConfigurar: "Not set up",
      listo: "Done",
      activa: "Active",
      quitar: "Remove",
      aplicar: "Apply",
      subirImagen: "Upload image",
      cambiar: "Change",
      searchConsole: "Google Search Console",
      searchConsoleTexto: "Proves to Google that the site is yours. Paste the tag or the code Google gives you.",
      analitica: "Visitor analytics",
      analiticaTexto: "Measure visits with Google Analytics. Paste your GA4 measurement ID (it starts with G-).",
      favicon: "Favicon",
      faviconTexto: "The little icon on the browser tab. Upload a square image (png recommended).",
      compartir: "Sharing image",
      compartirQueEs: "The picture that shows up when you paste your link on WhatsApp or social media (og:image).",
      compartirTexto: "Shows up when you send your site over WhatsApp or social media.",
    },

    peligro: {
      titulo: "Danger zone",
      resumen: "Delete this site forever",
      texto:
        "{nombre} will be deleted along with all its history, its blog and its files. If it's " +
        "published, it will go offline. **This cannot be undone.**",
      boton: "Delete this site…",
      escribe: "To confirm, type {nombre}:",
      borrando: "Deleting…",
      borrar: "Delete permanently",
      cancelar: "Cancel",
    },

    previo: {
      portada: "{pagina} (home page)",
      selectTitulo: "Page being shown",
      selectBloqueado: "Save or discard your changes to switch pages",
      hacerPortada: "Make this the home page",
      hacerPortadaTitulo: "The home page is what people see when they open your address, with nothing after it",
      guardando: "Saving…",
      guardandoSuelto: "saving…",
      modoEdicion: "Edit mode",
      unCambio: "{n} change",
      variosCambios: "{n} changes",
      descartar: "Discard",
      guardarCambios: "Save changes",
      expandir: "⤢ Expand",
      expandirTitulo: "See the site at full size",
      salir: "⤡ Exit",
      salirTitulo: "Leave full screen (Esc)",
      errorImagen: "The image couldn't be uploaded",
      errorPortada: "The home page couldn't be changed",
      errorGuardar: "The changes couldn't be saved",
    },

    historial: {
      titulo: "History",
      cargando: "Loading…",
      vacio: "No saved changes yet.",
      actual: "current · ",
      restaurar: "Restore",
      restaurarTitulo:
        "Puts the site back the way it was at that moment. Nothing is lost: you can go back to any " +
        "other version on the list, and your published site doesn't change until you hit «Publish changes».",
      confirmar: "Go back to this version? Your published site doesn't change until you hit «Publish changes».",
      si: "Yes, go back",
      no: "No",
      tipoImport: "First import",
      tipoEdit: "Edited by hand",
      tipoEditIa: "Edited with the assistant",
      tipoBlog: "Blog change",
      tipoRestore: "Restore",
      tipoPublish: "Publication",
      tipoActualizacion: "Update from a ZIP",
    },

    errores: {
      conexion: "Connection error",
      generico: "Something went wrong",
      subirImagen: "The image couldn't be uploaded",
      actualizar: "It couldn't be updated",
      borrar: "It couldn't be deleted",
    },
  },

  dialogo: {
    cancelar: "Cancel",
    continuar: "Continue",
    entendido: "Got it",
    etiquetaCoste: "Spends credit from your key",
    etiquetaPeligro: "This cannot be undone",
  },
};
