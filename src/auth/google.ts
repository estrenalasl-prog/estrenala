import { EditorError } from "@/src/editor/errors";
import type { AccountStore } from "@/src/repositories/accounts";

// «Continuar con Google» por OAuth 2.0 (authorization code). Sin librerías: se
// habla con los endpoints de Google directamente. El botón solo aparece si hay
// credenciales configuradas.
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export function googleConfigurado(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
}

export function urlAutorizacion(input: { clientId: string; redirectUri: string; state: string }): string {
  const p = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: input.state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${AUTH_URL}?${p.toString()}`;
}

export type PerfilGoogle = { sub: string; email: string; emailVerificado: boolean; nombre: string };

// Intercambia el `code` por un token y obtiene el perfil. `fetchFn` se inyecta
// en los tests. Cualquier fallo se traduce a un error genérico (no filtramos).
export async function obtenerPerfilGoogle(
  input: { code: string; clientId: string; clientSecret: string; redirectUri: string },
  fetchFn: typeof fetch = fetch
): Promise<PerfilGoogle> {
  const resp = await fetchFn(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code, client_id: input.clientId, client_secret: input.clientSecret,
      redirect_uri: input.redirectUri, grant_type: "authorization_code",
    }),
  });
  if (!resp.ok) throw new EditorError("No se pudo validar con Google", 502);
  const tok = (await resp.json()) as { access_token?: string };
  if (!tok.access_token) throw new EditorError("No se pudo validar con Google", 502);

  const ui = await fetchFn(USERINFO_URL, { headers: { Authorization: `Bearer ${tok.access_token}` } });
  if (!ui.ok) throw new EditorError("No se pudo validar con Google", 502);
  const u = (await ui.json()) as { sub?: string; email?: string; email_verified?: boolean; name?: string };
  if (!u.sub || !u.email) throw new EditorError("Google no devolvió tu correo", 502);

  return {
    sub: u.sub,
    email: u.email.trim().toLowerCase(),
    emailVerificado: !!u.email_verified,
    nombre: (u.name || u.email.split("@")[0]).trim(),
  };
}

// Decide qué hacer con el perfil: entrar (por googleSub), vincular Google a una
// cuenta existente con el mismo email, o crear una cuenta nueva ya verificada.
export async function resolverUsuarioGoogle(
  store: AccountStore, perfil: PerfilGoogle
): Promise<{ userId: string }> {
  const porSub = await store.getUserByGoogleSub(perfil.sub);
  if (porSub) return { userId: porSub.id };

  const porEmail = await store.getUserByEmail(perfil.email);
  if (porEmail) {
    if (!porEmail.googleSub) await store.vincularGoogle(porEmail.id, perfil.sub);
    return { userId: porEmail.id };
  }

  const { userId } = await store.crearCuentaGoogle({
    nombre: perfil.nombre, email: perfil.email, googleSub: perfil.sub,
    orgNombre: `Espacio de ${perfil.nombre}`,
  });
  return { userId };
}
