import type { TextosPanel } from "./tipos";

export const pt: TextosPanel = {
  cabecera: {
    inicio: "Estrénala — ir para o painel",
    espacioActivo: "Espaço ativo",
    configuracion: "Definições",
    salir: "Sair",
  },

  verifica: {
    antes: "Enviámos-te um email para ",
    despues: " para confirmares a tua conta. Vê a tua caixa de entrada (e o spam).",
    reenviado: "Reenviado",
    enviando: "A enviar…",
    reenviar: "Reenviar email",
  },

  subir: {
    arrastra: "Arrasta o teu site para aqui",
    subiendo: "A carregar…",
    formatos: "um .zip, um .html ou a pasta inteira",
    elegirArchivos: "Escolher ficheiros",
    elegirCarpeta: "Escolher pasta",
    tienesCarpeta: "Tens uma pasta?",
    error: "Não foi possível importar",
  },

  panel: {
    vacioTitulo: "Vamos pôr o teu site online.",
    vacioTexto:
      "Carrega o site que a IA te fez. Nós alojamos, damos-lhe endereço e HTTPS, e podes editá-lo sem código.",
    paso1: "Carrega-o",
    paso2conClic: "num clique",
    paso2: "Edita-o",
    paso3: "Publica-o",

    tusWebs: "Os teus sites",
    unProyecto: "projeto",
    variosProyectos: "projetos",

    empiezaAqui: "Começa aqui",
    subeTuWeb: "Carrega o teu site feito com IA",
    subeTuWebTexto:
      "Arrasta o .zip que o Claude, o ChatGPT ou o v0 te deram. Num clique fica online, com endereço e HTTPS.",

    recientes: "Recentes",
    miniaturaInicio: "Início",
    borrador: "Rascunho · {fecha}",
  },

  estado: {
    sinPublicar: "Por publicar",
    publicado: "Publicado",
    cambiosSinPublicar: "Alterações por publicar",
  },

  proyecto: {
    formularios: {
      titulo: "Mensagens dos teus formulários",
      apagado: "Desligado",
      encendido: "A recolher",
      encender: "Recolher as mensagens",
      apagar: "Deixar de recolher",
      queEs:
        "Quando alguém preenche um formulário do teu site, a mensagem chega aqui e avisamos-te por email. Enquanto isto estiver desligado, o teu site é servido exatamente como o carregaste.",
      avisoDatos:
        "Ao ligares isto passas a guardar dados das pessoas que te escrevem. És tu quem responde por eles perante a lei: diz isso no teu site e não peças mais do que precisas.",
      rotos: "Encontrámos {n} formulário que não envia para lado nenhum.",
      rotosPlural: "Encontrámos {n} formulários que não enviam para lado nenhum.",
      rotosDetalle:
        "Quem o preencher carrega em «enviar» e não acontece nada: nem lhe avisa, nem te chega. Liga a recolha e começarão a chegar-te.",
      ningunoRoto: "Todos os formulários da tua página inicial vão para algum lado. Não há nada a corrigir.",
      sinFormularios: "Não vimos nenhum formulário na tua página inicial.",
      buscador: "pesquisa do site",
      ajeno: "envia para o seu próprio destino",
      mailto: "abre o email do visitante",
      propio: "é o teu próprio código que trata dele",
      muerto: "não envia para lado nenhum",
      vacia: "Ainda não te escreveu ninguém.",
      vaciaEncendida: "Tudo pronto. Assim que alguém te escrever, aparece aqui.",
      sinLeer: "{n} por ler",
      marcarLeidos: "Marcar como lidas",
      en: "em {pagina}",
      cargando: "A carregar…",
      errorCargar: "Não foi possível carregar as mensagens.",
    },
    publicar: {
      sinDireccion: "Ainda sem endereço",
      copiar: "Copiar",
      copiado: "Copiado",
      oculta: "Escondido do Google",
      ocultaTitulo: "Ninguém o encontrará à procura no Google. Muda-se em «Endereço e domínio».",
      sinPublicar: "Por publicar",
      publicado: "Publicado",
      tienesCambios: "Tens alterações por publicar",
      publicando: "A publicar…",
      publicar: "Publicar",
      publicarCambios: "Publicar alterações",
      republicar: "Publicar de novo",
    },

    sitemap: {
      conHost:
        "O teu site é servido em {host}, mas o teu `sitemap.xml` diz ao Google que as tuas " +
        "páginas estão em {dominios}. O Google vai procurá-las lá em vez de aqui.",
      sinHost:
        "O teu `sitemap.xml` diz ao Google que as tuas páginas estão em {dominios}. O Google vai " +
        "procurá-las lá em vez de aqui.",
      y: "e",
      arreglaUno:
        "Se esse domínio é teu, liga-o em «Endereço e domínio». Se não é, apaga o `sitemap.xml` do " +
        "teu site e geramos um correto.",
      arreglaVarios:
        "Se esses domínios são teus, liga-os em «Endereço e domínio». Se não são, apaga o " +
        "`sitemap.xml` do teu site e geramos um correto.",
    },

    direccion: {
      titulo: "Endereço e domínio",
      estadoDominio: "Domínio próprio ativo",
      estadoSubdominio: "Subdomínio ativo · sem domínio próprio",
      estadoNada: "Sem endereço",

      subdominioTitulo: "Subdomínio",
      subdominioTexto: "O endereço gratuito do teu site na Estrénala.",
      subdominioEjemplo: "o-meu-subdominio",
      cambiar: "Mudar",
      guardar: "Guardar",

      dominioTitulo: "Domínio próprio",
      dominioQueEs: "Os registos DNS são como a morada do teu domínio.",
      conectadoAntes: "Ligado a ",
      conectadoDespues: ". Mantém este registo no teu fornecedor:",
      conecta: "Liga o teu domínio (p. ex. **aminhaempresa.com**) apontando estes registos no teu fornecedor:",
      dominioEjemplo: "omeudominio.com",
      conectar: "Ligar",
      quitarDominio: "Retirar domínio",
      quitarSeguro: "**De certeza?** Deixa de usar-se {dominio}; o site continua no subdomínio.",
      quitarNo: "Não, deixa estar",
      quitarSi: "Sim, retirar",

      tipoA: "Tipo A",
      dnsAyuda:
        "No campo **Nome** do teu fornecedor vai só a parte da frente: `@` se for o teu domínio " +
        "simples, ou `blog` se ligares `blog.omeudominio.com`. Com o domínio simples, acrescenta " +
        "também `www` a apontar para o mesmo IP.",

      googleTitulo: "Visibilidade no Google",
      googleEtiqueta: "Que o Google ainda não o encontre",
      googleActivo: "Pedimos aos motores de busca que não o mostrem. Tira isto quando o site estiver pronto.",
      googleInactivo:
        "Ativa-o enquanto o estás a preparar. O site continua online: só se pede aos motores de " +
        "busca que não o listem.",
      googleNoEsCandado:
        "Não é um cadeado: quem tiver o endereço continua a entrar. Se não queres que o veja " +
        "**ninguém**, despublica o site.",

      despublicarTitulo: "Despublicar o site",
      despublicarTexto: "Deixa de se ver na internet. Podes voltar a publicá-lo quando quiseres.",
      despublicar: "Despublicar",
      despublicarSeguroConHost: "**De certeza?** O site deixa de se ver em {host} imediatamente.",
      despublicarSeguro: "**De certeza?** O site deixa de se ver imediatamente.",
      despublicarNo: "Não, deixa estar",
      despublicarSi: "Sim, despublicar",

      txtIntro:
        "Se acabaste de mexer no DNS, dá-lhe uns minutos e tenta outra vez. E se o teu domínio " +
        "passa por um proxy (por exemplo a Cloudflare), acrescenta também este registo **TXT**:",
      txtNombre: "Nome",
      txtValor: "Valor",
    },

    asistente: {
      titulo: "Assistente de IA",
      resumen: "Diz-lhe por palavras tuas o que mudar e ele faz por ti",
      intro:
        "Escreve o que queres mudar nesta página. O assistente **propõe** as alterações e tu " +
        "decides se as aplicas. Fica tudo no Histórico, por isso podes sempre reverter.",
      avisoTitulo: "Vais usar o assistente de IA",
      aviso:
        "O assistente lê a tua página e usa a IA com a tua chave da OpenRouter (gasta crédito). " +
        "Vais rever as alterações antes de as aplicares.",
      avisoAceptar: "Continuar",
      pagina: "Página:",
      paginaInicio: "{pagina} (início)",
      ejemplo: "Ex.: «Torna o título mais direto e corrige os erros ortográficos»",
      pensando: "A pensar…",
      proponer: "Propor alterações",
      consumeCredito: "Gasta crédito da OpenRouter (a tua chave).",
      sinCambios: "O assistente não propôs nenhuma alteração.",
      unCambio: "{n} alteração proposta:",
      variosCambios: "{n} alterações propostas:",
      avisoVaciados:
        "**Atenção:** {n} destas alterações deixam um pedaço de texto vazio. Costuma acontecer " +
        "quando uma frase está repartida por vários pedaços com estilos diferentes e se juntam " +
        "num só: o texto fica bem, mas podes perder cores ou gradientes. Vê na pré-visualização " +
        "depois de aplicar; se não gostares, desfaz no Histórico.",
      seQuedaVacio: "Fica vazio",
      aplicando: "A aplicar…",
      aplicarUno: "Aplicar {n} alteração",
      aplicarVarios: "Aplicar {n} alterações",
      verComoQueda: "Ver como fica",
      ocultarVistaPrevia: "Esconder a pré-visualização",
      descartar: "Descartar",
      asiQuedaria: "Ficaria assim. Ainda não se guardou nada.",
      aplicado: "✓ Alterações aplicadas. Vê-as na pré-visualização em baixo.",
      tipoTexto: "Texto",
      tipoTextoFormato: "Texto com formatação",
      tipoEnlace: "Ligação",
      tipoColor: "Cor",
    },

    actualizar: {
      titulo: "Atualizar a partir de um ZIP",
      resumen: "Editaste-o na tua ferramenta? Carrega a versão nova",
      texto:
        "Se preferes continuar a editar o teu site na tua própria ferramenta (Claude Code, " +
        "ChatGPT, v0…), carrega aqui o **.zip** com a versão nova e o teu site online atualiza-se. " +
        "A versão anterior fica no **Histórico**, por isso podes sempre reverter.",
      ojo:
        "Atenção: o ZIP substitui o conteúdo; o que tiveres editado _dentro_ da Estrénala não se " +
        "mistura com ele (o teu projeto na tua ferramenta manda).",
      boton: "↻ Carregar ZIP e atualizar",
      actualizando: "A atualizar…",
      hecho: "✓ Site atualizado. Vê-o na pré-visualização em baixo.",
      confirmarTitulo: "Vais substituir o conteúdo deste site",
      confirmarCuerpo:
        "Fica substituído pelo do ZIP novo. A tua versão atual fica no Histórico, por isso podes " +
        "voltar a ela quando quiseres.",
      confirmarEtiqueta: "Pode desfazer-se a partir do Histórico",
      confirmarAceptar: "Substituir",
    },

    herramientas: {
      titulo: "Ferramentas do site",
      resumen: "Search Console · Analítica · Favicon · Partilha",
      configuradas: "{n} de 4 configuradas",
      sinConfigurar: "Por configurar",
      listo: "Pronto",
      activa: "Ativa",
      quitar: "Retirar",
      aplicar: "Aplicar",
      subirImagen: "Carregar imagem",
      cambiar: "Mudar",
      searchConsole: "Google Search Console",
      searchConsoleTexto: "Prova ao Google que o site é teu. Cola a etiqueta ou o código que o Google te dá.",
      analitica: "Analítica de visitas",
      analiticaTexto: "Mede as visitas com o Google Analytics. Cola o teu ID de medição do GA4 (começa por G-).",
      favicon: "Favicon",
      faviconTexto: "O ícone pequenino do separador do navegador. Carrega uma imagem quadrada (png recomendado).",
      compartir: "Imagem ao partilhar",
      compartirQueEs: "A foto que aparece ao colar a tua ligação no WhatsApp ou nas redes (og:image).",
      compartirTexto: "Aparece ao enviares o teu site pelo WhatsApp ou pelas redes sociais.",
    },

    peligro: {
      titulo: "Zona de perigo",
      resumen: "Eliminar este site para sempre",
      texto:
        "Vai apagar-se {nombre} com todo o seu histórico, o seu blogue e os seus ficheiros. Se " +
        "estiver publicado, deixa de estar online. **Isto não se pode desfazer.**",
      boton: "Eliminar este site…",
      escribe: "Para confirmar, escreve {nombre}:",
      borrando: "A apagar…",
      borrar: "Apagar definitivamente",
      cancelar: "Cancelar",
    },

    previo: {
      portada: "{pagina} (página inicial)",
      selectTitulo: "Página que se mostra",
      selectBloqueado: "Guarda ou descarta as alterações para mudar de página",
      hacerPortada: "Tornar esta a página inicial",
      hacerPortadaTitulo: "A página inicial é a que se vê ao entrar no teu endereço, sem nada a seguir",
      guardando: "A guardar…",
      guardandoSuelto: "a guardar…",
      modoEdicion: "Modo de edição",
      unCambio: "{n} alteração",
      variosCambios: "{n} alterações",
      descartar: "Descartar",
      guardarCambios: "Guardar alterações",
      expandir: "⤢ Expandir",
      expandirTitulo: "Ver o site em tamanho real",
      salir: "⤡ Sair",
      salirTitulo: "Sair do ecrã inteiro (Esc)",
      errorImagen: "Não foi possível carregar a imagem",
      errorPortada: "Não foi possível mudar a página inicial",
      errorGuardar: "Não foi possível guardar as alterações",
    },

    historial: {
      titulo: "Histórico",
      cargando: "A carregar…",
      vacio: "Ainda não há alterações guardadas.",
      actual: "atual · ",
      restaurar: "Restaurar",
      restaurarTitulo:
        "Deixa o site como estava nesse momento. Não se perde nada: podes voltar a qualquer outra " +
        "versão da lista, e o teu site publicado não muda até carregares em «Publicar alterações».",
      confirmar:
        "Voltar a esta versão? O teu site publicado não muda até carregares em «Publicar alterações».",
      si: "Sim, voltar",
      no: "Não",
      tipoImport: "Importação inicial",
      tipoEdit: "Edição à mão",
      tipoEditIa: "Edição com o assistente",
      tipoBlog: "Alteração no blogue",
      tipoRestore: "Restauro",
      tipoPublish: "Publicação",
      tipoActualizacion: "Atualização a partir de um ZIP",
    },

    errores: {
      conexion: "Erro de ligação",
      generico: "Alguma coisa correu mal",
      subirImagen: "Não foi possível carregar a imagem",
      actualizar: "Não foi possível atualizar",
      borrar: "Não foi possível apagar",
    },
  },

  dialogo: {
    cancelar: "Cancelar",
    continuar: "Continuar",
    entendido: "Entendido",
    etiquetaCoste: "Gasta crédito da tua chave",
    etiquetaPeligro: "Não se pode desfazer",
  },
};
