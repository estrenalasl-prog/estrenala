# Incremento 3b — La plataforma en internet

**Fecha:** 2026-07-04
**Estado:** aprobado por el usuario (diseño en 2 partes validado en conversación)
**Prerequisito:** Incremento 3 (Publicar) fusionado a master.

## Objetivo

Wordclicks pasa de correr en el PC del founder a estar en internet de verdad:

- El panel vive en `app.PLATAFORMA.com` (HTTPS), protegido por contraseña.
- Cada web publicada vive en `<slug>.PLATAFORMA.com` con HTTPS automático.
- Un proyecto puede **conectar su dominio propio** (`cliente.com`): el cliente apunta
  dos registros A y su web se sirve en su dominio con certificado automático.
- Los archivos de las webs viven en **Supabase Storage** (no en el disco del servidor).
- Al final del incremento, `quantivatechnology.com` sirve la web Quantiva desde
  Wordclicks (probado antes en `nueva.quantivatechnology.com`).

`PLATAFORMA.com` es un marcador: el nombre/dominio definitivo está pendiente de
decisión del usuario (candidatos comprobados libres: estrenala.com, webnace.com,
yavive.app). Todo el diseño es independiente del dominio elegido (vive en env vars).

## Decisiones tomadas con el usuario

1. **Infraestructura:** el VPS existente del usuario (Hostinger KVM 2, Ubuntu 24.04,
   IP `72.61.176.214`, gestionado con **Dokploy**, que ya aloja su CRM). Coste extra: 0€.
   Trade-off aceptado: servidor compartido con el CRM, mitigado con límites de recursos.
2. **Dominio madre:** se registrará uno nuevo (nombre pendiente). Mientras tanto,
   marcador `PLATAFORMA.com`.
3. **Cutover de quantivatechnology.com:** primero probar en `nueva.quantivatechnology.com`;
   el cambio del dominio principal solo cuando el usuario valide. Los MX (correo) no se tocan.
4. **Protección del panel:** contraseña única (single-user). El login multiusuario real
   será su propio incremento.
5. **El plan Cloud Startup** del usuario no aloja la plataforma (no soporta SSL wildcard);
   queda para correo, la web antigua como respaldo y otros usos.

## Arquitectura de infraestructura

```
Internet
   │
   ▼ (DNS: A @ / A * / A app → 72.61.176.214, en Cloudflare, nube gris)
Traefik (del Dokploy existente, puertos 80/443)
   ├─ Host: app.PLATAFORMA.com        ──┐
   ├─ HostRegexp: *.PLATAFORMA.com    ──┼──► contenedor Wordclicks (Next.js standalone)
   ├─ Host: <dominio-cliente> (por API)──┘        │
   └─ (resto de apps del VPS: CRM…)               ├─► Supabase Postgres (ya existente)
                                                  └─► Supabase Storage (bucket privado)
```

- **Certificados:**
  - `*.PLATAFORMA.com` + apex: certificado **wildcard** de Let's Encrypt vía
    DNS-challenge (token de API de Cloudflare en el env de Traefik; el DNS del
    dominio madre se gestiona en Cloudflare free, registros en "DNS only"/nube gris).
    Configuración documentada una sola vez en Traefik (certResolver nuevo + router
    `HostRegexp` hacia la app). Referencia: guía naps62 "Wildcard SSL in Dokploy".
  - **Dominios de clientes:** al conectar un dominio, la app llama a la **API de
    Dokploy** (`domain.create`, certificateType `letsencrypt`, HTTP-challenge) para
    el dominio pelado **y** su `www.`. Al desconectar, `domain.delete` de ambos.
- **Deploy:** repo privado de GitHub → Dokploy reconstruye y reinicia en cada push a
  master (integración GitHub nativa de Dokploy). Build con **Dockerfile** propio
  (Next.js `output: "standalone"`, multi-stage, node:22-alpine, puerto 3000).
- **Límites de recursos** en Dokploy para el contenedor Wordclicks (orientativo:
  1 GB RAM / 1 CPU) para que el CRM nunca sufra.
- **Healthcheck:** `GET /api/health` → `200 {"ok":true}` (público, sin candado).
- **Migraciones de BD:** igual que hasta ahora — `npm run db:push` desde el PC del
  founder contra Supabase. El servidor nunca migra esquema.

## Cambios en la aplicación

### 1. Storage en la nube (`SupabaseStorage`)

