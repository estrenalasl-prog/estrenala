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
};
