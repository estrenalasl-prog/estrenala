# Reanudación tras formateo — léeme primero

Actualizado: 2026-08-01 (prueba humana terminada). Este documento es la fuente de verdad para
retomar: la memoria de Claude en `C:\Users\Sebas\.claude` NO sobrevive a los formateos.

**Los otros dos documentos que hay que leer:**

- `docs/DESPLIEGUE.md` — cómo está montado el VPS y qué variables lleva producción.
- `docs/REPASO-SEO-SEGURIDAD.md` — repaso del 2026-07-28 con lo que falta por
  arreglar en SEO, seguridad y plugins, **priorizado**. Es la lista de trabajo.

## ✅ Checklist ANTES de formatear (para Sebas)

1. **Copia LA CARPETA ENTERA** `Desktop\Carpeta de Proyectos\Wordclicks` a un USB o
   nube. Desde el 2026-07-27 el código SÍ tiene remoto
   (`github.com/estrenalasl-prog/estrenala`, rama `main`), así que eso ya está a
   salvo; lo que sigue sin copia en ningún sitio son estas tres cosas, que NO están
   en git y son irrecuperables:
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
6. `npx vitest run` (594 tests) y `npx tsc --noEmit` deben salir limpios.
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
| 19 | **Repaso de seguridad y SEO antes de abrir** (`docs/REPASO-SEO-SEGURIDAD.md` es la lista viva). Seis arreglos. **Claves de clientes cifradas**: `org_settings` guardaba en claro las de OpenRouter/SerpAPI —credenciales de terceros con dinero detrás—; ahora AES-256-GCM bajo `SECRETS_KEY` (formato `s1.<iv>.<etiqueta>.<cifrado>`), con lo anterior tratado como legado en claro y los campos no tocados sin recifrar, para que cambiar el modelo de IA no exija la clave maestra. **Propiedad del dominio**: `conectarDominio` registraba cualquier dominio sin comprobar nada (se podía bloquear `elcorteingles.es` y gastar certificados); ahora vale el registro A apuntando a nuestra IP **o** un TXT en `_estrenala.<dominio>` con un token DERIVADO de la clave maestra (no se guarda) — la segunda vía existe porque con el dominio tras un proxy el registro A nunca resuelve a nosotros. Sin `DNS_TARGET_IP` no se verifica (local/autoservido). **Cupo**: 10 direcciones nuevas al día por espacio en UNA sentencia SQL, contadas justo antes de pedir el certificado (pelearse con el DNS no gasta). **Cookies `__Host-`**: una web publicada en `*.estrenala.com` podía *escribir* `wc_session` con `Domain=` y meterte en la sesión de otro; el prefijo lo impide y obliga a `secure` también en local. **Cabeceras de seguridad** en el **middleware**, NO en `next.config.ts`: `headers()` casa contra la ruta que entra y las webs de clientes entran por `/`, así que un HSTS con `includeSubDomains` habría caído sobre el dominio del cliente. **openGraph** con imagen 1200×630 generada por `scripts/brand/og-plataforma.mjs`, y de paso `/icon.png` y `/apple-icon.png`, que respondían **307 a /login** (el favicon no se veía sin sesión). **Sitemap** al servir para las webs sin blog. Migración 19 (`cambios_direccion`) + recifrado. 50 tests + e2e-19 (33/33) y e2e-20 (14/14) |
| 18 | **Control de indexación (SEO)**. Tres piezas. (1) Interruptor **por web** «Que Google no la encuentre todavía» (`projects.no_indexar`, false por defecto: publicar es querer que te vean). Se sirve como cabecera **`X-Robots-Tag: noindex, nofollow`**, NO como `Disallow` en robots.txt —bloquear el rastreo impide que Google llegue a leer el noindex y la URL puede seguir saliendo en los resultados—; y NO tocando el HTML del cliente, así protege también PDF e imágenes. Se aplica **al SERVIR**, como la marca: surte efecto sin republicar. Es de dueño (403 si no) y la barra de publicar avisa con «Oculta en Google». (2) **Canónico** `Link: <https://dominio/ruta>; rel="canonical"` cuando se entra por el subdominio teniendo dominio propio: la misma web vivía en dos direcciones y Google lo lee como contenido duplicado. A propósito **no** es un 301 —`conectarDominio` no comprueba el DNS, así que redirigir dejaría la web inalcanzable por ambos lados mientras el DNS no apunte—. Excluyente con el noindex (juntos se contradicen). (3) `PLATAFORMA_NOINDEX=1`: candado de pre-lanzamiento que saca la plataforma entera de los buscadores (cabecera desde el middleware + `app/robots.ts`); **quitarlo el día del lanzamiento**. Con él quitado, el robots.txt deja rastrear la landing y el blog pero veta panel, API y papeleo de cuenta (`ZONAS_PRIVADAS`). Migración 18 (`projects.no_indexar`). 20 tests + e2e-19 (22/22) |
| 17 | **El blog es de pago y las webs gratuitas llevan marca**. `src/publish/marca.ts`: insignia «Hecho con Estrénala» con estilos EN LÍNEA y `all:initial` (no puede romper el CSS del cliente ni romperse con él). Se inyecta **al SERVIR**, no al publicar (`getPublishedSiteByHost` trae el plan con un JOIN y `resolvePublicSite` la mete antes del último `</body>` si el plan no incluye `sinMarca`): al mejorar de plan desaparece **sin republicar** y al cancelar vuelve sola. Solo en `.html`; los assets se sirven byte a byte. Blog: `src/planes/guardas.ts` (`exigirBlog`, 402) en **las 25 rutas** del blog, GET incluidos; la interfaz muestra `BlogDePago` con «Ver los planes». El cron del piloto ya no escribe para quien dejó de pagar (`listPilotosActivos` filtra por `PLANES_CON_BLOG`, derivado de `PLANES`); lo ya programado sí se publica. 14 tests + e2e-18 (16/16) |
| 16 | **Pagos con Stripe** (sin librerías, API REST, igual que Google/Resend): Checkout alojado —la tarjeta NUNCA pasa por la plataforma—, portal de cliente y webhook firmado. `src/pagos/`: `precios.ts` (los price IDs viven en el ENTORNO porque cambian de prueba a producción), `stripe.ts` (`verificarFirmaStripe`: HMAC-SHA256 con `timingSafeEqual`, ±5 min antirreplay y varias firmas `v1` por rotación) y `suscripcion.ts` (**`past_due` MANTIENE el plan**, Stripe aún reintenta; `canceled` vuelve a gratuito). `POST /api/stripe/webhook` es público en el middleware: su candado es la firma. Migración 16: `stripe_customer_id`/`stripe_subscription_id`/`plan_estado`/`plan_hasta`. 21 tests + e2e-16 (11/11, sesiones REALES de Checkout) + e2e-17 (11/11, webhook firmado de punta a punta) |
| 15 | **Planes y límites**: `src/planes/planes.ts` (puro, sin BD) con Gratis (1 web, subdominio, editor, historial, actualizar desde ZIP), **Personal 9 €/mes o 90 €/año** (3 webs, dominio propio, sin marca, blog) y **Agencia 29 €/mes o 290 €/año** (25 webs, equipo). Se corta con **402** (no 403: la interfaz distingue «te falta plan» de «no tienes permiso») y mensajes byte-exactos. `planDe()` cae a `free` ante cualquier valor desconocido. Sección «Plan y uso» en Configuración con la comparativa. `scripts/plan-org.mjs` para asignar planes a mano. e2e-15 (10/10) |
| 14 | **Páginas legales públicas** (`/legal/*`: aviso legal, privacidad, cookies, términos) con los datos reales del titular en `src/legal/titular.ts` (LSSI-CE art. 10 exige NIF). La página de cookies documenta las de verdad —`wc_session` (30 d), `wc_org` (400 d), `g_state` (10 min)—: **solo técnicas**, así que por el art. 22.2 LSSI no hace falta banner de consentimiento. La columna «Legal» del pie de la landing vuelve a enlazarlas. e2e-14 (19/19) |
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

