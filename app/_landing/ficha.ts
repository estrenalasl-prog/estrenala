import { sinFormato } from "@/src/i18n/formato";
import { textosLanding } from "@/src/i18n/landing";
import { urlPlataforma } from "@/src/config/sitio";
import { rutaDeIdioma, type Idioma } from "@/src/i18n/idiomas";

/**
 * La ficha para buscadores de NUESTRA propia landing.
 *
 * Existe porque nuestro propio examen nos suspendió: vendemos «la ficha que le
 * dice a Google y a ChatGPT qué eres» y la landing no traía ninguna. Predicar y
 * no dar trigo, y encima en la única página que nos tiene que vender.
 *
 * Va aquí y no por el camino de `seo/ficha.ts` porque aquello es para las webs
 * de los clientes —deduce los datos leyendo su HTML porque no hay otra forma—.
 * De nosotros sabemos quiénes somos: no hay nada que deducir.
 *
 * El `FAQPage` sale de las MISMAS preguntas que se pintan en la página. No es un
 * detalle: marcar preguntas que no están visibles es justo lo que Google llama
 * marcado engañoso. Al salir del mismo catálogo no se pueden separar aunque
 * alguien reescriba una.
 */
export function fichaLanding(idioma: Idioma): string {
  const t = textosLanding(idioma);
  const base = urlPlataforma();
  const url = base + rutaDeIdioma(idioma);
  const idOrg = `${base}/#organizacion`;
  const idWeb = `${base}/#web`;

  const ficha = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": idOrg,
        name: "Estrénala",
        url: `${base}/`,
        logo: `${base}/brand/logo-tinta.png`,
        // Quién hay detrás. Va explícito porque es verdad y porque un negocio
        // sin dueño visible es exactamente lo que desconfía quien va a pagar.
        parentOrganization: { "@type": "Organization", name: "Quantiva Technology" },
      },
      {
        "@type": "WebSite",
        "@id": idWeb,
        url: `${base}/`,
        name: "Estrénala",
        description: t.meta.descripcion,
        inLanguage: idioma,
        publisher: { "@id": idOrg },
      },
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: t.meta.titulo,
        description: t.meta.descripcion,
        inLanguage: idioma,
        isPartOf: { "@id": idWeb },
      },
      {
        // Google ya no enseña las listas desplegables de preguntas —las retiró
        // el 7 de mayo de 2026—, así que esto no cambia nada en Google. Está
        // por lo mismo que se lo ponemos a los artículos del blog: es lo que
        // leen ChatGPT y Perplexity al rastrear, y estas ocho respuestas son
        // exactamente lo que queremos que citen cuando alguien pregunte cómo
        // publicar una web hecha con IA.
        "@type": "FAQPage",
        "@id": `${url}#preguntas`,
        inLanguage: idioma,
        mainEntity: t.faq.preguntas.map((q) => ({
          "@type": "Question",
          // Sin las marcas de formato (**negrita**, [[resaltado]]): en la
          // página se ven como estilo, no como asteriscos.
          name: sinFormato(q.p),
          acceptedAnswer: { "@type": "Answer", text: sinFormato(q.r) },
        })),
      },
    ],
  };

  // `<` escapado SIEMPRE: si un texto trajera `</script>` cerraría la etiqueta a
  // mitad y el resto del JSON se pintaría como texto en la página.
  return JSON.stringify(ficha).replace(/</g, "\\u003c");
}
