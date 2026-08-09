// Español: el original. De aquí sale la FORMA del catálogo (ver tipos.ts), así
// que los demás idiomas no pueden olvidarse una clave sin que falle el typecheck.
//
// El formato dentro de las frases va con marcas (ver ../formato.tsx):
//   **negrita**   [[resaltado en lima]]   ~~tachado~~

export const es = {
  meta: {
    titulo: "Estrénala — Tu web hecha con IA, por fin en directo",
    descripcion:
      "¿La IA te hizo una web y no sabes subirla? La ponemos online en un clic, con dominio y HTTPS, la editas sin código y hacemos que Google la encuentre.",
  },

  nav: {
    inicio: "Estrénala — inicio",
    como: "Cómo funciona",
    editar: "Editar",
    encontrar: "Lo que no ves",
    blog: "Blog",
    equipos: "Equipos",
    faq: "Preguntas",
    cta: "Sube tu web gratis",
    abrirMenu: "Abrir menú",
    principal: "Principal",
  },

  hero: {
    eyebrow: "La IA te hizo una web preciosa…",
    titular: "…y lleva semanas muerta en una carpeta.",
    promesa: "Nosotros la ponemos [[en el mundo]].",
    sub: "Arrastra la web que te dio Claude, ChatGPT o v0 y queda online con dominio y HTTPS. Edítala como quieras, y hacemos que Google la encuentre. Sin saber programar.",
    cta: "Sube tu web gratis →",
    nota: "Gratis para empezar · sin tarjeta",
    mockAria:
      "Vista del panel de proyecto de Estrénala: la web Clínica Sonrisa publicada, con los pasos Súbela, Publica y Edítala.",
    mockNombre: "Clínica Sonrisa",
    mockPublicado: "Publicado",
    mockEtiqueta: "en directo ✂",
    mockPaso1: "Súbela",
    mockPaso2: "Publica",
    mockPaso3: "Edítala",
  },

  problema: {
    eyebrow: "El momento en que te quedas atascado",
    titulo: "La IA te hizo la web en minutos. ~~Subirla~~ te lleva semanas.",
    texto:
      "Tienes un ZIP con tu web dentro, o unos archivos que no sabes dónde poner. Aparecen palabras como «hosting», «DNS», «servidor»… y la ilusión se apaga. La web que te encantó se queda en tu ordenador, sin que la vea nadie.",
    firma: "Estrénala empieza justo [[donde la IA te deja tirado]].",
  },

  como: {
    eyebrow: "Cómo funciona",
    titulo: "De la carpeta a internet, en tres pasos",
    texto: "Sin instalar nada, sin tocar código, sin llamar a tu sobrino que «sabe de ordenadores».",
    paso1Titulo: "Súbela",
    paso1Texto:
      "Arrastra el archivo o la carpeta que te dio la IA. Da igual si es de Claude, ChatGPT o v0: si es una web en HTML, vale.",
    paso1Chip: ".html · .zip · carpeta",
    paso2Titulo: "Publica",
    paso2Texto: "En un clic queda online con una dirección propia y HTTPS. ¿Tienes tu dominio? Conéctalo y listo.",
    paso2Chip: "subdominio o dominio propio · HTTPS",
    paso3Titulo: "Edítala",
    paso3Texto: "Cambia textos, imágenes, botones y colores cuando quieras. Con historial, para volver atrás sin miedo.",
    paso3Chip: "historial y revertir",
  },

  editar: {
    eyebrow: "Edítala como quieras · sin encierro",
    titulo: "Tres formas de editar. Eliges tú, no nosotros.",
    texto: "Puedes usar una, otra o las tres a la vez. Pases por donde pases, siempre queda guardado en el historial.",
    via1Etq: "Gratis",
    via1Titulo: "A mano, aquí mismo",
    via1Texto:
      "Haz clic sobre tu web real y cambia lo que veas: textos (con negrita, cursiva y enlaces), imágenes, botones y colores.",
    via1Punto1: "Sin código, sobre la web real",
    via1Punto2: "Historial y revertir siempre",
    via1Punto3: "Gratis, sin límite",
    via2Etq: "Con tu clave de IA · opt-in",
    via2Titulo: "Con el asistente de IA",
    via2Texto:
      "Dile en tus palabras qué cambiar («haz el titular más corto», «pon el teléfono en la cabecera») y lo hace por ti.",
    via2Punto1: "Conectas tu propia clave de IA",
    via2Punto2: "Tú decides cuándo gastas",
    via2Punto3: "Una opción potente, nunca obligatoria",
    via3Etq: "Sigue en tu herramienta",
    via3Titulo: "En tu propia herramienta",
    via3Texto:
      "¿Prefieres seguir en Claude Code, ChatGPT o v0? Edita allí y vuelve a subir el ZIP: tu web online se actualiza en un clic.",
    via3Punto1: "Re-subes el ZIP y ya está",
    via3Punto2: "La versión anterior queda guardada",
    via3Punto3: "Nunca te encerramos aquí",
    bandaBadge: "Historial",
    bandaTexto: "Cambies como cambies, **siempre puedes volver atrás**. Si algo se rompe, lo restauras en un clic.",
  },

  // Lo que la web hecha con IA NO trae, y que es lo único que la competencia no
  // puede copiar: para arreglarlo hay que tener el HTML delante al servirlo, y
  // quien solo guarda archivos se ha comprometido a devolverlos tal cual.
  encontrar: {
    eyebrow: "Compruébalo ahora mismo",
    titulo: "Tu web tiene un formulario de contacto. No envía nada.",
    texto:
      "Ábrela, rellénalo tú y dale a enviar. No te va a llegar nada. Le pasa a casi todas las webs hechas con IA, y el visitante nunca te lo va a decir: escribe, pulsa, ve que la página se recarga y se va convencido de que te ha escrito.",
    /** Enlace al artículo. La invitación a comprobarlo es media venta. */
    enlace: "Por qué pasa y cómo comprobarlo en 30 segundos",

    f1Titulo: "Los mensajes empiezan a llegarte",
    f1Texto:
      "Sin tocar el HTML: el formulario que ya escribió la IA se pone a funcionar y los mensajes te salen en el panel. Lo enciendes tú, cuando quieras, porque guardar datos de tus clientes lo decides tú y no nosotros.",
    f2Titulo: "Y de paso le ponemos nota a lo demás",
    f2Texto:
      "Diecisiete comprobaciones sobre todas tus páginas, sin jerga. «Sin descripción» aquí se lee: «es el texto gris de debajo del título en Google, tu anuncio gratis».",
    f3Titulo: "La ficha que le dice a Google y a ChatGPT qué eres",
    f3Texto:
      "Un negocio, con tu teléfono, tu logo y tus redes. Casi ninguna web hecha con IA la trae, y es lo que hace que te citen cuando alguien pregunta por lo tuyo.",

    banda:
      "Lo que se puede arreglar **sin que tu web se vea distinta, lo arreglamos solos** al servirla. No tienes que volver a subir nada, y el día que te vayas tu web sale tal y como la subiste.",

    panelAria:
      "Examen de una web recién subida: nota 62 sobre 100, con tres cosas encontradas — el formulario de contacto no envía a ninguna parte, no hay ficha para buscadores e imágenes sin describir.",
    notaPie: "de 100",
    veredicto: "Le faltan cosas importantes, y una la está costando clientes.",
    fallo1: "El formulario no envía a ninguna parte",
    fallo1Pie: "en contacto.html",
    fallo1Badge: "Grave",
    fallo2: "Sin ficha para buscadores",
    fallo2Pie: "en la portada",
    fallo2Badge: "Lo arreglamos",
    fallo3: "Imágenes sin describir",
    fallo3Pie: "12 imágenes en 4 páginas",
    fallo3Badge: "Grave",
  },

  blog: {
    eyebrow: "El blog que se escribe solo",
    titulo: "Aparece en Google sin que tengas que escribir",
    texto:
      "Un blog con contenido fresco te trae visitas. El nuestro se ocupa: encuentra los temas, los escribe y los publica.",
    f1Titulo: "Radar de temas en tendencia",
    f1Texto: "Detecta qué busca la gente de tu sector este mes, con datos reales de búsquedas.",
    f2Titulo: "Redacción por etapas",
    f2Texto: "La IA escribe el artículo paso a paso y tú lo revisas cuando quieras, no de golpe.",
    f3Titulo: "Portada automática",
    f3Texto: "Cada artículo sale con su imagen de portada, sin que tengas que buscarla.",
    f4Titulo: "Programación y piloto automático",
    f4Texto: "Publica en la fecha que elijas, o deja el piloto y sale solo cada semana.",
    aviso:
      "El blog va con los planes de pago, y escribe con tu propia clave de IA · opt-in: tú decides cuándo gastas. Publicar y editar a mano es gratis.",
    panelAria:
      "Panel del blog: un artículo publicado, un borrador escrito por IA, uno programado, y el piloto automático activado.",
    art1Titulo: "5 señales de que necesitas una revisión",
    art1Pie: "Publicado el 3 de julio",
    art1Badge: "Publicado",
    art2Titulo: "Blanqueamiento: mitos y verdades",
    art2Pie: "Redacción por etapas · 2 de 4",
    art2Badge: "Borrador IA",
    art3Titulo: "Cuidar tu ortodoncia en verano",
    art3Pie: "Se publica el 20 jul",
    art3Badge: "Programado",
    pilotoTitulo: "Piloto automático",
    pilotoPie: "Un artículo nuevo cada semana",
    pilotoActivado: "Activado",
  },

  equipo: {
    eyebrow: "¿Trabajas con más gente?",
    titulo: "Tu equipo, en el mismo sitio",
    texto:
      "Tanto si eres tú solo como si eres una agencia con varios clientes, cada web vive en su espacio y trabajáis sin pisaros.",
    punto1: "Entra con tu correo o con Google",
    punto2: "Invita a más gente a tu espacio",
    punto3: "Roles claros: propietario y editor",
    roles: "Propietario · Editor",
  },

  publico: {
    eyebrow: "Para quién es",
    titulo: "Pensada para quien no quiere pelearse con la técnica",
    c1Titulo: "Emprendedores",
    c1Texto: "Lanzas tu proyecto sin depender de nadie ni esperar semanas a un desarrollador.",
    c2Titulo: "Pequeñas agencias",
    c2Texto: "Publicas y mantienes las webs de tus clientes en un sitio, con tu equipo dentro.",
    c3Titulo: "Gente no técnica",
    c3Texto: "Si sabes usar el correo, sabes usar Estrénala. Nada de código ni servidores.",
  },

  faq: {
    eyebrow: "Preguntas frecuentes",
    titulo: "Lo que sueles querer saber",
    // El orden es el de la página. Todos los idiomas llevan las mismas y en el
    // mismo orden: hay un test que lo comprueba.
    preguntas: [
      {
        p: "¿Necesito saber programar?",
        r: "No. Subes tu web, la publicas y la editas haciendo clic sobre ella. Si sabes usar el correo o WhatsApp, sabes usar Estrénala.",
      },
      {
        p: "¿Sirve la web que me hizo ChatGPT, Claude o v0?",
        r: "Sí. Si es una web en HTML —lo que generan estas herramientas—, la subes tal cual (un archivo, un ZIP o la carpeta entera) y queda online.",
      },
      {
        p: "¿Puedo usar mi propio dominio?",
        r: "Sí. Puedes empezar con una dirección gratuita **tunombre.estrenala.com** y, cuando quieras, conectar tu dominio propio (p. ej. **tunegocio.com**). Todo con HTTPS.",
      },
      {
        p: "¿Cuánto cuesta la parte de IA?",
        r: "Editar **a mano es gratis**. La IA (asistente de edición y blog) funciona con **tu propia clave** y es opt-in: la conectas si quieres y **tú decides cuándo gastas**. No vendemos «IA ilimitada gratis»: pagas tu consumo real a tu proveedor.",
      },
      {
        p: "¿Y si prefiero seguir editando en mi herramienta de IA?",
        r: "Perfecto. Sigue en Claude Code, ChatGPT o v0 y, cuando termines, vuelve a subir el ZIP: tu web online se actualiza en un clic y la versión anterior queda en el historial. No te encerramos aquí.",
      },
      {
        p: "¿Qué es eso de que «arregláis» mi web para Google?",
        r: "Al subirla le pasamos un examen y te enseñamos qué tiene mal, en cristiano. Lo que se puede añadir **sin que tu web se vea distinta** —la ficha que le dice a Google y a ChatGPT qué eres, la imagen que sale al compartir el enlace— lo ponemos nosotros al servirla. **Tus archivos no se tocan**: si mañana te llevas la web a otro sitio, sale tal y como la subiste.",
      },
      {
        p: "¿Puedo volver atrás si rompo algo?",
        r: "Siempre. Cada cambio queda en el historial y puedes restaurar una versión anterior en un clic. Editar sin miedo es parte del trato.",
      },
      {
        p: "¿Puedo trabajar en equipo?",
        r: "Sí. Entras con tu correo o con Google e invitas a más gente a tu espacio con roles (propietario o editor). Ideal para agencias con varios clientes.",
      },
    ],
  },

  ctaFinal: {
    titulo: "Tu web ya está lista. [[Estrénala]].",
    texto: "Súbela ahora y verla online en internet te llevará menos de lo que has tardado en leer esto.",
    cta: "Sube tu web gratis →",
    nota: "Gratis para empezar · sin tarjeta · sin saber programar",
  },

  // La 404 de la propia plataforma. Hasta hoy no había ninguna: una dirección
  // mal escrita mandaba al login, que se lee como «esto es privado», y las que
  // sí llegaban al 404 veían la pantalla en blanco y negro que trae Next de
  // fábrica, en inglés y sin salida.
  noEncontrada: {
    titulo: "Esta página no existe",
    texto: "Puede que la dirección esté mal escrita, o que la página ya no esté aquí.",
    boton: "Ir a la portada",
  },

  pie: {
    lema: "El sitio donde tu web hecha con IA por fin sale al mundo.",
    colProducto: "Producto",
    editarSinCodigo: "Editar sin código",
    blogAutomatico: "Blog automático",
    colEmpezar: "Empezar",
    subeTuWeb: "Sube tu web",
    entrar: "Entrar",
    preguntasFrecuentes: "Preguntas frecuentes",
    colLegal: "Legal",
    avisoLegal: "Aviso legal",
    privacidad: "Privacidad",
    cookies: "Cookies",
    terminos: "Términos",
    hechoEn: "Hecho en España · Tu web hecha con IA, por fin en directo.",
    idioma: "Idioma",
  },
};
