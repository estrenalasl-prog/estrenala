import { describe, it, expect } from "vitest";
import { preguntasDelMarkdown, fichaDePreguntas, textoPlano } from "@/src/blog/preguntas";

const CUERPO = `# Kling AI

Un párrafo de introducción con lo suyo dentro para que tenga cuerpo.

## Qué es

Kling AI genera vídeo a partir de texto. Lo hizo Kuaishou.

## Preguntas frecuentes

### ¿Cuánto cuesta empezar?

Hay un plan gratuito con marca de agua. El de pago arranca en diez euros al mes.

### ¿Necesito saber editar vídeo?

No hace falta. Describes la escena en texto y el modelo se encarga del resto.

### ¿En qué idiomas funciona?

Acepta descripciones en español y en inglés, aunque va algo mejor en inglés.

## Conclusión

Merece la pena probarlo antes de contratar nada.
`;

describe("encontrar las preguntas de un artículo", () => {
  it("saca las tres, con su respuesta", () => {
    const p = preguntasDelMarkdown(CUERPO);
    expect(p.map((x) => x.pregunta)).toEqual([
      "¿Cuánto cuesta empezar?",
      "¿Necesito saber editar vídeo?",
      "¿En qué idiomas funciona?",
    ]);
    expect(p[0].respuesta).toBe("Hay un plan gratuito con marca de agua. El de pago arranca en diez euros al mes.");
  });

  /**
   * LA REGLA del módulo: se reconoce por la ESTRUCTURA, nunca buscando la
   * palabra «FAQ». Ramificar sobre cómo está escrito un texto se rompe en
   * silencio en cuanto cambia de idioma o el modelo titula la sección de otra
   * forma. Aquí la señal es el «?» y que haya varias seguidas.
   */
  it("da igual cómo se titule la sección, o que no se titule", () => {
    const sinTitulo = CUERPO.replace("## Preguntas frecuentes\n\n", "");
    expect(preguntasDelMarkdown(sinTitulo)).toHaveLength(3);

    const enIngles = CUERPO
      .replace("## Preguntas frecuentes", "## Frequently asked questions")
      .replace("¿Cuánto cuesta empezar?", "How much does it cost?")
      .replace("¿Necesito saber editar vídeo?", "Do I need editing skills?");
    expect(preguntasDelMarkdown(enIngles).map((p) => p.pregunta)).toContain("How much does it cost?");
  });

  /**
   * «¿Qué es Kling AI?» como título de apartado es la forma normal de escribir un
   * artículo, no un FAQ. Marcarla sería decirle a Google y a los asistentes que
   * el artículo entero es una lista de preguntas frecuentes. Hacen falta dos
   * seguidas al mismo nivel, que es lo único que solo pasa cuando hay un bloque
   * de preguntas de verdad.
   */
  it("una pregunta suelta como título de apartado NO es un FAQ", () => {
    const md = `# A\n\n## ¿Qué es Kling AI?\n\nEs una herramienta que genera vídeo desde texto.\n\n## Precios\n\nDiez euros al mes en el plan básico de la casa.\n`;
    expect(preguntasDelMarkdown(md)).toEqual([]);
  });

  it("se queda con la tira más larga si hay preguntas sueltas por ahí", () => {
    const md = `# A\n\n## ¿Retórica suelta?\n\nUn párrafo cualquiera que responde a la pregunta de arriba.\n\n## Otro apartado\n\nTexto normal del artículo que no pregunta nada de nada.\n\n### ¿Una?\n\nLa respuesta a la primera pregunta de la tira buena.\n\n### ¿Dos?\n\nLa respuesta a la segunda pregunta de la tira buena.\n`;
    expect(preguntasDelMarkdown(md).map((p) => p.pregunta)).toEqual(["¿Una?", "¿Dos?"]);
  });

  it("preguntas a distinto nivel no son la misma tira", () => {
    const md = `# A\n\n## ¿Una?\n\nRespuesta suficientemente larga para contar como tal.\n\n### ¿Dos?\n\nOtra respuesta suficientemente larga para contar como tal.\n`;
    expect(preguntasDelMarkdown(md)).toEqual([]);
  });

  it("una pregunta sin respuesta debajo no cuenta", () => {
    const md = `# A\n\n### ¿Una?\n\n### ¿Dos?\n\nEsta sí tiene una respuesta de largo razonable.\n\n### ¿Tres?\n\nY esta también tiene su respuesta bien puesta.\n`;
    expect(preguntasDelMarkdown(md).map((p) => p.pregunta)).toEqual(["¿Dos?", "¿Tres?"]);
  });

  /**
   * Dentro de unas comillas triples, `# algo` es un comentario de shell. Tomarlo
   * por encabezado partiría el artículo por la mitad y la respuesta anterior se
   * quedaría cortada.
   */
  it("lo que hay dentro de un bloque de código no son encabezados", () => {
    const md = "# A\n\n### ¿Cómo se instala?\n\nCon una sola línea en la terminal, sin configurar nada más:\n\n```bash\n# instala el paquete\nnpm i kling\n```\n\n### ¿Y después?\n\nSe arranca con `npm start` y ya está funcionando.\n";
    const p = preguntasDelMarkdown(md);
    expect(p.map((x) => x.pregunta)).toEqual(["¿Cómo se instala?", "¿Y después?"]);
    // Ni el comentario del bloque sube a la respuesta, ni ese `#` ha partido el
    // artículo tomándose por un encabezado de nivel 1.
    expect(p[0].respuesta).toBe("Con una sola línea en la terminal, sin configurar nada más:");
  });

  it("no marca más de diez aunque haya veinte", () => {
    const md = "# A\n\n" + Array.from({ length: 20 }, (_, i) =>
      `### ¿Pregunta número ${i}?\n\nUna respuesta con la longitud suficiente para el número ${i}.\n`
    ).join("\n");
    expect(preguntasDelMarkdown(md)).toHaveLength(10);
  });

  it("un artículo sin preguntas no da nada", () => {
    expect(preguntasDelMarkdown("# A\n\n## Uno\n\nTexto.\n\n## Dos\n\nMás texto.\n")).toEqual([]);
  });
});