Nueva implementación de la interfaz existente `StorageAdapter` (put/get/list/delete)
sobre Supabase Storage, bucket **privado** (nombre en env, por defecto `sites`),
usando `@supabase/supabase-js` con la service key (solo servidor).

- Mismas claves/prefijos que hoy (`storagePrefix` de snapshots no cambia).
- `contentType` en `get`: inferido por extensión con el helper existente
  (`src/storage/content-type.ts`), igual que la implementación local.
- `list(prefix)`: recursivo (el list de Supabase es por "carpeta" y paginado; se
  recorre con paginación hasta agotar).
- `put` con upsert (sobrescribir permitido, igual que local).
- Selección por env: `STORAGE_DRIVER=local` (default, dev) | `supabase` (prod),
  en `src/storage/factory.ts`.
- **Sin migración de datos:** los proyectos de prueba actuales solo existen en el
  disco del PC; en producción se empieza limpio re-importando los ZIPs.

### 2. Candado del panel (contraseña única)

- **Login:** página `/login` (en el host de plataforma) con un campo de contraseña.
  `POST /api/login` compara contra `PANEL_PASSWORD` (env) con comparación en tiempo
  constante. Error: 401 «Contraseña incorrecta». Éxito: cookie + redirect a `/`.
- **Cookie de sesión:** nombre `wc_session`, valor `v1.<expira-epoch>.<hmac>` con
  HMAC-SHA256 firmado con `SESSION_SECRET` (env). Atributos: `HttpOnly`, `Secure`
  (solo prod), `SameSite=Lax`, `Path=/`, **sin atributo `Domain`** (host-only: no
  puede filtrarse a `*.PLATAFORMA.com` ni a dominios de clientes — cierra el
  follow-up de aislamiento de cookies del incremento 3). Caducidad: 30 días.
- **Verificación en middleware** (Edge-safe: Web Crypto / `crypto.subtle`, no APIs
  de Node): en el host de plataforma, toda ruta exige cookie válida **excepto**
  `/login`, `/api/login`, `/api/health`, `/_next/*` y `favicon.ico`. Sin cookie:
  páginas → redirect 307 a `/login`; rutas `/api/*` → `401 {"error":"No autorizado"}`.
- Los hosts de sitios publicados se clasifican **antes** del candado y nunca pasan
  por él (siguen siendo públicos).
- **Salir:** `POST /api/logout` borra la cookie; botón «Salir» en la cabecera del panel.
- En dev el candado también funciona (login con la password de `.env.local`) para
  que los e2e lo cubran.

### 3. Mapa de hosts (parseHost v2)

Hasta ahora `PLATFORM_HOST` hacía de panel **y** de base de subdominios. En
producción se separan:

- `PLATFORM_HOST` = host del panel (prod: `app.PLATAFORMA.com`; dev: `localhost:3000`).
- `SITES_BASE_DOMAIN` = base de los subdominios de sitios (prod: `PLATAFORMA.com`;
  dev: sin definir → por defecto igual a `PLATFORM_HOST`, así `sub.localhost:3000`
  sigue funcionando igual).

`parseHost(hostRaw, platformHost, sitesBaseDomain)` clasifica:

| Host | Tipo |
|---|---|
| `app.PLATAFORMA.com` (== PLATFORM_HOST) o loopback | `plataforma` |
| `PLATAFORMA.com` (== SITES_BASE_DOMAIN) | `raiz` (nuevo) → middleware redirige 307 a `https://PLATFORM_HOST` |
| `<label>.PLATAFORMA.com` (un solo label válido `[a-z0-9-]+`) | `subdominio` |
| cualquier otro | `dominio` |

- Redirección `www` de dominios de clientes: en `resolvePublicSite`, si el host
  empieza por `www.` y el dominio pelado está publicado → `301` a
  `https://<pelado><ruta>`.
- `PublishBar` deja de leer `NEXT_PUBLIC_PLATFORM_HOST`: el server component
  (`page.tsx`) le pasa `sitesBaseDomain` (y `dnsTarget`, ver §4) como props.
  **Se eliminan las env `NEXT_PUBLIC_*`** (evita hornearlas en el build de Docker).

### 4. Dominio propio por proyecto

UI en `PublishBar` (visible cuando el proyecto está publicado): campo «Dominio
propio» + botón Conectar / Quitar + instrucciones DNS.

- **Normalización** de entrada: trim, minúsculas, quitar `https://`/`http://`,
  quitar barra final, quitar `www.` inicial. Se guarda el dominio pelado.
