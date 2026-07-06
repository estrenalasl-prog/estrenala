export function slugify(texto: string, maxPalabras = 5): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, maxPalabras)
    .join("-");
}

export function slugUnico(slug: string, existentes: string[]): string {
  if (!existentes.includes(slug)) return slug;
  let n = 2;
  while (existentes.includes(`${slug}-${n}`)) n++;
  return `${slug}-${n}`;
}
