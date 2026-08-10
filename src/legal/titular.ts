// Datos del titular del sitio, en UN solo lugar: los usan las cuatro páginas
// legales. Si cambias de forma jurídica (p. ej. constituyes la S.L.) o de correo
// de contacto, se toca aquí y las cuatro se actualizan solas.
//
// ⚠️ ANTES DE PUBLICAR: rellena `nif`. La LSSI-CE (art. 10) obliga a mostrar el
// NIF/CIF del titular; mientras esté vacío, las páginas lo marcan en rojo para
// que no se te pase.
export const TITULAR = {
  // Persona física (autónomo). Si constituyes la sociedad, cambia `nombre` por la
  // denominación social (p. ej. «Estrénala S.L.») y `formaJuridica`.
  nombre: "Sebastián Diego Martín Micucci",
  formaJuridica: "persona física" as "persona física" | "sociedad",
  nif: "79031692N", // si pasa a S.L., aquí va el CIF de la sociedad
  domicilio: "Calle Perdices 8, Bloque 1",
  cp: "29640",
  localidad: "Fuengirola",
  provincia: "Málaga",
  pais: "España",
  email: "estrenala.sl@gmail.com", // cuando tengas buzón propio: hola@estrenala.com
  sitio: "estrenala.com",
  marca: "Estrénala",
} as const;

export function direccionCompleta(): string {
  const t = TITULAR;
  return `${t.domicilio}, ${t.cp} ${t.localidad} (${t.provincia}), ${t.pais}`;
}

/**
 * Fecha de última actualización de los documentos legales.
 *
 * La de verdad es la ISO, y el texto que se enseña se deriva de ella. Antes solo
 * existía el texto («26 de julio de 2026»), y el sitemap necesita una fecha que
 * una máquina entienda: teniendo las dos por separado, tarde o temprano una se
 * queda vieja y le estaríamos diciendo cosas distintas a Google y al lector.
 */
export const ACTUALIZADO_ISO = "2026-07-26";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export const ACTUALIZADO = (() => {
  const [anio, mes, dia] = ACTUALIZADO_ISO.split("-").map(Number);
  return `${dia} de ${MESES[mes - 1]} de ${anio}`;
})();
