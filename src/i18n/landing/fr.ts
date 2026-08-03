import type { TextosLanding } from "./tipos";

// Tutoiement, comme dans l'original espagnol : le ton du produit est direct et
// proche, et le vouvoiement le rendrait administratif. « Estrénala » ne se
// traduit pas — c'est la marque.

export const fr: TextosLanding = {
  meta: {
    titulo: "Estrénala — Ton site fait par l'IA, enfin en ligne",
    descripcion:
      "L'IA t'a fait un site et tu ne sais pas comment le mettre en ligne ? Estrénala le publie en un clic avec un domaine et HTTPS, tu le modifies sans code et on fait que Google le trouve. Gratuit pour commencer.",
  },

  nav: {
    inicio: "Estrénala — accueil",
    como: "Comment ça marche",
    editar: "Modifier",
    encontrar: "Être trouvé",
    blog: "Blog",
    equipos: "Équipes",
    faq: "Questions",
    cta: "Mets ton site en ligne, gratuit",
    abrirMenu: "Ouvrir le menu",
    principal: "Principal",
  },

  hero: {
    eyebrow: "L'IA t'a fait un site magnifique…",
    titular: "…et il dort depuis des semaines dans un dossier.",
    promesa: "Nous, on le met [[devant le monde]].",
    sub: "Glisse le site que Claude, ChatGPT ou v0 t'a donné et il passe en ligne avec un domaine et HTTPS. Modifie-le comme tu veux, et on fait que Google le trouve. Sans savoir coder.",
    cta: "Mets ton site en ligne, gratuit →",
    nota: "Gratuit pour commencer · sans carte",
    mockAria:
      "Vue du panneau de projet d'Estrénala : le site Clinique Sourire publié, avec les étapes Envoie-le, Publie et Modifie.",
    mockNombre: "Clinique Sourire",
    mockPublicado: "Publié",
    mockEtiqueta: "en direct ✂",
    mockPaso1: "Envoie-le",
    mockPaso2: "Publie",
    mockPaso3: "Modifie",
  },

  problema: {
    eyebrow: "Le moment où tu bloques",
    titulo: "L'IA t'a fait le site en quelques minutes. ~~Le mettre en ligne~~ te prend des semaines.",
    texto:
      "Tu as un ZIP avec ton site dedans, ou des fichiers dont tu ne sais pas quoi faire. Des mots comme « hébergement », « DNS », « serveur » apparaissent… et l'envie retombe. Le site qui t'avait plu reste sur ton ordinateur, sans que personne ne le voie.",
    firma: "Estrénala commence exactement [[là où l'IA te laisse tomber]].",
  },

  como: {
    eyebrow: "Comment ça marche",
    titulo: "Du dossier à internet, en trois étapes",
    texto: "Rien à installer, pas une ligne de code, et pas besoin d'appeler le neveu qui « s'y connaît en informatique ».",
    paso1Titulo: "Envoie-le",
    paso1Texto:
      "Glisse le fichier ou le dossier que l'IA t'a donné. Claude, ChatGPT ou v0, peu importe : si c'est un site en HTML, ça marche.",
    paso1Chip: ".html · .zip · dossier",
    paso2Titulo: "Publie-le",
    paso2Texto: "En un clic il est en ligne avec sa propre adresse et HTTPS. Tu as ton domaine ? Connecte-le et c'est fait.",
    paso2Chip: "sous-domaine ou domaine perso · HTTPS",
    paso3Titulo: "Modifie-le",
    paso3Texto: "Change les textes, les images, les boutons et les couleurs quand tu veux. Avec un historique, pour revenir en arrière sans crainte.",
    paso3Chip: "historique et retour arrière",
  },

  editar: {
    eyebrow: "Modifie-le comme tu veux · sans être enfermé",
    titulo: "Trois façons de modifier. C'est toi qui choisis, pas nous.",
    texto: "Tu peux utiliser l'une, l'autre ou les trois à la fois. Quel que soit le chemin, tout reste enregistré dans l'historique.",
    via1Etq: "Gratuit",
    via1Titulo: "À la main, ici même",
    via1Texto:
      "Clique sur ton vrai site et change ce que tu vois : les textes (gras, italique et liens), les images, les boutons et les couleurs.",
    via1Punto1: "Sans code, sur le vrai site",
    via1Punto2: "Historique et retour arrière, toujours",
    via1Punto3: "Gratuit, sans limite",
    via2Etq: "Avec ta clé d'IA · opt-in",
    via2Titulo: "Avec l'assistant IA",
    via2Texto:
      "Dis-lui avec tes mots ce qu'il faut changer (« raccourcis le titre », « mets le téléphone dans l'en-tête ») et il le fait pour toi.",
    via2Punto1: "Tu connectes ta propre clé d'IA",
    via2Punto2: "C'est toi qui décides quand tu dépenses",
    via2Punto3: "Une option puissante, jamais obligatoire",
    via3Etq: "Reste dans ton outil",
    via3Titulo: "Dans ton propre outil",
    via3Texto:
      "Tu préfères rester sur Claude Code, ChatGPT ou v0 ? Modifie là-bas et renvoie le ZIP : ton site en ligne se met à jour en un clic.",
    via3Punto1: "Tu renvoies le ZIP et c'est tout",
    via3Punto2: "La version précédente est conservée",
    via3Punto3: "On ne t'enferme jamais ici",
    bandaBadge: "Historique",
    bandaTexto: "Quoi que tu changes, **tu peux toujours revenir en arrière**. Si quelque chose casse, tu le restaures en un clic.",
  },

  encontrar: {
    eyebrow: "Et on fait qu'on le trouve",
    titulo: "L'IA t'a fait un joli site. À l'intérieur, il sort cassé.",
    texto:
      "Ça ne se voit pas en le regardant, parce que ce ne sont pas des défauts de design. Ça se remarque des mois plus tard, quand tu n'apparais nulle part sur Google et que tu ne sais plus pourquoi. Nous, on regarde dedans le jour même où tu le mets en ligne.",

    f1Titulo: "On lui met une note et on te dit ce que ça te coûte",
    f1Texto:
      "Dix-sept vérifications sur toutes tes pages, sans jargon. « Aucune description » se lit ici : « c'est le texte gris sous le titre dans Google, ta publicité gratuite ».",
    f2Titulo: "La fiche qui dit à Google et à ChatGPT ce que tu es",
    f2Texto:
      "Une entreprise, avec ton téléphone, ton logo et tes réseaux. Presque aucun site fait avec l'IA n'en a, et c'est ce qui fait qu'on te cite quand quelqu'un pose une question sur ton métier.",
    f3Titulo: "Et les formulaires qui n'allaient nulle part",
    f3Texto:
      "Le grand classique : quelqu'un t'écrit, appuie sur « envoyer » et rien ne se passe. Ni avertissement pour lui, ni message pour toi. On te le montre et, si tu veux, les messages commencent à arriver.",

    banda:
      "Tout ce qui peut être corrigé **sans que ton site ait l'air différent, on le corrige nous-mêmes** au moment de le servir. Tu n'as jamais rien à renvoyer, et le jour où tu pars, ton site ressort exactement comme tu l'avais envoyé.",

    panelAria:
      "Examen d'un site tout juste mis en ligne : note de 62 sur 100, avec trois choses trouvées — pas prêt pour le mobile, aucune fiche pour les moteurs de recherche et des images sans description.",
    notaPie: "sur 100",
    veredicto: "Il lui manque des choses importantes pour que Google le comprenne.",
    fallo1: "Pas prête pour le mobile",
    fallo1Pie: "sur 5 pages",
    fallo1Badge: "Grave",
    fallo2: "Aucune fiche pour les moteurs de recherche",
    fallo2Pie: "sur la page d'accueil",
    fallo2Badge: "On s'en occupe",
    fallo3: "Des images sans description",
    fallo3Pie: "12 images sur 4 pages",
    fallo3Badge: "Grave",
  },

  blog: {
    eyebrow: "Le blog qui s'écrit tout seul",
    titulo: "Apparais sur Google sans avoir à écrire",
    texto:
      "Un blog avec du contenu frais t'amène des visites. Le nôtre s'en occupe : il trouve les sujets, les rédige et les publie.",
    f1Titulo: "Radar des sujets qui montent",
    f1Texto: "Il repère ce que les gens de ton secteur cherchent ce mois-ci, avec de vraies données de recherche.",
    f2Titulo: "Rédaction par étapes",
    f2Texto: "L'IA écrit l'article pas à pas et tu le relis quand tu veux, pas d'un seul coup.",
    f3Titulo: "Image de couverture automatique",
    f3Texto: "Chaque article sort avec son image de couverture, sans que tu aies à la chercher.",
    f4Titulo: "Programmation et pilote automatique",
    f4Texto: "Publie à la date que tu choisis, ou laisse le pilote et il sort tout seul chaque semaine.",
    aviso:
      "Le blog est inclus dans les formules payantes et écrit avec ta propre clé d'IA · opt-in : c'est toi qui décides quand tu dépenses. Publier et modifier à la main est gratuit.",
    panelAria:
      "Panneau du blog : un article publié, un brouillon écrit par l'IA, un programmé, et le pilote automatique activé.",
    art1Titulo: "5 signes qu'il est temps de faire un contrôle",
    art1Pie: "Publié le 3 juillet",
    art1Badge: "Publié",
    art2Titulo: "Blanchiment : mythes et réalités",
    art2Pie: "Rédaction par étapes · 2 sur 4",
    art2Badge: "Brouillon IA",
    art3Titulo: "Prendre soin de son appareil dentaire en été",
    art3Pie: "Sort le 20 juil.",
    art3Badge: "Programmé",
    pilotoTitulo: "Pilote automatique",
    pilotoPie: "Un nouvel article chaque semaine",
    pilotoActivado: "Activé",
  },

  equipo: {
    eyebrow: "Tu travailles avec d'autres personnes ?",
    titulo: "Ton équipe, au même endroit",
    texto:
      "Que tu sois seul ou une agence avec plusieurs clients, chaque site vit dans son espace et vous travaillez sans vous marcher dessus.",
    punto1: "Connecte-toi avec ton e-mail ou avec Google",
    punto2: "Invite d'autres personnes dans ton espace",
    punto3: "Des rôles clairs : propriétaire et éditeur",
    roles: "Propriétaire · Éditeur",
  },

  publico: {
    eyebrow: "Pour qui c'est",
    titulo: "Pensée pour ceux qui ne veulent pas se battre avec la technique",
    c1Titulo: "Entrepreneurs",
    c1Texto: "Lance ton projet sans dépendre de personne ni attendre des semaines un développeur.",
    c2Titulo: "Petites agences",
    c2Texto: "Publie et entretiens les sites de tes clients au même endroit, avec ton équipe dedans.",
    c3Titulo: "Les non-techniciens",
    c3Texto: "Si tu sais utiliser ta boîte mail, tu sais utiliser Estrénala. Ni code ni serveurs.",
  },

  faq: {
    eyebrow: "Questions fréquentes",
    titulo: "Ce qu'on nous demande le plus souvent",
    preguntas: [
      {
        p: "Faut-il savoir coder ?",
        r: "Non. Tu envoies ton site, tu le publies et tu le modifies en cliquant dessus. Si tu sais utiliser ta boîte mail ou WhatsApp, tu sais utiliser Estrénala.",
      },
      {
        p: "Est-ce que le site fait par ChatGPT, Claude ou v0 fonctionne ?",
        r: "Oui. Si c'est un site en HTML — ce que produisent ces outils —, tu l'envoies tel quel (un fichier, un ZIP ou le dossier entier) et il passe en ligne.",
      },
      {
        p: "Puis-je utiliser mon propre domaine ?",
        r: "Oui. Tu peux commencer avec une adresse gratuite **tonnom.estrenala.com** et connecter ton propre domaine quand tu veux (par ex. **tonentreprise.com**). Le tout avec HTTPS.",
      },
      {
        p: "Combien coûte la partie IA ?",
        r: "Modifier **à la main est gratuit**. L'IA (l'assistant de modification et le blog) fonctionne avec **ta propre clé** et est en opt-in : tu la connectes si tu veux et **c'est toi qui décides quand tu dépenses**. On ne vend pas d'« IA illimitée gratuite » : tu paies ta consommation réelle à ton fournisseur.",
      },
      {
        p: "Et si je préfère continuer à modifier dans mon outil d'IA ?",
        r: "Parfait. Reste sur Claude Code, ChatGPT ou v0 et, quand tu as fini, renvoie le ZIP : ton site en ligne se met à jour en un clic et la version précédente reste dans l'historique. On ne t'enferme pas ici.",
      },
      {
        p: "C'est quoi, ce site que vous « réparez » pour Google ?",
        r: "Quand tu le mets en ligne, on lui fait passer un examen et on te montre ce qui ne va pas, en clair. Tout ce qui peut être ajouté **sans que ton site ait l'air différent** —la fiche qui dit à Google et à ChatGPT ce que tu es, l'image qui s'affiche au partage du lien— on le met au moment de le servir. **On ne touche jamais à tes fichiers** : si demain tu emmènes ton site ailleurs, il ressort exactement comme tu l'avais envoyé.",
      },
      {
        p: "Puis-je revenir en arrière si je casse quelque chose ?",
        r: "Toujours. Chaque modification reste dans l'historique et tu peux restaurer une version précédente en un clic. Modifier sans crainte fait partie du marché.",
      },
      {
        p: "Puis-je travailler en équipe ?",
        r: "Oui. Tu te connectes avec ton e-mail ou avec Google et tu invites d'autres personnes dans ton espace avec des rôles (propriétaire ou éditeur). Idéal pour les agences avec plusieurs clients.",
      },
    ],
  },

  ctaFinal: {
    titulo: "Ton site est prêt. [[Fais-le sortir]].",
    texto: "Envoie-le maintenant — le voir en ligne te prendra moins de temps que tu n'en as mis à lire ceci.",
    cta: "Mets ton site en ligne, gratuit →",
    nota: "Gratuit pour commencer · sans carte · sans savoir coder",
  },

  pie: {
    lema: "L'endroit où ton site fait par l'IA sort enfin dans le monde.",
    colProducto: "Produit",
    editarSinCodigo: "Modifier sans code",
    blogAutomatico: "Blog automatique",
    colEmpezar: "Commencer",
    subeTuWeb: "Mets ton site en ligne",
    entrar: "Se connecter",
    preguntasFrecuentes: "Questions fréquentes",
    colLegal: "Mentions légales",
    avisoLegal: "Mentions légales",
    privacidad: "Confidentialité",
    cookies: "Cookies",
    terminos: "Conditions",
    hechoEn: "Fait en Espagne · Ton site fait par l'IA, enfin en ligne.",
    idioma: "Langue",
  },
};
