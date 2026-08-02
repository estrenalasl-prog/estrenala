import type { TextosBlog } from "./tipos";

export const en: TextosBlog = {
  titulo: "Blog",
  aviso:
    "The blog pages are generated from here; if you touch them with the visual editor, the next " +
    "time the blog is regenerated those changes will be undone.",
  avisoPublicar: "For it to show on your site, hit «Publish changes» right at the top.",

  dePago: {
    resumen: "Included in the paid plans",
    titulo: "A blog that writes itself",
    texto:
      "Articles with your own site's design, an index and a sitemap kept up to date, and an " +
      "autopilot that finds topics and publishes every few days. From €{precio}/month with the " +
      "{plan} plan.",
    boton: "See the plans",
  },

  borradorRevision: "✅ ready to review",
  borradorError: "⚠ error",
  borradorEnMarcha: "⏳ under way",
  programadoPublicado: "✓ published",
  programadoError: "⚠ error",
  programadoPendiente: "⏳ pending",

  previo: {
    expandir: "⤢ Expand",
    expandirTitulo: "See the template at full size",
    salir: "⤡ Exit",
    salirTitulo: "Leave full screen (Esc)",
    titulo: "preview",
  },

  vacio: {
    titulo: "Your site's blog",
    texto:
      "Articles with your design, index and sitemap done for you. First, the template: either the " +
      "AI reads your home page and proposes a design, or you bring your own ready-made.",
    crear: "Create the blog template with AI",
    creando: "Creating the template…",
    yaTengo: "I already have my template",
  },

  ia: {
    titulo: "Write with AI",
    nicho: "What your blog is about (the AI uses this to focus the articles)",
    nichoEjemplo: "e.g. Automation and AI for small businesses: agents, tools and real cases",
    semillas: "Seed keywords (comma-separated; they help the radar find topics in your niche)",
    semillasEjemplo: "e.g. ai agents, small business automation, chatbots",
    guardarConfig: "Save settings",
    guardado: "Saved",
    modelo: "AI model: {modelo} — you change it in {enlace}.",
    modeloEnlace: "Settings",
    escribir: "Write an article with AI",
    keyword: "Keyword or topic of the article",
    crearBorrador: "Create draft",
    creando: "Creating…",
    cancelar: "Cancel",
    abrir: "Open",
    borrar: "delete",
    borrarPregunta: "Delete the «{keyword}» draft?",
    borrarCuerpo: "Whatever the AI has already written for it is lost. Generating it again would spend credit.",
    borrarAceptar: "Yes, delete it",
  },

  radar: {
    titulo: "Trending topics",
    buscar: "🔍 Find today's topics",
    buscando: "Searching on Google…",
    forzar: "Force it",
    texto:
      "It looks at what's rising on Google today (Spain), crosses it with your niche and proposes " +
      "topics. Spends up to 4 SerpAPI credits + 1 AI call; once a day.",
    yaHoy: "The radar has already run today.",
    actualizado:
      "Radar updated: {candidatos} topics analysed ({tendencias} from today's trends, " +
      "{relacionadas} from your seeds).",
    sinSemillas: "Your seeds returned nothing on Google Trends: try more common ones.",
    relevanciaTitulo: "Relevance to your niche (0-100)",
    deTendencias: "· trending today",
    deSemillas: "· related to your seeds",
    escribir: "Write the article",
    preparando: "Getting ready…",
    descartar: "discard",
  },

  piloto: {
    titulo: "Autopilot",
    texto:
      "The blog writes itself: the radar finds the topic of the day, the AI writes it with your " +
      "model, the cover image is generated and publication is scheduled automatically. It only " +
      "writes if there's a topic scoring above 60 (otherwise it spends nothing on writing that " +
      "day). Cost per article: your model's AI calls + the radar (up to 4 SerpAPI credits a day).",
    cadaDia: "Every day",
    cada3Dias: "Every 3 days",
    cadaSemana: "Every week",
    aPartirDeLas: "from {hora}:00 onwards",
    portadaDiseno: "Cover: a design (free)",
    portadaIa: "Cover: AI image (a few cents)",
    guardar: "Save",
    guardadoActivo: "Saved. The autopilot is RUNNING.",
    guardadoApagado: "Saved (autopilot off).",
    ultima: "Last run: {msg}",
    ultimaConDia: "Last run ({dia}): {msg}",
  },

  programados: {
    titulo: "Scheduled",
    editar: "Edit",
    editarTitulo: "Brings the content back to the editor and removes the schedule (reschedule from there)",
    ocultar: "Hide",
    ocultarTitulo: "Removes this row; the article is already in the list below",
    hecho: "Article scheduled for {fecha}. At that time it publishes itself (article and site).",
  },

  lista: {
    nuevo: "New article",
    editarPlantillas: "Edit templates",
    cargando: "loading…",
    editar: "Edit",
    borrar: "delete",
    borrarPregunta: "Delete the article «{titulo}»?",
    borrarCuerpo:
      "It's removed from the blog and the index. For it to disappear from your published site too, " +
      "remember to hit «Publish changes» afterwards.",
    borrarAceptar: "Yes, delete it",
    guardado: "Article saved. {aviso}",
    borrado: "Article deleted. {aviso}",
  },

  plantillas: {
    misTitulo: "Your own template",
    misTexto:
      "A blog has **two kinds of page**: the **list** of articles —what you see when you open " +
      "`/blog/`— and **each article on the inside**. That's why we ask for two, although one is " +
      "enough for us. We don't change your design: we just put in the slots the system fills with " +
      "each article.",
    subirHtml: "Upload an .html file",

    paso1: "1 · What an article looks like on the inside",
    paso1Texto: "This is the important one. These are the slots we put in:",
    paso1Ejemplo: "Paste the HTML of your article page here…",
    paso2: "2 · The list of articles",
    paso2Opcional: "(optional)",
    paso2Texto:
      "The `/blog/` page, with all your articles listed. The slots here are different ones —each " +
      "article's title, date and link— and they go in on their own.",
    paso2Ejemplo: "If you don't bring one, we build it with the same design as your article.",

    huecoTitulo: "the article's title",
    huecoContenido: "the body, already in HTML",
    huecoMeta: "the summary for Google",
    huecoImagen: "the cover image",
    huecoFecha: "the publication date",
    huecoCanonical: "the page's proper address",
    huecoJsonLd: "the data for Google (goes in on its own)",

    colocar: "Put the slots in for me",
    colocando: "Putting the slots in…",
    yaLlevaHuecos: "It already has the slots",
    yaLlevaHuecosTitulo:
      "Only if you've already written the {{titulo}}, {{contenido}}… inside your HTML yourself. " +
      "Then there's no need to spend AI.",
    volver: "Back",
    cual:
      "**Which of the two?** If your HTML is a normal page, **«Put the slots in for me»** —it spends " +
      "one AI call from your OpenRouter account—. **«It already has the slots»** is only for when " +
      "you've written the `{{titulo}}`, `{{contenido}}`… inside yourself; that one costs nothing.",

    sinHuecosTitulo: "Your HTML doesn't have any slots yet",
    sinHuecosCuerpo:
      "This button is for when you've already written the {{titulo}}, {{contenido}}… inside your " +
      "HTML yourself. We couldn't find them, so the blog wouldn't know where to put each thing. We " +
      "can put them in for you without touching your design.",
    sinHuecosAceptar: "You put them in",
    sinHuecosCancelar: "I'll put them in",

    sinIndiceTitulo: "You're missing the list of articles",
    sinIndiceCuerpo:
      "It's the /blog/ page where all your articles show up. By hand, you write it by wrapping the " +
      "block that repeats for each one in <!--POST--> and <!--/POST-->. Or we build it with your " +
      "article's design.",
    sinIndiceAceptar: "You build it",
    sinIndiceCancelar: "I'll write it",

    preparando: "Preparing the template with AI (it can take a minute)…",
    crearConIa: "Create the template with AI",
    traerLaMia: "Bring my own",
    cancelar: "Cancel",
    tplPost: "Article template",
    tplIndex: "Index template",
    guardar: "Save templates",
    guardando: "Saving…",
    previoPost: "Preview the article",
    previoIndex: "Preview the index",
    regenerar: "Generate again",
  },

  editor: {
    titulo: "Article title",
    meta: "Meta description (for Google)",
    contadorMeta: "{n}/160",
    portada: "Cover image:",
    generarDiseno: "Generate a design",
    generarDisenoTitulo: "Free: a design with your title and your site's colours",
    dibujando: "Drawing…",
    generarIa: "Generate with AI",
    generarIaTitulo: "Image generated with AI (a few cents per image, on your OpenRouter account)",
    generando: "Generating…",
    cambiarImagen: "Change image",
    subirImagen: "Upload image",
    faltaTitulo: "(write the title to generate it)",
    insertarImagen: "Insert an image here",
    insertarTexto:
      "Write the article first, click where you want it and press the button. If you don't pick a " +
      "spot, it goes at the end.",
    cuerpoEjemplo: "Write or paste the article here in markdown (the one your AI wrote you, for instance)…",
    guardar: "Save article",
    guardando: "Saving…",
    vistaPrevia: "Preview",
    cancelar: "Cancel",
    programarTexto: "Or let it publish itself (article and site):",
    programar: "Schedule publication",
  },

  taller: {
    cargando: "Loading the draft…",
    volver: "← Back",
    encabezado: "Article with AI:",
    modelo: "Model: {modelo}",
    modeloDonde: "(you change it in Settings)",

    listo: "The draft is ready to review.",
    usar: "Use this draft",
    usarTexto:
      "The article editor will open with everything filled in; there you upload the cover image and save.",
    puedesReintentar: "{error} — you can retry the stage.",

    ejecutar: "▶ Run {etapa}",
    auto: "⏩ Auto until review",
    detener: "⏹ Stop (it stops after the current stage)",
    autoTitulo: "Write the whole article in one go",
    autoCuerpo:
      "Automatic mode runs all the pending stages one after another (several AI calls) and spends " +
      "OpenRouter credit.",
    autoAceptar: "Run everything",

    generando: " generating…",
    regenerar: "↻ Regenerate",
    ver: "show",
    ocultar: "hide",
    instruccion: "Optional instruction for regenerating (e.g. shorter, formal tone…)",
    nota: "Regenerating a stage doesn't redo the later ones: you decide which to regenerate.",

    etapaAnalisis: "SEO analysis",
    etapaPlan: "Article plan",
    etapaInvestigacion: "Web research",
    etapaRedaccion: "Writing",
    etapaLinks: "Internal links",
    etapaMetadatos: "SEO metadata",

    analisisResumen: "Main keyword: {principal}\nSecondary: {secundarias}\nSearch intent: {intencion}",
    linksHecho:
      "Done: the relevant internal links (if there were any) are worked into the article (see Writing).",
    metadatosResumen: "Title: {titulo}\nSlug: {slug}\nMeta description: {meta}",
  },

  errores: {
    conexion: "Connection error",
    generico: "Something went wrong",
    subirImagen: "The image couldn't be uploaded",
  },
};
