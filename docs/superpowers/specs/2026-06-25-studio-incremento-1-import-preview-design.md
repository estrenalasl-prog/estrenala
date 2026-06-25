# Studio — Incremento 1: Importar ZIP → Preview en el panel

- **Fecha:** 2026-06-25
- **Estado:** Aprobado (diseño). Pendiente de revisión del spec antes del plan de implementación.
- **Autor:** Ingeniería (con Sebastian, founder).

---

## 1. Contexto del producto

**Studio** = "el WordPress para webs hechas con IA". El usuario sube el HTML que le generó
cualquier IA (Claude Code, Lovable, Bolt, v0…) y desde un panel lo **pone online**, **edita
textos e imágenes sin tocar código** y le **añade un blog automático**, todo en un mismo sitio.

**Usuario objetivo del MVP: agencia-first** (agencias y freelancers que entregan webs a
clientes). Implica **multi-proyecto** desde el inicio; la arquitectura multi-proyecto generaliza
sola al creador final no técnico más adelante.

Este spec cubre **solo el Incremento 1** del MVP, situándolo dentro de la arquitectura completa
para que las decisiones de hoy no nos cierren puertas mañana.

---

## 2. Alcance

### En alcance (Incremento 1 — la rebanada fina)

> **Objetivo:** subo un ZIP de una web estática y la veo renderizada **fiel** en el dashboard,
> como un proyecto dentro de una organización.

1. Scaffold de la app Studio (Next.js App Router + TS + Tailwind + Postgres/Drizzle).
2. Dos **adaptadores** desde el día 1 (`StorageAdapter`, `AuthAdapter`) con implementación
   local; los proveedores reales se enchufan después sin tocar la lógica.
3. Modelo de datos mínimo multi-tenant: `Organization`, `User`, `Project`, `Asset`, `Snapshot`.
4. **Importar**: drag & drop de un ZIP → descompresión → validación → detección del `index.html`
   de entrada → escritura al storage → creación de `Project` + primer `Snapshot`.
5. **Dashboard** multi-proyecto (lista de proyectos de la organización + acción de importar).
6. **Preview**: página de proyecto con `<iframe>` sandbox que renderiza el sitio importado
   sirviendo sus archivos a través de una ruta de Next, **sin mutar el HTML almacenado**.

### Fuera de alcance (incrementos posteriores, en este orden)

- **Incremento 2 — Editor de contenido** (texto/imagen/enlace/color) con operaciones
  estructuradas, snapshots de edición y revertir.
- **Incremento 3 — Deploy** (capa de adaptadores; primer adaptador a host gestionado, p. ej.
  Cloudflare Pages: subdominio + dominio propio + SSL).
- **Incremento 4 — Blog** (portando las libs puras del `Creador de Blog/`; ver §11).
- **Fase 2+:** Clerk/R2/Postgres gestionados reales, Stripe, dominios, BYO-host
  (Vercel/Hostinger/GitHub), importar desde GitHub, constructor visual completo, white-label.

---

## 3. Decisiones arquitectónicas

