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

  proyecto: {
    formularios: {
      titulo: "Messaggi dai tuoi moduli",
      apagado: "Spento",
      encendido: "In raccolta",
      encender: "Raccogli i messaggi",
      apagar: "Smetti di raccogliere",
      queEs:
        "Quando qualcuno compila un modulo del tuo sito, il messaggio arriva qui e ti avvisiamo per email. Finché resta spento, il tuo sito viene servito esattamente come lo hai caricato.",
      avisoDatos:
        "Accendendolo inizi a conservare dati delle persone che ti scrivono. Sei tu a risponderne per legge: dillo sul tuo sito e non chiedere più di quello che ti serve.",
      rotos: "Abbiamo trovato {n} modulo che non manda da nessuna parte.",
      rotosPlural: "Abbiamo trovato {n} moduli che non mandano da nessuna parte.",
      rotosDetalle:
        "Chi lo compila preme «invia» e non succede niente: né un avviso per lui, né un messaggio per te. Accendi la raccolta e cominceranno ad arrivarti.",
      ningunoRoto: "Tutti i moduli della tua home vanno da qualche parte. Non c'è niente da sistemare.",
      sinFormularios: "Non abbiamo visto nessun modulo nella tua pagina iniziale.",
      buscador: "ricerca del sito",
      ajeno: "manda alla sua destinazione",
      mailto: "apre la posta del visitatore",
      propio: "lo gestisce il tuo codice",
      muerto: "non manda da nessuna parte",
      vacia: "Non ti ha ancora scritto nessuno.",
      vaciaEncendida: "Tutto pronto. Appena qualcuno ti scrive, comparirà qui.",
      sinLeer: "{n} da leggere",
      marcarLeidos: "Segna come letti",
      en: "su {pagina}",
      cargando: "Caricamento…",
      errorCargar: "Non è stato possibile caricare i messaggi.",
    },
    seo: {
      titulo: "Come ti vede Google",
      cargando: "Stiamo guardando il tuo sito…",
      errorCargar: "Non è stato possibile esaminare il sito.",
      sinPublicar: "Pubblica il sito e ti diciamo come lo vede Google.",
      todoBien: "Non abbiamo trovato niente da sistemare. Ottimo lavoro.",
      resumenTodoBien: "Tutto a posto",
      examinadas: "{n} pagine esaminate su {total}",
      grave: "Grave",
      aviso: "Migliorabile",
      arreglable: "Ci pensiamo noi",
      enUnaPagina: "in 1 pagina",
      enPaginas: "in {n} pagine",
      ejemplos: "Per esempio:",
      yMas: "e altre {n}",
      veredictoExcelente: "Il tuo sito è messo molto bene per farsi trovare.",
      veredictoBien: "È abbastanza a posto, ma si può tirarne fuori di più.",
      veredictoRegular: "Gli mancano cose importanti perché Google lo capisca.",
      veredictoMal: "Google farà fatica a capire questo sito.",
      fallos: {
        sinTitulo: {
          que: "Questa pagina non ha titolo",
          porque: "È la riga blu su cui la gente clicca su Google. Senza, Google se ne inventa uno con quello che trova.",
        },
        tituloLargo: {
          que: "Il titolo viene tagliato su Google",
          porque: "Supera i 60 caratteri, quindi nei risultati esce a metà.",
        },
        titulosRepetidos: {
          que: "Più pagine con lo stesso titolo",
          porque: "Google non sa quale mostrare e le mette in concorrenza tra loro. È il difetto più comune di un sito fatto con l'IA.",
        },
        sinDescripcion: {
          que: "Senza descrizione",
          porque: "È il testo grigio sotto il titolo su Google: la tua pubblicità gratis. Senza, esce un pezzo qualsiasi della pagina.",
        },
        descripcionLarga: {
          que: "La descrizione viene tagliata",
          porque: "Supera i 160 caratteri e Google la taglia a metà frase.",
        },
        descripcionesRepetidas: {
          que: "La stessa descrizione in più pagine",
          porque: "Stai dicendo a Google che raccontano la stessa cosa, e finisce per mostrarne una sola.",
        },
        sinH1: {
          que: "Non c'è un titolo principale",
          porque: "È la prima cosa che Google legge per capire di cosa parla la pagina. Senza, deve indovinare.",
        },
        variosH1: {
          que: "C'è più di un titolo principale",
          porque: "Se tutto è il titolo, niente lo è: Google non capisce qual è l'argomento della pagina.",
        },
        saltoEncabezados: {
          que: "I titoletti saltano dei livelli",
          porque: "Passano da un livello all'altro senza quello in mezzo. Così si rompe l'indice con cui Google capisce la pagina.",
        },
        imagenesSinAlt: {
          que: "Immagini senza descrizione",
          porque: "Quella descrizione è tutto ciò che Google capisce di una foto, ed è quello che sente chi non riesce a vederla. In più ti fa entrare gratis su Google Immagini.",
        },
        imagenesSinTamano: {
          que: "Immagini senza misure",
          porque: "Il browser non sa quanto spazio lasciare e la pagina saltella mentre carica. Google lo misura e conta per la posizione.",
        },
        sinViewport: {
          que: "Non è pronta per il cellulare",
          porque: "Manca la riga che dice al telefono come disegnarla. Google ordina in base alla versione mobile: senza questo parti perdendo.",
        },
        sinLang: {
          que: "Non dice in che lingua è",
          porque: "Google e i traduttori devono indovinare, e a volte sbagliano paese.",
        },
        sinOgImage: {
          que: "Senza immagine quando la condividi",
          porque: "Se incolli il link su WhatsApp o LinkedIn esce una scheda senza foto. È la differenza tra aprirlo o no.",
        },
        sinDatosEstructurados: {
          que: "Senza scheda per i motori di ricerca",
          porque: "È quello che dice a Google e a ChatGPT cosa sei: un'attività, un articolo, un prodotto. Quasi nessun sito fatto con l'IA ce l'ha, ed è quello che ti fa citare.",
        },
        enlacesGenericos: {
          que: "Link che non dicono dove portano",
          porque: "«Leggi di più» o «qui» non dicono niente né a Google né a chi naviga alla cieca.",
        },
        paginaPesada: {
          que: "Questa pagina pesa troppo",
          porque: "Chi entra dal cellulare con poco campo se ne va prima di vederla. Google lo cronometra a casa del visitatore e conta per la posizione.",
        },
        imagenPesada: {
          que: "Immagini non ottimizzate",
          porque: "Una foto da più di mezzo mega non serve quasi mai: salvata in WebP di solito scende a un quinto, e si vede uguale.",
        },
        sinFavicon: {
          que: "Senza icona della scheda",
          porque: "È il quadratino della scheda del browser e dei preferiti. Senza, esce un foglio bianco.",
        },
      },
    },
    publicar: {
      sinDireccion: "Ancora senza indirizzo",
      copiar: "Copia",
      copiado: "Copiato",
      oculta: "Nascosto a Google",
      ocultaTitulo: "Nessuno lo troverà cercando su Google. Si cambia in «Indirizzo e dominio».",
      sinPublicar: "Non pubblicato",
      publicado: "Pubblicato",
      tienesCambios: "Hai modifiche non pubblicate",
      publicando: "Pubblicazione…",
      publicar: "Pubblica",
      publicarCambios: "Pubblica le modifiche",
      republicar: "Ripubblica",
    },

    sitemap: {
      conHost:
        "Il tuo sito viene servito su {host}, ma il tuo `sitemap.xml` dice a Google che le tue " +
        "pagine stanno su {dominios}. Google andrà a cercarle lì invece che qui.",
      sinHost:
        "Il tuo `sitemap.xml` dice a Google che le tue pagine stanno su {dominios}. Google andrà a " +
        "cercarle lì invece che qui.",
      y: "e",
      arreglaUno:
        "Se quel dominio è tuo, collegalo in «Indirizzo e dominio». Se non lo è, cancella il " +
        "`sitemap.xml` dal tuo sito e te ne generiamo uno corretto.",
      arreglaVarios:
        "Se quei domini sono tuoi, collegali in «Indirizzo e dominio». Se non lo sono, cancella il " +
        "`sitemap.xml` dal tuo sito e te ne generiamo uno corretto.",
    },

    direccion: {
      titulo: "Indirizzo e dominio",
      estadoDominio: "Dominio proprio attivo",
      estadoSubdominio: "Sottodominio attivo · senza dominio proprio",
      estadoNada: "Senza indirizzo",

      subdominioTitulo: "Sottodominio",
      subdominioTexto: "L'indirizzo gratuito del tuo sito su Estrénala.",
      subdominioEjemplo: "mio-sottodominio",
      cambiar: "Cambia",
      guardar: "Salva",

      dominioTitulo: "Dominio proprio",
      dominioQueEs: "I record DNS sono come l'indirizzo postale del tuo dominio.",
      conectadoAntes: "Collegato a ",
      conectadoDespues: ". Tieni questo record dal tuo provider:",
      conecta: "Collega il tuo dominio (per es. **latuaazienda.com**) puntando questi record dal tuo provider:",
      dominioEjemplo: "iltuodominio.com",
      conectar: "Collega",
      quitarDominio: "Togli il dominio",
      quitarSeguro: "**Sicuro?** {dominio} non verrà più usato; il sito resterà sul sottodominio.",
      quitarNo: "No, lascialo",
      quitarSi: "Sì, toglilo",

      tipoA: "Tipo A",
      dnsAyuda:
        "Nel campo **Nome** del tuo provider va solo la parte davanti: `@` se è il tuo dominio " +
        "nudo, oppure `blog` se colleghi `blog.iltuodominio.com`. Con il dominio nudo, aggiungi " +
        "anche `www` che punta allo stesso IP.",

      googleTitulo: "Visibilità su Google",
      googleEtiqueta: "Che Google non lo trovi ancora",
      googleActivo: "Chiediamo ai motori di ricerca di non mostrarlo. Toglilo quando il sito è pronto.",
      googleInactivo:
        "Attivalo mentre lo stai preparando. Il sito resta online: si chiede solo ai motori di " +
        "ricerca di non elencarlo.",
      googleNoEsCandado:
        "Non è un lucchetto: chi ha l'indirizzo entra lo stesso. Se non vuoi che lo veda " +
        "**nessuno**, togli il sito dalla pubblicazione.",

      despublicarTitulo: "Togli il sito dalla pubblicazione",
      despublicarTexto: "Smetterà di vedersi su internet. Potrai ripubblicarlo quando vuoi.",
      despublicar: "Togli dalla pubblicazione",
      despublicarSeguroConHost: "**Sicuro?** Il sito smetterà subito di vedersi su {host}.",
      despublicarSeguro: "**Sicuro?** Il sito smetterà subito di vedersi.",
      despublicarNo: "No, lascialo",
      despublicarSi: "Sì, toglilo",

      txtIntro:
        "Se hai appena toccato il DNS, dagli qualche minuto e riprova. E se il tuo dominio passa " +
        "per un proxy (per esempio Cloudflare), aggiungi anche questo record **TXT**:",
      txtNombre: "Nome",
      txtValor: "Valore",
    },

    asistente: {
      titulo: "Assistente IA",
      resumen: "Digli a parole tue cosa cambiare e lo fa per te",
      intro:
        "Scrivi cosa vuoi cambiare in questa pagina. L'assistente **propone** le modifiche e sei tu " +
        "a decidere se applicarle. Resta tutto nella Cronologia, quindi puoi sempre tornare indietro.",
      avisoTitulo: "Stai per usare l'assistente IA",
      aviso:
        "L'assistente legge la tua pagina e usa l'IA con la tua chiave OpenRouter (consuma " +
        "credito). Rivedrai le modifiche prima di applicarle.",
      avisoAceptar: "Continua",
      pagina: "Pagina:",
      paginaInicio: "{pagina} (home)",
      ejemplo: "Es.: «Rendi il titolo più diretto e correggi gli errori di ortografia»",
      pensando: "Sto pensando…",
      proponer: "Proponi modifiche",
      consumeCredito: "Consuma credito OpenRouter (la tua chiave).",
      sinCambios: "L'assistente non ha proposto nessuna modifica.",
      unCambio: "{n} modifica proposta:",
      variosCambios: "{n} modifiche proposte:",
      avisoVaciados:
        "**Attenzione:** {n} di queste modifiche lasciano un pezzo di testo vuoto. Succede quando " +
        "una frase è divisa in più pezzi con stili diversi e vengono uniti in uno solo: il testo " +
        "viene bene, ma puoi perdere colori o sfumature. Guardalo nell'anteprima dopo aver " +
        "applicato; se non ti convince, annullalo dalla Cronologia.",
      seQuedaVacio: "Resta vuoto",
      aplicando: "Applicazione…",
      aplicarUno: "Applica {n} modifica",
      aplicarVarios: "Applica {n} modifiche",
      verComoQueda: "Vedi come viene",
      ocultarVistaPrevia: "Nascondi l'anteprima",
      descartar: "Scarta",
      asiQuedaria: "Verrebbe così. Non è stato ancora salvato niente.",
      aplicado: "✓ Modifiche applicate. Guardale nell'anteprima qui sotto.",
      tipoTexto: "Testo",
      tipoTextoFormato: "Testo formattato",
      tipoEnlace: "Link",
      tipoColor: "Colore",
    },

    actualizar: {
      titulo: "Aggiorna da uno ZIP",
      resumen: "L'hai modificato nel tuo strumento? Carica la versione nuova",
      texto:
        "Se preferisci continuare a modificare il tuo sito nel tuo strumento (Claude Code, " +
        "ChatGPT, v0…), carica qui lo **.zip** con la versione nuova e il tuo sito online si " +
        "aggiornerà. La versione precedente resta nella **Cronologia**, quindi puoi sempre " +
        "tornare indietro.",
      ojo:
        "Attenzione: lo ZIP sostituisce il contenuto; quello che hai modificato _dentro_ Estrénala " +
        "non si mescola con lui (comanda il tuo progetto nel tuo strumento).",
      boton: "↻ Carica uno ZIP e aggiorna",
      actualizando: "Aggiornamento…",
      hecho: "✓ Sito aggiornato. Guardalo nell'anteprima qui sotto.",
      confirmarTitulo: "Stai per sostituire il contenuto di questo sito",
      confirmarCuerpo:
        "Viene sostituito con quello dello ZIP nuovo. La tua versione attuale resta nella " +
        "Cronologia, quindi puoi tornarci quando vuoi.",
      confirmarEtiqueta: "Si può annullare dalla Cronologia",
      confirmarAceptar: "Sostituisci",
    },

    herramientas: {
      titulo: "Strumenti del sito",
      resumen: "Search Console · Analytics · Favicon · Condivisione",
      configuradas: "{n} di 4 configurati",
      sinConfigurar: "Non configurato",
      listo: "Pronto",
      activa: "Attiva",
      quitar: "Togli",
      aplicar: "Applica",
      subirImagen: "Carica un'immagine",
      cambiar: "Cambia",
      searchConsole: "Google Search Console",
      searchConsoleTexto: "Dimostra a Google che il sito è tuo. Incolla il tag o il codice che ti dà Google.",
      analitica: "Analisi delle visite",
      analiticaTexto: "Misura le visite con Google Analytics. Incolla il tuo ID di misurazione GA4 (inizia per G-).",
      favicon: "Favicon",
      faviconTexto: "L'iconcina della scheda del browser. Carica un'immagine quadrata (png consigliato).",
      compartir: "Immagine di condivisione",
      compartirQueEs: "La foto che appare quando incolli il tuo link su WhatsApp o sui social (og:image).",
      compartirTexto: "Appare quando mandi il tuo sito su WhatsApp o sui social.",
    },

    peligro: {
      titulo: "Zona di pericolo",
      resumen: "Elimina questo sito per sempre",
      texto:
        "Verrà cancellato {nombre} con tutta la sua cronologia, il suo blog e i suoi file. Se è " +
        "pubblicato, non sarà più online. **Questo non si può annullare.**",
      boton: "Elimina questo sito…",
      escribe: "Per confermare, scrivi {nombre}:",
      borrando: "Cancellazione…",
      borrar: "Cancella definitivamente",
      cancelar: "Annulla",
    },

    previo: {
      portada: "{pagina} (home)",
      selectTitulo: "Pagina mostrata",
      selectBloqueado: "Salva o scarta le modifiche per cambiare pagina",
      hacerPortada: "Rendila la home",
      hacerPortadaTitulo: "La home è la pagina che si vede entrando nel tuo indirizzo, senza niente dietro",
      guardando: "Salvataggio…",
      guardandoSuelto: "salvataggio…",
      modoEdicion: "Modalità modifica",
      unCambio: "{n} modifica",
      variosCambios: "{n} modifiche",
      descartar: "Scarta",
      guardarCambios: "Salva le modifiche",
      expandir: "⤢ Espandi",
      expandirTitulo: "Vedi il sito a grandezza reale",
      salir: "⤡ Esci",
      salirTitulo: "Esci da schermo intero (Esc)",
      errorImagen: "Non è stato possibile caricare l'immagine",
      errorPortada: "Non è stato possibile cambiare la home",
      errorGuardar: "Non è stato possibile salvare le modifiche",
    },

    historial: {
      titulo: "Cronologia",
      cargando: "Caricamento…",
      vacio: "Non ci sono ancora modifiche salvate.",
      actual: "attuale · ",
      restaurar: "Ripristina",
      restaurarTitulo:
        "Rimette il sito com'era in quel momento. Non si perde niente: puoi tornare a qualsiasi " +
        "altra versione dell'elenco, e il tuo sito pubblicato non cambia finché non premi " +
        "«Pubblica le modifiche».",
      confirmar:
        "Tornare a questa versione? Il tuo sito pubblicato non cambia finché non premi «Pubblica " +
        "le modifiche».",
      si: "Sì, torna",
      no: "No",
      tipoImport: "Importazione iniziale",
      tipoEdit: "Modifica a mano",
      tipoEditIa: "Modifica con l'assistente",
      tipoBlog: "Modifica nel blog",
      tipoRestore: "Ripristino",
      tipoPublish: "Pubblicazione",
      tipoActualizacion: "Aggiornamento da uno ZIP",
    },

    errores: {
      conexion: "Errore di connessione",
      generico: "Qualcosa è andato storto",
      subirImagen: "Non è stato possibile caricare l'immagine",
      actualizar: "Non è stato possibile aggiornare",
      borrar: "Non è stato possibile cancellare",
    },
  },

  dialogo: {
    cancelar: "Annulla",
    continuar: "Continua",
    entendido: "Capito",
    etiquetaCoste: "Consuma credito della tua chiave",
    etiquetaPeligro: "Non si può annullare",
  },
};
