# Incremento 7 — Edición rich-text del editor in-situ (design)

Fecha: 2026-07-24. Hoy el editor in-situ (`public/wc-editor.js`) hace texto PLANO:
al editar lee `el.textContent` y el servidor lo escapa. Se pierde poder poner
**negrita**, *cursiva* o un enlace dentro de un párrafo. Este incremento añade
formato en línea, con el saneado en el SERVIDOR como frontera anti-XSS.

## Alcance (MVP seguro)

- **Formato en línea permitido**: negrita (`b`/`strong`), cursiva (`i`/`em`),
  subrayado (`u`), enlaces (`a[href]`) y saltos (`br`). Nada de listas, títulos
  ni bloques (eso es estructura, no formato: fuera del MVP).
- Se aplica a los MISMOS elementos que hoy son «texto hoja» (párrafos, celdas,
  li, etc.), ampliando el criterio para admitir hijos que sean SOLO formato en
  línea (así se puede reeditar un párrafo que ya tiene una negrita).

## Servidor (la parte crítica)

1. **Saneador `src/editor/sanitize-inline.ts`** — `sanitizeInline(fragmento)`:
   NO deja pasar los bytes originales; **re-serializa** solo etiquetas de la
   lista blanca con atributos de la lista blanca, escapando todo el texto.
   - Etiquetas: `b strong i em u a br`. El resto se «desenvuelve» (se queda su
     texto). `script`/`style`/`iframe`/`svg`/`noscript`/`template` se descartan
     CON su contenido.
   - `<a>`: se conserva SOLO `href`, y solo si pasa `isSafeHref` (reusa la de
     `validate-op`, que ya neutraliza `javascript:`, controles C0, etc.); si no,
     se desenvuelve. Ningún otro atributo (fuera `onclick`, `style`, `target`…).
   - Salida siempre bien formada: se emiten cierres solo de lo que se abrió y se
     cierra lo pendiente al final (defiende de anidamientos rotos / mutation XSS).
2. **Nueva op `richText`** en `apply.ts` + `validate-op.ts`: `{ kind:"richText",
   value:string }`. En `applyEdits` reemplaza el contenido interno del nodo por
   `sanitizeInline(value)` (a diferencia de `text`, NO escapa y NO se salta por
   `hasElementChildren`). Exclusión mutua con `text`/`textNode` del mismo nodo.

## Cliente (`public/wc-editor.js`)

- `esTextoRico(el)`: TEXT_TAG cuyos hijos son TODOS formato en línea permitido.
- Al entrar en edición de un texto rico: barra flotante mínima con **B**, **I** y
  **enlace** (usa `document.execCommand` — suficiente para ES5 sin librerías).
- Al guardar: emite `richText` con `el.innerHTML` (el servidor lo sanea igual, la
  confianza está SIEMPRE en el servidor). El texto plano clásico sigue disponible
  para elementos sin formato (compatibilidad total hacia atrás).

## Seguridad

La confianza vive en el servidor: aunque el cliente mande cualquier HTML, solo
sobrevive la lista blanca re-serializada. Tests con vectores XSS (script, img
onerror, javascript: en href con tabs/newlines, atributos de evento, comentarios,
tags rotos, anidamiento profundo). El `href` reusa `isSafeHref` ya probada.

## Fuera de alcance

Listas/títulos/bloques · pegar desde Word con estilos · imágenes en línea ·
deshacer a nivel de carácter (el historial por snapshot ya cubre revertir).