- **Validación** (`400 «Dominio no válido (ejemplo: miempresa.com)»`): formato de
  dominio con al menos un punto, labels DNS válidos (RFC), TLD alfabético ≥2,
  longitud total ≤253, sin IP. **Prohibido** que sea `SITES_BASE_DOMAIN`, un
  subdominio suyo, o `PLATFORM_HOST` (evita secuestrar la plataforma).
- **Unicidad:** constraint UNIQUE en `projects.dominio` (nueva, columna ya existe).
  Ocupado (pre-check o carrera 23505) → `409 «Ese dominio ya está conectado a otro
  proyecto»`.
- **API:** rama nueva en `PATCH /api/projects/[id]` con `{dominio: string}` para
  conectar y `{dominio: null}` para quitar (mismo patrón que `subdominio`).
- **DeployTarget crece:** la interfaz gana `connectDomain(dominio)` y
  `disconnectDomain(dominio)`.
  - `selfHostedDeploy` (dev): no-op, como hasta ahora.
  - **`dokployDeploy` (prod, nuevo):** llama a la API REST de Dokploy
    (`DOKPLOY_URL`, header `x-api-key: DOKPLOY_API_KEY`):
    - conectar → `domain.create` para `dominio` y `www.dominio`
      (`applicationId: DOKPLOY_APPLICATION_ID`, `https: true`,
      `certificateType: "letsencrypt"`, puerto de la app).
    - quitar → `domain.byApplicationId` para localizar los `domainId` de ambos
      hosts y `domain.delete` de cada uno.
  - Selección por env `DEPLOY_TARGET=self` (default) | `dokploy`.
  - **Orden y fallos:** validar → comprobar libre → llamar a Dokploy → guardar en
    BD solo si Dokploy respondió OK. Si Dokploy falla: no se guarda nada y la API
    devuelve `502 «No se pudo activar el dominio en el servidor. Vuelve a
    intentarlo en unos minutos.»`. Al quitar: primero BD a null, después Dokploy
    (si Dokploy falla al quitar, se registra en logs pero la desconexión en
    Wordclicks se completa; limpieza manual posible en el panel de Dokploy).
- **Instrucciones DNS** mostradas al conectar (con `dnsTarget` = IP del VPS,
  pasada por env del servidor `DNS_TARGET_IP` → prop):
  - `A  @   → 72.61.176.214`
  - `A  www → 72.61.176.214`
  - Nota de propagación (minutos–horas) y de que los registros MX no deben tocarse.
- La resolución pública por `dominio` ya existe (`getPublishedSiteByHost({dominio})`);
  no cambia.
- Fuera de alcance: verificación automática de DNS («comprobar ahora») — follow-up.

### 5. Esquema de BD

- `projects.dominio`: añadir **UNIQUE** (la columna existe; misma mecánica que la
  unique de `subdominio` del incremento 3 — si `drizzle-kit push` pide truncar por
  el prompt interactivo, DDL manual + verificación con push «No changes detected»).
- Repositorio: `subdominioLibre`/`setSubdominio` ganan equivalentes de dominio
  (`dominioLibre`, `setDominio` con detección de 23505 → false), org-scoped.

### 6. Build de producción

- `next.config.ts`: `output: "standalone"`.
- `Dockerfile` multi-stage (deps → build → runner sin devDependencies), Node 22
  alpine, usuario no-root, `PORT=3000`, arranque `node server.js` (standalone).
- `.dockerignore` (node_modules, data/, .env*, .git, docs, .superpowers).
- Sin `NEXT_PUBLIC_*`: toda config llega por env de runtime (server components la
  pasan como props donde el cliente la necesita).

## Variables de entorno

| Variable | Dev (`.env.local`) | Prod (env de Dokploy) |
|---|---|---|
| `DATABASE_URL` | Supabase pooler (actual) | igual, **con password rotada** |
| `STORAGE_DRIVER` | `local` (default si falta) | `supabase` |
| `STORAGE_DIR` | `data/storage` | — |
| `SUPABASE_URL` | — | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | — | service key **rotada** (solo servidor) |
| `SUPABASE_STORAGE_BUCKET` | — | `sites` |
| `PLATFORM_HOST` | `localhost:3000` | `app.PLATAFORMA.com` |
| `SITES_BASE_DOMAIN` | (sin definir → = PLATFORM_HOST) | `PLATAFORMA.com` |
| `PANEL_PASSWORD` | una de prueba | fuerte, solo del founder |
| `SESSION_SECRET` | aleatoria dev | aleatoria ≥32 bytes |
| `DEPLOY_TARGET` | `self` (default si falta) | `dokploy` |
| `DOKPLOY_URL` | — | URL del panel Dokploy |
| `DOKPLOY_API_KEY` | — | API key generada en Dokploy |
| `DOKPLOY_APPLICATION_ID` | — | id de la app Wordclicks en Dokploy |
| `DNS_TARGET_IP` | `127.0.0.1` | `72.61.176.214` |

