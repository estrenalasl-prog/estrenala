// El blog: plantillas, artículos, radar de temas, piloto automático y el taller
// de redacción con IA.
//
// El español es el original y de aquí sale la FORMA (ver tipos.ts): los otros
// cuatro no pueden dejarse una clave sin que falle el typecheck.
//
// OJO con los `{{titulo}}`, `{{contenido}}`…: NO se traducen. Son los huecos de
// la plantilla del usuario, y el sistema los busca por ese nombre exacto.

export const es = {
  titulo: "Blog",
  aviso:
    "Las páginas del blog se generan desde aquí; si las tocas con el editor visual, la próxima " +
    "regeneración del blog deshará esos cambios.",
  // Guardar un artículo NO lo publica: reescribe el HTML, el índice y el sitemap,
  // y eso queda como versión actual sin publicar. Sin decirlo, uno guarda, no ve
  // ningún cambio en su web y se pone a buscar un «publicar blog» que no existe
  // ni debe existir — el blog es parte de la web, no algo aparte.
  avisoPublicar: "Para que se vea en tu web, dale a «Publicar cambios» arriba del todo.",

  dePago: {
    resumen: "Incluido en los planes de pago",
    titulo: "Un blog que escribe solo",
    texto:
      "Artículos con el diseño de tu propia web, índice y sitemap al día, y un piloto automático que " +
      "busca temas y publica cada pocos días. Desde {precio} €/mes con el plan {plan}.",
    boton: "Ver los planes",
  },

  // Estado de un borrador de IA y de un artículo programado.
  borradorRevision: "✅ para revisar",
  borradorError: "⚠ error",
  borradorEnMarcha: "⏳ en marcha",
  programadoPublicado: "✓ publicado",
  programadoError: "⚠ error",
  programadoPendiente: "⏳ pendiente",

  previo: {
    expandir: "⤢ Expandir",
    expandirTitulo: "Ver la plantilla a tamaño real",
    salir: "⤡ Salir",
    salirTitulo: "Salir de pantalla completa (Esc)",
    titulo: "vista previa",
  },

  vacio: {
    titulo: "El blog de tu web",
    texto:
      "Artículos con tu diseño, índice y sitemap automáticos. Primero, la plantilla: o la IA lee tu " +
      "portada y propone el diseño, o traes la tuya ya hecha.",
    crear: "Crear la plantilla del blog con IA",
    creando: "Creando la plantilla…",
    yaTengo: "Ya tengo mi plantilla",
  },

  ia: {
    titulo: "Escribir con IA",
    nicho: "De qué va tu blog (la IA lo usa para enfocar los artículos)",
    nichoEjemplo: "p. ej.: Automatización e IA para pymes: agentes, herramientas y casos prácticos",
    semillas: "Keywords semilla (separadas por comas; ayudan al radar a buscar temas de tu nicho)",
    semillasEjemplo: "p. ej.: agentes ia, automatización pymes, chatbots",
    guardarConfig: "Guardar configuración",
    guardado: "Guardado",
    modelo: "Modelo de IA: {modelo} — se cambia en {enlace}.",
    modeloEnlace: "Configuración",
    escribir: "Escribir artículo con IA",
    keyword: "Keyword o tema del artículo",
    crearBorrador: "Crear borrador",
    creando: "Creando…",
    cancelar: "Cancelar",
    abrir: "Abrir",
    borrar: "borrar",
    borrarPregunta: "¿Borrar el borrador «{keyword}»?",
    borrarCuerpo: "Se pierde lo que la IA ya haya escrito para él. Volver a generarlo gastaría crédito otra vez.",
    borrarAceptar: "Sí, borrar",
  },

  radar: {
    titulo: "Temas en tendencia",
    buscar: "🔍 Buscar temas de hoy",
    buscando: "Buscando en Google…",
    forzar: "Forzar",
    texto:
      "Busca lo que sube hoy en Google (España), lo cruza con tu nicho y te propone temas. Gasta " +
      "hasta 4 créditos de SerpAPI + 1 llamada de IA; una vez al día.",
    yaHoy: "El radar ya se actualizó hoy.",
    actualizado:
      "Radar actualizado: {candidatos} temas analizados ({tendencias} de tendencias de hoy, " +
      "{relacionadas} de tus semillas).",
    sinSemillas: "Tus semillas no dieron resultados en Google Trends: prueba con otras más habituales.",
    relevanciaTitulo: "Relevancia para tu nicho (0-100)",
    deTendencias: "· tendencia de hoy",
    deSemillas: "· relacionada con tus semillas",
    escribir: "Escribir artículo",
    preparando: "Preparando…",
    descartar: "descartar",
  },

  piloto: {
    titulo: "Piloto automático",
    texto:
      "El blog se escribe solo: el radar busca el tema del día, la IA redacta con tu modelo, se " +
      "genera la portada y la publicación se programa automáticamente. Solo escribe si hay un tema " +
      "con relevancia > 60 (si no, ese día no gasta nada en redactar). Gasto por artículo: las " +
      "llamadas de IA de tu modelo + el radar (hasta 4 créditos de SerpAPI al día).",
    cadaDia: "Cada día",
    cada3Dias: "Cada 3 días",
    cadaSemana: "Cada semana",
    aPartirDeLas: "a partir de las {hora}:00",
    portadaDiseno: "Portada: diseño (gratis)",
    portadaIa: "Portada: imagen con IA (céntimos)",
    guardar: "Guardar",
    guardadoActivo: "Guardado. El piloto está EN MARCHA.",
    guardadoApagado: "Guardado (piloto apagado).",
    ultima: "Última ejecución: {msg}",
    ultimaConDia: "Última ejecución ({dia}): {msg}",
  },

  programados: {
    titulo: "Programados",
    editar: "Editar",
    editarTitulo: "Recupera el contenido al editor y quita la programación (reprograma desde ahí)",
    ocultar: "Ocultar",
    ocultarTitulo: "Quita esta fila; el artículo ya está en la lista de abajo",
    hecho: "Artículo programado para el {fecha}. A esa hora se publica solo (artículo y sitio).",
  },

  lista: {
    nuevo: "Nuevo artículo",
    editarPlantillas: "Editar plantillas",
    cargando: "cargando…",
    editar: "Editar",
    borrar: "borrar",
    borrarPregunta: "¿Borrar el artículo «{titulo}»?",
    borrarCuerpo:
      "Se quita del blog y del índice. Para que desaparezca también de tu web publicada, acuérdate " +
      "de darle después a «Publicar cambios».",
    borrarAceptar: "Sí, borrar",
    guardado: "Artículo guardado. {aviso}",
    borrado: "Artículo borrado. {aviso}",
  },

  plantillas: {
    // «¿Por qué tengo que subir dos?» fue lo primero que preguntó Sebas al verlo,
    // y él conoce el sistema. Se explica aquí, que es donde surge la duda.
    misTitulo: "Tu propia plantilla",
    misTexto:
      "Un blog tiene **dos tipos de página**: la **lista** de artículos —lo que se ve al entrar en " +
      "`/blog/`— y **cada artículo por dentro**. Por eso te pedimos dos, aunque con una nos vale. No " +
      "cambiamos tu diseño: solo le colocamos los huecos que el sistema rellena con cada artículo.",
    subirHtml: "Subir archivo .html",

    paso1: "1 · Cómo se ve un artículo por dentro",
    paso1Texto: "Es la importante. Estos son los huecos que le colocamos:",
    paso1Ejemplo: "Pega aquí el HTML de tu página de artículo…",
    paso2: "2 · La lista de artículos",
    paso2Opcional: "(opcional)",
    paso2Texto:
      "La página `/blog/`, con todos tus artículos listados. Aquí los huecos son otros —el título, " +
      "la fecha y el enlace de cada uno— y se colocan solos.",
    paso2Ejemplo: "Si no la traes, la construimos con el mismo diseño de tu artículo.",

    // Qué significa cada hueco. Sin esto, «traer tu plantilla» solo lo puede usar
    // quien ya se sepa el sistema, y son justo los que quieren hacerlo a mano.
    huecoTitulo: "el título del artículo",
    huecoContenido: "el cuerpo, ya en HTML",
    huecoMeta: "el resumen para Google",
    huecoImagen: "la imagen de portada",
    huecoFecha: "la fecha de publicación",
    huecoCanonical: "la dirección buena de la página",
    huecoJsonLd: "los datos para Google (se inyecta solo)",

    colocar: "Colocar los huecos por mí",
    colocando: "Colocando los huecos…",
    yaLlevaHuecos: "Ya lleva los huecos",
    yaLlevaHuecosTitulo:
      "Solo si tú ya has escrito los {{titulo}}, {{contenido}}… dentro de tu HTML. Entonces no hace " +
      "falta gastar IA.",
    volver: "Volver",
    cual:
      "**¿Cuál de los dos?** Si tu HTML es una página normal, **«Colocar los huecos por mí»** —gasta " +
      "una llamada de IA de tu cuenta de OpenRouter—. **«Ya lleva los huecos»** es solo para cuando " +
      "tú mismo has escrito los `{{titulo}}`, `{{contenido}}`… dentro; ese no cuesta nada.",

    // «Ya lleva los huecos» solo tiene sentido si de verdad los lleva, y eso se ve
    // mirando el HTML. Sin esto, quien pega una plantilla normal pulsa aquí —es el
    // botón que no cuesta dinero, así que atrae— y acaba atascado sin entender por
    // qué. Le pasó a Sebas con la plantilla de ejemplo.
    sinHuecosTitulo: "Tu HTML no lleva ningún hueco todavía",
    sinHuecosCuerpo:
      "Este botón es para cuando ya has escrito tú los {{titulo}}, {{contenido}}… dentro de tu HTML. " +
      "No los encontramos, así que el blog no sabría dónde poner cada cosa. Podemos colocarlos " +
      "nosotros sin tocarte el diseño.",
    sinHuecosAceptar: "Colocadlos vosotros",
    sinHuecosCancelar: "Los pongo yo",

    // Un aviso que solo dice «te falta esto» es un callejón sin salida: te deja
    // leyendo y sin nada que pulsar. Las dos salidas van en los botones.
    sinIndiceTitulo: "Te falta la lista de artículos",
    sinIndiceCuerpo:
      "Es la página /blog/ donde aparecen todos tus artículos. A mano se escribe rodeando con " +
      "<!--POST--> y <!--/POST--> el bloque que se repite por cada uno. O la construimos nosotros " +
      "con el diseño de tu artículo.",
    sinIndiceAceptar: "Construidla vosotros",
    sinIndiceCancelar: "La escribo yo",

    preparando: "Preparando la plantilla con IA (puede tardar un minuto)…",
    crearConIa: "Crear la plantilla con IA",
    traerLaMia: "Traer la mía",
    cancelar: "Cancelar",
    tplPost: "Plantilla de artículo",
    tplIndex: "Plantilla del índice",
    guardar: "Guardar plantillas",
    guardando: "Guardando…",
    previoPost: "Vista previa artículo",
    previoIndex: "Vista previa índice",
    regenerar: "Volver a generar",
  },

  editor: {
    titulo: "Título del artículo",
    meta: "Meta descripción (para Google)",
    contadorMeta: "{n}/160",
    portada: "Imagen de portada:",
    generarDiseno: "Generar diseño",
    generarDisenoTitulo: "Gratis: un diseño con el título y los colores de tu web",
    dibujando: "Dibujando…",
    generarIa: "Generar con IA",
    generarIaTitulo: "Imagen generada con IA (céntimos por imagen, a tu cuenta de OpenRouter)",
    generando: "Generando…",
    cambiarImagen: "Cambiar imagen",
    subirImagen: "Subir imagen",
    faltaTitulo: "(escribe el título para generarla)",
    insertarImagen: "Insertar imagen aquí",
    insertarTexto:
      "Escribe primero el artículo, haz clic donde la quieras y pulsa el botón. Si no eliges sitio, " +
      "va al final.",
    cuerpoEjemplo: "Escribe o pega aquí el artículo en markdown (por ejemplo, el que te escribió tu IA)…",
    guardar: "Guardar artículo",
    guardando: "Guardando…",
    vistaPrevia: "Vista previa",
    cancelar: "Cancelar",
    programarTexto: "O deja que se publique solo (artículo y sitio):",
    programar: "Programar publicación",
  },

  taller: {
    cargando: "Cargando borrador…",
    volver: "← Volver",
    encabezado: "Artículo con IA:",
    modelo: "Modelo: {modelo}",
    modeloDonde: "(se cambia en Configuración)",

    listo: "El borrador está listo para revisar.",
    usar: "Usar este borrador",
    usarTexto:
      "Se abrirá el editor de artículos con todo pre-rellenado; ahí subes la imagen de portada y guardas.",
    puedesReintentar: "{error} — puedes reintentar la etapa.",

    ejecutar: "▶ Ejecutar {etapa}",
    auto: "⏩ Auto hasta revisión",
    detener: "⏹ Detener (para al acabar la etapa en curso)",
    // Un aviso de gasto no se suaviza al traducirlo.
    autoTitulo: "Escribir el artículo entero de una vez",
    autoCuerpo:
      "El modo automático ejecuta todas las etapas pendientes seguidas (varias llamadas de IA) y " +
      "consume crédito de OpenRouter.",
    autoAceptar: "Ejecutar todo",

    generando: " generando…",
    regenerar: "↻ Regenerar",
    ver: "ver",
    ocultar: "ocultar",
    instruccion: "Instrucción opcional para regenerar (p. ej.: más corto, tono formal…)",
    nota: "Regenerar una etapa no rehace las posteriores: tú decides cuáles regenerar.",

    etapaAnalisis: "Análisis SEO",
    etapaPlan: "Plan del artículo",
    etapaInvestigacion: "Investigación web",
    etapaRedaccion: "Redacción",
    etapaLinks: "Enlaces internos",
    etapaMetadatos: "Metadatos SEO",

    // Lo que enseña cada etapa al abrirla. Los `\n` son saltos de línea de verdad:
    // esto se pinta dentro de un <pre>.
    analisisResumen: "Keyword principal: {principal}\nSecundarias: {secundarias}\nIntención de búsqueda: {intencion}",
    linksHecho:
      "Hecho: los enlaces internos relevantes (si los había) están integrados en el artículo (ver Redacción).",
    metadatosResumen: "Título: {titulo}\nSlug: {slug}\nMeta descripción: {meta}",
  },

  errores: {
    conexion: "Error de conexión",
    generico: "Algo ha fallado",
    subirImagen: "No se pudo subir la imagen",
  },
};
