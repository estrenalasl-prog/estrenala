import type { TextosBlog } from "./tipos";

export const fr: TextosBlog = {
  titulo: "Blog",
  aviso:
    "Les pages du blog se génèrent depuis ici ; si tu y touches avec l'éditeur visuel, la prochaine " +
    "régénération du blog effacera ces modifications.",
  avisoPublicar: "Pour que ça se voie sur ton site, clique sur « Publier les modifications » tout en haut.",

  dePago: {
    resumen: "Compris dans les formules payantes",
    titulo: "Un blog qui s'écrit tout seul",
    texto:
      "Des articles avec le design de ton propre site, un index et un sitemap à jour, et un pilote " +
      "automatique qui cherche des sujets et publie tous les quelques jours. À partir de " +
      "{precio} €/mois avec la formule {plan}.",
    boton: "Voir les formules",
  },

  borradorRevision: "✅ à relire",
  borradorError: "⚠ erreur",
  borradorEnMarcha: "⏳ en cours",
  programadoPublicado: "✓ publié",
  programadoError: "⚠ erreur",
  programadoPendiente: "⏳ en attente",

  previo: {
    expandir: "⤢ Agrandir",
    expandirTitulo: "Voir le gabarit en taille réelle",
    salir: "⤡ Quitter",
    salirTitulo: "Quitter le plein écran (Échap)",
    titulo: "aperçu",
  },

  vacio: {
    titulo: "Le blog de ton site",
    texto:
      "Des articles avec ton design, index et sitemap automatiques. D'abord, le gabarit : soit l'IA " +
      "lit ta page d'accueil et propose le design, soit tu apportes le tien tout prêt.",
    crear: "Créer le gabarit du blog avec l'IA",
    creando: "Création du gabarit…",
    yaTengo: "J'ai déjà mon gabarit",
  },

  ia: {
    titulo: "Écrire avec l'IA",
    nicho: "De quoi parle ton blog (l'IA s'en sert pour orienter les articles)",
    nichoEjemplo: "par ex. : Automatisation et IA pour les PME : agents, outils et cas concrets",
    semillas: "Mots-clés de départ (séparés par des virgules ; ils aident le radar à chercher des sujets de ton domaine)",
    semillasEjemplo: "par ex. : agents ia, automatisation pme, chatbots",
    guardarConfig: "Enregistrer la configuration",
    guardado: "Enregistré",
    modelo: "Modèle d'IA : {modelo} — ça se change dans {enlace}.",
    modeloEnlace: "Réglages",
    escribir: "Écrire un article avec l'IA",
    keyword: "Mot-clé ou sujet de l'article",
    crearBorrador: "Créer un brouillon",
    creando: "Création…",
    cancelar: "Annuler",
    abrir: "Ouvrir",
    borrar: "supprimer",
    borrarPregunta: "Supprimer le brouillon « {keyword} » ?",
    borrarCuerpo: "Ce que l'IA a déjà écrit pour lui est perdu. Le regénérer coûterait du crédit à nouveau.",
    borrarAceptar: "Oui, supprimer",
  },

  radar: {
    titulo: "Sujets en tendance",
    buscar: "🔍 Chercher les sujets du jour",
    buscando: "Recherche sur Google…",
    forzar: "Forcer",
    texto:
      "Il regarde ce qui monte aujourd'hui sur Google (Espagne), le croise avec ton domaine et te " +
      "propose des sujets. Consomme jusqu'à 4 crédits SerpAPI + 1 appel d'IA ; une fois par jour.",
    yaHoy: "Le radar a déjà tourné aujourd'hui.",
    actualizado:
      "Radar mis à jour : {candidatos} sujets analysés ({tendencias} des tendances du jour, " +
      "{relacionadas} de tes mots-clés de départ).",
    sinSemillas: "Tes mots-clés n'ont rien donné sur Google Trends : essaie-en de plus courants.",
    relevanciaTitulo: "Pertinence pour ton domaine (0-100)",
    deTendencias: "· tendance du jour",
    deSemillas: "· liée à tes mots-clés",
    escribir: "Écrire l'article",
    preparando: "Préparation…",
    descartar: "écarter",
  },

  piloto: {
    titulo: "Pilote automatique",
    texto:
      "Le blog s'écrit tout seul : le radar cherche le sujet du jour, l'IA rédige avec ton modèle, " +
      "l'image de couverture est générée et la publication est programmée automatiquement. Il " +
      "n'écrit que s'il y a un sujet noté au-dessus de 60 (sinon, ce jour-là il ne dépense rien en " +
      "rédaction). Coût par article : les appels d'IA de ton modèle + le radar (jusqu'à 4 crédits " +
      "SerpAPI par jour).",
    cadaDia: "Tous les jours",
    cada3Dias: "Tous les 3 jours",
    cadaSemana: "Toutes les semaines",
    aPartirDeLas: "à partir de {hora}h",
    portadaDiseno: "Couverture : un visuel (gratuit)",
    portadaIa: "Couverture : image par IA (quelques centimes)",
    guardar: "Enregistrer",
    guardadoActivo: "Enregistré. Le pilote TOURNE.",
    guardadoApagado: "Enregistré (pilote éteint).",
    ultima: "Dernière exécution : {msg}",
    ultimaConDia: "Dernière exécution ({dia}) : {msg}",
  },

  programados: {
    titulo: "Programmés",
    editar: "Modifier",
    editarTitulo: "Ramène le contenu dans l'éditeur et enlève la programmation (reprogramme depuis là)",
    ocultar: "Masquer",
    ocultarTitulo: "Enlève cette ligne ; l'article est déjà dans la liste en dessous",
    hecho: "Article programmé pour le {fecha}. À cette heure-là il se publie tout seul (article et site).",
  },

  lista: {
    nuevo: "Nouvel article",
    editarPlantillas: "Modifier les gabarits",
    cargando: "chargement…",
    editar: "Modifier",
    borrar: "supprimer",
    borrarPregunta: "Supprimer l'article « {titulo} » ?",
    borrarCuerpo:
      "Il sort du blog et de l'index. Pour qu'il disparaisse aussi de ton site publié, pense à " +
      "cliquer ensuite sur « Publier les modifications ».",
    borrarAceptar: "Oui, supprimer",
    guardado: "Article enregistré. {aviso}",
    borrado: "Article supprimé. {aviso}",
  },

  plantillas: {
    misTitulo: "Ton propre gabarit",
    misTexto:
      "Un blog a **deux types de page** : la **liste** des articles —ce qu'on voit en ouvrant " +
      "`/blog/`— et **chaque article de l'intérieur**. C'est pour ça qu'on t'en demande deux, même " +
      "si un seul nous suffit. On ne change pas ton design : on y place juste les emplacements que " +
      "le système remplit avec chaque article.",
    subirHtml: "Envoyer un fichier .html",

    paso1: "1 · À quoi ressemble un article de l'intérieur",
    paso1Texto: "C'est l'important. Voici les emplacements qu'on y met :",
    paso1Ejemplo: "Colle ici le HTML de ta page d'article…",
    paso2: "2 · La liste des articles",
    paso2Opcional: "(facultatif)",
    paso2Texto:
      "La page `/blog/`, avec tous tes articles listés. Ici les emplacements sont différents —le " +
      "titre, la date et le lien de chacun— et ils se placent tout seuls.",
    paso2Ejemplo: "Si tu ne l'apportes pas, on la construit avec le même design que ton article.",

    huecoTitulo: "le titre de l'article",
    huecoContenido: "le corps, déjà en HTML",
    huecoMeta: "le résumé pour Google",
    huecoImagen: "l'image de couverture",
    huecoFecha: "la date de publication",
    huecoCanonical: "la bonne adresse de la page",
    huecoJsonLd: "les données pour Google (ça s'injecte tout seul)",

    colocar: "Placez-les pour moi",
    colocando: "Placement des emplacements…",
    yaLlevaHuecos: "Ils y sont déjà",
    yaLlevaHuecosTitulo:
      "Seulement si tu as déjà écrit toi-même les {{titulo}}, {{contenido}}… dans ton HTML. Alors " +
      "pas besoin de dépenser de l'IA.",
    volver: "Retour",
    cual:
      "**Lequel des deux ?** Si ton HTML est une page normale, **« Placez-les pour moi »** —ça " +
      "consomme un appel d'IA de ton compte OpenRouter—. **« Ils y sont déjà »** c'est seulement " +
      "quand tu as écrit toi-même les `{{titulo}}`, `{{contenido}}`… dedans ; celui-là ne coûte rien.",

    sinHuecosTitulo: "Ton HTML n'a encore aucun emplacement",
    sinHuecosCuerpo:
      "Ce bouton est pour quand tu as déjà écrit toi-même les {{titulo}}, {{contenido}}… dans ton " +
      "HTML. On ne les a pas trouvés, donc le blog ne saurait pas où mettre chaque chose. On peut " +
      "les placer nous-mêmes sans toucher à ton design.",
    sinHuecosAceptar: "Placez-les vous",
    sinHuecosCancelar: "Je les mets moi",

    sinIndiceTitulo: "Il te manque la liste des articles",
    sinIndiceCuerpo:
      "C'est la page /blog/ où apparaissent tous tes articles. À la main, on l'écrit en entourant " +
      "de <!--POST--> et <!--/POST--> le bloc qui se répète pour chacun. Ou on la construit avec le " +
      "design de ton article.",
    sinIndiceAceptar: "Construisez-la vous",
    sinIndiceCancelar: "Je l'écris moi",

    preparando: "Préparation du gabarit avec l'IA (ça peut prendre une minute)…",
    crearConIa: "Créer le gabarit avec l'IA",
    traerLaMia: "Apporter le mien",
    cancelar: "Annuler",
    tplPost: "Gabarit d'article",
    tplIndex: "Gabarit de l'index",
    guardar: "Enregistrer les gabarits",
    guardando: "Enregistrement…",
    previoPost: "Aperçu de l'article",
    previoIndex: "Aperçu de l'index",
    regenerar: "Générer à nouveau",
  },

  editor: {
    titulo: "Titre de l'article",
    meta: "Méta-description (pour Google)",
    contadorMeta: "{n}/160",
    portada: "Image de couverture :",
    generarDiseno: "Générer un visuel",
    generarDisenoTitulo: "Gratuit : un visuel avec le titre et les couleurs de ton site",
    dibujando: "Dessin…",
    generarIa: "Générer avec l'IA",
    generarIaTitulo: "Image générée par IA (quelques centimes par image, sur ton compte OpenRouter)",
    generando: "Génération…",
    cambiarImagen: "Changer l'image",
    subirImagen: "Envoyer une image",
    faltaTitulo: "(écris le titre pour la générer)",
    insertarImagen: "Insérer une image ici",
    insertarTexto:
      "Écris d'abord l'article, clique où tu la veux et appuie sur le bouton. Si tu ne choisis pas " +
      "d'endroit, elle va à la fin.",
    cuerpoEjemplo: "Écris ou colle ici l'article en markdown (celui que ton IA t'a écrit, par exemple)…",
    guardar: "Enregistrer l'article",
    guardando: "Enregistrement…",
    vistaPrevia: "Aperçu",
    cancelar: "Annuler",
    programarTexto: "Ou laisse-le se publier tout seul (article et site) :",
    programar: "Programmer la publication",
  },

  taller: {
    cargando: "Chargement du brouillon…",
    volver: "← Retour",
    encabezado: "Article avec l'IA :",
    modelo: "Modèle : {modelo}",
    modeloDonde: "(ça se change dans les Réglages)",

    listo: "Le brouillon est prêt à être relu.",
    usar: "Utiliser ce brouillon",
    usarTexto:
      "L'éditeur d'articles s'ouvrira avec tout de pré-rempli ; là tu envoies l'image de couverture et tu enregistres.",
    puedesReintentar: "{error} — tu peux réessayer l'étape.",

    ejecutar: "▶ Lancer {etapa}",
    auto: "⏩ Auto jusqu'à la relecture",
    detener: "⏹ Arrêter (s'arrête à la fin de l'étape en cours)",
    autoTitulo: "Écrire l'article entier d'un coup",
    autoCuerpo:
      "Le mode automatique enchaîne toutes les étapes en attente (plusieurs appels d'IA) et " +
      "consomme du crédit OpenRouter.",
    autoAceptar: "Tout lancer",

    generando: " génération…",
    regenerar: "↻ Regénérer",
    ver: "voir",
    ocultar: "masquer",
    instruccion: "Instruction facultative pour regénérer (par ex. : plus court, ton formel…)",
    nota: "Regénérer une étape ne refait pas les suivantes : c'est toi qui décides lesquelles regénérer.",

    etapaAnalisis: "Analyse SEO",
    etapaPlan: "Plan de l'article",
    etapaInvestigacion: "Recherche web",
    etapaRedaccion: "Rédaction",
    etapaLinks: "Liens internes",
    etapaMetadatos: "Métadonnées SEO",

    analisisResumen: "Mot-clé principal : {principal}\nSecondaires : {secundarias}\nIntention de recherche : {intencion}",
    linksHecho:
      "Fait : les liens internes pertinents (s'il y en avait) sont intégrés à l'article (voir Rédaction).",
    metadatosResumen: "Titre : {titulo}\nSlug : {slug}\nMéta-description : {meta}",
  },

  errores: {
    conexion: "Erreur de connexion",
    generico: "Quelque chose n'a pas marché",
    subirImagen: "L'image n'a pas pu être envoyée",
  },
};
