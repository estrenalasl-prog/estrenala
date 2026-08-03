import type { TextosLegal } from "./tipos";

// Tutoiement, comme dans tout le reste de la plateforme.

export const fr: TextosLegal = {
  banner: {
    aria: "Cookies",
    aviso:
      "Nous utilisons nos propres cookies, nécessaires au fonctionnement de la plateforme, et des cookies Google pour mesurer si nos publicités servent à quelque chose. Les seconds seulement si tu le veux.",
    mas: "Tu peux changer d'avis quand tu veux depuis la {enlace}.",
    enlace: "politique de cookies",
    soloNecesarias: "Uniquement les nécessaires",
    aceptarTodas: "Tout accepter",
  },
  paginas: {
    avisoLegal: "Mentions légales",
    privacidad: "Confidentialité",
    cookies: "Cookies",
    terminos: "Conditions",
    actualizado: "Dernière mise à jour : {fecha}",
    cta: "Mets ton site en ligne, gratuit",
    inicio: "Estrénala — accueil",
    principal: "Principal",
    soloEspanol:
      "Ce document n'est disponible qu'en espagnol. C'est le texte qui régit la relation entre toi et nous.",
  },
  politicaCookies: {
    metaTitulo: "Politique de cookies · Estrénala",
    metaDescripcion:
      "Estrénala n'utilise que les cookies techniques nécessaires pour garder ta session ouverte. Ni analytique, ni publicité.",
    titulo: "Politique de cookies",
    intro:
      "Chez {marca} nous utilisons des **cookies techniques**, ceux dont on ne peut pas se passer pour te connecter et travailler. Notre analytique de visites est **sans cookies** : elle ne garde rien sur ton appareil.",
    conAds:
      "Nous utilisons aussi des **cookies Google** pour mesurer si nos publicités fonctionnent. Ceux-là **ne s'activent que si tu les acceptes** : jusque-là ils se chargent bloqués et ne gardent rien. C'est pour ça que nous t'affichons l'avis la première fois que tu entres, et que les refuser coûte exactement autant que les accepter.",
    sinAds:
      "**Nous n'utilisons aucun cookie d'analytique, de publicité ni de suivi**, ni les nôtres ni ceux de tiers. C'est pour ça que nous ne t'affichons pas de bandeau de consentement : la réglementation ne l'exige pas pour les cookies strictement nécessaires (art. 22.2 LSSI-CE).",
    cambiarDecision: "Changer ma décision sur les cookies",
    tablaTitulo: "Les cookies que nous utilisons",
    thNombre: "Nom",
    thPara: "À quoi il sert",
    thDuracion: "Durée",
    thTipo: "Type",
    tecnicaPropia: "Technique, le nôtre",
    sesionPara: "Garder ta session ouverte en sécurité (il voyage signé cryptographiquement)",
    sesionDuracion: "30 jours",
    espacioPara: "Se rappeler dans quel espace de travail tu es, si tu appartiens à plusieurs",
    espacioDuracion: "Jusqu'à 400 jours",
    googlePara:
      "Te protéger des attaques CSRF pendant que tu te connectes avec Google (seulement si tu utilises cette option)",
    googleDuracion: "10 minutes",
    httpOnly:
      "Tous sont **HttpOnly** (inaccessibles depuis JavaScript) et ne voyagent que par connexions sécurisées en production.",
    eliminarTitulo: "Comment les supprimer",
    eliminarTexto:
      "Tu peux te déconnecter depuis la plateforme elle-même ou effacer les cookies depuis les réglages de ton navigateur. Garde en tête que si tu les bloques **tu ne pourras pas te connecter** : ils sont nécessaires au fonctionnement du service.",
    tusWebsTitulo: "Les sites que tu publies",
    tusWebsTexto:
      "Cette politique couvre la plateforme {sitio}. **Les sites que tu publies sont les tiens** : si tu ajoutes à ton site des outils d'analytique ou d'autres services qui utilisent des cookies, c'est à toi d'informer tes visiteurs et de recueillir leur consentement le cas échéant.",
    contactoTitulo: "Contact",
    contactoTexto: "La moindre question : {email}. Plus d'informations dans notre {privacidad}.",
  },
};
