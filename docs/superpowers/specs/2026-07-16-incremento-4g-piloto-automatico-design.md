# Incremento 4g — Piloto automático del blog (diseño)

Fecha: 2026-07-16 · Estado: continuación natural acordada («sigamos adelante» tras validar 4f); todas las piezas existen (4c radar, 4b pipeline, 4f portada, 4e programación)

## Contexto y objetivo

El circuito completo ya funciona con clics: radar → «Escribir artículo» → revisar → portada → programar.
El 4g quita los clics: **un proyecto con el piloto activado publica artículos solo** — el radar
encuentra el tema del día, la IA redacta con el modelo elegido por el usuario, la portada se genera
sola y la publicación se programa. El usuario solo ve el resultado (y un registro de lo que pasó).

**Principios de gasto (el usuario tiene pocos créditos):**
- OFF por defecto; se activa por proyecto con aviso claro de costes.
- Máximo **1 artículo por ejecución** y frecuencia configurable (cada 1 / 3 / 7 días).
- Solo escribe si el radar encuentra un tema que de verdad encaje: **relevancia > 60**
  (constante `PILOTO_RELEVANCIA_MINIMA`). Si no lo hay, ese día no se gasta NADA en redactar
  y el registro lo dice.
- El radar del piloto respeta la caché diaria del 4c (máx. 4 créditos SerpAPI/día, compartidos
  con el botón manual). La puntuación sigue usando el modelo por defecto de la plataforma; la
  redacción usa el modelo del usuario (con DeepSeek, ~1-2 céntimos por artículo).
- Portada en modo `diseno` (gratis) por defecto; `ia` opcional. Si `ia` falla, cae a `diseno`.
- Sin claves (OpenRouter/SerpAPI) el piloto no arranca: lo registra y no lo reintenta hasta el
  día siguiente.

## Modelo de datos (columnas nuevas en `blog_settings`, SQL manual)

```
piloto_activo boolean NOT NULL DEFAULT false
piloto_cada_dias integer NOT NULL DEFAULT 1      -- 1 | 3 | 7
piloto_hora integer NOT NULL DEFAULT 9           -- hora local del servidor (0-23)
piloto_portada text NOT NULL DEFAULT 'diseno'    -- diseno | ia
piloto_ultimo_dia text                            -- YYYY-MM-DD local; también actúa de reclamo
piloto_ultimo_msg text                            -- registro humano del último resultado
```

`BlogStore` + (sin tocar `BlogSettings` ni su PUT, para no pisar config):
`getPiloto` / `setPiloto` (upsert solo de columnas piloto) · `listPilotosActivos()` (global, join
projects → orgId) · `reclamarPiloto(projectId, dia)` — UPDATE … WHERE `piloto_ultimo_dia IS
DISTINCT FROM dia` RETURNING (dos ticks solapados: solo uno gana) · `registrarPiloto(projectId, msg)`.

## Runner (`src/blog/piloto/index.ts`)

`pilotoTick(deps { store, blog, storage }, ahora = new Date())` → `{ ejecutados, publicados }`.
Para cada piloto activo: ¿toca? (`hora local >= piloto_hora` y `hoy − ultimo_dia >= cada_dias`)
→ reclamo del día → y dentro de un try/catch cuyo fallo SIEMPRE queda en `piloto_ultimo_msg`:

1. **Claves**: sin OpenRouter o sin SerpAPI → registra «El piloto no arrancó: falta la clave de X
   (Configuración)» y para.
2. **Radar**: `actualizarRadar` (caché diaria = gratis si ya corrió hoy); un EditorError (sin
   nicho, SerpAPI caído) se registra con su mensaje.
3. **Tema**: primera keyword `nueva` con `relevancia > 60`. Si no hay → registra «Hoy no había
   ningún tema con relevancia > 60: no se gastó nada en redactar» y para.
4. **Borrador**: `createDraft(keyword)` + keyword → `usada`; bucle `siguienteEtapa`/`ejecutarEtapa`
   hasta `revision`. Si una etapa falla → registra «El borrador quedó en error en la etapa X: …
   (revísalo en el panel del blog)» y conserva el borrador (reanudable a mano); para.
5. **Portada**: `generarPortada` con el modo configurado; si `ia` falla → reintenta con `diseno`.
6. **Programar**: `programarPost` para AHORA + 5 min (ventana de cancelación; entra en el flujo
   4e y queda su rastro en «Programados»); si la validación falla (p. ej. slug duplicado) →
   registra y conserva el borrador; si va bien → `deleteDraft` y registra
   «Artículo «título» programado (tema: keyword, relevancia N)».

## Disparadores

- `instrumentation.ts`: el tick de 60 s ejecuta ahora `pilotoTick` y después `publicarVencidos`
  (la publicación del +5 min la recoge un tick posterior).
- `POST /api/cron/piloto` (pública en el middleware como `cron/publicar`; mismo trato de
  `CRON_SECRET`) → `{ ejecutados, publicados }`.

## API y UI

| Ruta | Métodos |
|---|---|
| `blog/piloto` | GET → 200 config completa + `ultimoDia`/`ultimoMsg` · PUT `{ activo, cadaDias, hora, portada }` → 200 (400 byte-exactos: «Frecuencia no válida», «Hora no válida», «Portada no válida») |

BlogPanel, tarjeta **«Piloto automático»** en el bloque del blog: interruptor + «cada día / cada
3 días / cada semana» + «a partir de las HH:00» + portada (diseño gratis / imagen con IA) +
aviso de coste («cada artículo gasta llamadas de IA con tu modelo; el radar hasta 4 créditos de
SerpAPI al día; solo escribe si hay un tema con relevancia > 60») + línea de estado con
`ultimoMsg` (y fecha). Guardar → PUT.

## Testing

- Unit (mock de módulos radar/pipeline/portada/programados/claves + fakes del store): no toca
  proyectos inactivos ni fuera de hora/frecuencia; el reclamo impide dobles; sin claves registra
  y no llama al radar; sin tema >60 registra y no crea borrador; camino feliz completo (draft →
  etapas → usada → portada → programar +5 min → deleteDraft → registro de éxito); fallo de etapa
  conserva el borrador y no programa; `ia` cae a `diseno`; fallo de programar conserva el borrador.
- E2e **sin gastar** (claves reales presentes): SOLO superficie de config — GET defaults, PUT
  válido e inválidos byte-exactos, GET refleja lo guardado — siempre con `activo: false` al
  terminar cada paso (nunca se deja activo: el tick real correría con las claves reales), y
  `POST /api/cron/piloto` con todos inactivos → `{ ejecutados: 0 … }`. La primera ejecución real
  la valida el usuario activándolo en su proyecto (su modelo barato, céntimos, su decisión).

## Fuera de alcance

Varios artículos por día · revisión humana previa configurable (el que quiera revisar usa el flujo
manual) · zona horaria configurable (hora local del servidor) · informes/consumo histórico ·
pausar automáticamente si OpenRouter se queda sin saldo (el registro ya lo cuenta).
