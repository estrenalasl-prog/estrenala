// URL base de la app para construir enlaces de correo. En prod se fija con
// PLATFORM_HOST (dominio real); en dev cae al Host de la petición.
export function baseApp(req: Request): string {
  const host = process.env.PLATFORM_HOST || req.headers.get("host") || "localhost:3000";
  const proto = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${proto}://${host}`;
}
