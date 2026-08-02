import type { TextosAjustes } from "./tipos";

export const it: TextosAjustes = {
  miga: "I tuoi siti",
  titulo: "Impostazioni",
  lead: "Impostazioni del tuo account e della piattaforma.",

  nav: {
    claves: "Collegamenti e chiavi",
    herramientas: "Strumenti del sito",
    equipo: "Squadra",
    plan: "Piano e utilizzo",
    cuenta: "Il tuo account",
    peligro: "Zona di pericolo",
  },

  claves: {
    titulo: "Collegamenti e chiavi",
    texto:
      "Tutto quello che genera l'IA (articoli, modelli, radar dei temi) passa dalla **tua chiave** ed " +
      "è addebitato sul tuo account: paghi il consumo reale, senza ricarichi nostri. Senza chiave " +
      "quelle funzioni restano spente; il resto della piattaforma funziona uguale.",

    cargando: "caricamento…",
    sinConfigurar: "Non configurato",
    usandoTuClave: "Sto usando la tua chiave (…{sufijo})",

    modeloTitulo: "Modello di IA per scrivere",
    modeloActual: "Attuale: {modelo}",
    modeloAyuda:
      "È con questo modello che si scrivono gli articoli del blog. Quelli economici consumano meno " +
      "credito (i «:free» niente); se uno dà errore mentre genera, provane un altro. Il punteggio " +
      "del radar dei temi usa sempre il modello predefinito della piattaforma (è 1 chiamata al " +
      "giorno e serve criterio fine).",
    modeloOtro: "Altro…",
    modeloOtroEjemplo: "identificatore di openrouter.ai/models, per es. deepseek/deepseek-chat:free",
    modeloGuardado: "Modello salvato.",

    pegaClave: "Incolla qui la tua chiave",
    guardar: "Salva",
    probar: "Prova il collegamento",
    quitar: "Togli",
    claveGuardada: "Chiave salvata.",
    claveGuardadaYProbada: "Chiave salvata. {detalle}",
    claveGuardadaPeroFallo: "Chiave salvata, ma la prova è fallita: {detalle}. Controlla di averla copiata intera.",
    claveQuitada: "Chiave tolta. Senza una chiave, le funzioni di IA restano spente.",

    openrouterTitulo: "OpenRouter (IA)",
    openrouterTexto: "Scrive gli articoli del blog e genera i modelli. Crea la tua chiave su",
    serpapiTitulo: "SerpAPI (Google Trends)",
    serpapiTexto: "Alimenta il radar dei temi di tendenza del blog. Ha un piano gratuito; crea la tua chiave su",
  },

  herramientas: {
    titulo: "Strumenti del sito",
    lead: "Favicon, immagine di condivisione, Google Search Console e analisi delle visite.",
    texto:
      "Questi strumenti sono **di ogni sito**, non dell'account: si configurano dentro il progetto, " +
      "sotto «Strumenti del sito». Apri uno dei {enlace} per sistemarli.",
    enlace: "tuoi siti",
  },

  equipo: {
    titulo: "Squadra",
    lead:
      "Chi può lavorare su {espacio}. L'editore modifica e pubblica; il proprietario gestisce anche " +
      "le chiavi, l'indirizzo e la squadra.",
    tuEspacio: "il tuo spazio",
    esteEspacio: "questo spazio",

    correoEjemplo: "email@del-tuo-socio.com",
    editor: "Editore",
    propietario: "Proprietario",
    enviando: "Invio…",
    invitar: "Invita",
    invitacionEnviada: "Invito mandato a {email}.",

    tu: " (tu)",
    cederTitulo: "Rendi proprietaria questa persona e scendi tu a editore",
    ceder: "Cedi la proprietà",
    quitar: "Togli",
    soloOwner: "Solo il proprietario dello spazio può invitare o cambiare i ruoli.",

    cederPregunta: "Cedere la proprietà a {nombre}?",
    cederCuerpo:
      "{nombre} passa a comandare in «{espacio}» e tu resti come editore. Solo quella persona potrà " +
      "restituirtela.",
    cederEtiqueta: "Perdi il comando dello spazio",
    cederAceptar: "Sì, cedi",
    cedido: "Adesso {nombre} è il proprietario dello spazio.",
  },

  plan: {
    titulo: "Piano e utilizzo",
    lead: "Cosa include il tuo piano e quanto hai usato in questo spazio.",
    cargando: "Caricamento…",

    tuPlan: "Il tuo piano: {nombre}",
    gratisSiempre: "Gratis per sempre.",
    precios: "{mes} €/mese · {anual} €/anno (2 mesi gratis)",
    porMes: "{n} €/mese",
    porAnual: "{n} €/anno",
    gratis: "0 €",

    estadoCancelada: "Disdetta",
    estadoPagoPendiente: "Pagamento in sospeso",
    estadoPrueba: "In prova",
    estadoActivo: "Attivo",

    cancelando:
      "Hai disdetto il rinnovo. Resti con il tuo piano fino al {fecha} e non ti verrà addebitato " +
      "altro. Dopo passerai al piano Gratis. Se cambi idea, puoi riattivarlo da «Gestisci " +
      "abbonamento» prima di quella data.",
    teQuedan: "Ti restano {dias}.",
    unDia: "{n} giorno",
    variosDias: "{n} giorni",
    pagoFallido:
      "Non siamo riusciti a incassare il tuo ultimo pagamento. Il tuo piano resta attivo mentre " +
      "riproviamo; aggiorna la carta in «Gestisci abbonamento» per non perderlo.",
    seRenueva: "Si rinnova da solo il {fecha}.",

    websTitulo: "Siti",
    websTexto: "Pubblicati in questo spazio.",
    websUso: "{usadas} di {total}",

    marcaTitulo: "Marchio «Fatto con Estrénala»",
    marcaTexto:
      "I tuoi siti pubblicati portano un marchietto discreto in basso a destra. Sparisce passando a un piano superiore.",
    marcaVisible: "Visibile",

    personasTitulo: "Persone nello spazio",
    personasSi: "Il tuo piano ti permette di invitare la tua squadra.",
    personasNo: "Invitare altra gente è del piano Agenzia.",

    comparativa: "I piani a confronto",
    columnaTuya: " ·  tu",
    filaWebs: "Siti",
    filaEditor: "Editor e cronologia",
    filaZip: "Aggiornare da uno ZIP",
    filaAsistente: "Assistente IA (la tua chiave)",
    filaDominio: "Il tuo dominio",
    filaSinMarca: "Senza marchio Estrénala",
    filaBlog: "Blog automatico",
    filaEquipo: "Squadra e inviti",

    sinPagos: "I pagamenti non sono configurati su questo server: i piani si assegnano a mano.",
    soloOwner: "Solo il proprietario dello spazio può cambiare piano.",
    abriendo: "Apertura…",
    gestionar: "Gestisci abbonamento",
    gestionarTexto: "Cambia piano, aggiorna la carta o disdici. Si apre su Stripe.",
    comoPagar: "Come vuoi pagare:",
    mesAMes: "Mese per mese",
    anual: "Annuale (2 mesi gratis)",
    pasarA: "Passa a {plan} · {precio}",
    pagoSeguro: "Il pagamento si fa su una pagina sicura di Stripe. Puoi disdire quando vuoi.",
  },

  cuenta: {
    titulo: "Il tuo account",
    lead: "Il tuo nome, la tua password e l'email con cui entri.",

    nombre: "Nome",
    nombreTexto: "Come ti chiamiamo sulla piattaforma.",
    guardar: "Salva",
    nombreGuardado: "Nome salvato.",

    idioma: "Lingua",
    idiomaTexto: "Quella in cui ti parliamo: il pannello e le email che ti mandiamo.",
    idiomaAutomatico: "Automatico (quella del tuo browser)",
    idiomaGuardado: "Lingua salvata.",

    password: "Password",
    passwordConGoogle: "Entri con Google. Puoi metterti anche una password.",
    passwordTexto: "Cambia la tua password.",
    passwordActual: "Attuale",
    passwordNueva: "Nuova (min. 8)",
    cambiar: "Cambia",
    passwordCambiada: "Password cambiata.",

    correo: "Email",
    correoTexto: "Adesso: {email}. Ti manderemo un link a quella nuova per confermarla.",
    correoEjemplo: "nuova@email.com",
    correoEnviado: "Ti abbiamo mandato un'email a {email} per confermarla.",
  },

  peligro: {
    titulo: "Zona di pericolo",
    lead: "Azioni che non si possono annullare.",
    texto:
      "Cancellando il tuo account si cancellano gli spazi di cui sei **unico proprietario**, con " +
      "tutti i loro siti, la loro cronologia e il loro blog. Dagli spazi che condividi con altre " +
      "persone, semplicemente esci. **Questo non si può annullare.**",
    boton: "Elimina il mio account…",
    escribe: "Per confermare, scrivi la tua email {email}:",
    borrando: "Cancellazione…",
    borrar: "Cancella il mio account definitivamente",
    cancelar: "Annulla",
  },

  errores: {
    conexion: "Errore di connessione",
    generico: "Qualcosa è andato storto",
    continuar: "Non è stato possibile continuare",
    borrarCuenta: "Non è stato possibile cancellare l'account",
    probar: "Non è stato possibile provare il collegamento",
  },
};
