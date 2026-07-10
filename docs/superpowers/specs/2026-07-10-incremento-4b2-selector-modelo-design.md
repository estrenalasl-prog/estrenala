# Incremento 4b2 — Selector de modelo de IA por proyecto (diseño)

Fecha: 2026-07-10 · Estado: aprobado (petición directa del usuario tras probar el 4b)

## Contexto y objetivo

El 4b dejó el pipeline de redacción funcionando, pero el modelo es fijo (`OPENROUTER_MODEL` del
`.env.local`, default Sonnet 4.6). El usuario tiene pocos créditos y **no quiere generar hasta poder
elegir el modelo desde la UI** — incluido un modelo barato o `:free` para probar el circuito entero.
El 4b2 añade la **elección de modelo por proyecto** en el bloque «Escribir con IA».

No es el BYOK completo (clave OpenRouter propia por usuario): eso queda para multiusuario. Aquí la
clave sigue siendo la del servidor; solo se parametriza el **modelo** de las llamadas del pipeline.

## Decisiones

1. **Ámbito por proyecto**, guardado en `blog_settings.modelo` (text, default `''` = modelo por
   defecto de la plataforma). La tabla se creó en el 4b precisamente para crecer así.
2. **UI**: un `<select>` con una lista corta curada + opción «Otro…» con input libre para cualquier
   slug de openrouter.ai/models (ahí puede escribir p. ej. un `:free`). Curados:
   - `''` — Por defecto de la plataforma (Claude Sonnet 4.6)
   - `anthropic/claude-sonnet-4.6` — calidad máxima
   - `anthropic/claude-haiku-4.5` — rápido y económico
   - `openai/gpt-5-mini` — económico
   - `google/gemini-2.5-flash` — muy económico
   - `deepseek/deepseek-chat` — muy económico
3. El modelo elegido afecta a **las 6 etapas del pipeline** (4b). La generación de plantillas del 4a
   sigue con el modelo por defecto (se usa una vez; fuera de alcance).
4. El workspace muestra el modelo con el que se va a generar, ANTES de gastar.

## Cambios

- `src/ia/claude.ts`: `pedirTexto(prompt, maxTokens?, modelo?)`, `pedirJson(prompt, schema,
  maxTokens?, modelo?)`, `pedirConBusquedaWeb(prompt, maxTokens?, maxBusquedas?, modelo?)`. Si
  `modelo` llega, sobreescribe el default en el body (`completar` ya hace `{ model: MODELO, ...body }`).
- BD: `ALTER TABLE blog_settings ADD COLUMN modelo text NOT NULL DEFAULT ''` (SQL manual).
  `BlogSettings = { nicho, idioma, modelo }` en el `BlogStore`.
- Pipeline: `Contexto` gana `modelo: string`; el orquestador lo lee de settings; cada etapa lo pasa a
  su llamada IA (`ctx.modelo || undefined`).
- API `blog/settings`: GET devuelve `modelo` (default `''`); PUT acepta `{ nicho, modelo?, idioma? }`.
  Límite: modelo ≤ 100 chars → 400 «El nombre del modelo es demasiado largo (máx. 100 caracteres)».
- UI `BlogPanel`: selector + input «Otro…» junto al nicho, un solo botón Guardar para ambos;
  `ArticleAiWorkspace` recibe el nombre legible por prop y lo muestra.

## Casos borde

- Modelo inexistente/mal escrito → la etapa falla con el error de OpenRouter en `errorMsg` (patrón
  4b); el usuario corrige el modelo y reintenta la etapa. No se valida contra la lista de OpenRouter.
- Modelos sin soporte de `response_format` estructurado → fallan `analisis`/`metadatos` con error
  visible; se documenta en la UI («si un modelo da error, prueba otro»).
- Cambiar el modelo a mitad de pipeline afecta solo a las etapas que se ejecuten después (checkpoint
  por etapa, como el 4b).

## Testing

- Unit: cliente IA (body.model sobreescrito con modelo explícito; default sin él); orquestador pasa
  `ctx.modelo` a cada tipo de llamada (pedirJson/pedirTexto/pedirConBusquedaWeb).
- E2e sin IA: PUT/GET de settings con modelo; límite de 100 chars byte-exacto.
- La generación real con el modelo elegido la valida el usuario (es justo lo que quiere probar).

## Fuera de alcance

BYOK real (clave por usuario) · modelo para la generación de plantillas del 4a · lista dinámica de
modelos desde la API de OpenRouter · precios exactos por modelo en la UI.
