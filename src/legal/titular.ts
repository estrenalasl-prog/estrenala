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
  nif: "", // ⚠️ PENDIENTE: tu DNI/NIE (o el CIF si pasa a S.L.)
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

// Fecha de última actualización que se muestra en los documentos.
export const ACTUALIZADO = "26 de julio de 2026";
