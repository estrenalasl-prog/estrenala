import type { TextosAjustes } from "./tipos";

export const fr: TextosAjustes = {
  miga: "Tes sites",
  titulo: "Réglages",
  lead: "Réglages de ton compte et de la plateforme.",

  nav: {
    claves: "Connexions et clés",
    herramientas: "Outils du site",
    equipo: "Équipe",
    plan: "Formule et usage",
    cuenta: "Ton compte",
    peligro: "Zone de danger",
  },

  claves: {
    titulo: "Connexions et clés",
    texto:
      "Tout ce que l'IA génère (articles, gabarits, radar de sujets) passe par **ta propre clé** et " +
      "est facturé sur ton compte : tu paies ce que ça coûte vraiment, sans marge de notre part. " +
      "Sans clé, ces fonctions sont désactivées ; le reste de la plateforme marche pareil.",

    cargando: "chargement…",
    sinConfigurar: "Non configuré",
    usandoTuClave: "Ta clé est utilisée (…{sufijo})",

    modeloTitulo: "Modèle d'IA pour la rédaction",
    modeloActual: "Actuel : {modelo}",
    modeloAyuda:
      "C'est avec ce modèle que sont rédigés les articles du blog. Les économiques consomment moins " +
      "de crédit (les « :free » rien du tout) ; si l'un donne une erreur à la génération, essaie-en " +
      "un autre. La notation du radar de sujets utilise toujours le modèle par défaut de la " +
      "plateforme (c'est 1 appel par jour et ça demande du discernement).",
    modeloOtro: "Autre…",
    modeloOtroEjemplo: "identifiant d'openrouter.ai/models, par ex. deepseek/deepseek-chat:free",
    modeloGuardado: "Modèle enregistré.",

    pegaClave: "Colle ta clé ici",
    guardar: "Enregistrer",
    probar: "Tester la connexion",
    quitar: "Retirer",
    claveGuardada: "Clé enregistrée.",
    claveGuardadaYProbada: "Clé enregistrée. {detalle}",
    claveGuardadaPeroFallo: "Clé enregistrée, mais le test a échoué : {detalle}. Vérifie que tu l'as copiée en entier.",
    claveQuitada: "Clé retirée. Sans clé, les fonctions d'IA sont désactivées.",

    openrouterTitulo: "OpenRouter (IA)",
    openrouterTexto: "Rédige les articles du blog et génère les gabarits. Crée ta clé sur",
    serpapiTitulo: "SerpAPI (Google Trends)",
    serpapiTexto: "Alimente le radar de sujets en tendance du blog. Il y a une formule gratuite ; crée ta clé sur",
  },

  herramientas: {
    titulo: "Outils du site",
    lead: "Favicon, image de partage, Google Search Console et analytique des visites.",
    texto:
      "Ces outils appartiennent à **chaque site**, pas au compte : ils se règlent dans le projet, " +
      "sous « Outils du site ». Ouvre l'un de {enlace} pour les ajuster.",
    enlace: "tes sites",
  },

  equipo: {
    titulo: "Équipe",
    lead:
      "Qui peut travailler sur {espacio}. L'éditeur modifie et publie ; le propriétaire gère en plus " +
      "les clés, l'adresse et l'équipe.",
    tuEspacio: "ton espace",
    esteEspacio: "cet espace",

    correoEjemplo: "email@ton-associe.com",
    editor: "Éditeur",
    propietario: "Propriétaire",
    enviando: "Envoi…",
    invitar: "Inviter",
    invitacionEnviada: "Invitation envoyée à {email}.",

    tu: " (toi)",
    cederTitulo: "Faire de cette personne le propriétaire et redescendre toi-même au rang d'éditeur",
    ceder: "Céder la propriété",
    quitar: "Retirer",
    soloOwner: "Seul le propriétaire de l'espace peut inviter ou changer les rôles.",

    cederPregunta: "Céder la propriété à {nombre} ?",
    cederCuerpo:
      "{nombre} prend les commandes de « {espacio} » et toi tu restes éditeur. Seule cette personne " +
      "pourra te la rendre.",
    cederEtiqueta: "Tu perds les commandes de l'espace",
    cederAceptar: "Oui, céder",
    cedido: "{nombre} est maintenant propriétaire de l'espace.",
  },

  plan: {
    titulo: "Formule et usage",
    lead: "Ce que comprend ta formule et ce que tu as déjà utilisé dans cet espace.",
    cargando: "Chargement…",

    tuPlan: "Ta formule : {nombre}",
    gratisSiempre: "Gratuit pour toujours.",
    precios: "{mes} €/mois · {anual} €/an (2 mois offerts)",
    porMes: "{n} €/mois",
    porAnual: "{n} €/an",
    gratis: "0 €",

    estadoCancelada: "Résiliée",
    estadoPagoPendiente: "Paiement en attente",
    estadoPrueba: "À l'essai",
    estadoActivo: "Active",

    cancelando:
      "Tu as annulé le renouvellement. Tu gardes ta formule jusqu'au {fecha} et rien de plus ne te " +
      "sera prélevé. Ensuite tu passeras à la formule Gratuite. Si tu changes d'avis, tu peux la " +
      "réactiver dans « Gérer l'abonnement » avant cette date.",
    teQuedan: "Il te reste {dias}.",
    unDia: "{n} jour",
    variosDias: "{n} jours",
    pagoFallido:
      "Nous n'avons pas pu prélever ton dernier paiement. Ta formule reste active pendant les " +
      "nouvelles tentatives ; mets la carte à jour dans « Gérer l'abonnement » pour ne pas la perdre.",
    seRenueva: "Elle se renouvelle toute seule le {fecha}.",

    websTitulo: "Sites",
    websTexto: "Publiés dans cet espace.",
    websUso: "{usadas} sur {total}",

    marcaTitulo: "Badge « Fait avec Estrénala »",
    marcaTexto:
      "Tes sites publiés portent un badge discret en bas à droite. Il disparaît quand tu montes de formule.",
    marcaVisible: "Visible",

    personasTitulo: "Personnes dans l'espace",
    personasSi: "Ta formule te permet d'inviter ton équipe.",
    personasNo: "Inviter plus de monde fait partie de la formule Agence.",

    comparativa: "Les formules côte à côte",
    columnaTuya: " ·  toi",
    filaWebs: "Sites",
    filaEditor: "Éditeur et historique",
    filaZip: "Mise à jour depuis un ZIP",
    filaAsistente: "Assistant IA (ta clé)",
    filaDominio: "Ton propre domaine",
    filaSinMarca: "Sans badge Estrénala",
    filaBlog: "Blog automatique",
    filaEquipo: "Équipe et invitations",

    sinPagos: "Les paiements ne sont pas configurés sur ce serveur : les formules sont attribuées à la main.",
    soloOwner: "Seul le propriétaire de l'espace peut changer de formule.",
    abriendo: "Ouverture…",
    gestionar: "Gérer l'abonnement",
    gestionarTexto: "Change de formule, mets la carte à jour ou résilie. Ça s'ouvre chez Stripe.",
    comoPagar: "Comment tu veux payer :",
    mesAMes: "Mois par mois",
    anual: "À l'année (2 mois offerts)",
    pasarA: "Passer à {plan} · {precio}",
    pagoSeguro: "Le paiement se fait sur une page sécurisée de Stripe. Tu peux résilier quand tu veux.",
  },

  cuenta: {
    titulo: "Ton compte",
    lead: "Ton nom, ton mot de passe et l'e-mail avec lequel tu te connectes.",

    nombre: "Nom",
    nombreTexto: "Comment on t'appelle sur la plateforme.",
    guardar: "Enregistrer",
    nombreGuardado: "Nom enregistré.",

    idioma: "Langue",
    idiomaTexto: "Celle dans laquelle on te parle : le tableau de bord et les e-mails qu'on t'envoie.",
    idiomaAutomatico: "Automatique (celle de ton navigateur)",
    idiomaGuardado: "Langue enregistrée.",

    password: "Mot de passe",
    passwordConGoogle: "Tu te connectes avec Google. Tu peux aussi te mettre un mot de passe.",
    passwordTexto: "Change ton mot de passe.",
    passwordActual: "Actuel",
    passwordNueva: "Nouveau (min. 8)",
    cambiar: "Changer",
    passwordCambiada: "Mot de passe changé.",

    correo: "E-mail",
    correoTexto: "Pour l'instant : {email}. On enverra un lien au nouveau pour le confirmer.",
    correoEjemplo: "nouveau@email.com",
    correoEnviado: "On a envoyé un e-mail à {email} pour le confirmer.",
  },

  peligro: {
    titulo: "Zone de danger",
    lead: "Des actions qu'on ne peut pas annuler.",
    texto:
      "Supprimer ton compte supprime les espaces dont tu es **seul propriétaire**, avec tous leurs " +
      "sites, leur historique et leur blog. Des espaces que tu partages avec d'autres personnes, tu " +
      "sors simplement. **C'est irréversible.**",
    boton: "Supprimer mon compte…",
    escribe: "Pour confirmer, écris ton e-mail {email} :",
    borrando: "Suppression…",
    borrar: "Supprimer définitivement mon compte",
    cancelar: "Annuler",
  },

  errores: {
    conexion: "Erreur de connexion",
    generico: "Quelque chose n'a pas marché",
    continuar: "Impossible de continuer",
    borrarCuenta: "Le compte n'a pas pu être supprimé",
    probar: "La connexion n'a pas pu être testée",
  },
};
