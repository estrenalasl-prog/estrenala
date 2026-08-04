# Informe para el equipo de Estrénala — Enrutado de webs publicadas

> **De:** CTO de Quantiva Technology (revisión técnica externa)
> **Fecha:** 2026-07-30
> **Proyecto afectado:** Estrénala (repo `Wordclicks`)
> **Naturaleza:** informe de un hallazgo. **No se ha modificado nada del código de Estrénala.**
> Este documento es para que lo evaluéis vosotros y decidáis.

---

## TL;DR

El servidor que sirve las webs publicadas (`src/publish/resolve-site.ts`) **no resuelve rutas de carpeta ni URLs sin extensión**. Solo encuentra el fichero si la ruta coincide *exactamente* con un fichero guardado.

Consecuencia: cualquier web que enlace a `/blog/` (una carpeta) o a URLs limpias sin `.html` (`/contacto`, `/blog/mi-articulo`) **devuelve un 404**, aunque los ficheros (`blog/index.html`, `contacto.html`) estén subidos y correctos.

- **Severidad:** alta. Rompe webs perfectamente válidas y bloquea publicaciones reales.
- **Alcance:** cualquier usuario, no un caso aislado. Las webs con carpetas o *clean URLs* son lo más habitual.
- **Arreglo:** ~8 líneas en un único fichero. Beneficia a todas las webs de golpe.

---

## Cómo se ha descubierto

Preparando la publicación de la web de **Quantiva Technology** (un sitio estático HTML/CSS/JS) a través de Estrénala. Al revisar cómo la plataforma serviría sus rutas, apareció el problema. La web de Quantiva está bien construida y se sirve perfecta en un servidor estático normal; el 404 lo produce el enrutado de Estrénala.

---

## El problema, con el código

Fichero: **`src/publish/resolve-site.ts`**, función `resolvePublicSite` (líneas ~112-113 en la revisión del 2026-07-30):

```ts
const rel = input.pathSegments.length > 0 ? input.pathSegments.join("/") : site.entryPath;
const file = await deps.storage.get(site.storagePrefix + rel);
// ...
if (!file) return pagina404("No encontrado", marca);
```

La resolución es literal:

| Petición | `rel` que se busca | Fichero real | Resultado |
|---|---|---|---|
| `/` | `entryPath` (p. ej. `index.html`) | `index.html` | ✅ 200 |
| `/contacto.html` | `contacto.html` | `contacto.html` | ✅ 200 |
| `/assets/app.css` | `assets/app.css` | `assets/app.css` | ✅ 200 |
| **`/blog/`** | **`blog`** | `blog/index.html` | ❌ **404** |
| **`/blog`** | **`blog`** | `blog/index.html` | ❌ **404** |
| **`/contacto`** (sin `.html`) | **`contacto`** | `contacto.html` | ❌ **404** |
| **`/contacto/`** (canónica con barra) | **`contacto`** | `contacto.html` | ❌ **404** |
| **`/blog/mi-articulo`** (URL limpia) | **`blog/mi-articulo`** | `blog/mi-articulo.html` | ❌ **404** |

Falta la resolución que hace cualquier servidor estático (Vercel, Netlify, Nginx `try_files`, `python -m http.server`…): **"carpeta → index.html"** y, opcionalmente, **"URL limpia → .html"**.

---

## Evidencia de cómo se guardan y sirven los ficheros

1. **Los ficheros se guardan con su ruta relativa tal cual**, incluidas las de subcarpeta.
   `src/import/import-project.ts` → `crearProyecto`:
   ```ts
   for (const f of input.files) {
     await deps.storage.put(prefix + f.path, f.bytes, contentTypeFor(f.path));
   }
   ```
   Es decir, un ZIP con `blog/index.html` se guarda como `…/blog/index.html`. El fichero **existe**; simplemente nadie lo busca cuando la URL es `/blog/`.

