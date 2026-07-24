# Reanudación tras formateo — léeme primero

Actualizado: 2026-07-24 (tras mergear el incremento 5b a master). Este documento es
la fuente de verdad para retomar: la memoria de Claude en `C:\Users\Sebas\.claude`
NO sobrevive a los formateos.

## ✅ Checklist ANTES de formatear (para Sebas)

1. **Copia LA CARPETA ENTERA** `Desktop\Carpeta de Proyectos\Wordclicks` a un USB o
   nube. El repo NO tiene remoto: este disco es la única copia. La carpeta incluye
   tres cosas que NO están en git y son irrecuperables:
   - `.env.local` — las claves (DATABASE_URL, SESSION_SECRET, OPENROUTER_API_KEY,
     OPENROUTER_MODEL). **La joya de la corona.** (PANEL_PASSWORD ya no existe:
     desde el incremento 6 el acceso es por cuenta de usuario.)
   - `data/storage/` — los archivos de las webs subidas en dev (snapshots, imágenes).
     Sin esto, los proyectos de la BD apuntan a archivos que no existen.
   - `Creador de Blog/` — el proyecto hermano fuente de los portes (ignorado por git).
2. Nada más. La base de datos vive en Supabase (nube) y las claves de OpenRouter y
   SerpAPI pegadas en Configuración están guardadas en esa BD (`org_settings`).

## 🔄 Checklist DESPUÉS de formatear (primeros pasos con Claude)

1. Restaurar la carpeta en la misma ruta: `C:\Users\Sebas\Desktop\Carpeta de Proyectos\Wordclicks`.
2. **Toolchain portable** (no requiere admin), como en el formateo anterior:
   - Node: bajar el ZIP de nodejs.org (la vez pasada v24.18.0-win-x64; considerar
     **v22 LTS**: el 24 dio 3 crashes nativos silenciosos) y extraer a
     `%LOCALAPPDATA%\Programs\nodejs` (usar `tar -xf`, Expand-Archive falla por rutas largas).
   - Git: bajar **MinGit** (portable) y extraer a `%LOCALAPPDATA%\Programs\MinGit`.
   - En CADA comando del harness, prefijar:
     `$env:PATH = "$env:LOCALAPPDATA\Programs\nodejs;$env:LOCALAPPDATA\Programs\MinGit\cmd;" + $env:PATH`
3. `npm install` en la carpeta del proyecto.
4. Comprobar `.env.local` restaurado (los NOMBRES esperados están en `.env.example`).
5. `npm run dev` → login en `http://localhost:3000` → abrir el proyecto «Quantiva
   Technology» y comprobar que la vista previa carga (= storage restaurado bien).
6. `npx vitest run` (422 tests) y `npx tsc --noEmit` deben salir limpios.
7. Reconstruir la memoria de Claude a partir de este documento (estado, guardas y
   preferencias de abajo).

## 📦 Estado del proyecto (qué hay construido)

Plataforma «el WordPress para webs hechas con IA» (Next.js 16, React 19, Tailwind v4,
Drizzle/Postgres en Supabase, vitest). Flujo de trabajo: spec → plan (docs/superpowers)
→ TDD con commit por tarea → e2e sin gastar IA → merge ff a master.

| Incremento | Qué es |
|---|---|
| 1–3c | Importar ZIP, preview, editor in-situ, publicar (subdominios/dominios), herramientas |
| 4a | Blog base: plantillas IA, posts, índice, sitemap |
| 4b | Redacción IA: pipeline 6 etapas con checkpoints (`article_drafts`) |
| 4b2/4d | Modelo de IA elegible + Configuración `/settings` con claves BYOK (`org_settings`) |
| 4c | Radar de keywords: Google Trends (SerpAPI) + puntuación IA vs nicho, caché diaria |
| 4e | Publicación programada: `scheduled_posts`, tick 60 s (instrumentation.ts) + cron |
| 4f | Portada automática: SVG con colores del sitio (gratis) o imagen IA (modelo fijo) |
| 4g | **Piloto automático**: radar→redacta→portada→programa, solo; OFF por defecto |
| 5a | Sistema visual v1 en `docs/design/` (tokens, 4 pantallas, componentes, 404, wordmarks) |
| 4f2 | Portada «diseño» rasterizada a **PNG real 1200×630** (resvg-wasm + Space Grotesk del repo en `src/blog/portada/fuentes/`): og:image visible en WhatsApp/X. GOTCHAs: el paquete va en `serverExternalPackages` y el `.wasm` se lee por ruta de `process.cwd()` (nunca `require.resolve`, Turbopack casca); fuentes+wasm declarados en `outputFileTracingIncludes` por el standalone |
| 6b | **Correos de cuenta**: verificación de email al registrarse + «he olvidado mi contraseña», con capa de envío enchufable (`src/email/enviar.ts`: consola en dev con el enlace, Resend en prod si hay `RESEND_API_KEY`). Tokens de un solo uso hasheados (`auth_tokens`). Páginas `/verificar` `/recuperar` `/restablecer`, banner de aviso en el panel (solo si el envío está activo) y gate de publicar por email verificado (solo en prod). Respuestas neutras anti-enumeración |
| 6a | **Cuentas de usuario reales** (registro/login email+contraseña, scrypt, cookie de sesión v2 con userId, rate-limit). `getDevContext` (stub) eliminado → `getContexto()` (cookie) en todas las rutas del panel; preview/assets públicos resuelven el org por UUID del proyecto. Claves BYOK de trabajos de fondo vía **org-context** (AsyncLocalStorage). Tras registrarte: `node scripts/migrar-org-dev.mjs <email>` engancha tu cuenta a la org de dev (proyectos + claves). Base para Google/Equipo/Cuenta (6b–6e) |
| 5b | **Diseño v2 «Alto Voltaje» INTEGRADO en toda la app** (lima `#C4F000` + papel/tinta + Space Grotesk): login, panel, proyecto (+ botón Expandir del preview), popover del editor, blog, taller IA, Configuración con secciones, 404 pública y logo real (`public/brand/`, servido `unoptimized` y con `/brand` en rutas públicas del middleware — NO tocar, ver memoria) |

