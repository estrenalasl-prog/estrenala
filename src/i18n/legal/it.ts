import type { TextosLegal } from "./tipos";

// Stesso tono diretto e informale dell'originale spagnolo.

export const it: TextosLegal = {
  banner: {
    aria: "Cookie",
    aviso:
      "Usiamo cookie nostri, necessari perché la piattaforma funzioni, e cookie di Google per misurare se i nostri annunci servono a qualcosa. I secondi solo se vuoi tu.",
    mas: "Puoi cambiare idea quando vuoi dalla {enlace}.",
    enlace: "politica sui cookie",
    soloNecesarias: "Solo quelli necessari",
    aceptarTodas: "Accetta tutti",
  },
  paginas: {
    avisoLegal: "Note legali",
    privacidad: "Privacy",
    cookies: "Cookie",
    terminos: "Termini",
    actualizado: "Ultimo aggiornamento: {fecha}",
    cta: "Metti online il tuo sito, gratis",
    inicio: "Estrénala — home",
    principal: "Principale",
    soloEspanol:
      "Questo documento è disponibile solo in spagnolo. È il testo che regola il rapporto tra te e noi.",
  },
  politicaCookies: {
    metaTitulo: "Politica sui cookie · Estrénala",
    metaDescripcion:
      "Estrénala usa solo i cookie tecnici necessari a tenerti collegato. Niente analitica, niente pubblicità.",
    titulo: "Politica sui cookie",
    intro:
      "Su {marca} usiamo **cookie tecnici**, quelli indispensabili per farti accedere e lavorare. La nostra analitica delle visite è **senza cookie**: non salva niente sul tuo dispositivo.",
    conAds:
      "Usiamo anche **cookie di Google** per misurare se i nostri annunci funzionano. Quelli **si attivano solo se li accetti**: fino ad allora si caricano bloccati e non salvano niente. Per questo ti mostriamo l'avviso la prima volta che entri, e rifiutarli costa esattamente quanto accettarli.",
    sinAds:
      "**Non usiamo cookie di analitica, pubblicità o tracciamento**, né nostri né di terzi. Per questo non ti mostriamo un banner di consenso: la normativa non lo richiede per i cookie strettamente necessari (art. 22.2 LSSI-CE).",
    cambiarDecision: "Cambiare la mia decisione sui cookie",
    tablaTitulo: "I cookie che utilizziamo",
    thNombre: "Nome",
    thPara: "A cosa serve",
    thDuracion: "Durata",
    thTipo: "Tipo",
    tecnicaPropia: "Tecnico nostro",
    sesionPara: "Tenerti collegato in sicurezza (viaggia firmato crittograficamente)",
    sesionDuracion: "30 giorni",
    espacioPara: "Ricordare in quale spazio di lavoro sei, se appartieni a più d'uno",
    espacioDuracion: "Fino a 400 giorni",
    googlePara:
      "Proteggerti dagli attacchi CSRF mentre accedi con Google (solo se usi quell'opzione)",
    googleDuracion: "10 minuti",
    httpOnly:
      "Sono tutti **HttpOnly** (non raggiungibili da JavaScript) e viaggiano solo su connessioni sicure in produzione.",
    eliminarTitulo: "Come eliminarli",
    eliminarTexto:
      "Puoi uscire dalla piattaforma stessa oppure cancellare i cookie dalle impostazioni del tuo browser. Tieni presente che, se li blocchi, **non potrai accedere**: servono al funzionamento del servizio.",
    tusWebsTitulo: "I siti che pubblichi",
    tusWebsTexto:
      "Questa politica copre la piattaforma {sitio}. **I siti che pubblichi sono tuoi**: se aggiungi al tuo sito strumenti di analitica o altri servizi che usano cookie, sei tu a dover informare i tuoi visitatori e raccogliere il loro consenso quando serve.",
    contactoTitulo: "Contatto",
    contactoTexto: "Per qualsiasi dubbio: {email}. Più informazioni nella nostra {privacidad}.",
  },
};
