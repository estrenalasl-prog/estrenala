import type { TextosBlog } from "./tipos";

export const it: TextosBlog = {
  titulo: "Blog",
  aviso:
    "Le pagine del blog si generano da qui; se le tocchi con l'editor visuale, la prossima volta " +
    "che il blog si rigenera quelle modifiche si perdono.",
  avisoPublicar: "Perché si veda nel tuo sito, premi «Pubblica le modifiche» qui in cima.",

  dePago: {
    resumen: "Incluso nei piani a pagamento",
    titulo: "Un blog che si scrive da solo",
    texto:
      "Articoli con il design del tuo sito, indice e sitemap sempre aggiornati, e un pilota " +
      "automatico che cerca temi e pubblica ogni pochi giorni. Da {precio} €/mese con il piano {plan}.",
    boton: "Vedi i piani",
  },

  borradorRevision: "✅ da rivedere",
  borradorError: "⚠ errore",
  borradorEnMarcha: "⏳ in corso",
  programadoPublicado: "✓ pubblicato",
  programadoError: "⚠ errore",
  programadoPendiente: "⏳ in attesa",

  previo: {
    expandir: "⤢ Espandi",
    expandirTitulo: "Vedi il modello a grandezza reale",
    salir: "⤡ Esci",
    salirTitulo: "Esci da schermo intero (Esc)",
    titulo: "anteprima",
  },

  vacio: {
    titulo: "Il blog del tuo sito",
    texto:
      "Articoli con il tuo design, indice e sitemap automatici. Prima, il modello: o l'IA legge la " +
      "tua home e propone il design, oppure porti il tuo già fatto.",
    crear: "Crea il modello del blog con l'IA",
    creando: "Sto creando il modello…",
    yaTengo: "Ho già il mio modello",
  },

  ia: {
    titulo: "Scrivere con l'IA",
    nicho: "Di cosa parla il tuo blog (l'IA lo usa per orientare gli articoli)",
    nichoEjemplo: "per es.: Automazione e IA per le PMI: agenti, strumenti e casi pratici",
    semillas: "Parole chiave di partenza (separate da virgole; aiutano il radar a cercare temi del tuo settore)",
    semillasEjemplo: "per es.: agenti ia, automazione pmi, chatbot",
    guardarConfig: "Salva la configurazione",
    guardado: "Salvato",
    modelo: "Modello di IA: {modelo} — si cambia in {enlace}.",
    modeloEnlace: "Impostazioni",
    escribir: "Scrivi un articolo con l'IA",
    keyword: "Parola chiave o tema dell'articolo",
    crearBorrador: "Crea bozza",
    creando: "Sto creando…",
    cancelar: "Annulla",
    abrir: "Apri",
    borrar: "cancella",
    borrarPregunta: "Cancellare la bozza «{keyword}»?",
    borrarCuerpo: "Si perde quello che l'IA ha già scritto. Rigenerarla consumerebbe credito un'altra volta.",
    borrarAceptar: "Sì, cancella",
  },

  radar: {
    titulo: "Temi di tendenza",
    buscar: "🔍 Cerca i temi di oggi",
    buscando: "Sto cercando su Google…",
    forzar: "Forza",
    texto:
      "Guarda cosa sale oggi su Google (Spagna), lo incrocia con il tuo settore e ti propone temi. " +
      "Consuma fino a 4 crediti SerpAPI + 1 chiamata di IA; una volta al giorno.",
    yaHoy: "Il radar è già stato aggiornato oggi.",
    actualizado:
      "Radar aggiornato: {candidatos} temi analizzati ({tendencias} dalle tendenze di oggi, " +
      "{relacionadas} dalle tue parole di partenza).",
    sinSemillas: "Le tue parole di partenza non hanno dato risultati su Google Trends: provane altre più comuni.",
    relevanciaTitulo: "Rilevanza per il tuo settore (0-100)",
    deTendencias: "· tendenza di oggi",
    deSemillas: "· collegata alle tue parole di partenza",
    escribir: "Scrivi l'articolo",
    preparando: "Sto preparando…",
    descartar: "scarta",
  },

  piloto: {
    titulo: "Pilota automatico",
    texto:
      "Il blog si scrive da solo: il radar cerca il tema del giorno, l'IA scrive con il tuo " +
      "modello, si genera la copertina e la pubblicazione viene programmata da sola. Scrive solo se " +
      "c'è un tema con rilevanza sopra 60 (altrimenti quel giorno non spende niente per scrivere). " +
      "Spesa per articolo: le chiamate di IA del tuo modello + il radar (fino a 4 crediti SerpAPI " +
      "al giorno).",
    cadaDia: "Ogni giorno",
    cada3Dias: "Ogni 3 giorni",
    cadaSemana: "Ogni settimana",
    aPartirDeLas: "dalle {hora}:00 in poi",
    portadaDiseno: "Copertina: un design (gratis)",
    portadaIa: "Copertina: immagine con IA (centesimi)",
    guardar: "Salva",
    guardadoActivo: "Salvato. Il pilota è IN MARCIA.",
    guardadoApagado: "Salvato (pilota spento).",
    ultima: "Ultima esecuzione: {msg}",
    ultimaConDia: "Ultima esecuzione ({dia}): {msg}",
  },

  programados: {
    titulo: "Programmati",
    editar: "Modifica",
    editarTitulo: "Riporta il contenuto nell'editor e toglie la programmazione (riprogramma da lì)",
    ocultar: "Nascondi",
    ocultarTitulo: "Toglie questa riga; l'articolo è già nell'elenco qui sotto",
    hecho: "Articolo programmato per il {fecha}. A quell'ora si pubblica da solo (articolo e sito).",
  },

  lista: {
    nuevo: "Nuovo articolo",
    editarPlantillas: "Modifica i modelli",
    cargando: "caricamento…",
    editar: "Modifica",
    borrar: "cancella",
    borrarPregunta: "Cancellare l'articolo «{titulo}»?",
    borrarCuerpo:
      "Sparisce dal blog e dall'indice. Perché sparisca anche dal tuo sito pubblicato, ricordati di " +
      "premere poi «Pubblica le modifiche».",
    borrarAceptar: "Sì, cancella",
    guardado: "Articolo salvato. {aviso}",
    borrado: "Articolo cancellato. {aviso}",
  },

  plantillas: {
    misTitulo: "Il tuo modello",
    misTexto:
      "Un blog ha **due tipi di pagina**: l'**elenco** degli articoli —quello che si vede entrando " +
      "in `/blog/`— e **ogni articolo dentro**. Per questo te ne chiediamo due, anche se con uno ci " +
      "basta. Non cambiamo il tuo design: gli mettiamo solo gli spazi che il sistema riempie con " +
      "ogni articolo.",
    subirHtml: "Carica un file .html",

    paso1: "1 · Com'è fatto un articolo dentro",
    paso1Texto: "È quello importante. Questi sono gli spazi che gli mettiamo:",
    paso1Ejemplo: "Incolla qui l'HTML della tua pagina di articolo…",
    paso2: "2 · L'elenco degli articoli",
    paso2Opcional: "(facoltativo)",
    paso2Texto:
      "La pagina `/blog/`, con tutti i tuoi articoli elencati. Qui gli spazi sono altri —il titolo, " +
      "la data e il link di ognuno— e si mettono da soli.",
    paso2Ejemplo: "Se non lo porti, lo costruiamo con lo stesso design del tuo articolo.",

    huecoTitulo: "il titolo dell'articolo",
    huecoContenido: "il corpo, già in HTML",
    huecoMeta: "il riassunto per Google",
    huecoImagen: "l'immagine di copertina",
    huecoFecha: "la data di pubblicazione",
    huecoCanonical: "l'indirizzo buono della pagina",
    huecoJsonLd: "i dati per Google (si mette da solo)",

    colocar: "Metteteli voi",
    colocando: "Sto mettendo gli spazi…",
    yaLlevaHuecos: "Ha già gli spazi",
    yaLlevaHuecosTitulo:
      "Solo se hai già scritto tu i {{titulo}}, {{contenido}}… dentro il tuo HTML. Allora non serve " +
      "spendere IA.",
    volver: "Torna",
    cual:
      "**Quale dei due?** Se il tuo HTML è una pagina normale, **«Metteteli voi»** —consuma una " +
      "chiamata di IA del tuo account OpenRouter—. **«Ha già gli spazi»** è solo per quando hai " +
      "scritto tu stesso i `{{titulo}}`, `{{contenido}}`… lì dentro; quello non costa niente.",

    sinHuecosTitulo: "Il tuo HTML non ha ancora nessuno spazio",
    sinHuecosCuerpo:
      "Questo pulsante è per quando hai già scritto tu i {{titulo}}, {{contenido}}… dentro il tuo " +
      "HTML. Non li abbiamo trovati, quindi il blog non saprebbe dove mettere ogni cosa. Possiamo " +
      "metterli noi senza toccarti il design.",
    sinHuecosAceptar: "Metteteli voi",
    sinHuecosCancelar: "Li metto io",

    sinIndiceTitulo: "Ti manca l'elenco degli articoli",
    sinIndiceCuerpo:
      "È la pagina /blog/ dove compaiono tutti i tuoi articoli. A mano si scrive circondando con " +
      "<!--POST--> e <!--/POST--> il blocco che si ripete per ognuno. Oppure la costruiamo noi con " +
      "il design del tuo articolo.",
    sinIndiceAceptar: "Costruitela voi",
    sinIndiceCancelar: "La scrivo io",

    preparando: "Sto preparando il modello con l'IA (può volerci un minuto)…",
    crearConIa: "Crea il modello con l'IA",
    traerLaMia: "Porto il mio",
    cancelar: "Annulla",
    tplPost: "Modello di articolo",
    tplIndex: "Modello dell'indice",
    guardar: "Salva i modelli",
    guardando: "Salvataggio…",
    previoPost: "Anteprima articolo",
    previoIndex: "Anteprima indice",
    regenerar: "Rigenera",
  },

  editor: {
    titulo: "Titolo dell'articolo",
    meta: "Meta descrizione (per Google)",
    contadorMeta: "{n}/160",
    portada: "Immagine di copertina:",
    generarDiseno: "Genera un design",
    generarDisenoTitulo: "Gratis: un design con il titolo e i colori del tuo sito",
    dibujando: "Sto disegnando…",
    generarIa: "Genera con l'IA",
    generarIaTitulo: "Immagine generata con IA (centesimi a immagine, sul tuo account OpenRouter)",
    generando: "Sto generando…",
    cambiarImagen: "Cambia immagine",
    subirImagen: "Carica immagine",
    faltaTitulo: "(scrivi il titolo per generarla)",
    insertarImagen: "Inserisci un'immagine qui",
    insertarTexto:
      "Scrivi prima l'articolo, clicca dove la vuoi e premi il pulsante. Se non scegli un punto, va " +
      "alla fine.",
    cuerpoEjemplo: "Scrivi o incolla qui l'articolo in markdown (per esempio quello che ti ha scritto la tua IA)…",
    guardar: "Salva l'articolo",
    guardando: "Salvataggio…",
    vistaPrevia: "Anteprima",
    cancelar: "Annulla",
    programarTexto: "Oppure lascia che si pubblichi da solo (articolo e sito):",
    programar: "Programma la pubblicazione",
  },

  taller: {
    cargando: "Sto caricando la bozza…",
    volver: "← Torna",
    encabezado: "Articolo con l'IA:",
    modelo: "Modello: {modelo}",
    modeloDonde: "(si cambia nelle Impostazioni)",

    listo: "La bozza è pronta da rivedere.",
    usar: "Usa questa bozza",
    usarTexto:
      "Si apre l'editor di articoli con tutto già compilato; lì carichi l'immagine di copertina e salvi.",
    puedesReintentar: "{error} — puoi riprovare la tappa.",

    ejecutar: "▶ Esegui {etapa}",
    auto: "⏩ Auto fino alla revisione",
    detener: "⏹ Ferma (si ferma alla fine della tappa in corso)",
    autoTitulo: "Scrivere l'articolo intero in una volta",
    autoCuerpo:
      "La modalità automatica esegue tutte le tappe rimaste una dietro l'altra (varie chiamate di " +
      "IA) e consuma credito di OpenRouter.",
    autoAceptar: "Esegui tutto",

    generando: " sto generando…",
    regenerar: "↻ Rigenera",
    ver: "vedi",
    ocultar: "nascondi",
    instruccion: "Istruzione facoltativa per rigenerare (per es.: più corto, tono formale…)",
    nota: "Rigenerare una tappa non rifà quelle dopo: decidi tu quali rigenerare.",

    etapaAnalisis: "Analisi SEO",
    etapaPlan: "Piano dell'articolo",
    etapaInvestigacion: "Ricerca sul web",
    etapaRedaccion: "Scrittura",
    etapaLinks: "Link interni",
    etapaMetadatos: "Metadati SEO",

    analisisResumen: "Parola chiave principale: {principal}\nSecondarie: {secundarias}\nIntenzione di ricerca: {intencion}",
    linksHecho:
      "Fatto: i link interni utili (se ce n'erano) sono integrati nell'articolo (vedi Scrittura).",
    metadatosResumen: "Titolo: {titulo}\nSlug: {slug}\nMeta descrizione: {meta}",
  },

  errores: {
    conexion: "Errore di connessione",
    generico: "Qualcosa è andato storto",
    subirImagen: "Non è stato possibile caricare l'immagine",
  },
};
