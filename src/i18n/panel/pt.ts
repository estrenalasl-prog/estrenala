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
    seo: {
      titulo: "Como o Google te vê",
      cargando: "A olhar para o teu site…",
      errorCargar: "Não foi possível examinar o site.",
      sinPublicar: "Publica o site e dizemos-te como o Google o vê.",
      todoBien: "Não encontrámos nada para corrigir. Muito bem.",
      resumenTodoBien: "Está tudo bem",
      examinadas: "{n} de {total} páginas examinadas",
      grave: "Grave",
      aviso: "Pode melhorar",
      arreglable: "Corrigimos nós",
      enUnaPagina: "em 1 página",
      enPaginas: "em {n} páginas",
      ejemplos: "Por exemplo:",
      yMas: "e mais {n}",
      veredictoExcelente: "O teu site está muito bem preparado para ser encontrado.",
      veredictoBien: "Está razoável, mas ainda dá para tirar mais dele.",
      veredictoRegular: "Faltam-lhe coisas importantes para o Google o perceber.",
      veredictoMal: "O Google vai ter dificuldade em perceber este site.",
      fallos: {
        sinTitulo: {
          que: "Esta página não tem título",
          porque: "É a linha azul em que as pessoas clicam no Google. Sem ela, o Google inventa uma com o que apanhar.",
        },
        tituloLargo: {
          que: "O título fica cortado no Google",
          porque: "Passa dos 60 caracteres, por isso nos resultados aparece a meio.",
        },
        titulosRepetidos: {
          que: "Várias páginas com o mesmo título",
          porque: "O Google não sabe qual mostrar e põe-nas a competir entre si. É a falha mais comum num site feito com IA.",
        },
        sinDescripcion: {
          que: "Sem descrição",
          porque: "É o texto cinzento por baixo do título no Google: o teu anúncio grátis. Sem ele aparece um pedaço solto da página.",
        },
        descripcionLarga: {
          que: "A descrição fica cortada",
          porque: "Passa dos 160 caracteres e o Google corta-a a meio da frase.",
        },
        descripcionesRepetidas: {
          que: "A mesma descrição em várias páginas",
          porque: "Estás a dizer ao Google que contam o mesmo, e ele acaba por mostrar só uma.",
        },
        sinH1: {
          que: "Não há manchete",
          porque: "É a primeira coisa que o Google lê para saber do que trata a página. Sem ela, tem de adivinhar.",
        },
        variosH1: {
          que: "Há mais do que uma manchete",
          porque: "Se tudo é manchete, nada é: o Google não percebe qual é o tema da página.",
        },
        saltoEncabezados: {
          que: "Os títulos de secção saltam níveis",
          porque: "Vão de um nível para outro sem passar pelo do meio. Isso parte o índice com que o Google percebe a página.",
        },
        imagenesSinAlt: {
          que: "Imagens sem descrição",
          porque: "Essa descrição é tudo o que o Google percebe de uma foto, e é o que ouve quem não a consegue ver. Ainda por cima mete-te de graça no Google Imagens.",
        },
        imagenesSinTamano: {
          que: "Imagens sem medidas",
          porque: "O navegador não sabe quanto espaço deixar e a página dá saltos enquanto carrega. O Google mede isso e conta para a posição.",
        },
        sinViewport: {
          que: "Não está preparada para o telemóvel",
          porque: "Falta a linha que diz ao telemóvel como a desenhar. O Google ordena pela versão móvel: sem isto começas a perder.",
        },
        sinLang: {
          que: "Não diz em que idioma está",
          porque: "O Google e os tradutores têm de adivinhar, e às vezes enganam-se no país.",
        },
        sinOgImage: {
          que: "Sem imagem ao partilhar",
          porque: "Ao colar a ligação no WhatsApp ou no LinkedIn sai um cartão sem foto. É a diferença entre abrirem ou não.",
        },
        sinDatosEstructurados: {
          que: "Sem ficha para os motores de busca",
          porque: "É o que diz ao Google e ao ChatGPT o que és: um negócio, um artigo, um produto. Quase nenhum site feito com IA a traz, e é o que faz que te citem.",
        },
        enlacesGenericos: {
          que: "Ligações que não dizem para onde levam",
          porque: "«Ler mais» ou «aqui» não dizem nada ao Google nem a quem navega às cegas.",
        },
        paginaPesada: {
          que: "Esta página pesa demasiado",
          porque: "Quem entra pelo telemóvel com má cobertura vai-se embora antes de a ver. O Google mede isto com o cronómetro do visitante e conta para a posição.",
        },
        imagenPesada: {
          que: "Imagens sem otimizar",
          porque: "Uma foto com mais de meio mega quase nunca é precisa: guardada como WebP costuma ficar num quinto, e vê-se igual.",
        },
        sinFavicon: {
          que: "Sem ícone de separador",
          porque: "É o quadradinho do separador e dos favoritos. Sem ele aparece uma folha em branco.",
        },
      },
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

      dnsTitulo: "Isto é o que vejo no teu DNS neste momento",
      dnsProveedor: "O teu DNS está na {proveedor}: é aí que tens de entrar para o alterar.",
      dnsApuntaA: "O teu domínio aponta para:",
      dnsNoApunta: "O teu domínio ainda não aponta para lado nenhum.",
      dnsIpv6Titulo: "Estes registos AAAA estão a mais",
      dnsIpv6Texto:
        "São endereços IPv6 que levam ao teu site anterior. **Apaga-os, não os substituas**: " +
        "enquanto lá estiverem, quase todos os navegadores vão por aí e continuam a ver o site antigo, " +
        "mesmo com o registo A perfeito. É por isso que o vês bem num sítio e mal noutro.",
      dnsWwwTitulo: "Falta o registo do `www`",
      dnsWwwTexto:
        "Acrescenta um registo **A** com o nome `www` a apontar para o mesmo endereço. Sem ele, quem " +
        "escrever o teu domínio com `www.` à frente não chega a lado nenhum.",
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
      descargarTexto:
        "E o contrário também: **o teu site é teu**. Descarrega-o inteiro quando quiseres — com " +
        "o que editaste aqui, imagens e artigos do blogue incluídos.",
      descargarBoton: "⬇ Descarregar o meu site (.zip)",
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
      deshacer: "↩ Desfazer",
      deshacerTitulo: "Desfazer a última alteração, sem mexer nas outras",
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
