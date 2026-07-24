import { EditorError } from "@/src/editor/errors";
import { hashPassword, verificarPassword } from "./password";
import type { AccountStore } from "@/src/repositories/accounts";

// Núcleo de registro y login, sin HTTP: valida, habla con el store y devuelve el
// userId. Los mensajes de error son byte-exactos (los fijan los tests). La ruta
// se encarga de la cookie de sesión y del rate limit.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizarEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export async function registrar(
  store: AccountStore,
  input: { nombre?: unknown; email?: unknown; password?: unknown }
): Promise<{ userId: string; orgId: string }> {
  const nombre = typeof input.nombre === "string" ? input.nombre.trim() : "";
  const email = normalizarEmail(input.email);
  const password = typeof input.password === "string" ? input.password : "";

  if (!nombre) throw new EditorError("Escribe tu nombre", 400);
  if (!EMAIL_RE.test(email)) throw new EditorError("Ese correo no parece válido", 400);
  if (password.length < 8) throw new EditorError("La contraseña necesita al menos 8 caracteres", 400);
  if (await store.getUserByEmail(email)) throw new EditorError("Ese correo ya tiene cuenta", 409);

  const passwordHash = await hashPassword(password);
  return store.crearCuenta({ nombre, email, passwordHash, orgNombre: `Espacio de ${nombre}` });
}

// Hash señuelo (una contraseña aleatoria) para gastar el mismo tiempo cuando el
// correo no existe o es de una cuenta sin contraseña (solo Google): así el
// atacante no distingue por tiempo si un email está registrado.
let señuelo: Promise<string> | null = null;
function hashSeñuelo(): Promise<string> {
  if (!señuelo) señuelo = hashPassword(crypto.randomUUID());
  return señuelo;
}

export async function autenticar(
  store: AccountStore,
  input: { email?: unknown; password?: unknown }
): Promise<{ userId: string }> {
  const email = normalizarEmail(input.email);
  const password = typeof input.password === "string" ? input.password : "";

  const user = email ? await store.getUserByEmail(email) : null;
  const hash = user?.passwordHash || (await hashSeñuelo());
  const ok = await verificarPassword(password, hash); // se ejecuta siempre (tiempo constante)
  if (!user || !user.passwordHash || !ok) {
    throw new EditorError("Correo o contraseña incorrectos", 401);
  }
  return { userId: user.id };
}