| # | Decisión | Razón | ¿Increm. 1? |
|---|----------|-------|-------------|
| D1 | **App Studio nueva** (no evolucionar el `Creador de Blog/`) | El blog es el Módulo 4; el increm. 1 no lo toca. El Creador queda intacto como herramienta y como "librería fuente" para portar sus libs puras. Evita entrelazar un rework grande con código que ya funciona. | Sí |
| D2 | **Local-first detrás de adaptadores** | "Rebanada fina primero": el flujo ZIP→preview corre en la máquina del founder hoy, sin crear cuentas. Los adaptadores cumplen el principio "capa de adaptadores desde el día 1". | Sí |
| D3 | **Postgres + Drizzle** | El brief pide Postgres (orgs, plan/uso). Drizzle ya se usa en el Creador → conceptos y patrones transfieren. En local: Postgres por Docker o un proyecto free de Neon/Supabase. | Sí |
| D4 | **Preview sirviendo archivos por una ruta de Next** | Renderiza HTML arbitrario **sin mutarlo**; las root-absolutas se reescriben solo en la respuesta del preview, nunca en el archivo guardado. Es la **misma base sobre la que montará el editor** (increm. 2). | Sí |
| D5 | Storage real: **Cloudflare R2** | S3-compatible y **sin egress fees** — clave porque servir previews y webs publicadas es lectura constante. Se enchufa vía `StorageAdapter`. | No (interfaz sí) |
| D6 | Auth real: **Clerk** | Sus *Organizations* nativas = el multi-tenant del brief sin construirlo. Se enchufa vía `AuthAdapter`. | No (interfaz sí) |
| D7 | Host gestionado: **Cloudflare Pages** | Subdominio instantáneo + dominio propio + SSL automático; encaja con R2/Cloudflare. Es una decisión del Módulo Deploy (increm. 3). | No |
| D8 | IA del blog: **SDK de Anthropic directo** (no OpenRouter) detrás de la misma interfaz `pedirTexto/pedirJson/pedirConBusquedaWeb` del Creador | El brief pide "Claude API (Anthropic)"; facturación/medición de créditos más limpia para el plan premium. Mantener la **interfaz** del Creador permite portar el pipeline sin cambios. | No (decisión del increm. 4) |

**Naming:** la app Studio vive en la raíz del workspace (`Wordclicks/`), como hermana de
`Creador de Blog/`. El nombre de paquete/carpeta concreto se fija al hacer el scaffold; este
spec lo trata como "la app Studio".

---

## 4. Arquitectura de módulos (visión)

Un **núcleo (Proyecto)** + cuatro módulos. El increment 1 construye el **núcleo** + **Importar**
+ la base del **Preview** (que el Editor reutiliza).

```
┌─────────────────────────────────────────────────────────────┐
│  Panel (Next.js App Router + Tailwind)                       │
│  Dashboard · Página de proyecto (preview)                    │
└───────────────┬─────────────────────────────────────────────┘
                │
   ┌────────────┴───────────┐   ┌──────────────┐   ┌──────────┐
   │ Núcleo / Proyecto       │   │ Importar      │   │ Editor   │ (increm. 2)
   │ (Project, Snapshot)     │   │ (ZIP→storage) │   │          │
   └────────────┬───────────┘   └──────┬───────┘   └──────────┘
                │                       │
        ┌───────┴────────┐      ┌───────┴────────┐   ┌──────────┐
        │ AuthAdapter     │      │ StorageAdapter │   │ Deploy   │ (increm. 3)
        │ (dev-stub→Clerk)│      │ (fs → R2)      │   │ adapters │
        └────────────────┘      └────────────────┘   └──────────┘
                                                       ┌──────────┐
                                                       │ Blog     │ (increm. 4)
                                                       └──────────┘
```

---

## 5. Modelo de datos

Solo las tablas del increment 1. Las futuras (`Deployment`, `Domain`, `BlogPost`, `Keyword`) se
añaden en sus incrementos; aquí se nombran para que las relaciones encajen.

