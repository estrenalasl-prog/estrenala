import type { TextosPanel } from "./tipos";

export const fr: TextosPanel = {
  cabecera: {
    inicio: "Estrénala — aller au tableau de bord",
    espacioActivo: "Espace actif",
    configuracion: "Réglages",
    salir: "Se déconnecter",
  },

  verifica: {
    antes: "Nous t'avons envoyé un e-mail à ",
    despues: " pour confirmer ton compte. Regarde ta boîte de réception (et les indésirables).",
    reenviado: "Renvoyé",
    enviando: "Envoi…",
    reenviar: "Renvoyer l'e-mail",
  },

  subir: {
    arrastra: "Glisse ton site ici",
    subiendo: "Envoi…",
    formatos: "un .zip, un .html ou le dossier entier",
    elegirArchivos: "Choisir des fichiers",
    elegirCarpeta: "Choisir un dossier",
    tienesCarpeta: "Tu as un dossier ?",
    error: "L'import n'a pas fonctionné",
  },

  panel: {
    vacioTitulo: "Mettons ton site en ligne.",
    vacioTexto:
      "Envoie le site que l'IA t'a fait. On l'héberge, on lui donne une adresse et HTTPS, et tu pourras le modifier sans code.",
    paso1: "Envoie-le",
    paso2conClic: "en un clic",
    paso2: "Modifie-le",
    paso3: "Publie-le",

    tusWebs: "Tes sites",
    unProyecto: "projet",
    variosProyectos: "projets",

    empiezaAqui: "Commence ici",
    subeTuWeb: "Envoie ton site fait par l'IA",
    subeTuWebTexto:
      "Glisse le .zip que Claude, ChatGPT ou v0 t'a donné. En un clic il est en ligne, avec une adresse et HTTPS.",

    recientes: "Récents",
    miniaturaInicio: "Accueil",
    borrador: "Brouillon · {fecha}",
  },

  estado: {
    sinPublicar: "Non publié",
    publicado: "Publié",
    cambiosSinPublicar: "Modifications non publiées",
  },

  proyecto: {
    formularios: {
      titulo: "Messages de tes formulaires",
      apagado: "Éteint",
      encendido: "Collecte active",
      encender: "Collecter les messages",
      apagar: "Arrêter la collecte",
      queEs:
        "Quand quelqu'un remplit un formulaire de ton site, le message arrive ici et on te prévient par e-mail. Tant que c'est éteint, ton site est servi exactement comme tu l'as téléversé.",
      avisoDatos:
        "En l'activant, tu commences à stocker des données sur les personnes qui t'écrivent. C'est toi qui en réponds devant la loi : dis-le sur ton site et ne demande pas plus que nécessaire.",
      rotos: "On a trouvé {n} formulaire qui n'envoie nulle part.",
      rotosPlural: "On a trouvé {n} formulaires qui n'envoient nulle part.",
      rotosDetalle:
        "Celui qui le remplit appuie sur « envoyer » et rien ne se passe : ni avertissement pour lui, ni message pour toi. Active la collecte et ils commenceront à arriver.",
      ningunoRoto: "Tous les formulaires de ta page d'accueil vont quelque part. Rien à corriger.",
      sinFormularios: "On n'a vu aucun formulaire sur ta page d'accueil.",
      buscador: "recherche du site",
      ajeno: "envoie vers sa propre destination",
      mailto: "ouvre la messagerie du visiteur",
      propio: "géré par ton propre code",
      muerto: "n'envoie nulle part",
      vacia: "Personne ne t'a encore écrit.",
      vaciaEncendida: "Tout est prêt. Dès que quelqu'un t'écrit, ça apparaîtra ici.",
      sinLeer: "{n} non lus",
      marcarLeidos: "Marquer comme lus",
      en: "sur {pagina}",
      cargando: "Chargement…",
      errorCargar: "Les messages n'ont pas pu être chargés.",
    },
    publicar: {
      sinDireccion: "Pas encore d'adresse",
      copiar: "Copier",
      copiado: "Copié",
      oculta: "Caché de Google",
      ocultaTitulo: "Personne ne le trouvera en cherchant sur Google. Ça se change dans « Adresse et domaine ».",
      sinPublicar: "Non publié",
      publicado: "Publié",
      tienesCambios: "Tu as des modifications non publiées",
      publicando: "Publication…",
      publicar: "Publier",
      publicarCambios: "Publier les modifications",
      republicar: "Republier",
    },

    sitemap: {
      conHost:
        "Ton site est servi sur {host}, mais ton `sitemap.xml` dit à Google que tes pages sont " +
        "sur {dominios}. Google ira les chercher là-bas au lieu d'ici.",
      sinHost:
        "Ton `sitemap.xml` dit à Google que tes pages sont sur {dominios}. Google ira les chercher " +
        "là-bas au lieu d'ici.",
      y: "et",
      arreglaUno:
        "Si ce domaine est à toi, connecte-le dans « Adresse et domaine ». Sinon, supprime le " +
        "`sitemap.xml` de ton site et on t'en génère un correct.",
      arreglaVarios:
        "Si ces domaines sont à toi, connecte-les dans « Adresse et domaine ». Sinon, supprime le " +
        "`sitemap.xml` de ton site et on t'en génère un correct.",
    },

    direccion: {
      titulo: "Adresse et domaine",
      estadoDominio: "Domaine perso actif",
      estadoSubdominio: "Sous-domaine actif · pas de domaine perso",
      estadoNada: "Pas d'adresse",

      subdominioTitulo: "Sous-domaine",
      subdominioTexto: "L'adresse gratuite de ton site sur Estrénala.",
      subdominioEjemplo: "mon-sous-domaine",
      cambiar: "Changer",
      guardar: "Enregistrer",

      dominioTitulo: "Domaine perso",
      dominioQueEs: "Les enregistrements DNS, c'est comme l'adresse postale de ton domaine.",
      conectadoAntes: "Connecté à ",
      conectadoDespues: ". Garde cet enregistrement chez ton hébergeur :",
      conecta: "Connecte ton domaine (par ex. **tonentreprise.com**) en pointant ces enregistrements chez ton hébergeur :",
      dominioEjemplo: "tondomaine.com",
      conectar: "Connecter",
      quitarDominio: "Retirer le domaine",
      quitarSeguro: "**Sûr ?** {dominio} ne sera plus utilisé ; le site restera sur le sous-domaine.",
      quitarNo: "Non, le garder",
      quitarSi: "Oui, retirer",

      tipoA: "Type A",
      dnsAyuda:
        "Dans le champ **Nom** de ton hébergeur, il n'y a que la partie de devant : `@` si c'est " +
        "ton domaine nu, ou `blog` si tu connectes `blog.tondomaine.com`. Avec le domaine nu, " +
        "ajoute aussi `www` pointant vers la même IP.",

      googleTitulo: "Visibilité sur Google",
      googleEtiqueta: "Que Google ne le trouve pas encore",
      googleActivo: "On demande aux moteurs de recherche de ne pas l'afficher. Enlève-le quand le site est prêt.",
      googleInactivo:
        "Active-le pendant que tu le prépares. Le site reste en ligne : on demande juste aux " +
        "moteurs de recherche de ne pas le lister.",
      googleNoEsCandado:
        "Ce n'est pas un verrou : qui a l'adresse entre quand même. Si tu ne veux que **personne** " +
        "ne le voie, dépublie le site.",

      despublicarTitulo: "Dépublier le site",
      despublicarTexto: "Il ne sera plus visible sur internet. Tu pourras le republier quand tu veux.",
      despublicar: "Dépublier",
      despublicarSeguroConHost: "**Sûr ?** Le site ne sera plus visible sur {host} immédiatement.",
      despublicarSeguro: "**Sûr ?** Le site ne sera plus visible immédiatement.",
      despublicarNo: "Non, le laisser",
      despublicarSi: "Oui, dépublier",

      txtIntro:
        "Si tu viens de toucher au DNS, laisse-lui quelques minutes et réessaie. Et si ton domaine " +
        "passe par un proxy (Cloudflare par exemple), ajoute aussi cet enregistrement **TXT** :",
      txtNombre: "Nom",
      txtValor: "Valeur",
    },

    asistente: {
      titulo: "Assistant IA",
      resumen: "Dis-lui avec tes mots quoi changer et il le fait pour toi",
      intro:
        "Écris ce que tu veux changer sur cette page. L'assistant **propose** les modifications et " +
        "c'est toi qui décides de les appliquer. Tout reste dans l'Historique, donc tu peux " +
        "toujours revenir en arrière.",
      avisoTitulo: "Tu vas utiliser l'assistant IA",
      aviso:
        "L'assistant lit ta page et utilise l'IA avec ta clé OpenRouter (ça consomme du crédit). " +
        "Tu reverras les modifications avant de les appliquer.",
      avisoAceptar: "Continuer",
      pagina: "Page :",
      paginaInicio: "{pagina} (accueil)",
      ejemplo: "Ex. : « Rends le titre plus direct et corrige les fautes »",
      pensando: "Réflexion…",
      proponer: "Proposer des modifications",
      consumeCredito: "Consomme du crédit OpenRouter (ta clé).",
      sinCambios: "L'assistant n'a proposé aucune modification.",
      unCambio: "{n} modification proposée :",
      variosCambios: "{n} modifications proposées :",
      avisoVaciados:
        "**Attention :** {n} de ces modifications laissent un bout de texte vide. Ça arrive quand " +
        "une phrase est répartie en plusieurs bouts avec des styles différents et qu'ils sont " +
        "réunis en un seul : le texte est bon, mais tu peux perdre des couleurs ou des dégradés. " +
        "Regarde dans l'aperçu après avoir appliqué ; si ça ne te convient pas, annule depuis " +
        "l'Historique.",
      seQuedaVacio: "Reste vide",
      aplicando: "Application…",
      aplicarUno: "Appliquer {n} modification",
      aplicarVarios: "Appliquer {n} modifications",
      verComoQueda: "Voir ce que ça donne",
      ocultarVistaPrevia: "Masquer l'aperçu",
      descartar: "Abandonner",
      asiQuedaria: "Voilà ce que ça donnerait. Rien n'a encore été enregistré.",
      aplicado: "✓ Modifications appliquées. Regarde-les dans l'aperçu en dessous.",
      tipoTexto: "Texte",
      tipoTextoFormato: "Texte mis en forme",
      tipoEnlace: "Lien",
      tipoColor: "Couleur",
    },

    actualizar: {
      titulo: "Mettre à jour depuis un ZIP",
      resumen: "Tu l'as modifié dans ton outil ? Envoie la nouvelle version",
      texto:
        "Si tu préfères continuer à modifier ton site dans ton propre outil (Claude Code, ChatGPT, " +
        "v0…), envoie ici le **.zip** avec la nouvelle version et ton site en ligne se mettra à " +
        "jour. La version précédente reste dans l'**Historique**, donc tu peux toujours revenir " +
        "en arrière.",
      ojo:
        "Attention : le ZIP remplace le contenu ; ce que tu as modifié _dans_ Estrénala ne s'y " +
        "mélange pas (c'est ton projet dans ton outil qui gagne).",
      boton: "↻ Envoyer un ZIP et mettre à jour",
      actualizando: "Mise à jour…",
      hecho: "✓ Site mis à jour. Regarde-le dans l'aperçu en dessous.",
      confirmarTitulo: "Tu vas remplacer le contenu de ce site",
      confirmarCuerpo:
        "Il est remplacé par celui du nouveau ZIP. Ta version actuelle reste dans l'Historique, " +
        "donc tu peux y revenir quand tu veux.",
      confirmarEtiqueta: "Ça s'annule depuis l'Historique",
      confirmarAceptar: "Remplacer",
    },

    herramientas: {
      titulo: "Outils du site",
      resumen: "Search Console · Analytique · Favicon · Partage",
      configuradas: "{n} sur 4 configurés",
      sinConfigurar: "Non configuré",
      listo: "Prêt",
      activa: "Active",
      quitar: "Retirer",
      aplicar: "Appliquer",
      subirImagen: "Envoyer une image",
      cambiar: "Changer",
      searchConsole: "Google Search Console",
      searchConsoleTexto: "Prouve à Google que le site est à toi. Colle la balise ou le code que Google te donne.",
      analitica: "Analytique des visites",
      analiticaTexto: "Mesure les visites avec Google Analytics. Colle ton ID de mesure GA4 (ça commence par G-).",
      favicon: "Favicon",
      faviconTexto: "La petite icône de l'onglet du navigateur. Envoie une image carrée (png recommandé).",
      compartir: "Image de partage",
      compartirQueEs: "La photo qui apparaît quand tu colles ton lien sur WhatsApp ou les réseaux (og:image).",
      compartirTexto: "Apparaît quand tu envoies ton site par WhatsApp ou sur les réseaux sociaux.",
    },

    peligro: {
      titulo: "Zone de danger",
      resumen: "Supprimer ce site pour toujours",
      texto:
        "{nombre} sera supprimé avec tout son historique, son blog et ses fichiers. S'il est " +
        "publié, il ne sera plus en ligne. **C'est irréversible.**",
      boton: "Supprimer ce site…",
      escribe: "Pour confirmer, écris {nombre} :",
      borrando: "Suppression…",
      borrar: "Supprimer définitivement",
      cancelar: "Annuler",
    },

    previo: {
      portada: "{pagina} (page d'accueil)",
      selectTitulo: "Page affichée",
      selectBloqueado: "Enregistre ou abandonne tes modifications pour changer de page",
      hacerPortada: "En faire la page d'accueil",
      hacerPortadaTitulo: "La page d'accueil, c'est celle qu'on voit en ouvrant ton adresse, sans rien derrière",
      guardando: "Enregistrement…",
      guardandoSuelto: "enregistrement…",
      modoEdicion: "Mode édition",
      unCambio: "{n} modification",
      variosCambios: "{n} modifications",
      descartar: "Abandonner",
      guardarCambios: "Enregistrer les modifications",
      expandir: "⤢ Agrandir",
      expandirTitulo: "Voir le site en taille réelle",
      salir: "⤡ Quitter",
      salirTitulo: "Quitter le plein écran (Échap)",
      errorImagen: "L'image n'a pas pu être envoyée",
      errorPortada: "La page d'accueil n'a pas pu être changée",
      errorGuardar: "Les modifications n'ont pas pu être enregistrées",
    },

    historial: {
      titulo: "Historique",
      cargando: "Chargement…",
      vacio: "Pas encore de modifications enregistrées.",
      actual: "actuelle · ",
      restaurar: "Restaurer",
      restaurarTitulo:
        "Remet le site comme il était à ce moment-là. Rien n'est perdu : tu peux revenir à " +
        "n'importe quelle autre version de la liste, et ton site publié ne change pas tant que tu " +
        "n'as pas cliqué sur « Publier les modifications ».",
      confirmar:
        "Revenir à cette version ? Ton site publié ne change pas tant que tu n'as pas cliqué sur " +
        "« Publier les modifications ».",
      si: "Oui, revenir",
      no: "Non",
      tipoImport: "Import initial",
      tipoEdit: "Modification à la main",
      tipoEditIa: "Modification avec l'assistant",
      tipoBlog: "Changement dans le blog",
      tipoRestore: "Restauration",
      tipoPublish: "Publication",
      tipoActualizacion: "Mise à jour depuis un ZIP",
    },

    errores: {
      conexion: "Erreur de connexion",
      generico: "Quelque chose n'a pas marché",
      subirImagen: "L'image n'a pas pu être envoyée",
      actualizar: "La mise à jour n'a pas fonctionné",
      borrar: "La suppression n'a pas fonctionné",
    },
  },

  dialogo: {
    cancelar: "Annuler",
    continuar: "Continuer",
    entendido: "Compris",
    etiquetaCoste: "Consomme du crédit de ta clé",
    etiquetaPeligro: "C'est irréversible",
  },
};
