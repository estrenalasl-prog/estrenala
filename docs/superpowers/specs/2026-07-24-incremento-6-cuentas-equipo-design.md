# Incremento 6 — Cuentas de usuario, Equipo y Tu cuenta (design)

Fecha: 2026-07-24. El salto de «panel con una contraseña» a «plataforma con
cuentas»: registro, login real, invitaciones y la sección Equipo/Cuenta que hoy
son «Próximamente». Decisiones tomadas por el usuario (sesión 2026-07-24):

- **Acceso: email + contraseña, y botón «Continuar con Google»** (GitHub queda
  como opcional futuro; el público objetivo no es developer).
- **Email: Resend al desplegar**; en desarrollo los emails se imprimen en la
  consola del server (capa enchufable, cero cuentas y cero coste en dev).
- **Roles: Propietario y Editor** (Invitado solo-ver queda para el futuro).

## Punto de partida (ya existe)

- Esquema multiusuario desde el día 1: `users`, `organizations`, `memberships`
  (con `rol`, unique org+user). TODO el dato cuelga de `orgId`.
- `src/auth/dev-stub.ts` fija org/usuario de desarrollo constantes; lo usan ~30
  rutas API y 2 páginas vía `getDevContext()`.
- Cookie `wc_session` = `v1.<expira>.<hmac>` SIN identidad; el middleware solo
  comprueba firma y caducidad.
- Diseño ya dibujado: login multiusuario con selector de espacios
  (`03-login.html §3`, roles como pastillas) y Equipo/Cuenta en
  `10-configuracion.html` (filas + «Invitar»).

## Fases (cada una: TDD + tests verdes + commit; validación en navegador donde hay UI)

### 6a — Cuentas base (el corazón)
- **Esquema (aditivo, `db:push`)**: `users` += `passwordHash` (text, default ''),
  `googleSub` (text, unique, nullable), `emailVerificadoAt` (timestamp nullable);
  tabla nueva `auth_tokens` (id, email, userId nullable, tipo
  `verificacion|reset|invitacion`, `tokenHash`, `payloadJson` jsonb nullable,
  `expiraAt`, `usadoAt` nullable, `createdAt`).
- **Contraseñas**: `node:crypto` scrypt (N=16384, r=8, p=1, salt 16 B aleatorio),
  formato `s1.<saltB64>.<hashB64>`, comparación en tiempo constante. Sin
  dependencias nuevas. JAMÁS se loguea material de contraseñas ni hashes.
- **Cookie v2**: `v2.<userId>.<expira>.<hmac>` (HMAC-SHA256 de `v2.<userId>.<expira>`
  con SESSION_SECRET). El middleware (Edge) solo verifica firma+caducidad; las
  v1 dejan de valer (re-login, solo afecta a Sebas). Mismos atributos de cookie
  que hoy (HttpOnly, SameSite, host-only).
- **Contexto real**: `src/auth/contexto.ts` → `getContexto()` devuelve
  `{ userId, orgId, rol }` leyendo cookie + membership (primera del usuario);
  sin sesión/membership → `EditorError("No autorizado", 401)`. Sustituye a
  `getDevContext()` en TODAS las rutas y páginas; `dev-stub.ts` se elimina.
- **Registro** (`/registro` + `POST /api/registro`): nombre, email, contraseña
  (mín. 8). Crea user + org `Espacio de <nombre>` + membership `owner` e inicia
  sesión. En 6a el usuario entra sin verificar email (aviso llega en 6b).
- **Login** (`/login` + `POST /api/login` reescrito): email + contraseña.
  PANEL_PASSWORD muere (se quita de `.env.example`; los e2e pasan a un helper
  de sesión que registra/loguea un usuario e2e propio).
- **Rate limit** en memoria para login/registro: 10 intentos por IP+email cada
  15 min → 429.
- **Migración de datos de dev**: `scripts/migrar-org-dev.mjs <email>` — engancha
  el usuario real a la org de desarrollo como owner, renombra la org y borra el
  espacio vacío auto-creado. Explícito y una sola vez; nada de magia al registrarse.
- **Mensajes byte-exactos nuevos** (los fijan los tests):
  - `Ese correo ya tiene cuenta` (409) · `La contraseña necesita al menos 8 caracteres` (400)
  - `Escribe tu nombre` (400) · `Ese correo no parece válido` (400)
  - `Correo o contraseña incorrectos` (401, neutro: no revela si el correo existe)
  - `Demasiados intentos, espera un momento` (429) · `No autorizado` (401, ya existe)
- **UI**: login split-panel actual pasa a email+contraseña + enlaces «Crear
  cuenta» y «He olvidado mi contraseña» (la página de recuperar llega en 6b;
  en 6a el enlace ya existe y lleva a una pantalla «te enviaremos un correo»
  deshabilitada con nota). `/registro` con el mismo estilo marca-panel.
- **Middleware**: rutas públicas += `/registro`, `/api/registro` (y en fases
  siguientes `/recuperar`, `/api/auth/*`).

### 6b — Emails: verificación y recuperar contraseña
- `src/email/` enchufable: `enviarEmail({para, asunto, html})` → consola en dev
  (imprime el enlace completo), Resend si hay `RESEND_API_KEY`.
- Verificación: token 24 h (hash SHA-256 en BD, un solo uso). Banner «Confirma
  tu correo» en el panel; **publicar e invitar exigen email verificado**.
- Recuperar: token 1 h; respuesta SIEMPRE neutra
  (`Si ese correo tiene cuenta, le hemos enviado un enlace`).

### 6c — Continuar con Google
- OAuth authorization-code con `state` en cookie (CSRF) y userinfo por HTTPS;
  sin librerías nuevas. Alta automática con email ya verificado; si el email ya
  tiene cuenta, se vincula (`googleSub`) tras login normal. Botón solo visible
  si hay `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` en el entorno.

### 6d — Equipo e invitaciones
- Invitar por email (token 7 días; si no tiene cuenta, el enlace le lleva a
  crearla y entra directo al espacio). Sección Equipo real en Configuración:
  lista de miembros con rol, invitar, cambiar rol, quitar (Propietario no puede
  quitarse a sí mismo si es el último).
- **Permisos**: Editor = todo el trabajo (editar, blog, publicar) menos
  Configuración del espacio (claves/equipo/plan) y acciones destructivas
  (despublicar, borrar). Un helper único `exigirRol("owner")` en las rutas.
- Selector de espacios en login si perteneces a >1 (diseño `03 §3`); la org
  activa viaja en la cookie (`v3` = v2 + orgId) o en una cookie hermana.
- Los e2e de equipo usan usuarios/orgs propios de e2e; **jamás** tocan
  `org_settings` de la org real ni imprimen tokens.

### 6e — Tu cuenta
- Cambiar nombre, cambiar contraseña (pide la actual), cambiar email (doble
  confirmación: enlace al correo nuevo; el cambio no se aplica hasta el clic).
- Se retiran los «Próximamente» de Cuenta y Equipo. Plan/facturación SIGUE
  «Próximamente» (decisión externa: Stripe/precios).

## Seguridad (todas las fases)

Tokens solo hasheados en BD y de un solo uso · respuestas neutras contra
enumeración de correos · rate limit en todo lo público · cookies host-only como
hoy · nunca loguear contraseñas/hashes/tokens (solo booleanos y longitudes) ·
los mensajes de error en español quedan fijados byte a byte por los tests.

## Fuera de alcance

GitHub OAuth · rol Invitado · 2FA · Plan/facturación · sesiones revocables por
BD (la cookie firmada de 30 días sigue; se revisará al monetizar).
