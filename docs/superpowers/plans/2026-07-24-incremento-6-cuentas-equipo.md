# Plan — Incremento 6: cuentas, equipo y Tu cuenta

Spec: `docs/superpowers/specs/2026-07-24-incremento-6-cuentas-equipo-design.md`
Rama: `feat/incremento-6-cuentas` · TDD, commit por tarea · fases 6a→6e.
Las fases 6b–6e se detallan al llegar; aquí el detalle es de 6a.

## Fase 6a — Cuentas base

1. **Esquema**: columnas nuevas de `users` + tabla `auth_tokens` en
   `src/db/schema.ts`; `npm run db:push` (aditivo; revisar el plan que imprima
   antes de confirmar).
2. **`src/auth/password.ts`** (TDD `password.test.ts`): `hashPassword` /
   `verificarPassword` con scrypt y comparación timing-safe; formato
   `s1.<salt>.<hash>`; rechaza formatos desconocidos sin lanzar.
3. **Cookie v2** (TDD sobre `session-cookie.test.ts` existente):
   `firmarSesion(secret, userId, expira)` → `v2.<userId>.<expira>.<hmac>`;
   `verificarSesion` devuelve `{ userId }` o `null`; las v1 no pasan.
4. **`src/auth/contexto.ts`** (TDD con BD mockeada): cookie → userId →
   membership+org; sin sesión o sin membership → `EditorError("No autorizado", 401)`.
5. **`POST /api/registro`** (TDD): validaciones byte-exactas, alta
   user+org+membership, autologin (Set-Cookie v2), email en minúsculas/trim,
   409 si existe. Rate limit compartido con login.
6. **`POST /api/login`** reescrito (TDD): email+contraseña, mensaje neutro 401,
   429 con `Demasiados intentos, espera un momento`.
7. **Swap del stub**: `getDevContext()` → `getContexto()` en todas las rutas y
   páginas (mecánico); borrar `src/auth/dev-stub.ts`; `tsc` como red.
8. **UI**: `/login` a email+contraseña (mismo split de marca) + `/registro`
   nueva; enlaces cruzados; middleware con `/registro` y `/api/registro`.
9. **Migración**: `scripts/migrar-org-dev.mjs <email>` (idempotente, aborta si
   el email no existe o ya es miembro; NO toca org_settings salvo el orgId ya
   existente de dev).
10. **E2e**: helper `scripts/e2e/lib/sesion.mjs` (registra/loguea usuario e2e
    dedicado `e2e@wordclicks.local`); actualizar los 7 scripts para usarlo;
    quitar PANEL_PASSWORD de `.env.example` y de los scripts. Ejecutar e2e-4f
    como humo (gratis) + login/registro a mano en navegador.
11. **Docs**: REANUDACION (tabla + guardas: PANEL_PASSWORD ya no existe).

## Fase 6b — Emails (verificación + recuperar)
`src/email/` (consola/Resend) · tokens `auth_tokens` con hash y un solo uso ·
banner de verificación · gate en publicar/invitar · `/recuperar` + `/restablecer`.

## Fase 6c — Continuar con Google
`/api/auth/google` + callback · cookie `state` · alta/vínculo por email ·
botón condicionado a env vars.

## Fase 6d — Equipo
Invitaciones (token 7 d, flujo con/sin cuenta previa) · sección Equipo real ·
`exigirRol("owner")` en rutas de Configuración/destructivas · selector de
espacios (cookie con orgId activa).

## Fase 6e — Tu cuenta
Cambiar nombre/contraseña/email (doble confirmación) · retirar «Próximamente»
de Cuenta y Equipo · repaso final de permisos.
