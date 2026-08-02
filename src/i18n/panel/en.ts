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
};