```
Organization
  id            uuid pk
  nombre        text
  plan          text default 'free'        -- 'free' | 'agency' (sin lógica de límites aún)
  uso_json      jsonb default '{}'          -- contadores de uso medido (placeholder)
  created_at    timestamptz

User
  id            uuid pk
  email         text unique
  nombre        text
  created_at    timestamptz

Membership                                   -- usuario ↔ organización (multi-tenant)
  id            uuid pk
  org_id        uuid fk -> Organization
  user_id       uuid fk -> User
  rol           text default 'owner'         -- 'owner' | 'member'
  unique(org_id, user_id)

Project
  id                 uuid pk
  org_id             uuid fk -> Organization
  nombre             text
  subdominio         text null                -- se asigna en Deploy (increm. 3)
  dominio            text null                -- dominio propio (increm. 3)
  entry_path         text                     -- p. ej. 'index.html' (detectado al importar)
  current_snapshot_id uuid null fk -> Snapshot
  created_at         timestamptz

Snapshot
  id            uuid pk
  project_id    uuid fk -> Project
  parent_id     uuid null fk -> Snapshot      -- null en el snapshot de import; padre en ediciones
  tipo          text                          -- 'import' | 'edit' (increm. 2)
  storage_prefix text                         -- prefijo en storage con el árbol de esta versión
  operaciones_json jsonb null                 -- ops de edición (increm. 2); null en 'import'
  created_at    timestamptz

Asset                                          -- imágenes subidas por el usuario (editor/blog)
  id            uuid pk
  project_id    uuid fk -> Project
  storage_key   text
  content_type  text
  bytes         integer
  created_at    timestamptz
```

**Notas:**
- `Organization.plan`/`uso_json` se incluyen ya (coste cero) para no migrar el esquema cuando
  llegue la lógica de límites; en increment 1 no se leen.
- En increment 1 cada `Project` tiene **un** `Snapshot` de tipo `import`. `current_snapshot_id`
  apunta a él. `Asset` existe como tabla pero no se llena hasta el editor (increment 2).

---

## 6. Adaptadores

### 6.1 `StorageAdapter`

```ts
interface StorageAdapter {
  put(key: string, body: Buffer | string, contentType?: string): Promise<void>;
  get(key: string): Promise<{ body: Buffer; contentType: string } | null>;
  list(prefix: string): Promise<string[]>;          // claves bajo el prefijo
  delete(key: string): Promise<void>;
}
```

- **Impl. local (`fs`)** para increment 1: raíz configurable (p. ej. `data/storage/`), fuera de
  git. `content_type` se infiere por extensión y se guarda junto al archivo (sidecar o mapa).
- **Impl. R2** (Fase 2): mismo contrato vía SDK S3-compatible. Cambiar de una a otra **no** toca
  la lógica de import ni de preview.

**Esquema de claves:**

```
projects/<projectId>/snapshots/<snapshotId>/<ruta-relativa-del-archivo>
projects/<projectId>/assets/<assetId>.<ext>
```

### 6.2 `AuthAdapter`

```ts
interface AuthAdapter {
  // Devuelve la identidad + organización activa de la petición.
  getContext(req: Request): Promise<{ user: User; org: Organization } | null>;
}
```

- **Impl. dev-stub** para increment 1: garantiza (crea si no existen) un `User` y una
  `Organization` fijos de desarrollo y los devuelve. No hay login real.
- **Impl. Clerk** (Fase 2): lee la sesión y la organización activa de Clerk y las mapea a
  nuestras filas (`User`/`Organization`/`Membership`).

Todas las rutas y server components obtienen `{ user, org }` por este adaptador; nunca leen el
proveedor de auth directamente.

---

## 7. Flujo de Importar

1. **UI:** zona de drag & drop en el dashboard acepta un `.zip` (también selector de archivo).
2. **`POST /api/projects`** (multipart): recibe el ZIP y un nombre opcional de proyecto.
3. **Descompresión** en memoria/temp (límites: tamaño total del ZIP, nº de archivos, tamaño por
   archivo; rechazo de rutas con `..` o absolutas — *zip-slip*).
4. **Validación de contenido:** solo extensiones web-seguras (`html, htm, css, js, mjs, json,
   svg, png, jpg, jpeg, gif, webp, avif, ico, woff, woff2, ttf, otf, txt, xml, map, …`). Tipos no
   reconocidos se ignoran con aviso, no rompen el import.
5. **Detección del `index.html` de entrada (regla determinista):** elegir, en este orden, (a) el
   `index.html` menos profundo; si no hay ninguno, (b) el `.html` menos profundo; si no hay
   ningún `.html`, **error** ("el ZIP no contiene ninguna página HTML"). El resultado se guarda en
   `Project.entry_path`. Un selector/override de la página de entrada se **difiere** (no se
   construye en increment 1). Se normaliza el árbol si el ZIP tiene una carpeta raíz envolvente
   (se "sube" un nivel) antes de aplicar la regla.