## 🧪 2026-08-01 — La prueba humana de punta a punta, terminada

Sebas recorrió la plataforma entera como cliente y entregó su lista. **761 tests.**
Los dos hallazgos que no eran lo que parecían, y eran los peores:

- **«A veces se vuelve loco y cambia la página de inicio».** No se volvía loco: el
  desplegable de la vista previa GUARDABA `entryPath` al cambiarlo. Era el control de
  portada disfrazado de navegador de páginas, así que asomarse a Contacto reasignaba
  la portada de la web publicada — y eso lo hace todo el mundo. Ahora navegar y
  decidir la portada son dos acciones distintas (`31cb7b9`).
- **«Por WhatsApp sale solo un recuadro».** Su `og:image` apuntaba al dominio para el
  que se escribió la web, donde el archivo da 404; la imagen estaba y se servía bien
  desde aquí. Es NUESTRO caso de uso, así que le pasa a todos.
  `reapuntarMetadatosImportados` lo corrige al servir (`18d2c7e`). **Regla del
  diseño:** solo se tocan las etiquetas que describen ESA página (canonical, og:url,
  og:image, twitter:image) y solo si apuntan al dominio viejo; **los `<a href>` no se
  tocan**, para que un enlace a su tienda de siempre siga yendo donde iba.

