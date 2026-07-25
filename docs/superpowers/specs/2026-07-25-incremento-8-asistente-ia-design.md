# Incremento 8 — Asistente de IA en la plataforma («Copiloto para tu web»)

Fecha: 2026-07-25. Estado: diseño.

## Idea en una frase

Un panel de chat en la pantalla del proyecto donde el usuario escribe en lenguaje
natural lo que quiere cambiar en su web («haz el titular más directo», «corrige las
faltas», «pon la sección de precios más persuasiva»). El asistente lee la página,
**propone** un conjunto de cambios concretos, el usuario los **revisa** y los **aplica**.
Todo reversible desde el Historial que ya existe.

## Principio de seguridad (lo que hace esto viable)

El asistente **NO genera HTML libre**. Produce exactamente las mismas *ops* que el
editor manual (`text`, `richText`, `href`, `style:color`) referidas a los `nodeId`
que ya asigna `walkElementsInOrder`. Se aplican por la tubería existente
`saveEdits → applyEdits → sanitizeInline / isValidOp`.

Consecuencia: **el modelo no puede hacer nada que un humano no pudiera hacer con el
editor visual.** La salida del modelo es *no confiable* y se valida op por op:
- `text`/`richText`: `richText` se sanea (lista blanca re-serializada); `text` se escapa.
- `href`: `isSafeHref` (bloquea `javascript:`, `data:`, etc.).
- `style`: solo `color` con `COLOR_RE`.
- Se descartan ops cuyo `nodeId` no exista en la página, de `kind` desconocido, o que
  no validen. Se acota el número de ops.

Además: como nuestras ediciones **nunca añaden ni quitan elementos**, el orden de
`nodeId` es **estable**; «proponer» y «aplicar» pueden ocurrir en momentos distintos
(incluso con ediciones manuales en medio) sin que las referencias se desalineen.

## Coste (opt-in, con aviso, acotado)

- Reutiliza la clave BYOK de OpenRouter (`claveOpenRouter`), la misma del blog. Sin
  clave → mensaje que remite a Configuración (no rompe).
- Cada ejecución **consume crédito** del usuario → aviso byte-exacto antes de gastar
  (estilo `AVISO_AUTO` del taller de artículos) y confirmación explícita.
- Acotado: **una página por vez** (la que elige el usuario), inventario de nodos
  recortado (texto truncado), instrucción con longitud máxima, `max_tokens` limitado,
  número de ops resultante limitado.
- Nada se publica solo. «Aplicar» crea un snapshot nuevo (revertible). El usuario ve
  el resultado en la vista previa.

## Interacción v1: proponer → revisar → aplicar

1. El usuario abre el panel **Asistente**, elige página (por defecto la de entrada),
   escribe una instrucción y confirma el aviso de coste.
2. El servidor lee el HTML de la página en el snapshot actual, construye el
   **inventario de nodos editables** (`{ id, tag, texto }`), llama al modelo **una vez**
   con salida JSON (esquema zod) y devuelve **ops propuestas + resumen legible**
   (viejo → nuevo). **No guarda nada.**
3. El cliente muestra la lista de cambios propuestos con **Aplicar** / **Descartar**.
   «Aplicar» hace `POST /api/projects/[id]/edits` (ruta ya existente) con esas ops →
   snapshot nuevo → la vista previa se refresca.

Conversación multi-turno / agente multi-paso (Claude Agent SDK) = **futuro**. v1 es
un único viaje «propón cambios», que ya entrega el valor con coste mínimo y acotado.

## Piezas nuevas

### Servidor (núcleo testeable sin IA real)
- `src/asistente/inventario.ts`
  - `construirInventario(html): NodoEditable[]` — usa `walkElementsInOrder`, filtra a
    nodos de texto editables (hoja o con texto suelto, **no** `textoExcluido`), recorta
    el texto a N chars. `NodoEditable = { id, tag, texto }`.
  - `serializarInventario(nodos): string` — texto compacto para el prompt.
- `src/asistente/proponer.ts`
  - `PropuestaSchema` (zod): `{ cambios: { nodeId, kind, value }[] }` con `kind` en
    `text | richText | href | style`.
  - `interpretarPropuesta(page, html, salida): EditOp[]` — mapea a `EditOp`, valida con
    `isValidOp`, descarta nodeId inexistentes y ops inválidas, recorta a `MAX_OPS`.
  - `resumenCambios(html, ops): { nodeId, antes, despues }[]` — para enseñar el diff.
  - `proponerEdiciones(deps, input, pedir?)` — orquesta: lee snapshot actual, construye
    inventario, arma el prompt, llama `pedir` (inyectable; por defecto `pedirJson`),
    interpreta y devuelve `{ ops, resumen }`. `deps = { store, storage }`.
  - `promptAsistente(ctx)` — sistema + instrucción del usuario + inventario. En español,
    reglas claras: solo editar nodos de la lista, no inventar ids, devolver JSON.

### API
- `POST /api/projects/[id]/asistente` → body `{ page, instruccion }` → `{ ops, resumen }`.
  Valida sesión (`getContexto`), acota longitudes, entra en org-context implícito vía
  `claveOpenRouter`/`modeloOrganizacion` (leen `orgActual`), maneja `OpenRouterError`
  (402 = sin saldo → mensaje claro). **Gasta IA.**
- «Aplicar» reutiliza `POST /api/projects/[id]/edits` (sin cambios).

### Cliente
- `app/projects/[id]/AssistantPanel.tsx` — panel plegable como `BlogPanel`: selector de
  página, textarea de instrucción, aviso de coste + confirmación, botón «Proponer
  cambios», lista de cambios propuestos (antes → después) con «Aplicar» / «Descartar».
  Tras aplicar: refresca la vista previa (router.refresh o recarga del iframe).
- Se monta en `app/projects/[id]/page.tsx` junto a `BlogPanel`.

## Avisos byte-exactos (fijados por tests)
- Aviso de coste (confirmación): _(se fija en implementación, estilo AVISO_AUTO)_
  > "El asistente lee tu página y usa la IA con tu clave de OpenRouter (consume crédito). Revisarás los cambios antes de aplicarlos. ¿Continuar?"
- Sin clave: remite a Configuración (mensaje del propio `claude.ts`).
- Sin cambios propuestos: "El asistente no propuso ningún cambio."

## Límites (constantes)
- `MAX_INSTRUCCION = 2000` chars. `MAX_NODOS_INVENTARIO` y truncado de texto por nodo
  (p. ej. 400 chars). `MAX_OPS = 100`. `max_tokens` del modelo acotado.

## Tests
- `inventario.test.ts`: filtra excluidos (script/style/head/svg), incluye hojas y texto
  suelto, trunca, ids correctos.
- `proponer.test.ts`: `interpretarPropuesta` descarta nodeId inexistentes, kinds
  desconocidos, href peligroso, color inválido; sanea richText; respeta `MAX_OPS`.
  `proponerEdiciones` con `pedir` simulado (sin IA real) devuelve ops + resumen y **no**
  crea snapshots.
- e2e smoke: registra usuario e2e, crea proyecto, llama al asistente con `pedir`
  simulado / o **salta** la vía IA real (patrón 4b/4f: nunca gasta, nunca toca
  `org_settings`).

## Fuera de alcance v1 (apuntado)
- Agente conversacional multi-paso con herramientas (Claude Agent SDK).
- Cambios estructurales (añadir/eliminar secciones, layout).
- Edición de varias páginas a la vez.
- Generación de imágenes desde el asistente.
