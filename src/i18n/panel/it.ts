import type { TextosPanel } from "./tipos";

export const it: TextosPanel = {
  cabecera: {
    inicio: "Estrénala — vai al pannello",
    espacioActivo: "Spazio attivo",
    configuracion: "Impostazioni",
    salir: "Esci",
  },

  verifica: {
    antes: "Ti abbiamo mandato un'email a ",
    despues: " per confermare il tuo account. Controlla la posta in arrivo (e lo spam).",
    reenviado: "Rimandata",
    enviando: "Invio…",
    reenviar: "Rimanda l'email",
  },

  subir: {
    arrastra: "Trascina qui il tuo sito",
    subiendo: "Caricamento…",
    formatos: "uno .zip, un .html o l'intera cartella",
    elegirArchivos: "Scegli i file",
    elegirCarpeta: "Scegli la cartella",
    tienesCarpeta: "Hai una cartella?",
    error: "Non è stato possibile importarlo",
  },

  panel: {
    vacioTitulo: "Mettiamo online il tuo sito.",
    vacioTexto:
      "Carica il sito che ti ha fatto l'IA. Lo ospitiamo noi, gli diamo un indirizzo e HTTPS, e potrai modificarlo senza codice.",
    paso1: "Caricalo",
    paso2conClic: "in un clic",
    paso2: "Modificalo",
    paso3: "Pubblicalo",

    tusWebs: "I tuoi siti",
    unProyecto: "progetto",
    variosProyectos: "progetti",

    empiezaAqui: "Inizia da qui",
    subeTuWeb: "Carica il tuo sito fatto con l'IA",
    subeTuWebTexto:
      "Trascina lo .zip che ti hanno dato Claude, ChatGPT o v0. In un clic è online, con indirizzo e HTTPS.",

    recientes: "Recenti",
    miniaturaInicio: "Home",
    borrador: "Bozza · {fecha}",
  },

  estado: {
    sinPublicar: "Non pubblicato",
    publicado: "Pubblicato",
    cambiosSinPublicar: "Modifiche non pubblicate",
  },
};