Además: relojito por tarea en lo que tarda (`.cargador` existía pero solo en
login/registro), Historial que distingue edición a mano de edición con el asistente y
pide confirmación antes de restaurar, instrucciones de DNS que reaccionan mientras
escribes, **«ver cómo queda» en el asistente** (se calcula con el MISMO `applyEdits`
que guarda de verdad: una vista previa por otro camino podría enseñar una cosa y
guardarse otra) y **«traer tu propia plantilla de blog»** — con vía manual de coste
cero, porque antes la pantalla de plantillas solo aparecía DESPUÉS de generarlas con
IA y había que pagar una generación para tirarla.

**Decisión de alcance (suya):** la plantilla de blog propia entra antes de lanzar; la
caja de herramientas con **inserción de imágenes se aplaza a después**. Todo el editor
direcciona `nodeId` que YA existen; insertar es crear nodos nuevos y es un incremento
entero, no un botón.

### GOTCHAs nuevos
- **Dokploy clona por deploy key SSH, así que NO se entera de los pushes.** El
  despliegue automático exige un webhook creado A MANO en GitHub (Settings →
  Webhooks) apuntando a la URL que imprime el panel. Hasta el 2026-08-01 no existía:
  todos los despliegues habían sido manuales. Usar la forma
  `https://panel.estrenala.com/api/deploy/<token>` y no la de `http://IP:3000`, que
  manda el token sin cifrar.
- **Desde fuera no se puede sondear si un commit está desplegado**: el middleware
  contesta 401 a todo `/api/projects/*` antes de mirar si la ruta existe.
- **Una variable de entorno que solo lea `middleware.ts` NO se aplica al reiniciar:
  hay que RECONSTRUIR.** El middleware corre en el runtime Edge, donde `process.env.X`
  se sustituye por su valor literal durante el build, y Dokploy construye con las
  variables de la app disponibles — o sea que la variable se congela dentro de la
  imagen. Mordió con `PLATFORM_ALIAS_HOSTS`, y el síntoma engañaba: TLS correcto y la
  petición llegando, pero contestando la 404 pública, que parece un fallo de lógica y
  no de configuración. Es la misma razón por la que `PLATFORM_HOST` sí funciona:
  estaba puesta al construir.
- ~~**Falta el registro DMARC de `estrenala.com`**~~ — puesto y verificado el
  2026-08-01. Estaba creado en `estrenala.es` por error, y por eso «no propagaba».

## 🌩️ 2026-08-01 (tarde) — El comodín, hecho y verificado en producción

**El techo de 50 webs nuevas por semana ya no existe.** Runbook completo y medido en
`docs/COMODIN-CLOUDFLARE.md`; la guía paso a paso que siguió Sebas está en un
artifact de claude.ai (9 bloques). Resumen de lo que quedó montado:

- **DNS de `estrenala.com` en Cloudflare** (nameservers `keaton` / `suzanne`), plan
  Free, **todos los registros en gris (Solo DNS)**. Sin caída: los siete registros se
  verificaron uno a uno contra los nameservers nuevos ANTES de cambiar nada en
  Hostinger, incluida la cadena entera del DKIM.
- **Certificado comodín** `*.estrenala.com` + `estrenala.com`, por reto DNS-01, con un
  resolver NUEVO (`letsencrypt-dns`) y `storage` propio (`acme-dns.json`). El resolver
  `letsencrypt` de siempre no se tocó: el CRM y los agentes de Quantiva siguen igual.
- **Regla comodín** en `/etc/dokploy/traefik/dynamic/estrenala-comodin.yml`, por el
  proveedor de archivos (no etiquetas de Docker). Se deshace borrando el archivo.
- **`DOKPLOY_COMODIN=1`** encendido y comprobado publicando de verdad.

### GOTCHAs de este día
- **El token de Cloudflare necesita DOS permisos**, no uno: `Zona · DNS · Editar` **y**
  `Zona · Zona · Leer`. Antes de escribir el registro temporal, lego tiene que
  averiguar el id de la zona, y eso es una lectura. Con solo el primero el certificado
  falla con un error que no menciona los permisos.
