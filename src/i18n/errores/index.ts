import type { Idioma } from "../idiomas";

/**
 * Los errores que manda el SERVIDOR, traducidos en la frontera.
 *
 * Aquí la clave es el mensaje en español, no un código. Es raro y es a
 * propósito:
 *
 * Hay 262 aserciones repartidas por los tests que fijan estos mensajes palabra
 * por palabra —«El artículo es demasiado largo (máx. 200000 caracteres)»— y esa
 * exactitud es lo que hace que un cambio de texto no pase desapercibido.
 * Cambiarlos por códigos significaría reescribir esas 262 aserciones a la vez
 * que se traduce, o sea meter dos cambios grandes en la misma maniobra y no
 * saber cuál rompió qué.
 *
 * Así, lo que se lanza sigue siendo exactamente lo de siempre y la traducción
 * ocurre en el único sitio donde el error se convierte en respuesta HTTP (ver
 * `errorJson`). Los tests no se tocan y siguen vigilando lo mismo.
 *
 * Lo que NO está aquí sale en español, y eso incluye lo de dentro de la máquina
 * —la firma de un webhook, `SESSION_SECRET`, un JSON malformado—: son cosas que
 * ve el que administra el servidor, no un cliente.
 *
 * El peligro de este montaje es que el mapa se quede viejo: alguien reescribe un
 * mensaje, la clave deja de coincidir y todo el mundo vuelve a ver español sin
 * que nada falle. De eso se encarga un test que comprueba que cada clave de aquí
 * sigue existiendo en el código.
 */
type Traducciones = Record<Exclude<Idioma, "es">, string>;

