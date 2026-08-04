# Lo que el examen encontró en la web de Quantiva

**Nota: 93/100** · 27 de 27 páginas · examinado el 3 de agosto de 2026.

Esto lo sacó el examen de SEO de Estrénala pasado sobre el HTML guardado de
`quantiva-comodin`. No es una opinión: cada punto dice en qué páginas está.

La nota ya es alta —la web está bien hecha— y **no hay ni un fallo grave**. Todo
lo de aquí es «mejorable». Están ordenados por lo que arregla cada uno dividido
por lo que cuesta, así que si solo haces el primero ya has hecho lo más rentable.

---

## 0. Lo que más te cuesta de todo · las imágenes

Esto se midió después de escribir el resto, y **es lo más caro de la lista**, más
que los títulos y los encabezados juntos.

```
index.html        →  3,6 MB
blog/index.html   →  5,3 MB
```

Ocho imágenes pasan de medio mega, y cinco pasan de mega y medio:

```
5ccd4f92-654e-49b4-8ed4-ad4cf86f9e86.jpg   1,6 MB
431f9f9a-3f42-4718-b603-cb48ea243403.jpg   1,6 MB
flor.jpg                                   1,6 MB
47a064cf-9890-4b28-9cc8-9bd8c66f6b44.jpg   1,5 MB
e8477fab-4abb-447d-a6d0-3400378588a7.jpg   1,4 MB
```

En un móvil con 4G normal, 3,6 MB son varios segundos mirando una pantalla en
blanco. Y no lo ves nunca desde tu ordenador con fibra.

**Arreglo:** guardarlas como **WebP** con calidad 80. Una foto así suele quedarse
en la quinta parte —de 1,6 MB a unos 300 KB— y **se ve igual**. Con Squoosh
(squoosh.app, gratis y sin subir nada a ningún sitio) o con cualquier conversor.

Y de paso, ponles el `width` y el `height` (punto 6): las mismas fotos salen en
los dos avisos.

**Por qué importa más que el resto:** es lo único de esta lista que Google mide
directamente con el cronómetro del visitante, y lo único que le duele a tu
cliente aunque Google no existiera. Quien entra desde el móvil y espera cuatro
segundos, se va.

---

## 1. Un arreglo que vale por 23 páginas · el pie de página

**23 de 27 páginas** avisan de que los apartados se saltan niveles. Las 23 por lo
mismo, y es un solo sitio: **el pie**.

```
h2  "No te pierdas ni una idea"
    h4  "Menú"                    <- salta de h2 a h4
    h4  "Contactos"
    h4  "Redes Sociales"
    h4  "Políticas y Legalidades"
```

Los cuatro títulos del pie son `<h4>` y encima de ellos hay un `<h2>`, así que se
salta el `<h3>`. En la portada no salta porque justo antes hay un `h3`; en las
otras 23 no lo hay.

**Arreglo:** en la plantilla del pie, cambiar esos cuatro `<h4>` por `<h3>`
(y `</h4>` por `</h3>`). Es un cambio en un archivo. Visualmente no cambia nada
si el tamaño lo pone el CSS por clase; si lo pone por etiqueta, hay que copiar
el tamaño del `h4` a esa clase.

**Por qué importa:** los encabezados son el índice con el que Google entiende de
qué va cada trozo de la página. Un salto lo rompe. Es también lo que usa un lector
de pantalla para navegar.

---

## 2. Los títulos se cortan en Google · 21 páginas

Google recorta alrededor de los 60 caracteres. Estos pasan de largo:

```
Agencia de Inteligencia Artificial en Fuengirola | Quantiva Core          (64)
Conoce a los Agentes IA de Previsión GAUTH: Innovación en Modelos…       (134)
Así es como la IA está transformando los hoteles en la Costa del Sol…    (117)
Tu Primera Automatización para Redes Sociales: Crea un Mes de…          (114)
```

Son la portada, el índice del blog y 19 artículos. El patrón es siempre
`Título del artículo | Quantiva Technology`.

(`contacto.html` se salva por los pelos: 60 justos.)

**Arreglo, por orden de rentabilidad:**

1. **Acorta el sufijo**: ` | Quantiva Technology` son **22 de los 60** que hay.
   Con ` | Quantiva` recuperas 11 caracteres en las 21 páginas de golpe. A la
   portada, que se pasa por 4, eso solo ya la arregla.
