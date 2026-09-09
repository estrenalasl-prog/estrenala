import type { Articulo } from "../tipos";

// Recordatorio: las comillas invertidas del Markdown van escapadas (\`asi\`).
export const webLovableDatosAbiertos: Articulo = {
  slug: "web-lovable-supabase-datos-abiertos",
  titulo: "Tu web de Lovable guarda datos: ¿quién puede leerlos?",
  descripcion:
    "Si tu web hecha con Lovable guarda datos, el navegador habla directo con la base. Cómo comprobar en un minuto si cualquiera puede leerlos.",
  entradilla:
    "Le pediste a la IA un formulario de reservas y funciona: escribes, le das a enviar y la reserva aparece. Lo que casi nadie comprueba es quién más puede ver esa lista. La respuesta, por defecto, suele ser: cualquiera.",
  fecha: "2026-09-09",
  tema: "Seguridad",
  resumen: [
    "La comprobación de un minuto que te dice si tu base de datos está abierta.",
    "Por qué la IA escribe código que funciona y aun así deja la puerta suelta.",
    "Qué se arregla de verdad, y por qué cambiar de alojamiento no es la solución.",
  ],
  cuerpo: `
Esto va para ti si tu web **guarda o muestra datos**: reservas, pedidos, un
formulario que se queda registrado, usuarios que entran con contraseña. Si lo
tuyo es una web de presentación —quién eres, qué haces, un teléfono— puedes
saltarte el artículo entero: no te afecta.

## La comprobación

Entra en el panel de Supabase de tu proyecto (desde Lovable se llega en un clic)
y abre el **Table Editor**. Mira tus tablas.

Si al lado del nombre de alguna ves un aviso de que **RLS está desactivado** —en
inglés, «RLS disabled» o «Unrestricted»—, esa tabla la puede leer cualquiera que
sepa dónde mirar. No hace falta ser nadie: no hay contraseña que romper, porque
no hay ninguna puerta que forzar.

Si todas tus tablas salen con RLS activado, respira y quédate igualmente con la
segunda parte del artículo, que es la que evita que esto vuelva.

## Por qué pasa

Aquí está la parte que sorprende, y no es culpa tuya.

Una web como la que hace Lovable **no tiene servidor propio**. El navegador de
quien la visita habla **directamente** con la base de datos. Para eso lleva
dentro una clave, la que en Supabase llaman \`anon\`, y esa clave **está pensada
para ser pública**: viaja en el código de la web, cualquiera puede verla, y eso
no es un fallo ni un descuido de nadie.

Lo que protege tus datos no es la clave. Son **las reglas**: unas líneas que
dicen «de esta tabla, cada uno solo puede leer lo suyo». Eso es lo que significa
RLS. Sin esas reglas, la clave pública abre la tabla entera.

| | Con las reglas puestas | Sin las reglas |
| --- | --- | --- |
| La clave va en la web | Sí, y está bien | Sí, y es un problema |
| Un desconocido pide tu tabla | Recibe lo suyo, o nada | Recibe **todo** |
| ¿Se nota desde fuera? | — | No. La web se ve igual |

Esa última fila es la peor. **Nada se rompe.** Tu web sigue funcionando
perfectamente, los clientes reservan, tú ves tus reservas. No hay ningún síntoma.

## Lo que la IA hace bien, y lo que no le has pedido

Cuando le dices «hazme un formulario de reservas», la IA escribe código que
**funciona**, y funciona de verdad. Pero «funciona» para quien lo está probando
significa una cosa muy concreta: *yo escribo y yo lo veo*.

«Y que nadie más lo vea» es una frase distinta, y **no se la has dicho**. La
herramienta tampoco te ha preguntado. Así que no está.

No es un fallo de Lovable en particular: le pasa a cualquier herramienta que
conecte tu web con una base de datos desde el navegador. Se han documentado
casos en cantidad durante 2025 y 2026, con centenares de aplicaciones publicadas
así, y el patrón siempre es el mismo. Lo que cambia es el logo de arriba.

## Qué hay que hacer

Son dos cosas, y la segunda es la que cuesta:

**Activar RLS en cada tabla.** Es un interruptor en el panel de Supabase. Ojo:
al activarlo sin más, la tabla se cierra **del todo** y tu web deja de ver sus
propios datos. Eso asusta y mucha gente lo desactiva otra vez. No lo hagas: es
la señal de que estaba funcionando por estar abierta.

**Escribir las reglas.** Una por tabla, diciendo quién puede leer y quién puede
escribir. Aquí sí hay que pensar, y es razonable pedirle ayuda a la propia IA —
pero pidiéndoselo con esas palabras: «escríbeme las políticas RLS de esta tabla
para que cada usuario solo vea sus propios registros». Y después comprobarlo:
abre tu web en una ventana de incógnito, sin haber entrado con tu cuenta, y mira
si sigues viendo datos que no deberías.

Esa prueba en incógnito es la que de verdad te dice si está arreglado.

## Cambiar de alojamiento no arregla esto

Lo decimos porque es la confusión más habitual y porque nos toca de lleno.

Mover tu web a otro sitio —a nosotros, a cualquiera— **no cambia nada de esto**.
Los datos no viven en la web: viven en Supabase, y quien decide quién los lee es
la configuración de Supabase. El alojamiento solo entrega los archivos.

Lo cual también quiere decir lo contrario, y es la buena noticia: si tu proyecto
de Lovable es una web de archivos sueltos que además habla con Supabase, **sí se
puede publicar** en un alojamiento estático como el nuestro, incluso con base de
datos. Lo que no se puede publicar así es lo que necesita un programa corriendo
en un servidor, y de eso hablamos en
[el artículo sobre el ZIP que te dan estas herramientas](/blog/publicar-web-v0-lovable-bolt).

## Lo que se lleva quien lo entiende

Que en una web hecha con IA, «funciona» y «está protegida» son dos preguntas
distintas, y la herramienta solo contesta la primera.

Comprobar la segunda cuesta un minuto y no hay que saber programar: entrar,
mirar si pone RLS, y abrir tu propia web en incógnito a ver qué te enseña.
`.trim(),
  preguntas: [
    {
      p: "¿Es peligroso que la clave de Supabase esté dentro de mi web?",
      r: "No por sí sola. La clave anon está diseñada para ser pública y viajar en el código de la web. Lo que protege los datos son las reglas de acceso (RLS) de cada tabla. Con las reglas puestas, la clave a la vista no es un problema; sin ellas, abre la tabla entera.",
    },
    {
      p: "¿Cómo sé si mi tabla está abierta?",
      r: "En el panel de Supabase, Table Editor: si junto a la tabla aparece que RLS está desactivado (RLS disabled o Unrestricted), está abierta. La otra comprobación, más realista, es abrir tu propia web en una ventana de incógnito sin iniciar sesión y ver si te muestra datos que no debería.",
    },
    {
      p: "Activé RLS y mi web dejó de funcionar. ¿Lo desactivo?",
      r: "No. Que deje de ver los datos al activarlo es precisamente la prueba de que antes funcionaba por estar abierta. Falta el segundo paso: escribir las políticas que dicen quién puede leer y escribir cada tabla. Desactivarlo otra vez es volver al punto de partida.",
    },
    {
      p: "¿Esto solo pasa con Lovable?",
      r: "No. Le pasa a cualquier herramienta que conecte la web con una base de datos desde el navegador: Lovable, Bolt, v0 con Supabase y las demás. El patrón es el mismo porque la arquitectura es la misma. Lo que cambia es el nombre de la herramienta.",
    },
    {
      p: "Si publico mi web en otro alojamiento, ¿se arregla?",
      r: "No. Los datos no están en la web, están en Supabase, y quien decide quién los lee es la configuración de Supabase. El alojamiento solo entrega los archivos. Cambiar de sitio no abre ni cierra nada.",
    },
  ],
};
