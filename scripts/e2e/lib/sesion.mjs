// Sesión para los e2e con el modelo de cuentas (6a): registra (o inicia sesión
// si ya existe) un usuario e2e DEDICADO y devuelve su cookie. Su organización es
// propia y separada de la de desarrollo, así que los e2e NUNCA tocan los
// proyectos ni las claves reales.
const EMAIL = "e2e@wordclicks.local";
const PASSWORD = "e2e-clave-fija-para-pruebas-123";
const J = { "content-type": "application/json" };

export async function iniciarSesionE2e(base) {
  let r = await fetch(`${base}/api/login`, {
    method: "POST", headers: J, body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (r.status === 401) {
    r = await fetch(`${base}/api/registro`, {
      method: "POST", headers: J, body: JSON.stringify({ nombre: "E2E", email: EMAIL, password: PASSWORD }),
    });
  }
  const cookie = (r.headers.get("set-cookie") ?? "").split(";")[0];
  if (!cookie.startsWith("wc_session=")) {
    throw new Error(`e2e: no se pudo iniciar sesión (status ${r.status})`);
  }
  return cookie;
}
