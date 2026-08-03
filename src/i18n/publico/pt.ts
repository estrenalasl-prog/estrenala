import type { TextosPublico } from "./tipos";

// Português europeu (Portugal), não do Brasil — o mesmo critério de toda a
// plataforma. Tratamento por «tu», como no original espanhol. «Estrénala» não
// se traduz: é a marca.

export const pt: TextosPublico = {
  marca: {
    texto: "Feito com Estrénala",
    aria: "Feito com Estrénala: publica o teu site feito com IA",
  },
  pagina404: {
    noPublicada: "Este site não está publicado",
    noEncontrado: "Não encontrado",
    lead: "Se este endereço é teu, entra na Estrénala para o publicares ou veres o que tem.",
    boton: "Entrar na Estrénala",
    promoTitulo: "Tens um site feito com IA e não sabes como o pôr online?",
    promoTexto:
      "A Estrénala põe-no online num clique, editas clicando em cima dele, sem código, e o blogue escreve-se sozinho.",
    pie: "Estrénala · O teu site feito com IA, finalmente no ar.",
  },
};
