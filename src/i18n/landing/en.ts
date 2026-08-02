import type { TextosLanding } from "./tipos";

// «Estrénala» no se traduce: es la marca. El juego de palabras del español
// —estrenar algo, sacarlo por primera vez— no existe fuera, así que en cada
// idioma la frase se reescribe entera en vez de calcarla.

export const en: TextosLanding = {
  meta: {
    titulo: "Estrénala — Your AI-built website, finally live",
    descripcion:
      "AI built you a website and you don't know how to put it online? Estrénala publishes it in one click with a domain and HTTPS, you edit it without code, and its blog writes itself. Free to start.",
  },

  nav: {
    inicio: "Estrénala — home",
    como: "How it works",
    editar: "Editing",
    blog: "Blog",
    equipos: "Teams",
    faq: "FAQ",
    cta: "Put your site online — free",
    abrirMenu: "Open menu",
    principal: "Main",
  },

  hero: {
    eyebrow: "AI built you a beautiful website…",
    titular: "…and it's been sitting dead in a folder for weeks.",
    promesa: "We put it [[out in the world]].",
    sub: "Drag in the site Claude, ChatGPT or v0 made you and it goes live with a domain and HTTPS. Edit it however you like. The blog writes itself. No coding needed.",
    cta: "Put your site online — free →",
    nota: "Free to start · no card",
    mockAria:
      "Estrénala project panel: the Bright Smile Clinic site published, with the steps Upload, Publish and Edit.",
    mockNombre: "Bright Smile Clinic",
    mockPublicado: "Published",
    mockEtiqueta: "live ✂",
    mockPaso1: "Upload",
    mockPaso2: "Publish",
    mockPaso3: "Edit",
  },

  problema: {
    eyebrow: "The moment you get stuck",
    titulo: "AI built your site in minutes. ~~Putting it online~~ takes you weeks.",
    texto:
      "You've got a ZIP with your website inside, or a pile of files you don't know what to do with. Words like «hosting», «DNS» and «server» start showing up… and the excitement drains away. The site you loved stays on your computer, where nobody sees it.",
    firma: "Estrénala starts exactly [[where the AI leaves you stranded]].",
  },

  como: {
    eyebrow: "How it works",
    titulo: "From a folder to the internet, in three steps",
    texto: "Nothing to install, no code to touch, no need to call the nephew who «knows about computers».",
    paso1Titulo: "Upload it",
    paso1Texto:
      "Drag in the file or folder the AI gave you. Claude, ChatGPT, v0 — doesn't matter: if it's an HTML site, it works.",
    paso1Chip: ".html · .zip · folder",
    paso2Titulo: "Publish it",
    paso2Texto: "One click and it's online with its own address and HTTPS. Got your own domain? Connect it and you're done.",
    paso2Chip: "subdomain or your own domain · HTTPS",
    paso3Titulo: "Edit it",
    paso3Texto: "Change text, images, buttons and colours whenever you want. With history, so you can go back without fear.",
    paso3Chip: "history and undo",
  },

  editar: {
    eyebrow: "Edit it your way · no lock-in",
    titulo: "Three ways to edit. You choose, not us.",
    texto: "Use one, another, or all three at once. Whichever way you go, it's always saved in the history.",
    via1Etq: "Free",
    via1Titulo: "By hand, right here",
    via1Texto:
      "Click on your actual website and change what you see: text (with bold, italics and links), images, buttons and colours.",
    via1Punto1: "No code, on the real site",
    via1Punto2: "History and undo, always",
    via1Punto3: "Free, no limits",
    via2Etq: "With your own AI key · opt-in",
    via2Titulo: "With the AI assistant",
    via2Texto:
      "Tell it in your own words what to change («make the headline shorter», «put the phone number in the header») and it does it for you.",
    via2Punto1: "You connect your own AI key",
    via2Punto2: "You decide when you spend",
    via2Punto3: "A powerful option, never compulsory",
    via3Etq: "Stay in your own tool",
    via3Titulo: "In your own tool",
    via3Texto:
      "Prefer to stay in Claude Code, ChatGPT or v0? Edit there and upload the ZIP again: your live site updates in one click.",
    via3Punto1: "Re-upload the ZIP and that's it",
    via3Punto2: "The previous version is kept",
    via3Punto3: "We never lock you in here",
    bandaBadge: "History",
    bandaTexto: "However you edit, **you can always go back**. If something breaks, you restore it in one click.",
  },

  blog: {
    eyebrow: "The blog that writes itself",
    titulo: "Show up on Google without having to write",
    texto:
      "A blog with fresh content brings you visitors. Ours takes care of it: it finds the topics, writes them and publishes them.",
    f1Titulo: "Trending topic radar",
    f1Texto: "It spots what people in your field are searching for this month, with real search data.",
    f2Titulo: "Written in stages",
    f2Texto: "The AI writes the article step by step and you review it whenever you like, not all at once.",
    f3Titulo: "Automatic cover image",
    f3Texto: "Every article comes out with its own cover image, without you having to go looking for one.",
    f4Titulo: "Scheduling and autopilot",
    f4Texto: "Publish on the date you choose, or leave the autopilot on and one goes out every week.",
    aviso:
      "The blog comes with the paid plans, and writes using your own AI key · opt-in: you decide when you spend. Publishing and editing by hand is free.",
    panelAria:
      "Blog panel: one published article, one AI-written draft, one scheduled, and autopilot switched on.",
    art1Titulo: "5 signs it's time for a check-up",
    art1Pie: "Published 3 July",
    art1Badge: "Published",
    art2Titulo: "Whitening: myths and facts",
    art2Pie: "Written in stages · 2 of 4",
    art2Badge: "AI draft",
    art3Titulo: "Looking after your braces in summer",
    art3Pie: "Goes out 20 Jul",
    art3Badge: "Scheduled",
    pilotoTitulo: "Autopilot",
    pilotoPie: "A new article every week",
    pilotoActivado: "On",
  },

  equipo: {
    eyebrow: "Working with other people?",
    titulo: "Your team, all in one place",
    texto:
      "Whether it's just you or an agency with several clients, each site lives in its own space and you work without getting in each other's way.",
    punto1: "Sign in with your email or with Google",
    punto2: "Invite more people into your space",
    punto3: "Clear roles: owner and editor",
    roles: "Owner · Editor",
  },

  publico: {
    eyebrow: "Who it's for",
    titulo: "Built for people who don't want to fight with the technical side",
    c1Titulo: "Founders",
    c1Texto: "Launch your project without depending on anyone or waiting weeks for a developer.",
    c2Titulo: "Small agencies",
    c2Texto: "Publish and maintain your clients' sites in one place, with your team inside.",
    c3Titulo: "Non-technical people",
    c3Texto: "If you can use email, you can use Estrénala. No code, no servers.",
  },

  faq: {
    eyebrow: "Frequently asked questions",
    titulo: "What people usually want to know",
    preguntas: [
      {
        p: "Do I need to know how to code?",
        r: "No. You upload your site, publish it and edit it by clicking on it. If you can use email or WhatsApp, you can use Estrénala.",
      },
      {
        p: "Will the site ChatGPT, Claude or v0 made me work?",
        r: "Yes. If it's an HTML site — which is what these tools produce — you upload it as it is (one file, a ZIP or the whole folder) and it goes live.",
      },
      {
        p: "Can I use my own domain?",
        r: "Yes. You can start with a free address at **yourname.estrenala.com** and connect your own domain whenever you want (e.g. **yourbusiness.com**). All with HTTPS.",
      },
      {
        p: "How much does the AI part cost?",
        r: "Editing **by hand is free**. The AI (the editing assistant and the blog) runs on **your own key** and is opt-in: you connect it if you want to and **you decide when you spend**. We don't sell «unlimited free AI»: you pay your real usage to your own provider.",
      },
      {
        p: "What if I'd rather keep editing in my AI tool?",
        r: "Perfect. Stay in Claude Code, ChatGPT or v0 and, when you're done, upload the ZIP again: your live site updates in one click and the previous version stays in the history. We don't lock you in here.",
      },
      {
        p: "Can I go back if I break something?",
        r: "Always. Every change is kept in the history and you can restore an earlier version in one click. Editing without fear is part of the deal.",
      },
      {
        p: "Can I work as a team?",
        r: "Yes. You sign in with your email or with Google and invite more people into your space with roles (owner or editor). Ideal for agencies with several clients.",
      },
    ],
  },

  ctaFinal: {
    titulo: "Your site is ready. [[Put it out there]].",
    texto: "Upload it now — seeing it live on the internet will take you less time than reading this did.",
    cta: "Put your site online — free →",
    nota: "Free to start · no card · no coding",
  },

  pie: {
    lema: "Where your AI-built website finally goes out into the world.",
    colProducto: "Product",
    editarSinCodigo: "Editing without code",
    blogAutomatico: "Automatic blog",
    colEmpezar: "Get started",
    subeTuWeb: "Put your site online",
    entrar: "Sign in",
    preguntasFrecuentes: "Frequently asked questions",
    colLegal: "Legal",
    avisoLegal: "Legal notice",
    privacidad: "Privacy",
    cookies: "Cookies",
    terminos: "Terms",
    hechoEn: "Made in Spain · Your AI-built website, finally live.",
    idioma: "Language",
  },
};
