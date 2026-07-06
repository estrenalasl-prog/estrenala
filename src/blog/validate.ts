import { huecosSinRellenar } from "./template";

export type DatosPublicacion = {
  titulo: string | null;
  slug: string | null;
  slugsExistentes: string[];
  metaDescripcion: string | null;
  imagenPath: string | null;
  htmlFinal: string;
};

export function validarPrePublicacion(d: DatosPublicacion): string[] {
  const errores: string[] = [];
  if (!d.titulo?.trim()) errores.push("Falta el título");
  if (!d.slug?.trim()) {
    errores.push("Falta el slug");
  } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(d.slug)) {
    errores.push("El slug solo puede llevar minúsculas, números y guiones");
  } else if (d.slugsExistentes.includes(d.slug)) {
    errores.push(`El slug "${d.slug}" ya existe en este sitio`);
  }
  if (!d.metaDescripcion?.trim()) {
    errores.push("Falta la meta descripción");
  } else if (d.metaDescripcion.length > 160) {
    errores.push(`La meta descripción tiene ${d.metaDescripcion.length} caracteres (máximo 160)`);
  }
  if (!d.imagenPath) errores.push("Falta la imagen de portada");
  const huecos = huecosSinRellenar(d.htmlFinal);
  if (huecos.length) errores.push(`Huecos sin rellenar en la plantilla: ${huecos.join(", ")}`);
  return errores;
}