6. **Escritura al storage:** cada archivo → `StorageAdapter.put(<prefijo-snapshot>/<ruta>, …)`.
7. **Persistencia:** crea `Project` (con `entry_path`) + `Snapshot` (`tipo='import'`,
   `storage_prefix`), fija `Project.current_snapshot_id`.
8. **Respuesta:** `{ projectId }` → el cliente navega a `/projects/<id>`.

**Errores con mensaje claro:** ZIP corrupto, sin ningún `.html`, supera límites, vacío.

---

## 8. Flujo de Preview

- **Página `/projects/[id]`:** server component que carga el proyecto (vía `AuthAdapter`,
  comprobando que pertenece a la org) y muestra un `<iframe sandbox>` cuyo `src` apunta a la ruta
  de preview del snapshot actual.
- **Ruta `GET /api/projects/[id]/preview/[[...path]]`:**
  - `path` vacío → sirve el `entry_path` del proyecto.
  - Resuelve la clave `projects/<id>/snapshots/<current>/<path>` vía `StorageAdapter.get` y
    responde con el `content-type` correcto.
  - **Documento de entrada (HTML):** se sirve **reescrito on-the-fly** para que cargue en el
    iframe, **sin alterar el archivo almacenado**:
    - Inyecta `<base href="/api/projects/<id>/preview/">` para que las rutas relativas resuelvan.
    - Reescribe referencias **root-absolutas** (`src="/..."`, `href="/..."`, `url(/...)` en
      estilos inline) al prefijo del preview. (Las relativas funcionan solas por el `<base>`.)
  - Assets (css/js/img/fuentes) se sirven tal cual desde storage.
- **Sandbox:** `sandbox="allow-scripts"` (sin `allow-same-origin` salvo que un caso lo exija);
  CSP del preview acotada. El objetivo es **fidelidad visual**, no interactividad con el panel.
- **Importante:** estas reescrituras son **solo de preview**. La web *publicada* (Módulo Deploy,
  increment 3) se sirve en su propia raíz, donde las rutas root-absolutas funcionan nativamente y
  estos parches no aplican. El HTML almacenado permanece **limpio**.

---

## 9. Snapshots: modelo y evolución

- **Increment 1:** un `Snapshot` `tipo='import'` guarda el **árbol completo** importado bajo su
  `storage_prefix`. Simple y correcto.
- **Increment 2 (editor):** cada guardado crea un `Snapshot` `tipo='edit'` con `parent_id` y
  `operaciones_json` (`{ ruta-del-nodo, propiedad, valorNuevo }`). El servidor aplica las
  operaciones sobre el árbol del padre para materializar el árbol de la nueva versión. Ventajas
  del brief: HTML publicado limpio, operaciones reaplicables aunque se reimporte, buen versionado.
- **Revertir:** cambiar `Project.current_snapshot_id` a un snapshot anterior.

> La interfaz de almacenamiento y el campo `operaciones_json` ya quedan listos en increment 1 para
> no migrar nada al construir el editor.

---

## 10. Panel (UI)

- **`/` (Dashboard):** lista de proyectos de la org (nombre, fecha, miniatura/placeholder),
  botón/zona "Importar web (.zip)". Estados: vacío (onboarding), cargando, error.
- **`/projects/[id]`:** cabecera con nombre del proyecto + iframe de preview a tamaño realista
  (toggle desktop/móvil opcional, no crítico). Botón de re-importar (reemplaza creando un nuevo
  snapshot de import) — opcional para increment 1.
- Tailwind para el panel. Sin framework dentro del iframe (regla del brief; relevante en
  increment 2).

---

## 11. Reuso del `Creador de Blog/` (referencia para el Increment 4)