Detalles finos por incremento: specs y planes en `docs/superpowers/`. E2e regenerables
en `scripts/e2e/` (necesitan dev server + .env.local; se ejecutan con `node`).

## ⏭️ En qué punto estamos y qué sigue

1. **ESTRATEGIA (fijada por el usuario el 2026-07-24): terminar TODA la plataforma
   sin apuros y salir con todo listo de una vez.** Nada de pre-registros por estar
   a medias; si algún día se hace pre-registro será una acción de marketing
   deliberada, no un parche. Mientras, se sigue construyendo.
2. **Marca FIJADA: Estrénala.** El usuario compra `estrenala.com` (2026-07-24).
   Al desplegar: apuntar DNS y configurar `PLATFORM_HOST` / `SITES_BASE_DOMAIN`.
3. **Landing de marketing → la diseña el usuario en claude.ai** («Claude Design»),
   igual que hizo con la plataforma. El prompt listo y la lista de adjuntos están en
   `docs/design/prompt-landing-para-claude-design.md`. Entregable esperado:
   `11-landing.html`. CTA de la landing = **botón al registro real** (cuando salga,
   la plataforma estará terminada, con cuentas de usuario).
4. **Decisión de producto (2026-07-24): web primero, nada de app nativa.** La
   plataforma es responsive; si algún día hace falta icono en el móvil, se hace PWA
   (web instalable). App nativa solo se replantearía con usuarios pidiéndola.
5. **El piloto automático (4g) está SIN estrenar**: el usuario lo probará «cuando
   salgamos con nuestra propia página». No activarlo por él.
6. **Idea nueva (2026-07-24): asistente de IA DENTRO de la plataforma**, estilo
   «Claude Code pero para tu web»: el usuario conecta su clave (BYOK, como el blog:
   opt-in y con aviso de coste) y un agente edita su web por él usando lo que ya
   existe (snapshots, historial/revertir, editor). Encaja con el Claude Agent SDK.
   Matiz importante: NO se puede «conectar la suscripción de claude.ai» de un
   usuario a una plataforma de terceros; lo que sí se puede es clave de API
   (Anthropic/OpenRouter), el mismo patrón BYOK que ya usamos. Apuntado, NO empezado.
7. **Orden de construcción hasta salir** (todo antes del lanzamiento): portada
   SVG→PNG (og:image de WhatsApp/X no muestra SVG) → multiusuario/Equipo + Tu
   cuenta (hoy «Próximamente» en /settings) → edición rich-text → integrar la
   landing cuando vuelva de Claude Design → Plan/facturación (necesita decisiones
   externas del usuario: Stripe, precios) → asistente IA (punto 6). El blog como
   sección premium sigue apuntado, NO construir hasta monetizar.

## ⚠️ Guardas y preferencias (aprendidas a base de sustos)

- **Los e2e JAMÁS escriben en `org_settings`** cuando hay claves reales (el
  2026-07-15 una regresión borró las claves del usuario; irrecuperables). Los
  scripts de `scripts/e2e/` ya llevan guardas (abortan/skipean); mantenerlas.
- **Nunca imprimir material de claves guardadas**, ni fragmentos (solo booleanos y
  longitud si hay que diagnosticar).
- El e2e del 4g **jamás deja `piloto_activo=true`** (el tick correría con claves reales).
- El usuario tiene POCOS créditos: todo lo que gaste IA/SerpAPI se diseña opt-in,
  acotado y con aviso de coste; probar con su clave lo decide él.
- Mensajes de error en español byte-exactos (los tests los fijan). UI en español,
  tono cercano y sin jerga. El usuario responde a preguntas con opciones (elige
  el recomendado casi siempre) y valida en el navegador con capturas.
- El scorer del radar usa SIEMPRE el modelo por defecto de la plataforma (DeepSeek
  puntuaba basura al corte); la redacción usa el modelo del usuario (deepseek-chat).
- Dev: proyectos «E2E 4b/4c/4e/4f/4g» son residuos de e2e, borrables.
