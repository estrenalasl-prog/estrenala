# Incremento 4e — Publicación programada (diseño)

Fecha: 2026-07-16 · Estado: elegido por el usuario entre los candidatos del backlog («seguimos adelante»)

## Contexto y objetivo

Con 4b (redacción IA), 4c (radar) y 4d (claves propias) el blog ya encuentra temas y redacta
artículos, pero el último paso sigue siendo manual: el usuario tiene que pulsar «Guardar» y luego
«Publicar» el sitio. El 4e cierra el círculo del **blog en piloto automático**: desde el editor de
artículos se elige fecha y hora, y el artículo **se publica solo** en ese momento (se materializa
en el snapshot Y se publica el sitio), sin gastar créditos de IA ni de SerpAPI en el proceso.

## Cómo funciona

1. **Programar** (editor del BlogPanel): junto a «Guardar» aparece «Programar publicación» con un
   selector de fecha y hora. Al programar se validan los mismos requisitos que al guardar
   (plantilla, título, slug único, meta, imagen de portada, huecos de plantilla) para detectar los
   problemas AHORA y no a las 3 de la mañana. El contenido completo del artículo queda guardado en
   una fila de `scheduled_posts`; si venía de un borrador IA, el borrador se borra (el contenido ya
   vive en la programación, como hace hoy Guardar).
2. **Publicar** (runner `publicarVencidos`): busca programaciones `pendiente` con
   `publicar_en <= now()`, las **reclama** (estado → `publicando`, evita dobles si dos ticks se
   solapan) y para cada una ejecuta `guardarPost` (snapshot con el HTML) + `publishSite` (el sitio
   queda público; si nunca se publicó, se publica ahora — eso ES publicar). Éxito → estado
   `publicado` + `post_id`; fallo → estado `error` + `error_msg` visible en la UI (el contenido no
   se pierde). La `fecha` del post es la del día en que se publica de verdad.
3. **Disparadores** (dos, complementarios):
   - `instrumentation.ts` (estable en Next 15+): al arrancar el servidor, un intervalo de 60 s
     llama al runner (solo runtime nodejs; guarda en `globalThis` para no duplicar el intervalo con
     el hot reload). Es lo que hace que funcione en dev y en un `next start` autoalojado.
   - `POST /api/cron/publicar`: endpoint para cron externo (Vercel Cron, curl). Si existe
     `CRON_SECRET` en el entorno, exige `Authorization: Bearer <secret>`; sin la variable, abierto
     (dev). Devuelve `{ publicados, errores }`.

## Modelo de datos (SQL manual, patrón 4a/4b/4c)

```
scheduled_posts:
  id uuid pk, project_id → projects(id) notnull,
  titulo text notnull, slug text notnull, meta_descripcion text notnull,
  md text notnull, imagen_asset_id uuid notnull,
  publicar_en timestamptz notnull,
  estado text notnull default 'pendiente',   -- pendiente | publicando | publicado | error
  error_msg text, post_id uuid,
  created_at/updated_at timestamptz notnull default now()
```

`BlogStore` (org-scoped): `crearProgramado`, `listProgramados` (publicar_en asc),
`borrarProgramado` (false si no existe). Para el runner (global, cruza organizaciones):
`reclamarProgramadosVencidos(limite)` — UPDATE pendiente→publicando … RETURNING con `org_id` del
join a projects — y `resolverProgramado(id, { estado, errorMsg?, postId? })`.

## Módulo (`src/blog/programados/`)

- `programarPost(deps, input)`: mismas validaciones de longitud que `guardarPost` + 
  `validarPrePublicacion` sobre el HTML renderizado (plantilla obligatoria, imagen obligatoria,
  slug único frente a posts existentes Y frente a otras programaciones pendientes del proyecto) +
  «Elige fecha y hora para programar» (falta/inválida) y «La fecha de publicación debe ser futura».
- `publicarVencidos(deps)`: reclama vencidos y ejecuta `guardarPost` + `publishSite` por cada uno;
  un fallo marca SU fila como `error` y sigue con las demás. Devuelve `{ publicados, errores }`.

## API (tras el candado, patrón conError)

| Ruta | Métodos |
|---|---|
| `blog/programados` | GET → 200 lista `[{ id, titulo, slug, publicarEn, estado, errorMsg, postId }]` · POST `{ titulo, slug, metaDescripcion, md, imagenAssetId, publicarEn, borradorId? }` → 201 `{ programadoId }` (si `borradorId`, borra el borrador) |
| `blog/programados/[progId]` | DELETE → 200 `{ ok: true }` · 404 «Programación no encontrada» |
| `/api/cron/publicar` | POST (sin candado de org: es global) → 200 `{ publicados, errores }` · 401 si `CRON_SECRET` existe y no coincide |

## UI (BlogPanel)

- **Editor**: bajo el botón Guardar, fila «Programar publicación»: input `datetime-local` + botón
  «Programar». Al programar con éxito → vuelve a la lista con aviso «Artículo programado para el
  {fecha y hora local}». La hora se elige en horario local del navegador (se guarda en UTC).
- **Lista**: bloque **«Programados»** (solo si hay filas): título, fecha/hora local, badge de
  estado (⏳ pendiente · ✓ publicado · ⚠ error con su mensaje). Acciones: `pendiente|error` →
  «Editar» (carga el contenido en el editor y borra la programación: reprogramar = volver a
  programar) · `publicado` → «Ocultar» (borra la fila; el post ya vive en Artículos).

## Coste y seguridad

- **Cero IA y cero SerpAPI**: programar y publicar solo mueven contenido ya redactado.
- El runner corre en servidor; el endpoint cron es global pero solo dispara publicaciones ya
  aprobadas por el usuario y puede protegerse con `CRON_SECRET` (se añade comentado a `.env.example`).

## Testing

- Unit (fakes org-scoped, patrón radar): programar valida todo antes de crear la fila (mensajes
  byte-exactos); fecha pasada → 400; slug duplicado contra posts y contra pendientes; runner
  publica vencidos y no los futuros, reclama (no publica dos veces), un fallo marca error y sigue,
  éxito guarda postId y publica el sitio.
- E2e **sin gastar nada** (guarda de claves reales intacta): proyecto + plantilla + asset reales en
  dev → POST programados con fecha pasada (vía SQL se fuerza `publicar_en` en el pasado si la API
  exige futuro) → POST /api/cron/publicar → el post existe, el sitio quedó publicado, la fila quedó
  `publicado`; DELETE de una pendiente; validaciones 400.

## Fuera de alcance

Ediciones de una programación in situ (se cancela y reprograma) · repetición/recurrencia ·
auto-programar borradores del radar sin intervención del usuario (candidato natural a 4f) ·
imagen de portada generada con IA (sigue en backlog) · zona horaria configurable (se usa la del
navegador).