2. En los artículos largos, corta el titular para el `<title>` y deja el largo
   dentro, en el `<h1>`. No tienen por qué ser el mismo texto: el `<title>` es
   el anuncio en Google, el `<h1>` es el titular de la página.

**Ojo con esto de cara al futuro:** los artículos los escribe el generador del
blog, así que si no se acorta ahí, cada artículo nuevo nacerá con el mismo aviso.

---

## 3. Las descripciones se cortan · 3 páginas

Google recorta a los 160 caracteres. Pasan de largo:

- `index.html` — 184 caracteres
- `contacto.html` — 195
- `proyectos.html` — 165

Los 19 artículos del blog están todos en 155, así que ahí el generador lo hace
bien: el problema es solo de las tres páginas escritas a mano.

**Arreglo:** dejarlas por debajo de 160 poniendo lo importante al principio. Las
tres dicen lo mismo dos veces («agencia de inteligencia artificial y
automatizaciones»), así que sobra sitio de donde recortar. La de `contacto.html`
mete el teléfono y el correo dentro de la descripción: eso no hace falta, ya va
en la ficha para buscadores.

---

## 4. Dos titulares en el mismo artículo · 1 página

`blog/n8n-claude-code-automatizacion.html` tiene dos `<h1>` casi iguales:

```
n8n y Claude Code: Tu Guía Definitiva para Dominar la Automatización
Domina la Automatización con n8n y Claude Code: Tu Guía Definitiva
```

Parece un artículo que salió con el titular duplicado. **Arreglo:** dejar uno
como `<h1>` y el otro bajarlo a `<h2>`, o quitarlo.

---

## 5. Enlaces que no dicen a dónde llevan · 6 artículos

Textos encontrados: `aquí`, `ver más`, `[ver más]`.

```
blog/como-cambiara-trabajo-agentes-ia.html                    (2)
blog/como-difiere-agentic-ai-automatizacion-tradicional.html
blog/descifrando-ngrok-forecaster-ai-agent.html
blog/descubra-langflow-herramienta-ia.html
blog/google-science-experiments-legado-futuro.html
blog/kling-ai-generacion-de-videos.html
```

**Arreglo:** cambiar el texto del enlace por lo que hay al otro lado. En vez de
«puedes verlo aquí», «puedes ver **la documentación de Langflow**». El texto de
un enlace es de lo poco que Google usa para entender la página que enlazas, y es
lo único que oye quien navega con lector de pantalla.

`[ver más]` con corchetes tiene pinta de plantilla que se quedó a medias — merece
una mirada aparte.

---

## 6. Imágenes sin medidas · 8 páginas, 12 imágenes

Sin `width` y `height`, el navegador no sabe cuánto hueco reservar y la página
pega saltos mientras carga. Google lo mide (se llama CLS) y cuenta para el puesto.

```
index.html (2) · blog/index.html (2) · blog/flor.html (3)
blog/como-cambiara-trabajo-agentes-ia.html · blog/google-agent-development-kit-exploring.html
blog/google-gemini-ai-foto-prompt-trending.html · blog/mathway-asistente-digital-matematicas.html
blog/n8n-claude-code-automatizacion.html
```

**Arreglo:** poner `width` y `height` con las medidas reales del archivo. No hace
falta que sean las que se ven en pantalla: sirven para la proporción, y el CSS
sigue mandando en el tamaño final.

Es el de menos prioridad de la lista: 3 puntos de peso y molesta más al visitante
que a Google.

---

## Lo que NO tienes que arreglar

**«Sin imagen al compartir» en las 3 páginas legales** (`aviso-legal.html`,
`politica-de-cookies.html`, `politica-de-privacidad.html`).

Lo pone Estrénala sola al servir: coge la primera imagen de la propia página y la
declara como `og:image`. Si lo arreglas en el HTML, mejor —manda el tuyo—, pero
no es necesario.

**La ficha para buscadores.** La portada ya trae la suya, y Estrénala respeta la
del cliente sin tocarla: dos fichas que se contradicen son peores que una.

---

## Cómo volver a pasarlo

Sube la web arreglada y abre su pantalla en Estrénala. Arriba del todo, la sección
**«Cómo te ve Google»**. La nota se recalcula sola con cada publicación o edición.

Cuenta hecha: con el **0** (las imágenes) y el **1** (el pie) ya recuperas la
mayor parte. Del 2 al 5 son detalles de escritura, y el 6 sale gratis si haces
el 0, porque son las mismas fotos.
