import { describe, it, expect } from "vitest";
import { srcPreview } from "@/app/projects/[id]/PreviewPane";

/**
 * Sebas, el 2026-08-12, subiendo la web de Quantiva: «cuando actualizo el ZIP y
 * me dice listo, ya puede revisar los cambios, bajo y todavía me muestra lo
 * anterior; si me voy a otra página y vuelvo, ya sale bien».
 *
 * El motivo: la vista previa vive en un `<iframe>` con `key={src}`, y al subir
 * un ZIP el `src` no cambiaba. `router.refresh()` rehace la página en el
 * servidor, pero el marco se quedaba montado con lo de antes. Solo se refrescaba
 * al desmontarlo entero, o sea yéndose y volviendo.
 *
 * Es de los fallos que hacen dudar de si el cambio se ha guardado, que es peor
 * que un error: un error se ve.
 *
 * Ahora la dirección lleva la versión actual del sitio. Se prueba aquí y no
 * pintando el componente porque esto es TODA la lógica que falló, y así el test
 * no depende de enrutador ni de diálogos.
 */
describe("la vista previa se refresca cuando cambia la web", () => {
  const base = { projectId: "p1", relPath: "", editMode: false, recarga: 0, version: "v1" };

  it("cambiar de versión cambia la dirección", () => {
    const antes = srcPreview(base);
    const despues = srcPreview({ ...base, version: "v2" });
    expect(despues).not.toBe(antes);
  });

  // El fallo exacto: misma página, mismo modo, mismo contador… y web nueva.
  it("y eso pasa aunque no cambie NADA más", () => {
    expect(srcPreview({ ...base, version: "v2" })).not.toBe(srcPreview(base));
  });

  // Un proyecto recién creado no tiene versión todavía. No debe reventar ni
  // colar un "null" que luego no coincida con nada.
  it("sin versión todavía, sigue dando una dirección válida", () => {
    const s = srcPreview({ ...base, version: null });
    expect(s).toContain("/api/projects/p1/preview/");
    expect(s).not.toContain("null");
  });

  // `recarga` sigue haciendo su parte: tirar los cambios sin guardar no cambia
  // de versión, y aun así hay que volver a pedir la página.
  it("descartar cambios también refresca, aunque la versión sea la misma", () => {
    expect(srcPreview({ ...base, recarga: 1 })).not.toBe(srcPreview(base));
  });

  // Lo de siempre, que no se rompa: el modo edición es lo que mete el editor
  // dentro del iframe, y va en la query porque lo lee el servidor.
  it("el modo edición viaja en la dirección, no en el ancla", () => {
    const s = srcPreview({ ...base, editMode: true });
    expect(s.split("#")[0]).toContain("?edit=1");
  });

  it("la página que se mira va en la ruta", () => {
    expect(srcPreview({ ...base, relPath: "contacto.html" }))
      .toContain("/api/projects/p1/preview/contacto.html");
  });
});