export const ERRORES: Record<string, Traducciones> = {
  // --- entrar y darse de alta ---
  "No autorizado": {
    en: "Not authorised",
    pt: "Não autorizado",
    fr: "Non autorisé",
    it: "Non autorizzato",
  },
  "Correo o contraseña incorrectos": {
    en: "Wrong email or password",
    pt: "Email ou palavra-passe errados",
    fr: "E-mail ou mot de passe incorrects",
    it: "Email o password sbagliati",
  },
  "Ese correo no parece válido": {
    en: "That email doesn't look right",
    pt: "Esse email não parece válido",
    fr: "Cet e-mail n'a pas l'air valide",
    it: "Quell'email non sembra valida",
  },
  "Ese correo ya tiene cuenta": {
    en: "That email already has an account",
    pt: "Esse email já tem conta",
    fr: "Cet e-mail a déjà un compte",
    it: "Quell'email ha già un account",
  },
  "La contraseña necesita al menos 8 caracteres": {
    en: "The password needs at least 8 characters",
    pt: "A palavra-passe precisa de pelo menos 8 caracteres",
    fr: "Le mot de passe doit faire au moins 8 caractères",
    it: "La password ha bisogno di almeno 8 caratteri",
  },
  "Escribe tu nombre": {
    en: "Write your name",
    pt: "Escreve o teu nome",
    fr: "Écris ton nom",
    it: "Scrivi il tuo nome",
  },
  "No se pudo crear la cuenta": {
    en: "The account couldn't be created",
    pt: "Não foi possível criar a conta",
    fr: "Le compte n'a pas pu être créé",
    it: "Non è stato possibile creare l'account",
  },
  "No se pudo iniciar sesión": {
    en: "You couldn't be signed in",
    pt: "Não foi possível iniciar sessão",
    fr: "La connexion n'a pas pu se faire",
    it: "Non è stato possibile entrare",
  },
  "No se pudo cambiar la contraseña": {
    en: "The password couldn't be changed",
    pt: "Não foi possível mudar a palavra-passe",
    fr: "Le mot de passe n'a pas pu être changé",
    it: "Non è stato possibile cambiare la password",
  },
  "Ese idioma no existe": {
    en: "That language doesn't exist",
    pt: "Esse idioma não existe",
    fr: "Cette langue n'existe pas",
    it: "Quella lingua non esiste",
  },
  "Demasiados intentos, espera un momento": {
    en: "Too many attempts, wait a moment",
    pt: "Demasiadas tentativas, espera um momento",
    fr: "Trop de tentatives, attends un instant",
    it: "Troppi tentativi, aspetta un attimo",
  },
  "Google no devolvió tu correo": {
    en: "Google didn't give us your email",
    pt: "O Google não devolveu o teu email",
    fr: "Google ne nous a pas donné ton e-mail",
    it: "Google non ci ha dato la tua email",
  },
  "No se pudo validar con Google": {
    en: "We couldn't validate with Google",
    pt: "Não foi possível validar com o Google",
    fr: "La validation avec Google n'a pas marché",
    it: "Non è stato possibile validare con Google",
  },
  "Error interno": {
    en: "Something broke on our side",
    pt: "Alguma coisa se partiu do nosso lado",
    fr: "Quelque chose a cassé de notre côté",
    it: "Qualcosa si è rotto da parte nostra",
  },

  "Ese correo ya está en uso": {
    en: "That email is already taken",
    pt: "Esse email já está em uso",
    fr: "Cet e-mail est déjà pris",
    it: "Quell'email è già in uso",
  },
  "La contraseña actual no es correcta": {
    en: "The current password isn't right",
    pt: "A palavra-passe atual não está correta",
    fr: "Le mot de passe actuel n'est pas le bon",
    it: "La password attuale non è giusta",
  },
  "Este enlace ya no es válido. Pide uno nuevo.": {
    en: "This link isn't valid any more. Ask for a new one.",
    pt: "Esta ligação já não é válida. Pede uma nova.",
    fr: "Ce lien n'est plus valide. Demandes-en un nouveau.",
    it: "Questo link non vale più. Chiedine uno nuovo.",
  },

  // --- espacio y equipo ---
  "Solo el propietario del espacio puede hacer esto": {
    en: "Only the space's owner can do this",
    pt: "Só o proprietário do espaço pode fazer isto",
    fr: "Seul le propriétaire de l'espace peut faire ça",
    it: "Solo il proprietario dello spazio può farlo",
  },
  "Rol no válido": {
    en: "That role isn't valid",
    pt: "Papel não válido",
    fr: "Ce rôle n'est pas valide",
    it: "Ruolo non valido",
  },
  "Esa persona ya está en el espacio": {
    en: "That person is already in the space",
    pt: "Essa pessoa já está no espaço",
    fr: "Cette personne est déjà dans l'espace",
    it: "Quella persona è già nello spazio",
  },
  "Elige a otra persona del espacio": {
    en: "Pick someone else in the space",
    pt: "Escolhe outra pessoa do espaço",
    fr: "Choisis quelqu'un d'autre dans l'espace",
    it: "Scegli un'altra persona dello spazio",
  },
  "No puedes dejar el espacio sin ningún propietario": {
    en: "You can't leave the space without an owner",
    pt: "Não podes deixar o espaço sem nenhum proprietário",
    fr: "Tu ne peux pas laisser l'espace sans propriétaire",
    it: "Non puoi lasciare lo spazio senza nessun proprietario",
  },
  "Eres el único propietario de un espacio con más gente dentro. Pasa la propiedad o quita a los demás antes de borrar tu cuenta.": {
    en: "You're the sole owner of a space with other people in it. Hand ownership over or remove the others before deleting your account.",
    pt: "És o único proprietário de um espaço com mais gente lá dentro. Passa a propriedade ou tira os outros antes de apagares a tua conta.",
    fr: "Tu es le seul propriétaire d'un espace où il y a d'autres personnes. Cède la propriété ou retire-les avant de supprimer ton compte.",
    it: "Sei l'unico proprietario di uno spazio con altra gente dentro. Cedi la proprietà o togli gli altri prima di cancellare il tuo account.",
  },
  "No perteneces a ese espacio": {
    en: "You don't belong to that space",
    pt: "Não pertences a esse espaço",
    fr: "Tu n'appartiens pas à cet espace",
    it: "Non fai parte di quello spazio",
  },
  "Esa persona no está en el espacio": {
    en: "That person isn't in the space",
    pt: "Essa pessoa não está no espaço",
    fr: "Cette personne n'est pas dans l'espace",
    it: "Quella persona non è nello spazio",
  },

  // --- proyectos y publicación ---
  "Proyecto no encontrado": {
    en: "Site not found",
    pt: "Site não encontrado",
    fr: "Site introuvable",
    it: "Sito non trovato",
  },
  "Página no encontrada": {
    en: "Page not found",
    pt: "Página não encontrada",
    fr: "Page introuvable",
    it: "Pagina non trovata",
  },
  "Snapshot no encontrado": {
    en: "Version not found",
    pt: "Versão não encontrada",
    fr: "Version introuvable",
    it: "Versione non trovata",
  },
  "El proyecto no tiene página de entrada": {
    en: "This site has no home page",
    pt: "Este site não tem página inicial",
    fr: "Ce site n'a pas de page d'accueil",
    it: "Questo sito non ha una home",
  },
  "El proyecto no tiene snapshot actual": {
    en: "This site has no current version",
    pt: "Este site não tem versão atual",
    fr: "Ce site n'a pas de version actuelle",
    it: "Questo sito non ha una versione attuale",
  },
  "Ese subdominio ya está en uso": {
    en: "That subdomain is already taken",
    pt: "Esse subdomínio já está em uso",
    fr: "Ce sous-domaine est déjà pris",
    it: "Quel sottodominio è già in uso",
  },
  // --- dirección y dominio (PublishError) ---
  "Subdominio no válido (minúsculas, números y guiones)": {
    en: "Subdomain isn't valid (lowercase, numbers and hyphens)",
    pt: "Subdomínio não válido (minúsculas, números e hífens)",
    fr: "Sous-domaine non valide (minuscules, chiffres et tirets)",
    it: "Sottodominio non valido (minuscole, numeri e trattini)",
  },
  "Ese subdominio está reservado": {
    en: "That subdomain is reserved",
    pt: "Esse subdomínio está reservado",
    fr: "Ce sous-domaine est réservé",
    it: "Quel sottodominio è riservato",
  },
  "No hay subdominios libres para ese nombre": {
    en: "There are no free subdomains for that name",
    pt: "Não há subdomínios livres para esse nome",
    fr: "Il n'y a pas de sous-domaine libre pour ce nom",
    it: "Non ci sono sottodomini liberi per quel nome",
  },
  "Dominio no válido (ejemplo: miempresa.com)": {
    en: "Domain isn't valid (example: mycompany.com)",
    pt: "Domínio não válido (exemplo: aminhaempresa.com)",
    fr: "Domaine non valide (exemple : monentreprise.com)",
    it: "Dominio non valido (esempio: latuaazienda.com)",
  },
  "Ese dominio ya está conectado a otro proyecto": {
    en: "That domain is already connected to another site",
    pt: "Esse domínio já está ligado a outro site",
    fr: "Ce domaine est déjà connecté à un autre site",
    it: "Quel dominio è già collegato a un altro sito",
  },
  "No se pudo activar el dominio en el servidor. Vuelve a intentarlo en unos minutos.": {
    en: "The domain couldn't be switched on at the server. Try again in a few minutes.",
    pt: "Não foi possível ativar o domínio no servidor. Tenta outra vez daqui a uns minutos.",
    fr: "Le domaine n'a pas pu être activé sur le serveur. Réessaie dans quelques minutes.",
    it: "Non è stato possibile attivare il dominio sul server. Riprova tra qualche minuto.",
  },
  "El proyecto no tiene contenido que publicar": {
    en: "This site has nothing to publish",
    pt: "Este site não tem conteúdo para publicar",
    fr: "Ce site n'a rien à publier",
    it: "Questo sito non ha niente da pubblicare",
  },

  "Todavía no veo que ese dominio apunte aquí. Añade los registros DNS y vuelve a intentarlo en unos minutos.": {
    en: "I still can't see that domain pointing here. Add the DNS records and try again in a few minutes.",
    pt: "Ainda não vejo esse domínio a apontar para aqui. Acrescenta os registos DNS e tenta outra vez daqui a uns minutos.",
    fr: "Je ne vois toujours pas ce domaine pointer ici. Ajoute les enregistrements DNS et réessaie dans quelques minutes.",
    it: "Non vedo ancora quel dominio puntare qui. Aggiungi i record DNS e riprova tra qualche minuto.",
  },
  "Has cambiado de dirección demasiadas veces hoy. Vuelve a intentarlo mañana.": {
    en: "You've changed address too many times today. Try again tomorrow.",
    pt: "Mudaste de endereço demasiadas vezes hoje. Tenta outra vez amanhã.",
    fr: "Tu as changé d'adresse trop de fois aujourd'hui. Réessaie demain.",
    it: "Hai cambiato indirizzo troppe volte oggi. Riprova domani.",
  },

  // --- lo que pide un plan de pago ---
  "Conectar tu propio dominio está disponible en los planes de pago": {
    en: "Connecting your own domain comes with the paid plans",
    pt: "Ligar o teu próprio domínio está disponível nos planos pagos",
    fr: "Connecter ton propre domaine est dans les formules payantes",
    it: "Collegare il tuo dominio è nei piani a pagamento",
  },
  "El blog automático está disponible en los planes de pago": {
    en: "The automatic blog comes with the paid plans",
    pt: "O blogue automático está disponível nos planos pagos",
    fr: "Le blog automatique est dans les formules payantes",
    it: "Il blog automatico è nei piani a pagamento",
  },
  "Invitar a tu equipo está disponible en el plan Agencia": {
    en: "Inviting your team comes with the Agency plan",
    pt: "Convidar a tua equipa está disponível no plano Agência",
    fr: "Inviter ton équipe est dans la formule Agence",
    it: "Invitare la tua squadra è nel piano Agenzia",
  },

  // --- subir la web (ImportError) ---
  "El archivo no es un ZIP válido": {
    en: "That file isn't a valid ZIP",
    pt: "O ficheiro não é um ZIP válido",
    fr: "Ce fichier n'est pas un ZIP valide",
    it: "Il file non è uno ZIP valido",
  },
  "Lo que has subido supera 50 MB": {
    en: "What you uploaded is over 50 MB",
    pt: "O que carregaste passa dos 50 MB",
    fr: "Ce que tu as envoyé dépasse 50 Mo",
    it: "Quello che hai caricato supera i 50 MB",
  },
  "No encontramos ninguna página HTML (.html) en lo que has subido": {
    en: "We couldn't find any HTML page (.html) in what you uploaded",
    pt: "Não encontrámos nenhuma página HTML (.html) no que carregaste",
    fr: "On n'a trouvé aucune page HTML (.html) dans ce que tu as envoyé",
    it: "Non abbiamo trovato nessuna pagina HTML (.html) in quello che hai caricato",
  },
  "No hay ningún archivo que subir": {
    en: "There's no file to upload",
    pt: "Não há nenhum ficheiro para carregar",
    fr: "Il n'y a aucun fichier à envoyer",
    it: "Non c'è nessun file da caricare",
  },

  // --- editor ---
  "Esta página no tiene cabecera editable": {
    en: "This page has no editable header",
    pt: "Esta página não tem cabeçalho editável",
    fr: "Cette page n'a pas d'en-tête modifiable",
    it: "Questa pagina non ha un'intestazione modificabile",
  },
  "Ruta no válida": {
    en: "That path isn't valid",
    pt: "Caminho não válido",
    fr: "Ce chemin n'est pas valide",
    it: "Percorso non valido",
  },
  "Archivo vacío": {
    en: "Empty file",
    pt: "Ficheiro vazio",
    fr: "Fichier vide",
    it: "File vuoto",
  },
  "Falta el archivo": {
    en: "The file is missing",
    pt: "Falta o ficheiro",
    fr: "Il manque le fichier",
    it: "Manca il file",
  },
  "Falta el archivo ZIP": {
    en: "The ZIP file is missing",
    pt: "Falta o ficheiro ZIP",
    fr: "Il manque le fichier ZIP",
    it: "Manca il file ZIP",
  },

  // --- edición ---
  "Ninguna edición válida": {
    en: "No valid changes",
    pt: "Nenhuma alteração válida",
    fr: "Aucune modification valide",
    it: "Nessuna modifica valida",
  },
  "Demasiadas ediciones (máx. 1000)": {
    en: "Too many changes (max. 1000)",
    pt: "Demasiadas alterações (máx. 1000)",
    fr: "Trop de modifications (max. 1000)",
    it: "Troppe modifiche (max. 1000)",
  },
  "Valor demasiado largo (máx. 50000 caracteres)": {
    en: "Value too long (max. 50000 characters)",
    pt: "Valor demasiado longo (máx. 50000 caracteres)",
    fr: "Valeur trop longue (max. 50000 caractères)",
    it: "Valore troppo lungo (max. 50000 caratteri)",
  },
  "No se pudo aplicar": {
    en: "It couldn't be applied",
    pt: "Não foi possível aplicar",
    fr: "Ça n'a pas pu être appliqué",
    it: "Non è stato possibile applicare",
  },

  // --- imágenes ---
  "Imagen no válida": {
    en: "That image isn't valid",
    pt: "Imagem não válida",
    fr: "Cette image n'est pas valide",
    it: "Immagine non valida",
  },
  "Imagen demasiado grande (máx. 10 MB)": {
    en: "Image too big (max. 10 MB)",
    pt: "Imagem demasiado grande (máx. 10 MB)",
    fr: "Image trop lourde (max. 10 Mo)",
    it: "Immagine troppo grande (max. 10 MB)",
  },
  "Tipo de imagen no permitido": {
    en: "That kind of image isn't allowed",
    pt: "Tipo de imagem não permitido",
    fr: "Ce type d'image n'est pas autorisé",
    it: "Tipo di immagine non permesso",
  },
  "Portada no válida": {
    en: "That cover isn't valid",
    pt: "Capa não válida",
    fr: "Cette couverture n'est pas valide",
    it: "Copertina non valida",
  },

  // --- herramientas del sitio ---
  "Herramienta desconocida": {
    en: "Unknown tool",
    pt: "Ferramenta desconhecida",
    fr: "Outil inconnu",
    it: "Strumento sconosciuto",
  },
  "Código de verificación no válido (pega la etiqueta de Google o solo el código)": {
    en: "Verification code isn't valid (paste Google's tag or just the code)",
    pt: "Código de verificação não válido (cola a etiqueta do Google ou só o código)",
    fr: "Code de vérification non valide (colle la balise de Google ou juste le code)",
    it: "Codice di verifica non valido (incolla il tag di Google o solo il codice)",
  },
  "ID de Analytics no válido (ejemplo: G-ABC1DE23FG)": {
    en: "Analytics ID isn't valid (example: G-ABC1DE23FG)",
    pt: "ID do Analytics não válido (exemplo: G-ABC1DE23FG)",
    fr: "Identifiant Analytics non valide (exemple : G-ABC1DE23FG)",
    it: "ID di Analytics non valido (esempio: G-ABC1DE23FG)",
  },

  // --- claves de IA ---
  "Falta la clave de OpenRouter: añádela en Configuración": {
    en: "The OpenRouter key is missing: add it in Settings",
    pt: "Falta a chave da OpenRouter: acrescenta-a nas Definições",
    fr: "Il manque la clé OpenRouter : ajoute-la dans les Réglages",
    it: "Manca la chiave OpenRouter: aggiungila nelle Impostazioni",
  },
  "Falta la clave de SerpAPI: añádela en Configuración": {
    en: "The SerpAPI key is missing: add it in Settings",
    pt: "Falta a chave da SerpAPI: acrescenta-a nas Definições",
    fr: "Il manque la clé SerpAPI : ajoute-la dans les Réglages",
    it: "Manca la chiave SerpAPI: aggiungila nelle Impostazioni",
  },
  "La clave es demasiado larga (máx. 200 caracteres)": {
    en: "The key is too long (max. 200 characters)",
    pt: "A chave é demasiado longa (máx. 200 caracteres)",
    fr: "La clé est trop longue (max. 200 caractères)",
    it: "La chiave è troppo lunga (max. 200 caratteri)",
  },
  "El nombre del modelo es demasiado largo (máx. 100 caracteres)": {
    en: "The model name is too long (max. 100 characters)",
    pt: "O nome do modelo é demasiado longo (máx. 100 caracteres)",
    fr: "Le nom du modèle est trop long (max. 100 caractères)",
    it: "Il nome del modello è troppo lungo (max. 100 caratteri)",
  },
  "Servicio desconocido": {
    en: "Unknown service",
    pt: "Serviço desconhecido",
    fr: "Service inconnu",
    it: "Servizio sconosciuto",
  },
  // El saldo de SU cuenta de OpenRouter: se dice dónde se recarga, porque si no
  // hay que salir a buscarlo y es justo el momento en el que uno abandona.
  "Tu cuenta de OpenRouter no tiene saldo. Añade crédito en openrouter.ai/settings/credits e inténtalo de nuevo.": {
    en: "Your OpenRouter account has no balance. Add credit at openrouter.ai/settings/credits and try again.",
    pt: "A tua conta da OpenRouter não tem saldo. Acrescenta crédito em openrouter.ai/settings/credits e tenta outra vez.",
    fr: "Ton compte OpenRouter n'a plus de solde. Ajoute du crédit sur openrouter.ai/settings/credits et réessaie.",
    it: "Il tuo account OpenRouter non ha saldo. Aggiungi credito su openrouter.ai/settings/credits e riprova.",
  },
  // Lo que dice SerpAPI cuando se acaba el cupo NO va aquí: nuestro mensaje es
  // «SerpAPI: <lo que conteste ellos>», o sea que la clave nunca coincidiría. Lo
  // llegué a poner y lo cazó el test de abajo a la primera. Ese trozo sale en el
  // idioma del proveedor, que es lo correcto: es su mensaje, no nuestro.

  // --- asistente de IA ---
  "Escribe qué quieres cambiar": {
    en: "Write what you want to change",
    pt: "Escreve o que queres mudar",
    fr: "Écris ce que tu veux changer",
    it: "Scrivi cosa vuoi cambiare",
  },
  "La instrucción es demasiado larga": {
    en: "The instruction is too long",
    pt: "A instrução é demasiado longa",
    fr: "L'instruction est trop longue",
    it: "L'istruzione è troppo lunga",
  },
  "La instrucción es demasiado larga (máx. 1000 caracteres)": {
    en: "The instruction is too long (max. 1000 characters)",
    pt: "A instrução é demasiado longa (máx. 1000 caracteres)",
    fr: "L'instruction est trop longue (max. 1000 caractères)",
    it: "L'istruzione è troppo lunga (max. 1000 caratteri)",
  },

  // --- blog ---
  "Artículo no encontrado": {
    en: "Article not found",
    pt: "Artigo não encontrado",
    fr: "Article introuvable",
    it: "Articolo non trovato",
  },
  "Borrador no encontrado": {
    en: "Draft not found",
    pt: "Rascunho não encontrado",
    fr: "Brouillon introuvable",
    it: "Bozza non trovata",
  },
  "Keyword no encontrada": {
    en: "Keyword not found",
    pt: "Palavra-chave não encontrada",
    fr: "Mot-clé introuvable",
    it: "Parola chiave non trovata",
  },
  "Programación no encontrada": {
    en: "Schedule not found",
    pt: "Agendamento não encontrado",
    fr: "Programmation introuvable",
    it: "Programmazione non trovata",
  },
  "Configura primero de qué va tu blog (campo Nicho)": {
    en: "First say what your blog is about (the topic field)",
    pt: "Primeiro diz sobre o que é o teu blogue (o campo do tema)",
    fr: "Dis d'abord de quoi parle ton blog (le champ du sujet)",
    it: "Prima di' di cosa parla il tuo blog (il campo del tema)",
  },
  "Escribe una keyword o tema para el artículo": {
    en: "Write a keyword or topic for the article",
    pt: "Escreve uma palavra-chave ou tema para o artigo",
    fr: "Écris un mot-clé ou un sujet pour l'article",
    it: "Scrivi una parola chiave o un tema per l'articolo",
  },
  "Escribe primero el título del artículo": {
    en: "Write the article's title first",
    pt: "Escreve primeiro o título do artigo",
    fr: "Écris d'abord le titre de l'article",
    it: "Scrivi prima il titolo dell'articolo",
  },
  "El título es demasiado largo (máx. 300 caracteres)": {
    en: "The title is too long (max. 300 characters)",
    pt: "O título é demasiado longo (máx. 300 caracteres)",
    fr: "Le titre est trop long (max. 300 caractères)",
    it: "Il titolo è troppo lungo (max. 300 caratteri)",
  },
  "El slug es demasiado largo (máx. 100 caracteres)": {
    en: "The slug is too long (max. 100 characters)",
    pt: "O slug é demasiado longo (máx. 100 caracteres)",
    fr: "Le slug est trop long (max. 100 caractères)",
    it: "Lo slug è troppo lungo (max. 100 caratteri)",
  },
  "El artículo es demasiado largo (máx. 200000 caracteres)": {
    en: "The article is too long (max. 200000 characters)",
    pt: "O artigo é demasiado longo (máx. 200000 caracteres)",
    fr: "L'article est trop long (max. 200000 caractères)",
    it: "L'articolo è troppo lungo (max. 200000 caratteri)",
  },
  "El nicho es demasiado largo (máx. 2000 caracteres)": {
    en: "The topic is too long (max. 2000 characters)",
    pt: "O tema é demasiado longo (máx. 2000 caracteres)",
    fr: "Le sujet est trop long (max. 2000 caractères)",
    it: "Il tema è troppo lungo (max. 2000 caratteri)",
  },
  "La keyword es demasiado larga (máx. 200 caracteres)": {
    en: "The keyword is too long (max. 200 characters)",
    pt: "A palavra-chave é demasiado longa (máx. 200 caracteres)",
    fr: "Le mot-clé est trop long (max. 200 caractères)",
    it: "La parola chiave è troppo lunga (max. 200 caratteri)",
  },
  "Las keywords semilla son demasiado largas (máx. 500 caracteres)": {
    en: "The seed keywords are too long (max. 500 characters)",
    pt: "As palavras-chave semente são demasiado longas (máx. 500 caracteres)",
    fr: "Les mots-clés de départ sont trop longs (max. 500 caractères)",
    it: "Le parole chiave di partenza sono troppo lunghe (max. 500 caratteri)",
  },
  "Etapa desconocida": {
    en: "Unknown stage",
    pt: "Etapa desconhecida",
    fr: "Étape inconnue",
    it: "Tappa sconosciuta",
  },
  "Modo desconocido": {
    en: "Unknown mode",
    pt: "Modo desconhecido",
    fr: "Mode inconnu",
    it: "Modalità sconosciuta",
  },
  "Estado desconocido": {
    en: "Unknown state",
    pt: "Estado desconhecido",
    fr: "État inconnu",
    it: "Stato sconosciuto",
  },
  "Frecuencia no válida": {
    en: "That frequency isn't valid",
    pt: "Frequência não válida",
    fr: "Cette fréquence n'est pas valide",
    it: "Frequenza non valida",
  },
  "Hora no válida": {
    en: "That time isn't valid",
    pt: "Hora não válida",
    fr: "Cette heure n'est pas valide",
    it: "Ora non valida",
  },
  "Elige fecha y hora para programar": {
    en: "Pick a date and time to schedule it",
    pt: "Escolhe data e hora para agendar",
    fr: "Choisis une date et une heure pour programmer",
    it: "Scegli data e ora per programmare",
  },
  "La fecha de publicación debe ser futura": {
    en: "The publication date has to be in the future",
    pt: "A data de publicação tem de ser futura",
    fr: "La date de publication doit être dans le futur",
    it: "La data di pubblicazione dev'essere futura",
  },
  "El proyecto no tiene plantilla de blog (créala en la sección Blog)": {
    en: "This site has no blog template (create it in the Blog section)",
    pt: "Este site não tem modelo de blogue (cria-o na secção Blogue)",
    fr: "Ce site n'a pas de gabarit de blog (crée-le dans la section Blog)",
    it: "Questo sito non ha un modello di blog (crealo nella sezione Blog)",
  },
  "Pega o sube el HTML de tu plantilla de artículo": {
    en: "Paste or upload the HTML of your article template",
    pt: "Cola ou carrega o HTML do teu modelo de artigo",
    fr: "Colle ou envoie le HTML de ton gabarit d'article",
    it: "Incolla o carica l'HTML del tuo modello di articolo",
  },
  "Pega antes el HTML de la página de artículo": {
    en: "Paste the HTML of the article page first",
    pt: "Cola primeiro o HTML da página de artigo",
    fr: "Colle d'abord le HTML de la page d'article",
    it: "Incolla prima l'HTML della pagina di articolo",
  },
  "Todavía no has traído la lista de artículos. Escríbela, o usa «Colocar los huecos por mí» y la construimos con el diseño de tu artículo": {
    en: "You haven't brought the list of articles yet. Write it, or use «Put the slots in for me» and we'll build it with your article's design",
    pt: "Ainda não trouxeste a lista de artigos. Escreve-a, ou usa «Colocai vós os espaços» e construímo-la com o design do teu artigo",
    fr: "Tu n'as pas encore apporté la liste des articles. Écris-la, ou utilise « Placez-les pour moi » et on la construit avec le design de ton article",
    it: "Non hai ancora portato l'elenco degli articoli. Scrivilo, oppure usa «Metteteli voi» e lo costruiamo con il design del tuo articolo",
  },
  "La plantilla es demasiado grande (máx. 120.000 caracteres)": {
    en: "The template is too big (max. 120,000 characters)",
    pt: "O modelo é demasiado grande (máx. 120.000 caracteres)",
    fr: "Le gabarit est trop gros (max. 120 000 caractères)",
    it: "Il modello è troppo grande (max. 120.000 caratteri)",
  },
  "Eso no parece una página HTML": {
    en: "That doesn't look like an HTML page",
    pt: "Isso não parece uma página HTML",
    fr: "Ça n'a pas l'air d'une page HTML",
    it: "Quella non sembra una pagina HTML",
  },
  "No pudimos colocar los huecos en tu plantilla, vuelve a intentarlo": {
    en: "We couldn't put the slots into your template, try again",
    pt: "Não conseguimos colocar os espaços no teu modelo, tenta outra vez",
    fr: "On n'a pas pu placer les emplacements dans ton gabarit, réessaie",
    it: "Non siamo riusciti a mettere gli spazi nel tuo modello, riprova",
  },
  "Una de las imágenes del artículo ya no existe. Quítala del texto y vuelve a insertarla": {
    en: "One of the article's images no longer exists. Take it out of the text and insert it again",
    pt: "Uma das imagens do artigo já não existe. Tira-a do texto e volta a inseri-la",
    fr: "Une des images de l'article n'existe plus. Enlève-la du texte et remets-la",
    it: "Una delle immagini dell'articolo non esiste più. Toglila dal testo e reinseriscila",
  },

  // --- el modelo se queda a medias ---
  "El modelo devolvió el artículo a medias. Vuelve a lanzar la redacción; si se repite, elige otro modelo en Configuración.": {
    en: "The model returned the article half-finished. Run the writing stage again; if it keeps happening, pick another model in Settings.",
    pt: "O modelo devolveu o artigo a meio. Volta a lançar a redação; se se repetir, escolhe outro modelo nas Definições.",
    fr: "Le modèle a rendu l'article à moitié. Relance la rédaction ; si ça se répète, choisis un autre modèle dans les Réglages.",
    it: "Il modello ha restituito l'articolo a metà. Rilancia la scrittura; se si ripete, scegli un altro modello nelle Impostazioni.",
  },
  "El modelo dejó el texto a medias al llegar a su límite. Vuelve a intentarlo; si se repite, elige otro modelo en Configuración.": {
    en: "The model cut the text short when it hit its limit. Try again; if it keeps happening, pick another model in Settings.",
    pt: "O modelo deixou o texto a meio ao chegar ao seu limite. Tenta outra vez; se se repetir, escolhe outro modelo nas Definições.",
    fr: "Le modèle a coupé le texte en arrivant à sa limite. Réessaie ; si ça se répète, choisis un autre modèle dans les Réglages.",
    it: "Il modello ha lasciato il testo a metà arrivando al suo limite. Riprova; se si ripete, scegli un altro modello nelle Impostazioni.",
  },
  "Tu clave de OpenRouter no tiene saldo suficiente.": {
    en: "Your OpenRouter key doesn't have enough balance.",
    pt: "A tua chave da OpenRouter não tem saldo suficiente.",
    fr: "Ta clé OpenRouter n'a pas assez de solde.",
    it: "La tua chiave OpenRouter non ha abbastanza saldo.",
  },
  "El proveedor de IA devolvió un error. Inténtalo de nuevo.": {
    en: "The AI provider returned an error. Try again.",
    pt: "O fornecedor de IA devolveu um erro. Tenta outra vez.",
    fr: "Le fournisseur d'IA a renvoyé une erreur. Réessaie.",
    it: "Il fornitore di IA ha restituito un errore. Riprova.",
  },

  "No se pudo generar la plantilla del blog, vuelve a intentarlo": {
    en: "The blog template couldn't be generated, try again",
    pt: "Não foi possível gerar o modelo do blogue, tenta outra vez",
    fr: "Le gabarit du blog n'a pas pu être généré, réessaie",
    it: "Non è stato possibile generare il modello del blog, riprova",
  },
  "No se pudo generar la portada, vuelve a intentarlo": {
    en: "The cover couldn't be generated, try again",
    pt: "Não foi possível gerar a capa, tenta outra vez",
    fr: "La couverture n'a pas pu être générée, réessaie",
    it: "Non è stato possibile generare la copertina, riprova",
  },
  "No se pudo puntuar la relevancia de los temas, vuelve a intentarlo": {
    en: "The topics couldn't be scored, try again",
    pt: "Não foi possível pontuar a relevância dos temas, tenta outra vez",
    fr: "La pertinence des sujets n'a pas pu être notée, réessaie",
    it: "Non è stato possibile dare un punteggio ai temi, riprova",
  },

  // --- planes y pagos ---
  "Elige un plan de pago": {
    en: "Pick a paid plan",
    pt: "Escolhe um plano pago",
    fr: "Choisis une formule payante",
    it: "Scegli un piano a pagamento",
  },
  "Los pagos no están configurados": {
    en: "Payments aren't set up",
    pt: "Os pagamentos não estão configurados",
    fr: "Les paiements ne sont pas configurés",
    it: "I pagamenti non sono configurati",
  },
  "Este espacio todavía no tiene ninguna suscripción": {
    en: "This space doesn't have a subscription yet",
    pt: "Este espaço ainda não tem nenhuma subscrição",
    fr: "Cet espace n'a encore aucun abonnement",
    it: "Questo spazio non ha ancora nessun abbonamento",
  },
  "No se pudo iniciar el pago. Inténtalo de nuevo.": {
    en: "The payment couldn't be started. Try again.",
    pt: "Não foi possível iniciar o pagamento. Tenta outra vez.",
    fr: "Le paiement n'a pas pu démarrer. Réessaie.",
    it: "Non è stato possibile avviare il pagamento. Riprova.",
  },
  "No se pudo abrir la gestión de tu suscripción.": {
    en: "We couldn't open your subscription management.",
    pt: "Não foi possível abrir a gestão da tua subscrição.",
    fr: "La gestion de ton abonnement n'a pas pu s'ouvrir.",
    it: "Non è stato possibile aprire la gestione del tuo abbonamento.",
  },
};

/**
 * El mensaje en el idioma de quien lo va a leer. Si no está en el mapa, sale tal
 * cual: en español y entero, que es mejor que un hueco o un código.
 *
 * `Object.hasOwn` y no la búsqueda directa: un mensaje que se llamara
 * "constructor" devolvería la función Object en vez de una traducción. Es el
 * mismo fallo que ya mordió en `contentTypeFor`.
 */
export function traducirError(mensaje: string, idioma: Idioma): string {
  if (idioma === "es") return mensaje;
  if (!Object.hasOwn(ERRORES, mensaje)) return mensaje;
  return ERRORES[mensaje][idioma] ?? mensaje;
}
