# Análisis competitivo — Payload / Figma (y el set real)

- **Fecha:** 2026-07-03
- **Estado:** Referencia estratégica (no cambia la hoja de ruta; robar ideas selectivamente).

## Corrección de marco
**Payload NO es de Vercel — lo compró Figma** (17 jun 2025). Se asocia a Vercel porque
corre sobre Next.js, despliega bien ahí y tiene la integración "Vercel Content Link", pero
el dueño es Figma y Payload es el **backend de Figma Sites** ("idea → web publicada"; los
componentes de Figma mapean 1:1 a colecciones de Payload). Lo que suena a "de Vercel" es
**v0 de Vercel** (la IA que genera la web) — ese sí es de Vercel.

## Qué es Payload
CMS **headless code-first** para **desarrolladores**: modelas el contenido en TypeScript
(colecciones/campos) y genera panel admin en React, API REST/GraphQL/Local, auth, control
de acceso por campo, versiones/borradores, rich-text (Lexical), media, editor visual on-page
y multiplayer. Postgres (vía **Drizzle**, igual que nosotros) o MongoDB. Open source.

## Lectura competitiva
Nos parecemos en la **superficie** (editar contenido visualmente + hosting), pero el punto
de entrada es **opuesto**:

| | Payload / Figma | Wordclicks |
|---|---|---|
| Usuario | Desarrollador (modela el esquema) | No-técnico / agencia |
| Entrada | Construyes la web en su framework | Subes HTML de **cualquier IA**, tal cual |
| Editor visual | Sobre contenido **ya modelado** | Sobre **HTML arbitrario**, sin modelar |
| Time-to-live | Necesita un dev | Minutos, sin código |

El editor visual de Payload **no edita HTML arbitrario**: edita contenido modelado y bindeado
a un frontend que un dev construyó. Ese es exactamente **nuestro hueco**.

**Set competitivo real** (no Payload-el-CMS): **Figma Sites**, **Vercel v0**, **Framer /
Webflow / Wix AI**, WordPress.

## Qué robar (encaja en la hoja de ruta)
- **Roles/permisos por proyecto** (agencia) — siguiente escalón sobre el org-scoping actual.
- **Rich-text (Lexical) + media (tamaños de imagen, focal point)** — referencia para el **Blog (Incremento 4)** y el crecimiento de assets.
- **Borradores/preview + versiones** — nuestros snapshots ya juegan aquí; su UX de drafts es buena referencia.
- **Capa de API (REST/GraphQL/Local)** — valida la estrategia de adaptadores.
- **Validación de stack**: el adaptador Postgres de Payload usa **Drizzle** → confirma Next.js + Drizzle + Postgres como base correcta.

## Nuestro foso
1. Cero esquema, cero código: editar HTML de IA directamente (Payload no puede).
2. Agnóstico a la IA: HTML de ChatGPT/Claude/v0/Lovable/lo-que-sea.
3. HTML publicado limpio y quirúrgico (respetamos el original, tocando solo bytes de contenido).
4. Multi-proyecto agency-first desde el día 1.

## Alerta
"Tenerlo todo como ellos o mejor" **en todo** = clonar un CMS de desarrolladores = "construir
toda la plataforma a la vez → hundirla" (principio del fundador). Mantener la cuña (no-code
sobre HTML de cualquier IA) y robar solo lo de alto impacto.

## Fuentes
- https://www.figma.com/blog/payload-joins-figma/
- https://blog.logrocket.com/ux-design/figma-config-2025-whats-new-whats-next/
- https://payloadcms.com/enterprise/visual-editor
- https://payloadcms.com/marketers
- https://www.cmswire.com/digital-experience/when-cms-meets-ux-design-what-figmas-payload-deal-really-means/