- **La prioridad por defecto de un router de Traefik ES LA LONGITUD DE LA REGLA.** La
  regex comodín mide 41 y `` Host(`panel.estrenala.com`) `` mide 27: sin `priority: 1`
  explícito, la comodín gana y te quedas sin panel. Medido, no supuesto.
- **`traefik.yml` es configuración ESTÁTICA**: solo se lee al arrancar el proceso. El
  botón «Reload» de Dokploy no basta de fiar; `docker restart dokploy-traefik` sí. En
  cambio la carpeta `dynamic` es dinámica y se recarga sola (`watch: true`).
- **Los logs de Traefik están en nivel ERROR: un certificado emitido bien no deja ni
  una línea.** Silencio no prueba nada, ni bueno ni malo. Se comprueba desde fuera.
- **No todos los routers salen en la carpeta `dynamic`.** El inventario de verdad:
  `docker exec dokploy-traefik wget -qO- http://localhost:8080/api/http/routers`.
- **`panel.estrenala.com` es el panel de administración de DOKPLOY**, no el de la
  plataforma. Pendiente moverlo a un nombre no adivinable (ver COMODIN-CLOUDFLARE.md).

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
   Las **páginas legales ya existen** (incremento 14) y el pie vuelve a enlazarlas.
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
   (4f2) → ~~multiusuario/Equipo + Tu cuenta~~ ✅ (6 completo) → ~~edición
   rich-text~~ ✅ (7) → ~~asistente IA v1~~ ✅ (8) → ~~zona de peligro~~ ✅ (9) →
   ~~ceder propiedad~~ ✅ (10) → ~~actualizar desde ZIP~~ ✅ (11) → ~~subir .html
   o carpeta~~ ✅ (12) → ~~landing~~ ✅ (13) → ~~legales~~ ✅ (14) →
   ~~**MONETIZACIÓN**~~ ✅ (15, 16 y 17, cerrada el 2026-07-27).
   El modelo espejo es **WordPress.com**, no .org (el .org no monetiza: el dinero
   está en el ecosistema). Palanca de conversión = **dominio propio + quitar la
   marca**, como Wix/Squarespace/Webflow. Dos ventajas propias: el coste marginal
   de una web gratis es ínfimo (estáticos) y **la IA no le cuesta a la plataforma**
   (clave del usuario), así que el margen no depende del uso de IA. Precios
   decididos por el usuario el 2026-07-26: 9/90 € Personal y 29/290 € Agencia.
   Mejoras futuras del asistente (apuntadas, NO empezadas): agente conversacional
   multi-paso (Claude Agent SDK), cambios estructurales, edición de varias páginas.
8. **LO QUE QUEDA PARA SALIR: DESPLEGAR.** Elegir hosting, apuntar `estrenala.com`
   y pasar Stripe a producción. Checklist de entorno: `PLATFORM_HOST`,
   `SITES_BASE_DOMAIN`, `DNS_TARGET_IP`, `DATABASE_URL`, `RESEND_API_KEY`,
   `EMAIL_FROM`, `GOOGLE_CLIENT_ID`/`SECRET` (redirect URI `<host>/api/auth/google/callback`),
   `CRON_SECRET`, y de Stripe: `STRIPE_SECRET_KEY` **live**, `STRIPE_WEBHOOK_SECRET`
   del endpoint real (`<host>/api/stripe/webhook`) y los **4 price IDs de
   producción** (los de prueba NO valen: por eso viven en el entorno). Ver
   `.env.example`. Pruebas que le faltan al usuario: «Continuar con Google» y el
   asistente de IA (espera a recargar OpenRouter).

## ⚠️ Guardas y preferencias (aprendidas a base de sustos)

- **Los e2e JAMÁS escriben en `org_settings`** cuando hay claves reales (el
  2026-07-15 una regresión borró las claves del usuario; irrecuperables). Los
  scripts de `scripts/e2e/` ya llevan guardas (abortan/skipean); mantenerlas.
- **GOTCHA Turbopack + CSS nuevo**: si creas un `.css` con el `npm run dev` YA
  corriendo, Turbopack puede servir un chunk cacheado **sin tus reglas** (pasó al
  integrar la landing: el CSS servido traía solo Tailwind y la página se veía sin
  estilos, sin ningún error en el log). Cura: parar el dev server, `rm -rf .next` y
  relanzar. Para diagnosticarlo: descargar el chunk `.css` que enlaza el HTML y
  buscar dentro alguna clase propia.
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
