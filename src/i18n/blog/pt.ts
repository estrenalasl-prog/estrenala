import type { TextosBlog } from "./tipos";

export const pt: TextosBlog = {
  titulo: "Blogue",
  aviso:
    "As páginas do blogue geram-se a partir daqui; se lhes mexeres com o editor visual, a próxima " +
    "regeneração do blogue desfaz essas alterações.",
  avisoPublicar: "Para se ver no teu site, carrega em «Publicar alterações» lá em cima.",

  dePago: {
    resumen: "Incluído nos planos pagos",
    titulo: "Um blogue que se escreve sozinho",
    texto:
      "Artigos com o design do teu próprio site, índice e sitemap sempre em dia, e um piloto " +
      "automático que procura temas e publica de poucos em poucos dias. Desde {precio} €/mês com o " +
      "plano {plan}.",
    boton: "Ver os planos",
  },

  borradorRevision: "✅ para rever",
  borradorError: "⚠ erro",
  borradorEnMarcha: "⏳ a caminho",
  programadoPublicado: "✓ publicado",
  programadoError: "⚠ erro",
  programadoPendiente: "⏳ pendente",

  previo: {
    expandir: "⤢ Expandir",
    expandirTitulo: "Ver o modelo em tamanho real",
    salir: "⤡ Sair",
    salirTitulo: "Sair do ecrã inteiro (Esc)",
    titulo: "pré-visualização",
  },

  vacio: {
    titulo: "O blogue do teu site",
    texto:
      "Artigos com o teu design, índice e sitemap automáticos. Primeiro, o modelo: ou a IA lê a tua " +
      "página inicial e propõe o design, ou trazes o teu já feito.",
    crear: "Criar o modelo do blogue com IA",
    creando: "A criar o modelo…",
    yaTengo: "Já tenho o meu modelo",
  },

  ia: {
    titulo: "Escrever com IA",
    nicho: "Sobre o que é o teu blogue (a IA usa isto para orientar os artigos)",
    nichoEjemplo: "p. ex.: Automatização e IA para PME: agentes, ferramentas e casos práticos",
    semillas: "Palavras-chave semente (separadas por vírgulas; ajudam o radar a procurar temas do teu nicho)",
    semillasEjemplo: "p. ex.: agentes ia, automatização pme, chatbots",
    guardarConfig: "Guardar configuração",
    guardado: "Guardado",
    modelo: "Modelo de IA: {modelo} — muda-se em {enlace}.",
    modeloEnlace: "Definições",
    escribir: "Escrever artigo com IA",
    keyword: "Palavra-chave ou tema do artigo",
    crearBorrador: "Criar rascunho",
    creando: "A criar…",
    cancelar: "Cancelar",
    abrir: "Abrir",
    borrar: "apagar",
    borrarPregunta: "Apagar o rascunho «{keyword}»?",
    borrarCuerpo: "Perde-se o que a IA já escreveu para ele. Voltar a gerá-lo gastaria crédito outra vez.",
    borrarAceptar: "Sim, apagar",
  },

  radar: {
    titulo: "Temas em tendência",
    buscar: "🔍 Procurar temas de hoje",
    buscando: "A procurar no Google…",
    forzar: "Forçar",
    texto:
      "Procura o que sobe hoje no Google (Espanha), cruza com o teu nicho e propõe-te temas. Gasta " +
      "até 4 créditos da SerpAPI + 1 chamada de IA; uma vez por dia.",
    yaHoy: "O radar já foi atualizado hoje.",
    actualizado:
      "Radar atualizado: {candidatos} temas analisados ({tendencias} de tendências de hoje, " +
      "{relacionadas} das tuas sementes).",
    sinSemillas: "As tuas sementes não deram resultados no Google Trends: experimenta outras mais comuns.",
    relevanciaTitulo: "Relevância para o teu nicho (0-100)",
    deTendencias: "· tendência de hoje",
    deSemillas: "· relacionada com as tuas sementes",
    escribir: "Escrever artigo",
    preparando: "A preparar…",
    descartar: "descartar",
  },

  piloto: {
    titulo: "Piloto automático",
    texto:
      "O blogue escreve-se sozinho: o radar procura o tema do dia, a IA redige com o teu modelo, " +
      "gera-se a imagem de capa e a publicação é agendada automaticamente. Só escreve se houver um " +
      "tema com relevância acima de 60 (senão, nesse dia não gasta nada a redigir). Gasto por " +
      "artigo: as chamadas de IA do teu modelo + o radar (até 4 créditos da SerpAPI por dia).",
    cadaDia: "Todos os dias",
    cada3Dias: "De 3 em 3 dias",
    cadaSemana: "Todas as semanas",
    aPartirDeLas: "a partir das {hora}:00",
    portadaDiseno: "Capa: um design (grátis)",
    portadaIa: "Capa: imagem com IA (cêntimos)",
    guardar: "Guardar",
    guardadoActivo: "Guardado. O piloto está A FUNCIONAR.",
    guardadoApagado: "Guardado (piloto desligado).",
    ultima: "Última execução: {msg}",
    ultimaConDia: "Última execução ({dia}): {msg}",
  },

  programados: {
    titulo: "Agendados",
    editar: "Editar",
    editarTitulo: "Traz o conteúdo de volta ao editor e retira o agendamento (reagenda a partir daí)",
    ocultar: "Esconder",
    ocultarTitulo: "Retira esta linha; o artigo já está na lista abaixo",
    hecho: "Artigo agendado para {fecha}. A essa hora publica-se sozinho (artigo e site).",
  },

  lista: {
    nuevo: "Novo artigo",
    editarPlantillas: "Editar modelos",
    cargando: "a carregar…",
    editar: "Editar",
    borrar: "apagar",
    borrarPregunta: "Apagar o artigo «{titulo}»?",
    borrarCuerpo:
      "Sai do blogue e do índice. Para desaparecer também do teu site publicado, lembra-te de " +
      "carregar depois em «Publicar alterações».",
    borrarAceptar: "Sim, apagar",
    guardado: "Artigo guardado. {aviso}",
    borrado: "Artigo apagado. {aviso}",
  },

  plantillas: {
    misTitulo: "O teu próprio modelo",
    misTexto:
      "Um blogue tem **dois tipos de página**: a **lista** de artigos —o que se vê ao entrar em " +
      "`/blog/`— e **cada artigo por dentro**. Por isso te pedimos dois, embora com um nos baste. " +
      "Não mudamos o teu design: só lhe colocamos os espaços que o sistema preenche com cada artigo.",
    subirHtml: "Carregar ficheiro .html",

    paso1: "1 · Como se vê um artigo por dentro",
    paso1Texto: "É o importante. Estes são os espaços que lhe colocamos:",
    paso1Ejemplo: "Cola aqui o HTML da tua página de artigo…",
    paso2: "2 · A lista de artigos",
    paso2Opcional: "(opcional)",
    paso2Texto:
      "A página `/blog/`, com todos os teus artigos listados. Aqui os espaços são outros —o título, " +
      "a data e a ligação de cada um— e colocam-se sozinhos.",
    paso2Ejemplo: "Se não a trouxeres, construímo-la com o mesmo design do teu artigo.",

    huecoTitulo: "o título do artigo",
    huecoContenido: "o corpo, já em HTML",
    huecoMeta: "o resumo para o Google",
    huecoImagen: "a imagem de capa",
    huecoFecha: "a data de publicação",
    huecoCanonical: "o endereço bom da página",
    huecoJsonLd: "os dados para o Google (entra sozinho)",

    colocar: "Colocai vós os espaços",
    colocando: "A colocar os espaços…",
    yaLlevaHuecos: "Já leva os espaços",
    yaLlevaHuecosTitulo:
      "Só se já escreveste tu os {{titulo}}, {{contenido}}… dentro do teu HTML. Então não é preciso " +
      "gastar IA.",
    volver: "Voltar",
    cual:
      "**Qual dos dois?** Se o teu HTML é uma página normal, **«Colocai vós os espaços»** —gasta uma " +
      "chamada de IA da tua conta da OpenRouter—. **«Já leva os espaços»** é só para quando " +
      "escreveste tu mesmo os `{{titulo}}`, `{{contenido}}`… lá dentro; esse não custa nada.",

    sinHuecosTitulo: "O teu HTML ainda não leva nenhum espaço",
    sinHuecosCuerpo:
      "Este botão é para quando já escreveste tu os {{titulo}}, {{contenido}}… dentro do teu HTML. " +
      "Não os encontrámos, por isso o blogue não saberia onde pôr cada coisa. Podemos colocá-los " +
      "nós sem te mexer no design.",
    sinHuecosAceptar: "Colocai-os vós",
    sinHuecosCancelar: "Ponho-os eu",

    sinIndiceTitulo: "Falta-te a lista de artigos",
    sinIndiceCuerpo:
      "É a página /blog/ onde aparecem todos os teus artigos. À mão escreve-se rodeando com " +
      "<!--POST--> e <!--/POST--> o bloco que se repete por cada um. Ou construímo-la nós com o " +
      "design do teu artigo.",
    sinIndiceAceptar: "Construí-la vós",
    sinIndiceCancelar: "Escrevo-a eu",

    preparando: "A preparar o modelo com IA (pode demorar um minuto)…",
    crearConIa: "Criar o modelo com IA",
    traerLaMia: "Trazer o meu",
    cancelar: "Cancelar",
    tplPost: "Modelo de artigo",
    tplIndex: "Modelo do índice",
    guardar: "Guardar modelos",
    guardando: "A guardar…",
    previoPost: "Pré-visualizar artigo",
    previoIndex: "Pré-visualizar índice",
    regenerar: "Voltar a gerar",
  },

  editor: {
    titulo: "Título do artigo",
    meta: "Meta descrição (para o Google)",
    contadorMeta: "{n}/160",
    portada: "Imagem de capa:",
    generarDiseno: "Gerar um design",
    generarDisenoTitulo: "Grátis: um design com o título e as cores do teu site",
    dibujando: "A desenhar…",
    generarIa: "Gerar com IA",
    generarIaTitulo: "Imagem gerada com IA (cêntimos por imagem, na tua conta da OpenRouter)",
    generando: "A gerar…",
    cambiarImagen: "Mudar imagem",
    subirImagen: "Carregar imagem",
    faltaTitulo: "(escreve o título para a gerar)",
    insertarImagen: "Inserir uma imagem aqui",
    insertarTexto:
      "Escreve primeiro o artigo, clica onde a queres e carrega no botão. Se não escolheres sítio, " +
      "vai para o fim.",
    cuerpoEjemplo: "Escreve ou cola aqui o artigo em markdown (por exemplo, o que a tua IA te escreveu)…",
    guardar: "Guardar artigo",
    guardando: "A guardar…",
    vistaPrevia: "Pré-visualização",
    cancelar: "Cancelar",
    programarTexto: "Ou deixa que se publique sozinho (artigo e site):",
    programar: "Agendar publicação",
  },

  taller: {
    cargando: "A carregar o rascunho…",
    volver: "← Voltar",
    encabezado: "Artigo com IA:",
    modelo: "Modelo: {modelo}",
    modeloDonde: "(muda-se nas Definições)",

    listo: "O rascunho está pronto para rever.",
    usar: "Usar este rascunho",
    usarTexto:
      "Abre-se o editor de artigos com tudo preenchido; aí carregas a imagem de capa e guardas.",
    puedesReintentar: "{error} — podes tentar a etapa outra vez.",

    ejecutar: "▶ Executar {etapa}",
    auto: "⏩ Auto até à revisão",
    detener: "⏹ Parar (para ao acabar a etapa em curso)",
    autoTitulo: "Escrever o artigo inteiro de uma vez",
    autoCuerpo:
      "O modo automático executa todas as etapas pendentes seguidas (várias chamadas de IA) e " +
      "consome crédito da OpenRouter.",
    autoAceptar: "Executar tudo",

    generando: " a gerar…",
    regenerar: "↻ Regenerar",
    ver: "ver",
    ocultar: "esconder",
    instruccion: "Instrução opcional para regenerar (p. ex.: mais curto, tom formal…)",
    nota: "Regenerar uma etapa não refaz as seguintes: decides tu quais regenerar.",

    etapaAnalisis: "Análise SEO",
    etapaPlan: "Plano do artigo",
    etapaInvestigacion: "Investigação na web",
    etapaRedaccion: "Redação",
    etapaLinks: "Ligações internas",
    etapaMetadatos: "Metadados SEO",

    analisisResumen: "Palavra-chave principal: {principal}\nSecundárias: {secundarias}\nIntenção de pesquisa: {intencion}",
    linksHecho:
      "Feito: as ligações internas relevantes (se as havia) estão integradas no artigo (ver Redação).",
    metadatosResumen: "Título: {titulo}\nSlug: {slug}\nMeta descrição: {meta}",
  },

  errores: {
    conexion: "Erro de ligação",
    generico: "Alguma coisa correu mal",
    subirImagen: "Não foi possível carregar a imagem",
  },
};