2. **`entryPath` solo se usa para la raíz `/`.** `src/import/entry.ts` → `detectarEntrada` elige el `index.html` más superficial como entrada. No hay equivalente "índice de carpeta" para subrutas.

3. **El propio blog de Estrénala esquiva el problema** porque genera los enlaces **con `.html`**:
   - `src/tests/blog-index.test.ts`: `<a href="/blog/{{slug}}.html">` y comprueba `href="/blog/post-a.html"`.
   - `src/tests/blog-apply.test.ts`: guarda `blog/index.html`, `blog/<slug>.html` y el `sitemap.xml` con URLs `…/blog/<slug>.html`.

   Esto significa que el contenido **generado por la plataforma** no dispara el bug — pero cualquier web **subida por el usuario** que use carpetas o URLs limpias, sí. Es un punto ciego: los tests verdes no lo cubren porque su propio contenido usa `.html`.

---

## Caso real: la web de Quantiva (por qué es un bloqueante, no una teoría)

La web de Quantiva depende de las dos cosas que hoy fallan:

- **Navegación y breadcrumbs** apuntan a `/blog/` (carpeta):
  `<a href="/blog/">Blog</a>` → hoy **404**.
- **El índice del blog enlaza los 18 artículos con URL limpia, sin `.html`**:
  `<a href="/blog/google-science-experiments-legado-futuro">` → hoy **404**.
- **Los `canonical` de cada artículo** son sin extensión:
  `https://quantivatechnology.com/blog/agentes-ia-prevision-realidad`.
- Las páginas principales tienen `canonical` con barra final: `/contacto/`, `/proyectos/`.

Resultado con Estrénala tal cual: la home carga, pero **el blog entero (índice + 18 artículos) devuelve 404**, y las URLs canónicas no resuelven. Inpublicable sin el arreglo en plataforma.

> Nota: la web de Quantiva **no se va a parchear** para esquivarlo. El objetivo es que la plataforma sirva bien cualquier web estática, para que un usuario normal suba su ZIP y funcione sin trucos.

---

## Causa raíz

`resolvePublicSite` traduce la URL a una clave de almacenamiento 1:1 y no contempla:
- que una carpeta debe servir su `index.html`;
- que una URL sin extensión puede corresponder a `<ruta>.html`.

---

## Propuesta de arreglo (para que la evaluéis)

Un fallback de servidor estático en `resolve-site.ts`, justo tras el `get` exacto. Sustituir:

```ts
const rel = input.pathSegments.length > 0 ? input.pathSegments.join("/") : site.entryPath;
const file = await deps.storage.get(site.storagePrefix + rel);
```

por:

```ts
let rel = input.pathSegments.length > 0 ? input.pathSegments.join("/") : site.entryPath;
let file = await deps.storage.get(site.storagePrefix + rel);

// Fallback tipo servidor estático: si no hay fichero exacto y la ruta no apunta a
// un recurso con extensión, probar "carpeta → index.html" y luego "clean URL → .html".
// Los segmentos ya pasaron el guard de traversal de arriba; estos sufijos son fijos.
if (!file && input.pathSegments.length > 0 && !/\.[a-z0-9]+$/i.test(rel)) {
  const base = rel.replace(/\/+$/, "");
  for (const candidato of [`${base}/index.html`, `${base}.html`]) {
    const alt = await deps.storage.get(site.storagePrefix + candidato);
    if (alt) { file = alt; rel = candidato; break; }
  }
}
```

**Detalles a tener en cuenta:**