`NEXT_PUBLIC_PLATFORM_HOST` se elimina.

## Runbook de estreno (manual, guiado, al final del incremento)

1. Usuario decide el nombre y **compra el dominio ese mismo día**.
2. DNS del dominio madre a Cloudflare (free): `A @`, `A *`, `A app` → `72.61.176.214`,
   todos «DNS only» (nube gris). Token de API (Zone→DNS→Edit) para Traefik.
3. En Supabase: crear bucket privado `sites`; **rotar `service_role` y password de
   BD** (expuestas anteriormente; ahora es obligatorio). Las claves nuevas solo se
   escriben en Dokploy y `.env.local` — nunca en el chat ni en git.
4. GitHub: crear repo privado, push de master, conectar la GitHub App de Dokploy.
5. Dokploy: crear la aplicación (Dockerfile), envs de la tabla, límites de
   recursos, healthcheck `/api/health`, dominio `app.PLATAFORMA.com`; configurar el
   certResolver wildcard + router `HostRegexp` en Traefik (una vez); generar API key
   y `applicationId` para las envs.
6. Primer deploy. `npm run db:push` desde local (URL con password nueva).
7. Re-importar la web Quantiva (ZIP), publicar → verificar
   `https://quantiva-technology.PLATAFORMA.com`.
8. Conectar `nueva.quantivatechnology.com` como dominio propio (un registro A en el
   DNS de quantivatechnology.com, que sigue en Hostinger). Usuario valida.
9. **Cutover** (solo con OK explícito del usuario): cambiar `A @` y `A www` de
   quantivatechnology.com a `72.61.176.214`, sin tocar MX. La web antigua queda de
   respaldo en el hosting cloud.

## Seguridad

- Rotación obligatoria de las credenciales Supabase expuestas (paso 3 del runbook).
- Service key: solo en env del servidor; jamás en cliente, git o chat.
- Cookie host-only firmada (HMAC) → sin filtración a sitios publicados.
- Candado cubre panel + todas las APIs privadas; públicos solo: sitios publicados,
  `/login`, `/api/login`, `/api/health`.
- Serving público sin cambios de garantías (byte-idéntico, guard de traversal,
  mensajes de error de literales fijos).
- La IP del VPS no es secreta (es pública vía DNS); las API keys de Dokploy sí.

## Testing

- **Unit (vitest):** parseHost v2 (plataforma/raiz/subdominio/dominio, puertos,
  default de SITES_BASE_DOMAIN); normalización y validación de dominio (casos
  prohibidos incl. subdominio de la plataforma); firma/verificación de cookie
  (expiración, manipulación); `dokployDeploy` con fetch mockeado (create ok, fallo
  502, delete con lookup); `SupabaseStorage` con cliente mockeado (put/get/list
  recursivo+paginado/delete, contentType por extensión); factories (`STORAGE_DRIVER`,
  `DEPLOY_TARGET`).
- **e2e local (script, como incrementos anteriores):** sin cookie → panel redirige
  a login y APIs dan 401; login con password → panel funciona; flujo completo del
  inc. 3 con candado activo (regresión); conectar/quitar dominio con
  `DEPLOY_TARGET=self`; `www.` → 301 al pelado; host raíz → redirect al panel.
- **Verificación en producción (manual + curl del asistente):** HTTPS válido en
  panel, subdominio y dominio conectado; login; web byte-correcta; CRM del VPS
  intacto.

## Fuera de alcance (3b)

- Login multiusuario real (Supabase Auth) — incremento propio.
- Blog (incremento 4).
- Rediseño visual (brief aparte para sesión de diseño con Claude; integración como
  incremento propio).
- Landing de marketing en la raíz.
- Verificación automática de DNS del dominio conectado.
- Decidir si despublicar libera el subdominio; helper compartido de traversal;
  favicon del matcher (siguen en la lista de follow-ups).
- Renombrar repo/bucket/UI a la marca definitiva (cuando haya nombre).
