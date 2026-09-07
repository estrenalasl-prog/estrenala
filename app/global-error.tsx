"use client";
import { Reventado } from "./_components/Reventado";

/**
 * El último recurso: lo que se ve si revienta el propio layout de la raíz.
 *
 * Aquí Next NO pinta el layout, así que este archivo tiene que traerse su
 * `<html>` y su `<body>`. Sin él, un fallo en el layout deja la pantalla en
 * blanco del todo.
 *
 * El `lang` se queda en español porque en este punto no hay nada que haya
 * resuelto el idioma —justamente ha fallado lo que lo resolvía—, y `Reventado`
 * lee de ahí: en la pantalla más rota de todas, el idioma de casa.
 */
export default function GlobalError() {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>
        <Reventado />
      </body>
    </html>
  );
}