- `rel` pasa a `let` **a propósito**: al reasignarlo al fichero resuelto, la lógica de más abajo sigue funcionando bien — el chequeo `esHtml` (`/\.html?$/i.test(rel)`), la inserción de la insignia del plan gratuito (`conMarca`) y el reapuntado de canónicos operan sobre la ruta real servida (`blog/index.html`), no sobre `blog`.
- **No rompe el guard de traversal** (líneas ~90-92): los `pathSegments` ya se validaron individualmente antes; los sufijos `/index.html` y `.html` son constantes del servidor, no entrada del usuario.
- **No interfiere con el sitemap de emergencia** (línea ~117, `rel === "sitemap.xml"`): al llevar extensión `.xml`, la condición `!/\.[a-z0-9]+$/` es falsa y el fallback ni se ejecuta.
- **Prioridad "carpeta antes que página":** si existieran a la vez `blog.html` y `blog/index.html`, gana `blog/index.html`. Es la convención habitual; decidid si os encaja.
- **Coste:** una lectura de storage extra solo cuando el fichero exacto no existe (camino de error/redirección, no el habitual). Para URLs limpias de artículo se hace un `get` de más al probar primero `…/index.html`. Es asumible; si molesta, se puede afinar el orden.

### Decisión abierta: ¿301 a la barra final?

Los hosts serios redirigen `/blog` → `/blog/` (301) antes de servir el `index.html`, para que los **enlaces relativos** dentro de esa página resuelvan bien (`href="foto.html"` cuelga de `/blog/`, no de `/`).

- El contenido que genera Estrénala usa rutas **absolutas** (`/blog/...`), así que a vosotros no os afecta.
- La web de Quantiva también usa rutas absolutas → **no necesita el 301**.
- Pero una web de cliente con enlaces relativos sí lo agradecería.

Recomendación: empezar con el fallback simple (servir directo, sin redirección) y añadir el 301 solo si aparece un caso real con enlaces relativos. Vuestra decisión.

---

## Recomendación de test

Ahora mismo **no hay ningún test para el serving público** (`resolvePublicSite`); los tests existentes cubren import, blog, host y storage, pero no esta función. Sería el primero. Con vitest y un `StorageAdapter`/`ProjectStore` de prueba (como en `src/tests/blog-apply.test.ts`), cubrir:

- `/blog/` y `/blog` → sirven `blog/index.html` con `200` y `content-type` HTML.
- `/blog/mi-articulo` (sin `.html`) → sirve `blog/mi-articulo.html`.
- `/contacto/` y `/contacto` → sirven `contacto.html`.
- Un HTML servido por el fallback **sigue recibiendo** la insignia del plan gratuito (regresión de `conMarca`).
- Ruta inexistente sin extensión → sigue devolviendo la 404 de plataforma.
- `sitemap.xml` inexistente → sigue generando el sitemap de emergencia (no lo pisa el fallback).

---

## Impacto y prioridad

- **Quién se ve afectado:** cualquier web con carpetas (`/blog/`, `/nosotros/`) o con *clean URLs*. Es la mayoría de las webs modernas y muchas de las que genera una IA.
- **Síntoma para el usuario:** "subo mi web, la home va, pero el resto da 404". Difícil de diagnosticar para alguien no técnico → soporte y abandono.
- **Riesgo del arreglo:** bajo. Un único fichero, solo actúa en el camino de "no encontrado", y es fácilmente cubrible con tests.
- **Prioridad sugerida:** alta, previa a cualquier onboarding de webs de cliente con blog o multipágina.

---

## Anexo — ficheros revisados

- `src/publish/resolve-site.ts` — el serving público (aquí está el hueco).
- `app/sites/[host]/[[...path]]/route.ts` — el handler Next que llama a `resolvePublicSite`.
- `src/import/import-project.ts` — cómo se materializan los ficheros en storage.
- `src/import/entry.ts` — detección de la página de entrada (`entryPath`).
- `src/import/validate.ts` — extensiones permitidas.
- `src/tests/blog-index.test.ts`, `src/tests/blog-apply.test.ts` — evidencian que el contenido propio enlaza con `.html`.

> Las líneas citadas son de la revisión del 2026-07-30; si el código se ha movido, localizad por el fragmento de código, no por el número de línea.