No se toca en increment 1, pero se documenta el mapeo para no perderlo:

| Pieza del Creador | Acción en Studio |
|---|---|
| `src/lib/template.ts`, `blog-index.ts`, `markdown.ts`, `sitemap.ts`, `validate.ts`, `slug.ts` | **Portar tal cual** (lógica pura determinista). |
| `src/services/pipeline/**` (6 etapas + dispatcher) | **Portar tal cual**; cambia solo de dónde lee el sitio (Project en vez de `sites` SQLite). |
| `src/services/keywords.ts`, `serpapi.ts` | **Portar** (radar de keywords). |
| `src/services/site-template.ts` | **Portar y adaptar**: genera la "plantilla del proyecto" desde el `index.html` **del storage del proyecto** (no del repo de GitHub). |
| `src/services/claude.ts` | **Reimplementar la interfaz** sobre el SDK de Anthropic (D8), manteniendo `pedirTexto/pedirJson/pedirConBusquedaWeb`. |
| `src/services/publicar.ts` | **Sustituir el destino**: en vez de `commitAtomico()` a GitHub, escribir `blog/<slug>.html`, `blog/index.html`, imagen y `sitemap.xml` al **storage del proyecto**; el Módulo Deploy publica. |
| `src/services/github.ts` | **No portar** al núcleo; reaparece como un *adaptador de deploy* en Fase 2. |

---

## 12. Manejo de errores

- Import: validar antes de escribir; si algo falla a mitad, no dejar un `Project` a medias
  (crear filas en transacción tras escribir storage con éxito; si la escritura falla, abortar y
  limpiar el prefijo del snapshot).
- Preview: archivo no encontrado → 404 con mensaje; entry no detectable → estado de proyecto
  "necesita elegir entrada".
- Adaptadores: errores envueltos con contexto (qué clave/operación falló).

---

## 13. Testing y verificación

- **Unit:** detección de entry (varios layouts de ZIP), normalización de carpeta raíz, rechazo
  zip-slip, validación de extensiones, reescritura de root-absolutas del preview (entrada con
  rutas relativas, root-absolutas y mixtas), esquema de claves del storage.
- **Integración:** `StorageAdapter` local (put/get/list/delete round-trip).
- **Verificación visual (definición de hecho):** importar un ZIP real de una web estática
  (HTML+CSS+imágenes) → aparece en el dashboard → abrir el proyecto → **el preview se ve idéntico
  al original (CSS e imágenes cargan)** → confirmar con **captura de pantalla**. El HTML
  almacenado se inspecciona y está **sin restos** (idéntico al subido).

---

## 14. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Rutas de assets root-absolutas no cargan en el preview | Reescritura on-the-fly solo en la respuesta del preview + `<base>`; no toca el archivo guardado. En producción (raíz propia) el problema no existe. |
| ZIPs con carpeta raíz envolvente o estructuras raras | Normalizar el árbol; heurística de detección de entry con fallback a elección del usuario. |
| Seguridad del unzip (zip-slip, bombas zip) | Rechazar rutas `..`/absolutas; límites de tamaño/nº de archivos; descompresión acotada. |
| Acoplarse a fs y luego sufrir al pasar a R2 | Todo pasa por `StorageAdapter`; la impl. local respeta exactamente el contrato. |
| El preview parece "suficiente" y se cuela mutación del HTML | Test que compara byte a byte el HTML almacenado con el subido; la reescritura vive en la capa de servir, no en el import. |

---

## 15. Decisiones diferidas (no resolver ahora)

- Proveedor exacto de Postgres gestionado (Neon vs Supabase) — en increment 1 da igual (Drizzle).
- Detalles de Cloudflare Pages API (Módulo Deploy, increment 3).
- SDK/medición de créditos de Anthropic (Módulo Blog, increment 4).
- Stripe, dominios, white-label, BYO-host, importar desde GitHub — Fase 2.
