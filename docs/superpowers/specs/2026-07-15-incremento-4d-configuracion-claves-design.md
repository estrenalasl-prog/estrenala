# Incremento 4d — Sección Configuración: claves API desde la UI (diseño)

Fecha: 2026-07-15 · Estado: pedido directo del usuario («la clave de SerpAPI debería ponerse en la UI; crear una sección de configuración con APIs, conexiones, etc. — que cada usuario use su API para todo»)

## Contexto y objetivo

Hoy las claves (OpenRouter, SerpAPI) viven en `.env.local`: solo las puede poner quien toca el
servidor. El 4d crea la **página `/settings`** («Configuración») con la sección **APIs y
conexiones**, donde el usuario pega sus claves desde el navegador. Es el primer paso del BYOK real:
las claves se guardan **por organización** (`org_settings`), así que cuando llegue el multiusuario
cada org traerá las suyas.

Nota de producto (backlog, NO se construye ahora): el usuario contempla que el blog sea una sección
premium; la monetización se planeará cuando toque.

## Decisiones

1. **Resolución de claves: UI primero, `.env.local` de respaldo.** Si la clave guardada en
   Configuración está vacía, se usa la del servidor (si existe). Así el despliegue actual sigue
   funcionando sin tocar nada y quitar la clave de la UI («Quitar») vuelve al respaldo.
2. **Tabla `org_settings`** (org-scoped, UNIQUE org_id): `openrouter_key`, `serpapi_key` (text,
   default `''`). Se guardan tal cual en la BD del usuario (mismo nivel de confianza que su
   `.env.local`); cifrado en reposo queda anotado como mejora futura.
3. **La API nunca devuelve la clave completa**: GET expone solo `{ origen: "ui" | "env" | null,
   sufijo: "…últimos 4" }` por servicio.
4. **Probar conexión sin gastar**: OpenRouter ya tiene `probarConexionModelo()` (endpoint `/key`);
   para SerpAPI se añade `probarConexionSerpApi()` (endpoint `account.json`, no consume créditos).
5. **Mensajes de error actualizados** (sustituyen a los «Falta X en .env.local» del 4a/4c):
   «Falta la clave de OpenRouter: añádela en Configuración» · «Falta la clave de SerpAPI: añádela en
   Configuración». Aparecen solo cuando no hay clave NI en la UI NI en el entorno.
6. El resolutor (`src/config/claves.ts`) intenta leer la BD y, si no hay BD disponible (tests
   unitarios sin `DATABASE_URL`), cae al entorno — los tests existentes que stubean env siguen
   valiendo con el mensaje nuevo.

## API (tras el candado; `/settings` y `/api/settings` quedan cubiertos por el middleware actual)

| Ruta | Métodos |
|---|---|
| `/api/settings` | GET → 200 `{ openrouter: { origen, sufijo }, serpapi: { origen, sufijo } }` · PUT `{ openrouterKey?, serpapiKey? }` (parcial; `""` limpia y vuelve al respaldo; > 200 chars → 400 «La clave es demasiado larga (máx. 200 caracteres)») → 200 `{ ok: true }` |
| `/api/settings/probar` | POST `{ cual: "openrouter" \| "serpapi" }` → 200 `{ ok: true, detalle }` o `{ ok: false, error }` · 400 «Servicio desconocido» |

## UI

- Página **`/settings`** (client): cabecera con «← Volver», título «Configuración», sección
  **APIs y conexiones** con una tarjeta por servicio:
  - **OpenRouter** («redacta los artículos del blog y genera las plantillas»): estado («Usando tu
    clave (…abcd)» / «Usando la del servidor» / «Sin configurar»), input tipo password, Guardar,
    Probar conexión, Quitar (si origen ui). Enlace a openrouter.ai/keys.
  - **SerpAPI** («radar de temas en tendencia; clave gratuita, 100 búsquedas/mes»): ídem, enlace a
    serpapi.com.
- Enlace **«⚙ Configuración»** en la cabecera del panel de proyectos (`app/page.tsx`).
- El diseño de la página sigue el estilo actual (gris/tarjetas); el rediseño visual llega con el
  design-brief.

## Casos borde

- Clave de UI inválida: los consumidores fallan con el error real del proveedor (401 de SerpAPI, 401
  de OpenRouter) — visible y reintentable; «Probar conexión» permite detectarlo antes de gastar.
- Borrar la clave de la UI con respaldo en env → se sigue funcionando con la del servidor (GET
  vuelve a `origen: "env"`).
- Sin clave en ningún sitio → mensajes byte-exactos de la decisión 5.

## Testing

- Unit: resolutor con fallback a env (sin BD); `probarConexionSerpApi` con fetch mockeado; mensajes
  nuevos en `site-template` (OpenRouter) y `radar` (SerpAPI) — se actualizan sus asserts.
- E2e: GET estados iniciales (openrouter `env`, serpapi `null`); PUT clave falsa de SerpAPI → origen
  `ui` + sufijo, y el radar pasa del «falta la clave» al error real de SerpAPI (401, sin créditos);
  PUT `""` → vuelve a `null` y al mensaje de falta; límite 200 chars; PUT/limpiar openrouterKey →
  origen ui → env (sin llamadas IA por medio).
- La prueba con claves reales desde la UI la hace el usuario.

## Fuera de alcance

Cifrado de claves en reposo · claves por usuario individual (multiusuario) · más ajustes en la
página (idioma UI, plan/billing) · gating premium del blog (backlog de monetización).
