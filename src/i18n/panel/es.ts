// El panel: lo que ve alguien que ya está dentro.
//
// El español es el original y de aquí sale la FORMA (ver tipos.ts): los otros
// cuatro no pueden dejarse una clave sin que falle el typecheck.
//
// `{email}` y compañía se rellenan al pintar (ver ../rellenar.ts).

export const es = {
  cabecera: {
    inicio: "Estrénala — ir al panel",
    espacioActivo: "Espacio activo",
    configuracion: "Configuración",
    salir: "Salir",
  },

  verifica: {
    // El correo va en negrita dentro de la frase, así que se parte en dos: el
    // trozo de antes y el de después. En otro idioma la dirección no cae en el
    // mismo sitio de la oración.
    antes: "Te enviamos un correo a ",
    despues: " para confirmar tu cuenta. Revisa tu bandeja (y el spam).",
    reenviado: "Reenviado",
    enviando: "Enviando…",
    reenviar: "Reenviar correo",
  },

  subir: {
    arrastra: "Arrastra tu web aquí",
    subiendo: "Subiendo…",
    formatos: "un .zip, un .html o la carpeta entera",
    elegirArchivos: "Elegir archivos",
    elegirCarpeta: "Elegir carpeta",
    tienesCarpeta: "¿Tienes una carpeta?",
    error: "Error al importar",
  },

  panel: {
    vacioTitulo: "Vamos a poner tu web online.",
    vacioTexto:
      "Sube la web que te generó la IA. La alojamos, le damos dirección y HTTPS, y podrás editarla sin código.",
    paso1: "Súbela",
    paso2conClic: "con un clic",
    paso2: "Edítala",
    paso3: "Publícala",

    tusWebs: "Tus webs",
    unProyecto: "proyecto",
    variosProyectos: "proyectos",

    empiezaAqui: "Empieza aquí",
    subeTuWeb: "Sube tu web hecha con IA",
    subeTuWebTexto:
      "Arrastra el .zip que te dio Claude, ChatGPT o v0. En un clic estará online, con dirección y HTTPS.",

    recientes: "Recientes",
    miniaturaInicio: "Inicio",
    // La dirección de una web que aún no tiene ninguna. `{fecha}` es el día que
    // se creó, tal cual viene (aaaa-mm-dd): no se traduce ni se reformatea.
    borrador: "Borrador · {fecha}",
  },

  estado: {
    sinPublicar: "Sin publicar",
    publicado: "Publicado",
    cambiosSinPublicar: "Cambios sin publicar",
  },

  // Dentro de una web. Cada apartado va a su componente (ver projects/[id]/).
  proyecto: {
    publicar: {
      sinDireccion: "Sin dirección aún",
      copiar: "Copiar",
      copiado: "Copiado",
      oculta: "Oculta en Google",
      ocultaTitulo: "Nadie la encontrará buscando en Google. Se cambia en «Dirección y dominio».",
      sinPublicar: "Sin publicar",
      publicado: "Publicado",
      tienesCambios: "Tienes cambios sin publicar",
      publicando: "Publicando…",
      publicar: "Publicar",
      publicarCambios: "Publicar cambios",
      republicar: "Republicar",
    },

    // El aviso de que su sitemap manda a Google a otro dominio. Antes era JSX
    // partido en seis trozos con `{" "}` entre medias; ahora es UNA frase por
    // idioma, que es la única forma de que un traductor pueda reordenarla.
    //
    // `{host}` y `{dominios}` los pone `conValores`, o sea que llegan como
    // elementos ya hechos: son datos del usuario y no pasan por el intérprete de
    // marcas. Por eso NO se envuelven en `**` aquí (ver i18n/formato.tsx).
    sitemap: {
      conHost:
        "Tu web se sirve en {host}, pero tu `sitemap.xml` le dice a Google que tus páginas " +
        "están en {dominios}. Google irá a buscarlas allí en vez de aquí.",
      sinHost:
        "Tu `sitemap.xml` le dice a Google que tus páginas están en {dominios}. Google irá a " +
        "buscarlas allí en vez de aquí.",
      /** Une los dos últimos dominios de la lista: «a.com, b.com y c.com». */
      y: "y",
      arreglaUno:
        "Si ese dominio es tuyo, conéctalo en «Dirección y dominio». Si no, borra el " +
        "`sitemap.xml` de tu web y te generamos uno correcto.",
      arreglaVarios:
        "Si esos dominios son tuyos, conéctalos en «Dirección y dominio». Si no, borra el " +
        "`sitemap.xml` de tu web y te generamos uno correcto.",
    },

    direccion: {
      titulo: "Dirección y dominio",
      estadoDominio: "Dominio propio activo",
      estadoSubdominio: "Subdominio activo · sin dominio propio",
      estadoNada: "Sin dirección",

      subdominioTitulo: "Subdominio",
      subdominioTexto: "La dirección gratuita de tu web en Estrénala.",
      subdominioEjemplo: "mi-subdominio",
      cambiar: "Cambiar",
      guardar: "Guardar",

      dominioTitulo: "Dominio propio",
      dominioQueEs: "Los registros DNS son como la dirección postal de tu dominio.",
      // El dominio va en un enlace en medio de la frase, así que se parte en dos.
      conectadoAntes: "Conectado a ",
      conectadoDespues: ". Mantén este registro en tu proveedor:",
      conecta: "Conecta tu dominio (p. ej. **tuempresa.com**) apuntando estos registros en tu proveedor:",
      dominioEjemplo: "tudominio.com",
      conectar: "Conectar",
      quitarDominio: "Quitar dominio",
      quitarSeguro: "**¿Seguro?** Se dejará de usar {dominio}; la web seguirá en el subdominio.",
      quitarNo: "No, dejarlo",
      quitarSi: "Sí, quitar",

      tipoA: "Tipo A",
      dnsAyuda:
        "En el campo **Nombre** de tu proveedor va solo la parte de delante: `@` si es tu dominio " +
        "pelado, o `blog` si conectas `blog.tudominio.com`. Con el dominio pelado, añade además " +
        "`www` apuntando a la misma IP.",

      googleTitulo: "Visibilidad en Google",
      googleEtiqueta: "Que Google no la encuentre todavía",
      googleActivo: "Pedimos a los buscadores que no la muestren. Quítalo cuando la web esté lista.",
      googleInactivo:
        "Actívalo mientras la estás preparando. La web sigue online: solo se le pide a los " +
        "buscadores que no la listen.",
      googleNoEsCandado:
        "No es un candado: quien tenga la dirección seguirá entrando. Si no quieres que la vea " +
        "**nadie**, despublica la web.",

      despublicarTitulo: "Despublicar la web",
      despublicarTexto: "Dejará de verse en internet. Podrás volver a publicarla cuando quieras.",
      despublicar: "Despublicar",
      despublicarSeguroConHost: "**¿Seguro?** La web dejará de verse en {host} al momento.",
      despublicarSeguro: "**¿Seguro?** La web dejará de verse al momento.",
      despublicarNo: "No, dejarla",
      despublicarSi: "Sí, despublicar",

      txtIntro:
        "Si acabas de tocar el DNS, dale unos minutos y vuelve a intentarlo. Y si tu dominio pasa " +
        "por un proxy (por ejemplo Cloudflare), añade además este registro **TXT**:",
      txtNombre: "Nombre",
      txtValor: "Valor",
    },

    asistente: {
      titulo: "Asistente de IA",
      resumen: "Dile en tus palabras qué cambiar y lo hace por ti",
      intro:
        "Escribe qué quieres cambiar de esta página. El asistente **propone** los cambios y tú " +
        "decides si aplicarlos. Todo queda en el Historial, así que siempre puedes revertir.",
      // Un aviso de gasto no se suaviza al traducirlo: dice con la clave de quién
      // se paga y que hay una revisión antes de aplicar nada.
      avisoTitulo: "Vas a usar el asistente de IA",
      aviso:
        "El asistente lee tu página y usa la IA con tu clave de OpenRouter (consume crédito). " +
        "Revisarás los cambios antes de aplicarlos.",
      avisoAceptar: "Continuar",
      pagina: "Página:",
      paginaInicio: "{pagina} (inicio)",
      ejemplo: "Ej.: «Haz el titular más directo y corrige las faltas de ortografía»",
      pensando: "Pensando…",
      proponer: "Proponer cambios",
      consumeCredito: "Consume crédito de OpenRouter (tu clave).",
      sinCambios: "El asistente no propuso ningún cambio.",
      unCambio: "{n} cambio propuesto:",
      variosCambios: "{n} cambios propuestos:",
      avisoVaciados:
        "**Ojo:** {n} de estos cambios dejan un trozo de texto vacío. Suele pasar cuando una frase " +
        "está repartida en varios trozos con estilos distintos y se juntan en uno: el texto queda " +
        "bien, pero puedes perder colores o degradados. Míralo en la vista previa después de " +
        "aplicar; si no te convence, deshazlo desde el Historial.",
      seQuedaVacio: "Se queda vacío",
      aplicando: "Aplicando…",
      aplicarUno: "Aplicar {n} cambio",
      aplicarVarios: "Aplicar {n} cambios",
      verComoQueda: "Ver cómo queda",
      ocultarVistaPrevia: "Ocultar la vista previa",
      descartar: "Descartar",
      asiQuedaria: "Así quedaría. Todavía no se ha guardado nada.",
      aplicado: "✓ Cambios aplicados. Revísalos en la vista previa de abajo.",
      // Qué se toca en cada cambio propuesto.
      tipoTexto: "Texto",
      tipoTextoFormato: "Texto con formato",
      tipoEnlace: "Enlace",
      tipoColor: "Color",
    },

    actualizar: {
      titulo: "Actualizar desde ZIP",
      resumen: "¿La editaste en tu herramienta? Sube la versión nueva",
      texto:
        "Si prefieres seguir editando tu web en tu propia herramienta (Claude Code, ChatGPT, v0…), " +
        "sube aquí el **.zip** con la versión nueva y tu web online se actualizará. La versión " +
        "anterior queda en el **Historial**, así que siempre puedes revertir.",
      ojo:
        "Ojo: el ZIP reemplaza el contenido; lo que hayas editado _dentro_ de Estrénala no se " +
        "mezcla con él (tu proyecto en tu herramienta manda).",
      boton: "↻ Subir ZIP y actualizar",
      actualizando: "Actualizando…",
      hecho: "✓ Web actualizada. Revísala en la vista previa de abajo.",
      // Tono normal y no «peligro» a propósito: esto SÍ se puede deshacer.
      confirmarTitulo: "Vas a reemplazar el contenido de esta web",
      confirmarCuerpo:
        "Se sustituye por el del ZIP nuevo. Tu versión actual queda en el Historial, así que " +
        "puedes volver a ella cuando quieras.",
      confirmarEtiqueta: "Se puede deshacer desde el Historial",
      confirmarAceptar: "Reemplazar",
    },

    herramientas: {
      titulo: "Herramientas del sitio",
      resumen: "Search Console · Analítica · Favicon · Compartir",
      configuradas: "{n} de 4 configuradas",
      sinConfigurar: "Sin configurar",
      listo: "Listo",
      activa: "Activa",
      quitar: "Quitar",
      aplicar: "Aplicar",
      subirImagen: "Subir imagen",
      cambiar: "Cambiar",
      searchConsole: "Google Search Console",
      searchConsoleTexto:
        "Demuestra a Google que la web es tuya. Pega la etiqueta o el código que te da Google.",
      analitica: "Analítica de visitas",
      analiticaTexto:
        "Mide las visitas con Google Analytics. Pega tu ID de medición de GA4 (empieza por G-).",
      favicon: "Favicon",
      faviconTexto: "El iconito de la pestaña del navegador. Sube una imagen cuadrada (png recomendado).",
      compartir: "Imagen al compartir",
      compartirQueEs: "La foto que aparece al pegar tu enlace en WhatsApp o redes (og:image).",
      compartirTexto: "Aparece al enviar tu web por WhatsApp o redes sociales.",
    },

    peligro: {
      titulo: "Zona de peligro",
      resumen: "Eliminar esta web para siempre",
      texto:
        "Se borrará {nombre} con todo su historial, su blog y sus archivos. Si está publicada, " +
        "dejará de estar online. **Esto no se puede deshacer.**",
      boton: "Eliminar esta web…",
      escribe: "Para confirmar, escribe {nombre}:",
      borrando: "Borrando…",
      borrar: "Borrar definitivamente",
      cancelar: "Cancelar",
    },

    previo: {
      portada: "{pagina} (portada)",
      selectTitulo: "Página que se muestra",
      selectBloqueado: "Guarda o descarta los cambios para cambiar de página",
      hacerPortada: "Hacer que sea la portada",
      hacerPortadaTitulo: "La portada es la página que se ve al entrar en tu dirección, sin nada detrás",
      guardando: "Guardando…",
      guardandoSuelto: "guardando…",
      modoEdicion: "Modo edición",
      unCambio: "{n} cambio",
      variosCambios: "{n} cambios",
      descartar: "Descartar",
      guardarCambios: "Guardar cambios",
      expandir: "⤢ Expandir",
      expandirTitulo: "Ver la web a tamaño real",
      salir: "⤡ Salir",
      salirTitulo: "Salir de pantalla completa (Esc)",
      errorImagen: "No se pudo subir la imagen",
      errorPortada: "No se pudo cambiar la portada",
      errorGuardar: "No se pudieron guardar los cambios",
    },

    historial: {
      titulo: "Historial",
      cargando: "Cargando…",
      vacio: "Aún no hay cambios guardados.",
      actual: "actual · ",
      restaurar: "Restaurar",
      restaurarTitulo:
        "Deja la web como estaba en ese momento. No se pierde nada: puedes volver a cualquier " +
        "otra versión de la lista, y tu web publicada no cambia hasta que le des a «Publicar cambios».",
      confirmar:
        "¿Volver a esta versión? Tu web publicada no cambia hasta que le des a «Publicar cambios».",
      si: "Sí, volver",
      no: "No",
      // Cada línea del historial. Las claves son las del servidor: no se tocan.
      tipoImport: "Importación inicial",
      tipoEdit: "Edición a mano",
      tipoEditIa: "Edición con el asistente",
      tipoBlog: "Cambio en el blog",
      tipoRestore: "Restauración",
      tipoPublish: "Publicación",
      tipoActualizacion: "Actualización desde ZIP",
    },

    // Solo los que se escriben AQUÍ, en el navegador. Los que manda el servidor
    // van en su propio bloque y siguen en español de momento.
    errores: {
      conexion: "Error de conexión",
      generico: "Algo ha fallado",
      subirImagen: "No se pudo subir la imagen",
      actualizar: "No se pudo actualizar",
      borrar: "No se pudo borrar",
    },
  },

  // Los botones de la ventanita de avisos, que sale en toda la plataforma.
  dialogo: {
    cancelar: "Cancelar",
    continuar: "Continuar",
    entendido: "Entendido",
    etiquetaCoste: "Gasta crédito de tu clave",
    etiquetaPeligro: "No se puede deshacer",
  },
};
