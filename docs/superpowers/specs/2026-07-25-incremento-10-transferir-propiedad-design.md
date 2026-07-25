# Incremento 10 — Transferir la propiedad de un espacio

Fecha: 2026-07-25. Estado: diseño.

## Qué falta y por qué

El modelo de equipo ya deja a un propietario **subir a otro miembro a propietario**
(`cambiarRol`), pero no hay una acción limpia de **ceder el mando**: hacer propietario
a otra persona y **bajarte tú a editor** de una vez. Eso:
- expresa la intención de forma clara (un botón «Ceder propiedad», no juegos de menús);
- se hace **atómico** (nunca hay un instante sin propietario);
- **desbloquea «borrar cuenta»** al único propietario de un espacio con equipo (tras
  ceder, ya no es el único dueño → puede borrarse).

## Comportamiento

`transferirPropiedad(orgId, actualUserId, nuevoUserId)`:
- El destino debe ser **otro** miembro del espacio (≠ el actual). Si no, 400
  `MSG_ELIGE_OTRA`.
- Debe estar **en el espacio**. Si no, 404 "Esa persona no está en el espacio".
- Efecto (transacción): el destino pasa a **owner** y el actual baja a **editor**.
  Orden: primero se sube al destino, luego se baja al actual → nunca cero propietarios.
- Solo un **propietario** puede iniciar (`exigirOwner` en la ruta).

Nota: si el destino ya era propietario, el efecto es solo que el actual se baja a
editor (sigue habiendo dueño). Válido.

## Piezas

- **Dominio** `src/auth/equipo.ts`:
  - `MSG_ELIGE_OTRA = "Elige a otra persona del espacio"`.
  - `TransferenciaStore` (estructural): `getMembership`, `aplicarTransferencia`.
  - `transferirPropiedad(store, { orgId, actualUserId, nuevoUserId })` — valida y llama
    a `aplicarTransferencia`.
- **Store concreto** `DrizzleAccountStore.aplicarTransferencia(orgId, deUserId, aUserId)`:
  transacción de dos `UPDATE` de rol (sube destino, baja origen). Fuera del interfaz.
- **Ruta** `POST /api/equipo/transferir` `{ userId }` (owner-only). Al terminar, quien
  la llamó ya es editor: la UI de Equipo se recarga y oculta los controles de dueño.
- **UI** (`SeccionEquipo` en settings): por cada miembro que no soy yo, botón
  «Ceder propiedad» con confirmación (`window.confirm`).

## Tests
- Unit (`equipo-transferir.test.ts`): destino = yo → `MSG_ELIGE_OTRA`; destino no
  miembro → 404; happy path llama `aplicarTransferencia(orgId, actual, nuevo)`; destino
  ya-owner también transfiere (baja al actual).
- e2e (usuario **desechable**): transferir a uno mismo → 400; transferir a un UUID que
  no es miembro → 404. (El swap real de roles necesita dos usuarios en la misma org,
  que por HTTP exige el token de invitación por correo; queda cubierto por los unit
  tests. Nunca toca el e2e compartido ni la org de dev.)

## Fuera de alcance
- Ceder y además salir/borrar cuenta en un solo paso (son acciones separadas).
- Transferir a alguien que aún no es miembro (primero se le invita).
