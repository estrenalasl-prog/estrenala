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
| 13 | **Landing pública integrada** (`app/_landing/`): la RAÍZ es pública — sin sesión sirve la landing de marketing, con sesión el panel (lo decide `app/page.tsx` con `haySesion()`, solo HMAC sin tocar BD). En `middleware.ts` `"/"` va APARTE de `RUTAS_PUBLICAS` (meterla en la lista abriría toda la app por el `startsWith`). CSS del mockup con **todos los selectores acotados a `.landing`** (la app ya usa `.btn`/`.badge`/`.contenedor`); `html`/`body` → `:has(.landing)`. Correcciones de honestidad al integrar: fuera el rol «Invitado» y las «640 lecturas» (no existen), CTA al registro real, logos `/brand/*.png` con `<img>`. **Pendiente: páginas legales** (la columna Legal del pie se omitió para no dejar enlaces rotos). e2e-13 (14/14) incluye que el panel SIGUE protegido |
| 12 | **Subir la web como `.html` suelto o carpeta**, además del `.zip` (la landing lo prometía y tenía razón: mucha gente recibe de ChatGPT un `index.html`, no un ZIP). `sanearArchivos` en `unzip.ts` centraliza TODAS las reglas (zip-slip, límites, raíz envolvente) y la comparten las dos vías; `processFiles` para carpeta/archivos. **GOTCHA: sanear dos veces se comía dos niveles de carpeta** — cada vía sanea UNA sola vez (hay test de regresión). `POST /api/projects` acepta varios `file` + `rutas` (JSON paralelo con las rutas relativas). `ImportDropzone` arrastra carpetas (`webkitGetAsEntry` recursivo) y tiene «Elegir carpeta» (`webkitdirectory`). 11 tests + e2e-12 (8/8) |
| 11 | **Actualizar una web desde un ZIP nuevo**: para quien prefiere editar en SU herramienta (Claude Code, ChatGPT, v0…) y subir la versión nueva (el asistente cuesta tokens; «Estrénala no te encierra»). `src/projects/actualizar.ts` crea un snapshot `tipo:"actualizacion"` (parentId=actual) con el ZIP, lo deja como actual, ajusta `entryPath` si cambia; mantiene proyecto+dirección+Historial (reversible); NO mezcla con lo editado in-app. `POST /api/projects/[id]/actualizar` (editor+propietario). `ActualizarPanel.tsx` + etiqueta «Actualización desde ZIP» en Historial. Mejora: `unzipSafe` envuelve el error de fflate → `ImportError` "El archivo no es un ZIP válido" (400 en crear y actualizar). 6 tests + e2e-11 (10/10) |
| 10 | **Ceder la propiedad de un espacio**: acción atómica que hace propietario a otro miembro y baja al que cede a editor (sube al destino PRIMERO → nunca cero dueños). Desbloquea «borrar cuenta» al único propietario con equipo. `transferirPropiedad` + `TransferenciaStore` en `src/auth/equipo.ts`; `DrizzleAccountStore.aplicarTransferencia` (transacción); `POST /api/equipo/transferir` (owner-only); botón «Ceder propiedad» en Configuración › Equipo. Valida destino≠yo (`MSG_ELIGE_OTRA`) y que sea miembro (`MSG_NO_MIEMBRO`). 6 tests + e2e-10 (5/5, guardas con usuario desechable; el swap real de 2 usuarios queda en unit por el token de invitación) |
| 9 | **Zona de peligro (borrados irreversibles)**: eliminar un proyecto (solo el propietario) y eliminar la cuenta, con confirmación en dos pasos (escribir para confirmar). Sin `ON DELETE CASCADE` en el esquema → se borran los hijos en orden en una transacción + storage aparte (BD PRIMERO, storage best-effort). Proyecto: `DrizzleProjectStore.deleteProjectCascade` (fuera del interfaz) + `src/projects/eliminar.ts` + `DELETE` en la ruta del proyecto + `DangerZone.tsx`. Cuenta: política segura (con otro owner → solo te vas; único owner y único miembro → borra el espacio entero; único owner con más gente → BLOQUEA, `MSG_ULTIMO_OWNER_CUENTA`); `contarMiembros`/`eliminarEspacio`/`eliminarUsuario` en el store + `src/auth/eliminar-cuenta.ts` + `DELETE /api/cuenta` (cierra sesión con `cerrarSesion`). Sección «Zona de peligro» real en Configuración. 15 tests + e2e-9 (7/7, usuario DESECHABLE). Fuera de v1: transferir propiedad, exportar datos antes de borrar |
| 8 | **Asistente de IA («copiloto para tu web»)**: panel en la pantalla del proyecto donde el usuario dice en lenguaje natural qué cambiar; el asistente **propone** cambios (viejo→nuevo), el usuario **revisa** y **aplica**. Todo reversible (Historial). CLAVE de seguridad: produce las MISMAS ops que el editor manual (`text/richText/href/style`) sobre los `nodeId` de `walkElementsInOrder` → no puede hacer nada que un humano no pudiera (misma lista blanca/saneado, imposible XSS). `src/asistente/inventario.ts` (nodos editables) + `proponer.ts` (`interpretarPropuesta` valida op por op con `isValidOp`, descarta ids/kinds/valores inseguros, `MAX_OPS`; `proponerEdiciones` llama al modelo vía `pedirJson` inyectable, NO guarda). BYOK opt-in (misma clave OpenRouter del blog, aviso de coste). Ruta `POST /api/projects/[id]/asistente`; «aplicar» reutiliza `/edits`. `AssistantPanel.tsx`. 21 tests + e2e-8 (6/6, vía IA saltada si hay clave real). v1 = un tiro «propón»; futuro: agente multi-paso, cambios estructurales, varias páginas |
| 7 | **Edición rich-text del editor in-situ**: negrita/cursiva/subrayado/enlace dentro de un texto, con barra flotante (B/I/U/🔗) en `public/wc-editor.js` (lee `innerHTML`, op `richText`). La seguridad vive en el SERVIDOR: `src/editor/sanitize-inline.ts` re-serializa solo una lista blanca (`b strong i em u a[href seguro] br`), escapa el texto e ignora todo lo demás (probado con vectores XSS). `escapeText` NO re-escapa `&` (idempotente con innerHTML) |
| 6e | **Tu cuenta**: cambiar nombre, contraseña (pide la actual; las cuentas solo-Google pueden ponerse una) y correo con **doble confirmación** (el cambio se aplica al abrir el enlace del correo NUEVO). `src/auth/cuenta.ts`, rutas `/api/cuenta*`, página `/cambiar-email`, sección real en Configuración |
| 6d | **Equipo e invitaciones + roles**: Propietario/Editor aplicados (Editor no toca claves, dirección/dominio, despublicar ni equipo). Invitar por correo (token 7d) → `/invitacion` → aceptar y entrar. Selector de espacio en la cabecera (cookie `wc_org` validada). Protección del último propietario. `src/auth/roles.ts`, `equipo.ts`, rutas `/api/equipo*` `/api/espacio(s)*` |
| 6c | **«Continuar con Google»** (OAuth 2.0 authorization-code, sin librerías): rutas `/api/auth/google` + `/callback` con `state` en cookie (anti-CSRF); login/vincular/crear según el perfil (alta con email ya verificado). El botón solo aparece si hay `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (login/registro = envoltorio de servidor que pasa el flag a un `*Form` cliente). El OAuth real se prueba con credenciales de Google (redirect URI `<host>/api/auth/google/callback`) |
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
3. **Landing de marketing: HECHA E INTEGRADA** ✅ (2026-07-25). La diseñó el usuario
   en claude.ai con el prompt de `docs/design/prompt-landing-para-claude-design.md`
   (actualizado con la idea fuerza **«Estrénala no te encierra»**: tres formas de
   editar). Mockup en `docs/design/11-landing.html`, integrada en `app/_landing/`.
   **Pendiente asociado: las páginas legales** (aviso legal, privacidad, cookies,
   términos) — la columna «Legal» del pie está omitida hasta que existan.
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
7. **Orden de construcción hasta salir** (lo tachado = HECHO): ~~portada SVG→PNG~~ ✅
   (4f2) → ~~multiusuario/Equipo + Tu cuenta~~ ✅ (incremento 6 completo) →
   **MONETIZACIÓN (perfilada el 2026-07-25, precios SIN decidir):** el modelo espejo
   es **WordPress.com**, no .org (el .org no monetiza: el dinero está en el
   ecosistema). Palanca de conversión = **dominio propio + quitar la marca**, como
   Wix/Squarespace/Webflow. Reparto propuesto: **gratis** = 1 web, subdominio,
   editor a mano, historial, actualizar desde ZIP; **premium** = dominio propio,
   varias webs, quitar marca, blog automático, equipo. Dos ventajas propias: el
   coste marginal de una web gratis es ínfimo (estáticos) y **la IA no le cuesta a
   la plataforma** (clave del usuario), así que el margen no depende del uso de IA.
   El usuario confirmó «una parte gratuita y otra premium»; los importes los decide
   él (referencia de mercado: 9–15 €/mes personal, 29–49 €/mes agencia).
   ~~edición rich-text~~ ✅ (incremento 7) → ~~asistente IA v1~~ ✅ (incremento 8:
   proponer→revisar→aplicar; construido ANTES que la landing/Stripe porque esos dos
   dependen de decisiones del usuario y el asistente no) → **pendientes que dependen
   del usuario:** integrar la landing cuando vuelva de Claude Design; Plan/facturación
   (Stripe, precios; el esqueleto ya está: `organizaciones` tiene `plan`/`usoJson`).
   El blog como sección premium sigue apuntado, NO construir hasta monetizar.
   Mejoras futuras del asistente (apuntadas, NO empezadas): agente conversacional
   multi-paso (Claude Agent SDK), cambios estructurales, edición de varias páginas.
   Al desplegar, para activar los correos/Google reales: `RESEND_API_KEY`,
   `EMAIL_FROM`, `PLATFORM_HOST`, `GOOGLE_CLIENT_ID`/`SECRET` (ver `.env.example`).

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
