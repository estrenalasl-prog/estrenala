import type { TextosLanding } from "./tipos";

// Si dà del «tu», come nell'originale spagnolo: il tono del prodotto è diretto e
// vicino, e il «Lei» lo renderebbe burocratico. «Estrénala» non si traduce — è
// il marchio.

export const it: TextosLanding = {
  meta: {
    titulo: "Estrénala — Il tuo sito fatto con l'IA, finalmente online",
    descripcion:
      "L'IA ti ha fatto un sito e non sai pubblicarlo? Lo mettiamo online in un clic, con dominio e HTTPS, lo modifichi senza codice e Google lo trova.",
  },

  nav: {
    inicio: "Estrénala — home",
    como: "Come funziona",
    editar: "Modificare",
    encontrar: "Quello che non vedi",
    blog: "Blog",
    equipos: "Team",
    faq: "Domande",
    cta: "Metti online il tuo sito, gratis",
    abrirMenu: "Apri il menu",
    principal: "Principale",
  },

  hero: {
    eyebrow: "L'IA ti ha fatto un sito bellissimo…",
    titular: "…e da settimane sta morto dentro una cartella.",
    promesa: "Noi lo mettiamo [[davanti al mondo]].",
    sub: "Trascina qui il sito che ti hanno dato Claude, ChatGPT o v0 e va online con dominio e HTTPS. Modificalo come vuoi, e facciamo che Google lo trovi. Senza saper programmare.",
    cta: "Metti online il tuo sito, gratis →",
    nota: "Gratis per iniziare · senza carta",
    mockAria:
      "Vista del pannello di progetto di Estrénala: il sito Clinica Sorriso pubblicato, con i passi Caricalo, Pubblica e Modifica.",
    mockNombre: "Clinica Sorriso",
    mockPublicado: "Pubblicato",
    mockEtiqueta: "in diretta ✂",
    mockPaso1: "Caricalo",
    mockPaso2: "Pubblica",
    mockPaso3: "Modifica",
  },

  problema: {
    eyebrow: "Il momento in cui ti blocchi",
    titulo: "L'IA ti ha fatto il sito in pochi minuti. ~~Metterlo online~~ ti porta via settimane.",
    texto:
      "Hai uno ZIP con dentro il tuo sito, o dei file che non sai dove mettere. Iniziano a comparire parole come «hosting», «DNS», «server»… e l'entusiasmo si spegne. Il sito che ti era piaciuto resta sul tuo computer, senza che lo veda nessuno.",
    firma: "Estrénala comincia esattamente [[dove l'IA ti pianta in asso]].",
  },

  como: {
    eyebrow: "Come funziona",
    titulo: "Dalla cartella a internet, in tre passi",
    texto: "Senza installare niente, senza toccare codice, senza chiamare il nipote che «se ne intende di computer».",
    paso1Titulo: "Caricalo",
    paso1Texto:
      "Trascina il file o la cartella che ti ha dato l'IA. Non importa se è di Claude, ChatGPT o v0: se è un sito in HTML, va bene.",
    paso1Chip: ".html · .zip · cartella",
    paso2Titulo: "Pubblicalo",
    paso2Texto: "In un clic è online con un indirizzo tutto suo e HTTPS. Hai un dominio tuo? Collegalo e hai finito.",
    paso2Chip: "sottodominio o dominio tuo · HTTPS",
    paso3Titulo: "Modificalo",
    paso3Texto: "Cambia testi, immagini, pulsanti e colori quando vuoi. Con lo storico, per tornare indietro senza paura.",
    paso3Chip: "storico e ripristino",
  },

  editar: {
    eyebrow: "Modificalo come vuoi · senza restare incastrato",
    titulo: "Tre modi di modificare. Scegli tu, non noi.",
    texto: "Puoi usarne uno, un altro o tutti e tre insieme. Da qualunque parte passi, resta sempre salvato nello storico.",
    via1Etq: "Gratis",
    via1Titulo: "A mano, proprio qui",
    via1Texto:
      "Clicca sul tuo sito vero e cambia quello che vedi: testi (con grassetto, corsivo e link), immagini, pulsanti e colori.",
    via1Punto1: "Senza codice, sul sito vero",
    via1Punto2: "Storico e ripristino, sempre",
    via1Punto3: "Gratis, senza limiti",
    via2Etq: "Con la tua chiave IA · opt-in",
    via2Titulo: "Con l'assistente IA",
    via2Texto:
      "Digli con parole tue cosa cambiare («accorcia il titolo», «metti il telefono nell'intestazione») e lo fa per te.",
    via2Punto1: "Colleghi la tua chiave IA",
    via2Punto2: "Sei tu a decidere quando spendi",
    via2Punto3: "Un'opzione potente, mai obbligatoria",
    via3Etq: "Resta nel tuo strumento",
    via3Titulo: "Nel tuo strumento",
    via3Texto:
      "Preferisci restare su Claude Code, ChatGPT o v0? Modifica lì e ricarica lo ZIP: il tuo sito online si aggiorna in un clic.",
    via3Punto1: "Ricarichi lo ZIP e basta",
    via3Punto2: "La versione precedente resta salvata",
    via3Punto3: "Non ti chiudiamo mai qui dentro",
    bandaBadge: "Storico",
    bandaTexto: "Comunque tu modifichi, **puoi sempre tornare indietro**. Se qualcosa si rompe, lo ripristini in un clic.",
  },

  encontrar: {
    eyebrow: "Verificalo adesso",
    titulo: "Il tuo sito ha un modulo di contatto. Non invia niente.",
    texto:
      "Aprilo, compilalo tu e premi invia. Non ti arriverà niente. Succede a quasi tutti i siti fatti con l'IA, e il visitatore non te lo dirà mai: scrive, preme, vede la pagina ricaricarsi e se ne va convinto di averti scritto.",
    enlace: "Perché succede e come verificarlo in 30 secondi",

    f1Titulo: "I messaggi iniziano ad arrivarti",
    f1Texto:
      "Senza toccare l'HTML: il modulo che l'IA ha già scritto inizia a funzionare e i messaggi ti compaiono nel pannello. Lo accendi tu, quando vuoi, perché conservare i dati dei tuoi clienti lo decidi tu e non noi.",
    f2Titulo: "E già che ci siamo diamo un voto al resto",
    f2Texto:
      "Diciassette controlli su tutte le tue pagine, senza gergo. «Senza descrizione» qui si legge: «è il testo grigio sotto il titolo su Google, la tua pubblicità gratis».",
    f3Titulo: "La scheda che dice a Google e a ChatGPT cosa sei",
    f3Texto:
      "Un'attività, con il tuo telefono, il tuo logo e i tuoi social. Quasi nessun sito fatto con l'IA ce l'ha, ed è quello che ti fa citare quando qualcuno chiede del tuo settore.",

    banda:
      "Quello che si può sistemare **senza che il tuo sito si veda diverso, lo sistemiamo noi** mentre lo serviamo. Non devi ricaricare niente, e il giorno che te ne vai il tuo sito esce esattamente come l'hai caricato.",

    panelAria:
      "Esame di un sito appena caricato: voto 62 su 100, con tre cose trovate — il modulo di contatto non invia da nessuna parte, senza scheda per i motori di ricerca e immagini senza descrizione.",
    notaPie: "su 100",
    veredicto: "Gli mancano cose importanti, e una ti sta costando clienti.",
    fallo1: "Il modulo non invia da nessuna parte",
    fallo1Pie: "in contatto.html",
    fallo1Badge: "Grave",
    fallo2: "Senza scheda per i motori di ricerca",
    fallo2Pie: "nella home page",
    fallo2Badge: "Ci pensiamo noi",
    fallo3: "Immagini senza descrizione",
    fallo3Pie: "12 immagini in 4 pagine",
    fallo3Badge: "Grave",
  },

  blog: {
    eyebrow: "Il blog che si scrive da solo",
    titulo: "Compari su Google senza dover scrivere",
    texto:
      "Un blog con contenuti freschi ti porta visite. Il nostro se ne occupa: trova gli argomenti, li scrive e li pubblica.",
    f1Titulo: "Radar degli argomenti di tendenza",
    f1Texto: "Individua cosa cerca questo mese la gente del tuo settore, con dati reali di ricerca.",
    f2Titulo: "Scrittura per fasi",
    f2Texto: "L'IA scrive l'articolo passo dopo passo e tu lo rivedi quando vuoi, non tutto in una volta.",
    f3Titulo: "Copertina automatica",
    f3Texto: "Ogni articolo esce con la sua immagine di copertina, senza che tu debba cercarla.",
    f4Titulo: "Programmazione e pilota automatico",
    f4Texto: "Pubblica nella data che scegli, oppure lascia il pilota e esce da solo ogni settimana.",
    aviso:
      "Il blog è incluso nei piani a pagamento e scrive con la tua chiave IA · opt-in: sei tu a decidere quando spendi. Pubblicare e modificare a mano è gratis.",
    panelAria:
      "Pannello del blog: un articolo pubblicato, una bozza scritta dall'IA, uno programmato e il pilota automatico attivo.",
    art1Titulo: "5 segnali che è ora di un controllo",
    art1Pie: "Pubblicato il 3 luglio",
    art1Badge: "Pubblicato",
    art2Titulo: "Sbiancamento: miti e verità",
    art2Pie: "Scrittura per fasi · 2 di 4",
    art2Badge: "Bozza IA",
    art3Titulo: "Prendersi cura dell'apparecchio d'estate",
    art3Pie: "Esce il 20 lug.",
    art3Badge: "Programmato",
    pilotoTitulo: "Pilota automatico",
    pilotoPie: "Un articolo nuovo ogni settimana",
    pilotoActivado: "Attivo",
  },

  equipo: {
    eyebrow: "Lavori con altre persone?",
    titulo: "Il tuo team, nello stesso posto",
    texto:
      "Che tu sia da solo o un'agenzia con più clienti, ogni sito vive nel suo spazio e lavorate senza pestarvi i piedi.",
    punto1: "Entra con la tua email o con Google",
    punto2: "Invita altre persone nel tuo spazio",
    punto3: "Ruoli chiari: proprietario ed editor",
    roles: "Proprietario · Editor",
  },

  publico: {
    eyebrow: "Per chi è",
    titulo: "Pensata per chi non ha voglia di litigare con la tecnica",
    c1Titulo: "Imprenditori",
    c1Texto: "Lanci il tuo progetto senza dipendere da nessuno né aspettare settimane uno sviluppatore.",
    c2Titulo: "Piccole agenzie",
    c2Texto: "Pubblichi e mantieni i siti dei tuoi clienti in un posto solo, con il tuo team dentro.",
    c3Titulo: "Persone non tecniche",
    c3Texto: "Se sai usare l'email, sai usare Estrénala. Niente codice, niente server.",
  },

  faq: {
    eyebrow: "Domande frequenti",
    titulo: "Quello che di solito si vuole sapere",
    preguntas: [
      {
        p: "Devo saper programmare?",
        r: "No. Carichi il tuo sito, lo pubblichi e lo modifichi cliccandoci sopra. Se sai usare l'email o WhatsApp, sai usare Estrénala.",
      },
      {
        p: "Va bene il sito che mi hanno fatto ChatGPT, Claude o v0?",
        r: "Sì. Se è un sito in HTML — che è quello che generano questi strumenti — lo carichi così com'è (un file, uno ZIP o l'intera cartella) e va online.",
      },
      {
        p: "Posso usare un dominio mio?",
        r: "Sì. Puoi iniziare con un indirizzo gratuito **iltuonome.estrenala.com** e, quando vuoi, collegare il tuo dominio (per es. **latuaazienda.com**). Tutto con HTTPS.",
      },
      {
        p: "Quanto costa la parte di IA?",
        r: "Modificare **a mano è gratis**. L'IA (assistente di modifica e blog) funziona con **la tua chiave** ed è opt-in: la colleghi se vuoi e **sei tu a decidere quando spendi**. Non vendiamo «IA illimitata gratis»: paghi il tuo consumo reale al tuo fornitore.",
      },
      {
        p: "E se preferisco continuare a modificare nel mio strumento di IA?",
        r: "Perfetto. Resta su Claude Code, ChatGPT o v0 e, quando hai finito, ricarica lo ZIP: il tuo sito online si aggiorna in un clic e la versione precedente resta nello storico. Non ti chiudiamo qui dentro.",
      },
      {
        p: "Che vuol dire che «sistemate» il mio sito per Google?",
        r: "Quando lo carichi gli facciamo un esame e ti mostriamo cosa non va, in parole semplici. Quello che si può aggiungere **senza che il tuo sito si veda diverso** —la scheda che dice a Google e a ChatGPT cosa sei, l'immagine che esce quando si condivide il link— lo mettiamo noi mentre lo serviamo. **I tuoi file non si toccano**: se domani porti il sito da un'altra parte, esce esattamente come l'hai caricato.",
      },
      {
        p: "Posso tornare indietro se rompo qualcosa?",
        r: "Sempre. Ogni modifica resta nello storico e puoi ripristinare una versione precedente in un clic. Modificare senza paura fa parte del patto.",
      },
      {
        p: "Posso lavorare in team?",
        r: "Sì. Entri con la tua email o con Google e inviti altre persone nel tuo spazio con dei ruoli (proprietario o editor). Ideale per agenzie con più clienti.",
      },
    ],
  },

  ctaFinal: {
    titulo: "Il tuo sito è già pronto. [[Fallo uscire]].",
    texto: "Caricalo adesso — vederlo online ti porterà via meno tempo di quanto ce ne hai messo a leggere questo.",
    cta: "Metti online il tuo sito, gratis →",
    nota: "Gratis per iniziare · senza carta · senza saper programmare",
  },

  pie: {
    lema: "Il posto dove il tuo sito fatto con l'IA esce finalmente nel mondo.",
    colProducto: "Prodotto",
    editarSinCodigo: "Modificare senza codice",
    blogAutomatico: "Blog automatico",
    colEmpezar: "Iniziare",
    subeTuWeb: "Metti online il tuo sito",
    entrar: "Accedi",
    preguntasFrecuentes: "Domande frequenti",
    colLegal: "Legale",
    avisoLegal: "Note legali",
    privacidad: "Privacy",
    cookies: "Cookie",
    terminos: "Termini",
    hechoEn: "Fatto in Spagna · Il tuo sito fatto con l'IA, finalmente online.",
    idioma: "Lingua",
  },
};
