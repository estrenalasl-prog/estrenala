# Incremento 11 — Actualizar una web desde un ZIP nuevo

Fecha: 2026-07-25. Estado: implementado.

## Por qué

El asistente de IA cuesta tokens (clave propia). Mucha gente que ya paga una
suscripción de IA preferirá seguir editando su web en **su** herramienta (Claude Code,
ChatGPT, v0…) y solo **actualizar** la versión online. Es el otro camino del producto
(«Estrénala no te encierra»). Hoy no existía: subir un ZIP solo creaba proyectos NUEVOS.

## Qué hace

`actualizarProyecto(deps{store,storage}, {orgId, projectId, zip})`:
- Verifica el proyecto (scoped a org) → 404 si no.
- `processZip` (reutilizado del import) → archivos + página de entrada. ImportError → 400.
- Crea un **snapshot NUEVO** (`tipo: "actualizacion"`, `parentId` = snapshot actual) con
  el contenido del ZIP, lo escribe en su prefijo y lo deja como **actual**.
- Ajusta `entryPath` si el ZIP nuevo cambia la página de entrada.
- Mantiene el proyecto, su dirección (subdominio/dominio) y **todo el Historial**
  (reversible). Si algo falla tras escribir en storage, limpia lo escrito.
- **NO mezcla** con lo editado dentro de Estrénala: el ZIP es la versión completa nueva.

## Piezas
- `src/projects/actualizar.ts` (dominio).
- `POST /api/projects/[id]/actualizar` (multipart; editor y propietario, es trabajo de
  edición).
- `ActualizarPanel.tsx` (plegable en la pantalla del proyecto, con la advertencia del
  no-mezcla) + etiqueta «Actualización desde ZIP» en el Historial (`PreviewPane`).
- Mejora colateral: `unzipSafe` envuelve el error crudo de fflate ante bytes que no son
  ZIP → `ImportError` (400 limpio en crear Y actualizar). Mensaje: "El archivo no es un
  ZIP válido".

## Tests
- Unit (`actualizar-proyecto.test.ts`): snapshot nuevo sin copiar el viejo; ajusta/no
  ajusta la entrada; 404; ZIP inválido → ImportError sin crear snapshot; limpieza si
  createSnapshot falla.
- e2e-11 (usuario desechable): crear v1 → actualizar v2 (preview cambia) → Historial con
  «actualizacion» → revertir a v1 → ZIP inválido 400. 10/10.

## Fuera de alcance
- Fusionar cambios (in-app + ZIP) — el ZIP reemplaza, a propósito.
- Diff visual entre versiones.