describe("el texto de la respuesta", () => {
  it("se queda con el texto de los enlaces y tira la dirección", () => {
    expect(textoPlano("Mira [la documentación](https://ejemplo.com/docs) para más.")).toBe(
      "Mira la documentación para más."
    );
  });

  it("quita negritas, cursivas, viñetas, citas e imágenes", () => {
    expect(textoPlano("- **Uno** y *dos*\n- `tres`\n\n> Una cita\n\n![foto](/a.jpg)")).toBe(
      "Uno y dos tres Una cita"
    );
  });

  it("las respuestas muy largas se recortan por palabra", () => {
    const largo = "palabra ".repeat(400);
    const md = `# A\n\n### ¿Una?\n\n${largo}\n\n### ¿Dos?\n\nUna respuesta corta y normal.\n`;
    const r = preguntasDelMarkdown(md)[0].respuesta;
    expect(r.length).toBeLessThanOrEqual(1001);
    expect(r.endsWith("…")).toBe(true);
    expect(r).not.toContain("palabr…"); // corta entre palabras, no a mitad
  });
});

describe("la ficha FAQPage", () => {
  it("monta el nodo de Schema.org", () => {
    const ficha = fichaDePreguntas(preguntasDelMarkdown(CUERPO))!;
    expect(ficha["@type"]).toBe("FAQPage");
    const primera = (ficha.mainEntity as Record<string, unknown>[])[0];
    expect(primera).toMatchObject({ "@type": "Question", name: "¿Cuánto cuesta empezar?" });
    expect((primera.acceptedAnswer as Record<string, unknown>)["@type"]).toBe("Answer");
  });

  it("sin preguntas no hay ficha", () => {
    expect(fichaDePreguntas([])).toBeNull();
  });
});
