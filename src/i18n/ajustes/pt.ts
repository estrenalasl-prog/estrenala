import type { TextosAjustes } from "./tipos";

export const pt: TextosAjustes = {
  miga: "Os teus sites",
  titulo: "Definições",
  lead: "Definições da tua conta e da plataforma.",

  nav: {
    claves: "Ligações e chaves",
    herramientas: "Ferramentas do site",
    equipo: "Equipa",
    plan: "Plano e utilização",
    cuenta: "A tua conta",
    peligro: "Zona de perigo",
  },

  claves: {
    titulo: "Ligações e chaves",
    texto:
      "Tudo o que a IA gera (artigos, modelos, radar de temas) vai com a **tua própria chave** e é " +
      "cobrado na tua conta: pagas o consumo real, sem acréscimo nosso. Sem chave, essas funções " +
      "ficam desativadas; o resto da plataforma funciona na mesma.",

    cargando: "a carregar…",
    sinConfigurar: "Por configurar",
    usandoTuClave: "A usar a tua chave (…{sufijo})",

    modeloTitulo: "Modelo de IA para escrever",
    modeloActual: "Atual: {modelo}",
    modeloAyuda:
      "É com este modelo que se escrevem os artigos do blogue. Os económicos gastam menos crédito " +
      "(os «:free» nada); se algum der erro ao gerar, experimenta outro. A pontuação do radar de " +
      "temas usa sempre o modelo por omissão da plataforma (é 1 chamada por dia e precisa de " +
      "critério fino).",
    modeloOtro: "Outro…",
    modeloOtroEjemplo: "identificador de openrouter.ai/models, p. ex. deepseek/deepseek-chat:free",
    modeloGuardado: "Modelo guardado.",

    pegaClave: "Cola aqui a tua chave",
    guardar: "Guardar",
    probar: "Testar ligação",
    quitar: "Retirar",
    claveGuardada: "Chave guardada.",
    claveGuardadaYProbada: "Chave guardada. {detalle}",
    claveGuardadaPeroFallo: "Chave guardada, mas o teste falhou: {detalle}. Vê se a copiaste inteira.",
    claveQuitada: "Chave retirada. Sem chave, as funções de IA ficam desativadas.",

    openrouterTitulo: "OpenRouter (IA)",
    openrouterTexto: "Escreve os artigos do blogue e gera os modelos. Cria a tua chave em",
    serpapiTitulo: "SerpAPI (Google Trends)",
    serpapiTexto: "Alimenta o radar de temas em tendência do blogue. Tem plano gratuito; cria a tua chave em",
  },

  herramientas: {
    titulo: "Ferramentas do site",
    lead: "Favicon, imagem de partilha, Google Search Console e analítica de visitas.",
    texto:
      "Estas ferramentas são **de cada site**, não da conta: configuram-se dentro do projeto, no " +
      "menu «Ferramentas do site». Abre um dos {enlace} para as ajustares.",
    enlace: "teus sites",
  },

  equipo: {
    titulo: "Equipa",
    lead:
      "Quem pode trabalhar em {espacio}. O editor edita e publica; o proprietário gere também as " +
      "chaves, o endereço e a equipa.",
    tuEspacio: "o teu espaço",
    esteEspacio: "este espaço",

    correoEjemplo: "email@do-teu-socio.com",
    editor: "Editor",
    propietario: "Proprietário",
    enviando: "A enviar…",
    invitar: "Convidar",
    invitacionEnviada: "Convite enviado para {email}.",

    tu: " (tu)",
    cederTitulo: "Tornar esta pessoa proprietária e passares tu a editor",
    ceder: "Ceder a propriedade",
    quitar: "Retirar",
    soloOwner: "Só o proprietário do espaço pode convidar ou mudar papéis.",

    cederPregunta: "Ceder a propriedade a {nombre}?",
    cederCuerpo:
      "{nombre} passa a mandar em «{espacio}» e tu ficas como editor. Só essa pessoa a poderá " +
      "devolver-te.",
    cederEtiqueta: "Perdes o comando do espaço",
    cederAceptar: "Sim, ceder",
    cedido: "Agora {nombre} é o proprietário do espaço.",
  },

  plan: {
    titulo: "Plano e utilização",
    lead: "O que inclui o teu plano e quanto já usaste neste espaço.",
    cargando: "A carregar…",

    tuPlan: "O teu plano: {nombre}",
    gratisSiempre: "Grátis para sempre.",
    precios: "{mes} €/mês · {anual} €/ano (2 meses grátis)",
    porMes: "{n} €/mês",
    porAnual: "{n} €/ano",
    gratis: "0 €",

    estadoCancelada: "Cancelada",
    estadoPagoPendiente: "Pagamento pendente",
    estadoPrueba: "Em experiência",
    estadoActivo: "Ativo",

    cancelando:
      "Cancelaste a renovação. Continuas com o teu plano até {fecha} e não te será cobrado mais " +
      "nada. Depois passas ao plano Grátis. Se mudares de ideias, podes reativá-la em «Gerir " +
      "subscrição» antes dessa data.",
    teQuedan: "Faltam-te {dias}.",
    unDia: "{n} dia",
    variosDias: "{n} dias",
    pagoFallido:
      "Não conseguimos cobrar o teu último pagamento. O teu plano continua ativo enquanto " +
      "tentamos de novo; atualiza o cartão em «Gerir subscrição» para não o perderes.",
    seRenueva: "Renova-se sozinho a {fecha}.",

    websTitulo: "Sites",
    websTexto: "Publicados neste espaço.",
    websUso: "{usadas} de {total}",

    marcaTitulo: "Selo «Feito com a Estrénala»",
    marcaTexto:
      "Os teus sites publicados levam um selo discreto em baixo à direita. Desaparece ao melhorares de plano.",
    marcaVisible: "Visível",

    personasTitulo: "Pessoas no espaço",
    personasSi: "O teu plano permite convidar a tua equipa.",
    personasNo: "Convidar mais gente é do plano Agência.",

    comparativa: "Comparação de planos",
    columnaTuya: " ·  tu",
    filaWebs: "Sites",
    filaEditor: "Editor e histórico",
    filaZip: "Atualizar a partir de um ZIP",
    filaAsistente: "Assistente de IA (a tua chave)",
    filaDominio: "Domínio próprio",
    filaSinMarca: "Sem selo da Estrénala",
    filaBlog: "Blogue automático",
    filaEquipo: "Equipa e convites",

    sinPagos: "Os pagamentos não estão configurados neste servidor: os planos atribuem-se à mão.",
    soloOwner: "Só o proprietário do espaço pode mudar de plano.",
    abriendo: "A abrir…",
    gestionar: "Gerir subscrição",
    gestionarTexto: "Muda de plano, atualiza o cartão ou cancela. Abre na Stripe.",
    comoPagar: "Como queres pagar:",
    mesAMes: "Mês a mês",
    anual: "Anual (2 meses grátis)",
    pasarA: "Passar a {plan} · {precio}",
    pagoSeguro: "O pagamento faz-se numa página segura da Stripe. Podes cancelar quando quiseres.",
  },

  cuenta: {
    titulo: "A tua conta",
    lead: "O teu nome, a tua palavra-passe e o teu email de acesso.",

    nombre: "Nome",
    nombreTexto: "Como te chamamos na plataforma.",
    guardar: "Guardar",
    nombreGuardado: "Nome guardado.",

    idioma: "Idioma",
    idiomaTexto: "Aquele em que falamos contigo: o painel e os emails que te enviamos.",
    idiomaAutomatico: "Automático (o do teu navegador)",
    idiomaGuardado: "Idioma guardado.",

    password: "Palavra-passe",
    passwordConGoogle: "Entras com o Google. Podes também definir uma palavra-passe.",
    passwordTexto: "Muda a tua palavra-passe.",
    passwordActual: "Atual",
    passwordNueva: "Nova (mín. 8)",
    cambiar: "Mudar",
    passwordCambiada: "Palavra-passe alterada.",

    correo: "Email",
    correoTexto: "Agora: {email}. Enviamos-te uma ligação para o novo para o confirmares.",
    correoEjemplo: "novo@email.com",
    correoEnviado: "Enviámos um email para {email} para o confirmares.",
  },

  peligro: {
    titulo: "Zona de perigo",
    lead: "Ações que não se podem desfazer.",
    texto:
      "Ao eliminares a tua conta apagam-se os espaços de que és **único proprietário**, com todos os " +
      "seus sites, o seu histórico e o seu blogue. Dos espaços que partilhas com outras pessoas, " +
      "simplesmente sais. **Isto não se pode desfazer.**",
    boton: "Eliminar a minha conta…",
    escribe: "Para confirmar, escreve o teu email {email}:",
    borrando: "A apagar…",
    borrar: "Apagar a minha conta definitivamente",
    cancelar: "Cancelar",
  },

  errores: {
    conexion: "Erro de ligação",
    generico: "Alguma coisa correu mal",
    continuar: "Não foi possível continuar",
    borrarCuenta: "Não foi possível apagar a conta",
    probar: "Não foi possível testar a ligação",
  },
};
