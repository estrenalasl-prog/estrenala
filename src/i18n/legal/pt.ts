import type { TextosLegal } from "./tipos";

// Português europeu (Portugal), tratamento por «tu», como no resto da plataforma.

export const pt: TextosLegal = {
  banner: {
    aria: "Cookies",
    aviso:
      "Usamos cookies próprios, necessários para a plataforma funcionar, e cookies da Google para medir se os nossos anúncios servem de alguma coisa. Os segundos só se tu quiseres.",
    mas: "Podes mudar de ideias quando quiseres a partir da {enlace}.",
    enlace: "política de cookies",
    soloNecesarias: "Só os necessários",
    aceptarTodas: "Aceitar todos",
  },
  paginas: {
    avisoLegal: "Aviso legal",
    privacidad: "Privacidade",
    cookies: "Cookies",
    terminos: "Termos",
    actualizado: "Última atualização: {fecha}",
    cta: "Põe o teu site online, grátis",
    inicio: "Estrénala — início",
    principal: "Principal",
    soloEspanol:
      "Este documento está disponível apenas em espanhol. É o texto que rege a relação entre ti e nós.",
  },
  politicaCookies: {
    metaTitulo: "Política de cookies · Estrénala",
    metaDescripcion:
      "A Estrénala só usa cookies técnicos, os necessários para manteres a sessão iniciada. Sem analítica nem publicidade.",
    titulo: "Política de cookies",
    intro:
      "Na {marca} usamos **cookies técnicos**, os imprescindíveis para poderes iniciar sessão e trabalhar. A nossa analítica de visitas é **sem cookies**: não guarda nada no teu equipamento.",
    conAds:
      "Usamos também **cookies da Google** para medir se os nossos anúncios funcionam. Esses **só são ativados se os aceitares**: até lá carregam bloqueados e não guardam nada. É por isso que te mostramos o aviso na primeira vez que entras, e recusá-los custa exatamente o mesmo que aceitá-los.",
    sinAds:
      "**Não usamos cookies de analítica, publicidade nem seguimento**, nem próprios nem de terceiros. Por isso não te mostramos um banner de consentimento: a lei não o exige para os cookies estritamente necessários (art. 22.2 LSSI-CE).",
    cambiarDecision: "Mudar a minha decisão sobre os cookies",
    tablaTitulo: "Cookies que utilizamos",
    thNombre: "Nome",
    thPara: "Para que serve",
    thDuracion: "Duração",
    thTipo: "Tipo",
    tecnicaPropia: "Técnico próprio",
    sesionPara: "Manter a tua sessão iniciada em segurança (vai assinada criptograficamente)",
    sesionDuracion: "30 dias",
    espacioPara: "Lembrar em que espaço de trabalho estás, se pertences a vários",
    espacioDuracion: "Até 400 dias",
    googlePara:
      "Proteger-te contra ataques CSRF enquanto inicias sessão com a Google (só se usares essa opção)",
    googleDuracion: "10 minutos",
    httpOnly:
      "Todos são **HttpOnly** (não acessíveis a partir de JavaScript) e viajam apenas por ligações seguras em produção.",
    eliminarTitulo: "Como eliminá-los",
    eliminarTexto:
      "Podes terminar a sessão a partir da própria plataforma ou apagar os cookies nas definições do teu navegador. Tem em conta que, se os bloqueares, **não vais conseguir iniciar sessão**: são necessários para o serviço funcionar.",
    tusWebsTitulo: "Os sites que publicas",
    tusWebsTexto:
      "Esta política cobre a plataforma {sitio}. **Os sites que tu publicas são teus**: se adicionares ao teu site ferramentas de analítica ou outros serviços que usem cookies, és tu quem tem de informar os teus visitantes e obter o seu consentimento quando for caso disso.",
    contactoTitulo: "Contacto",
    contactoTexto: "Qualquer dúvida: {email}. Mais informação na nossa {privacidad}.",
  },
};
