import type { TextosLanding } from "./tipos";

// Português europeu (Portugal), não do Brasil: é o mercado mais próximo e o que
// se pretende atacar primeiro. «Estrénala» não se traduz — é a marca.

export const pt: TextosLanding = {
  meta: {
    titulo: "Estrénala — O teu site feito com IA, finalmente no ar",
    descripcion:
      "A IA fez-te um site e não sabes como o pôr online? A Estrénala publica-o num clique com domínio e HTTPS, editas sem código e fazemos que o Google o encontre. Grátis para começar.",
  },

  nav: {
    inicio: "Estrénala — início",
    como: "Como funciona",
    editar: "Editar",
    encontrar: "Que te encontrem",
    blog: "Blogue",
    equipos: "Equipas",
    faq: "Perguntas",
    cta: "Põe o teu site online, grátis",
    abrirMenu: "Abrir menu",
    principal: "Principal",
  },

  hero: {
    eyebrow: "A IA fez-te um site lindíssimo…",
    titular: "…e há semanas que está morto numa pasta.",
    promesa: "Nós pomo-lo [[no mundo]].",
    sub: "Arrasta o site que o Claude, o ChatGPT ou o v0 te deram e fica online com domínio e HTTPS. Edita-o como quiseres, e fazemos que o Google o encontre. Sem saber programar.",
    cta: "Põe o teu site online, grátis →",
    nota: "Grátis para começar · sem cartão",
    mockAria:
      "Vista do painel de projeto da Estrénala: o site Clínica Sorriso publicado, com os passos Carrega, Publica e Edita.",
    mockNombre: "Clínica Sorriso",
    mockPublicado: "Publicado",
    mockEtiqueta: "no ar ✂",
    mockPaso1: "Carrega",
    mockPaso2: "Publica",
    mockPaso3: "Edita",
  },

  problema: {
    eyebrow: "O momento em que ficas encravado",
    titulo: "A IA fez-te o site em minutos. ~~Pô-lo online~~ leva-te semanas.",
    texto:
      "Tens um ZIP com o teu site lá dentro, ou uns ficheiros que não sabes onde meter. Aparecem palavras como «alojamento», «DNS», «servidor»… e a vontade desaparece. O site de que gostaste fica no teu computador, sem ninguém o ver.",
    firma: "A Estrénala começa exatamente [[onde a IA te deixa a meio]].",
  },

  como: {
    eyebrow: "Como funciona",
    titulo: "Da pasta para a internet, em três passos",
    texto: "Sem instalar nada, sem mexer em código, sem ligar ao sobrinho que «percebe de computadores».",
    paso1Titulo: "Carrega-o",
    paso1Texto:
      "Arrasta o ficheiro ou a pasta que a IA te deu. Tanto faz se é do Claude, do ChatGPT ou do v0: se for um site em HTML, serve.",
    paso1Chip: ".html · .zip · pasta",
    paso2Titulo: "Publica-o",
    paso2Texto: "Num clique fica online com um endereço próprio e HTTPS. Tens domínio próprio? Liga-o e está feito.",
    paso2Chip: "subdomínio ou domínio próprio · HTTPS",
    paso3Titulo: "Edita-o",
    paso3Texto: "Muda textos, imagens, botões e cores quando quiseres. Com histórico, para voltares atrás sem medo.",
    paso3Chip: "histórico e reverter",
  },

  editar: {
    eyebrow: "Edita-o como quiseres · sem ficares preso",
    titulo: "Três formas de editar. Escolhes tu, não nós.",
    texto: "Podes usar uma, outra ou as três ao mesmo tempo. Vás por onde fores, fica sempre guardado no histórico.",
    via1Etq: "Grátis",
    via1Titulo: "À mão, aqui mesmo",
    via1Texto:
      "Clica no teu site a sério e muda o que vires: textos (com negrito, itálico e links), imagens, botões e cores.",
    via1Punto1: "Sem código, sobre o site real",
    via1Punto2: "Histórico e reverter sempre",
    via1Punto3: "Grátis, sem limite",
    via2Etq: "Com a tua chave de IA · opt-in",
    via2Titulo: "Com o assistente de IA",
    via2Texto:
      "Diz-lhe por palavras tuas o que mudar («faz o título mais curto», «põe o telefone no cabeçalho») e ele faz por ti.",
    via2Punto1: "Ligas a tua própria chave de IA",
    via2Punto2: "És tu que decides quando gastas",
    via2Punto3: "Uma opção potente, nunca obrigatória",
    via3Etq: "Continua na tua ferramenta",
    via3Titulo: "Na tua própria ferramenta",
    via3Texto:
      "Preferes continuar no Claude Code, no ChatGPT ou no v0? Edita lá e volta a carregar o ZIP: o teu site online atualiza-se num clique.",
    via3Punto1: "Voltas a carregar o ZIP e pronto",
    via3Punto2: "A versão anterior fica guardada",
    via3Punto3: "Nunca te prendemos aqui",
    bandaBadge: "Histórico",
    bandaTexto: "Mudes o que mudares, **podes sempre voltar atrás**. Se alguma coisa se estragar, repõe-la num clique.",
  },

  encontrar: {
    eyebrow: "E fazemos que a encontrem",
    titulo: "A IA fez-te um site bonito. Por dentro sai partido.",
    texto:
      "Não se vê a olhar para ele, porque não são falhas de design. Notam-se meses depois, quando não apareces no Google e já não sabes porquê. Nós olhamos por dentro no mesmo dia em que o publicas.",

    f1Titulo: "Damos-lhe nota e dizemos-te o que te custa",
    f1Texto:
      "Dezassete verificações em todas as tuas páginas, sem linguagem técnica. «Sem descrição» aqui lê-se: «é o texto cinzento por baixo do título no Google, o teu anúncio grátis».",
    f2Titulo: "A ficha que diz ao Google e ao ChatGPT o que és",
    f2Texto:
      "Um negócio, com o teu telefone, o teu logótipo e as tuas redes. Quase nenhum site feito com IA a traz, e é o que faz que te citem quando alguém pergunta pela tua área.",
    f3Titulo: "E os formulários que não enviavam a lado nenhum",
    f3Texto:
      "O clássico: alguém escreve-te, carrega em «enviar» e não acontece nada. Nem o avisa, nem te chega. Mostramos-te, e se quiseres as mensagens começam a chegar-te.",

    banda:
      "O que se pode corrigir **sem que o teu site fique diferente, corrigimos nós** ao servi-lo. Não tens de voltar a carregar nada, e no dia em que saíres o teu site sai tal como o carregaste.",

    panelAria:
      "Exame de um site acabado de carregar: nota 62 em 100, com três coisas encontradas — sem preparação para telemóvel, sem ficha para motores de busca e imagens sem descrição.",
    notaPie: "em 100",
    veredicto: "Faltam-lhe coisas importantes para o Google o perceber.",
    fallo1: "Não está preparada para o telemóvel",
    fallo1Pie: "em 5 páginas",
    fallo1Badge: "Grave",
    fallo2: "Sem ficha para motores de busca",
    fallo2Pie: "na página inicial",
    fallo2Badge: "Corrigimos nós",
    fallo3: "Imagens sem descrição",
    fallo3Pie: "12 imagens em 4 páginas",
    fallo3Badge: "Grave",
  },

  blog: {
    eyebrow: "O blogue que se escreve sozinho",
    titulo: "Aparece no Google sem teres de escrever",
    texto:
      "Um blogue com conteúdo fresco traz-te visitas. O nosso trata disso: encontra os temas, escreve-os e publica-os.",
    f1Titulo: "Radar de temas em tendência",
    f1Texto: "Deteta o que as pessoas do teu setor procuram este mês, com dados reais de pesquisas.",
    f2Titulo: "Redação por etapas",
    f2Texto: "A IA escreve o artigo passo a passo e tu revês quando quiseres, não de uma vez só.",
    f3Titulo: "Capa automática",
    f3Texto: "Cada artigo sai com a sua imagem de capa, sem teres de a procurar.",
    f4Titulo: "Agendamento e piloto automático",
    f4Texto: "Publica na data que escolheres, ou deixa o piloto e sai sozinho todas as semanas.",
    aviso:
      "O blogue vem com os planos pagos e escreve com a tua própria chave de IA · opt-in: és tu que decides quando gastas. Publicar e editar à mão é grátis.",
    panelAria:
      "Painel do blogue: um artigo publicado, um rascunho escrito por IA, um agendado, e o piloto automático ligado.",
    art1Titulo: "5 sinais de que precisas de uma revisão",
    art1Pie: "Publicado a 3 de julho",
    art1Badge: "Publicado",
    art2Titulo: "Branqueamento: mitos e verdades",
    art2Pie: "Redação por etapas · 2 de 4",
    art2Badge: "Rascunho IA",
    art3Titulo: "Cuidar do teu aparelho no verão",
    art3Pie: "Sai a 20 de jul.",
    art3Badge: "Agendado",
    pilotoTitulo: "Piloto automático",
    pilotoPie: "Um artigo novo todas as semanas",
    pilotoActivado: "Ligado",
  },

  equipo: {
    eyebrow: "Trabalhas com mais gente?",
    titulo: "A tua equipa, no mesmo sítio",
    texto:
      "Quer sejas só tu, quer sejas uma agência com vários clientes, cada site vive no seu espaço e trabalham sem se atropelarem.",
    punto1: "Entra com o teu email ou com o Google",
    punto2: "Convida mais gente para o teu espaço",
    punto3: "Papéis claros: proprietário e editor",
    roles: "Proprietário · Editor",
  },

  publico: {
    eyebrow: "Para quem é",
    titulo: "Pensada para quem não se quer chatear com a técnica",
    c1Titulo: "Empreendedores",
    c1Texto: "Lanças o teu projeto sem dependeres de ninguém nem esperares semanas por um programador.",
    c2Titulo: "Pequenas agências",
    c2Texto: "Publicas e manténs os sites dos teus clientes num só sítio, com a tua equipa lá dentro.",
    c3Titulo: "Gente não técnica",
    c3Texto: "Se sabes usar o email, sabes usar a Estrénala. Nada de código nem de servidores.",
  },

  faq: {
    eyebrow: "Perguntas frequentes",
    titulo: "O que costumam querer saber",
    preguntas: [
      {
        p: "Preciso de saber programar?",
        r: "Não. Carregas o teu site, publica-lo e edita-lo clicando em cima dele. Se sabes usar o email ou o WhatsApp, sabes usar a Estrénala.",
      },
      {
        p: "Serve o site que o ChatGPT, o Claude ou o v0 me fizeram?",
        r: "Sim. Se for um site em HTML — que é o que estas ferramentas geram —, carrega-lo tal como está (um ficheiro, um ZIP ou a pasta inteira) e fica online.",
      },
      {
        p: "Posso usar o meu próprio domínio?",
        r: "Sim. Podes começar com um endereço gratuito **onomedele.estrenala.com** e, quando quiseres, ligar o teu domínio próprio (p. ex. **oteunegocio.com**). Tudo com HTTPS.",
      },
      {
        p: "Quanto custa a parte de IA?",
        r: "Editar **à mão é grátis**. A IA (assistente de edição e blogue) funciona com **a tua própria chave** e é opt-in: ligas se quiseres e **és tu que decides quando gastas**. Não vendemos «IA ilimitada grátis»: pagas o teu consumo real ao teu fornecedor.",
      },
      {
        p: "E se preferir continuar a editar na minha ferramenta de IA?",
        r: "Perfeito. Continua no Claude Code, no ChatGPT ou no v0 e, quando acabares, volta a carregar o ZIP: o teu site online atualiza-se num clique e a versão anterior fica no histórico. Não te prendemos aqui.",
      },
      {
        p: "O que é isso de «corrigirem» o meu site para o Google?",
        r: "Ao carregá-lo fazemos-lhe um exame e mostramos-te o que está mal, em bom português. O que se pode acrescentar **sem que o teu site fique diferente** —a ficha que diz ao Google e ao ChatGPT o que és, a imagem que aparece ao partilhar o link— pomos nós ao servi-lo. **Os teus ficheiros não se tocam**: se amanhã levares o site para outro lado, sai tal como o carregaste.",
      },
      {
        p: "Posso voltar atrás se estragar alguma coisa?",
        r: "Sempre. Cada alteração fica no histórico e podes repor uma versão anterior num clique. Editar sem medo faz parte do acordo.",
      },
      {
        p: "Posso trabalhar em equipa?",
        r: "Sim. Entras com o teu email ou com o Google e convidas mais gente para o teu espaço com papéis (proprietário ou editor). Ideal para agências com vários clientes.",
      },
    ],
  },

  ctaFinal: {
    titulo: "O teu site já está pronto. [[Estreia-o]].",
    texto: "Carrega-o agora — vê-lo online na internet vai demorar-te menos do que demoraste a ler isto.",
    cta: "Põe o teu site online, grátis →",
    nota: "Grátis para começar · sem cartão · sem saber programar",
  },

  pie: {
    lema: "O sítio onde o teu site feito com IA sai finalmente para o mundo.",
    colProducto: "Produto",
    editarSinCodigo: "Editar sem código",
    blogAutomatico: "Blogue automático",
    colEmpezar: "Começar",
    subeTuWeb: "Põe o teu site online",
    entrar: "Entrar",
    preguntasFrecuentes: "Perguntas frequentes",
    colLegal: "Legal",
    avisoLegal: "Aviso legal",
    privacidad: "Privacidade",
    cookies: "Cookies",
    terminos: "Termos",
    hechoEn: "Feito em Espanha · O teu site feito com IA, finalmente no ar.",
    idioma: "Idioma",
  },
};
