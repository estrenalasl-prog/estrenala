import type { Articulo } from "../tipos";

// Recordatorio: las comillas invertidas del Markdown van escapadas (\`asi\`).
export const conectarDominioRegistrosDns: Articulo = {
  slug: "conectar-dominio-registros-dns",
  titulo: "Conectar tu dominio: los registros DNS que hay que tocar",
  descripcion:
    "Qué es la zona DNS, qué significan A, CNAME y AAAA, y por qué un registro que te olvidas de borrar hace que media internet siga viendo tu web anterior.",
  entradilla:
    "Cambias el registro, esperas, y tu web nueva se ve. Pero en el móvil de tu socio sigue saliendo la vieja. No estás loco: hay un registro que casi nadie borra y que gana la partida en silencio.",
  fecha: "2026-08-09",
  tema: "Dominios",
  resumen: [
    "Qué es exactamente la zona DNS y por qué no hay forma de esquivarla.",
    "Los tres registros que importan, explicados sin jerga y con lo que hace cada uno.",
    "El registro AAAA que deja tu web anterior en pie sin dar ni un solo error.",
  ],
  cuerpo: `
Publicar la web es el paso fácil. El que hunde a la gente es este.

Compraste *tunegocio.com* en algún sitio —Hostinger, GoDaddy, IONOS, da igual— y
ahora tienes que hacer que ese nombre lleve a tu web nueva. Para eso hay que
entrar en un panel y tocar una tabla. No hay atajo, ningún servicio serio puede
hacerlo por ti sin las llaves de tu dominio.

La buena noticia es que son **dos filas**, y en diez minutos está.

## Qué es la zona DNS

Piénsalo como la agenda de contactos de internet.

Cuando alguien escribe *tunegocio.com*, su navegador no tiene ni idea de dónde
está eso. Va y pregunta. La respuesta sale de una tabla asociada a tu dominio: la
**zona DNS**. Ahí pone «este nombre corresponde a este servidor», igual que en tu
agenda pone que «Mamá» corresponde a un número.

Tú eres el dueño de esa agenda. Está en el panel de donde compraste el dominio,
normalmente en un menú que se llama *DNS*, *Zona DNS* o *Administrar registros*.

## Los tres nombres que hay que entender

**Registro A.** El importante. Dice: *este dominio está en este servidor*, y da
una dirección numérica del tipo \`72.61.176.214\`. Es el que hace que tu web se
vea.

**Registro CNAME.** Dice: *esto es otro nombre para aquello*. El uso típico es
\`www\`: pones un CNAME que apunta \`www.tunegocio.com\` a \`tunegocio.com\`, y así
funciona lo escriba la gente como lo escriba.

**Registro AAAA.** Es como el A pero para direcciones de la generación nueva,
mucho más largas y con letras. **Y este es el que te va a arruinar la tarde.**

## Cómo queda al final

{{figura:zona-dns}}

## El AAAA: por qué es tan traicionero

Si tu dominio ya tuvo una web antes —un WordPress, una página del propio
registrador, cualquier cosa—, es muy probable que tenga un AAAA apuntando allí.

Y aquí está la trampa: cuando un dominio tiene A y AAAA a la vez, **los
navegadores modernos prefieren el AAAA**. Así que cambias el A, lo compruebas
desde tu ordenador y ves la web nueva; y tu socio, con otra conexión, sigue
viendo la vieja.

Lo peor es cómo se manifiesta: **no hay ningún error**. Nada en rojo, ningún
aviso, ninguna pista. Simplemente, para media internet tu web sigue siendo la
anterior. He visto perder días enteros con esto.

Regla sencilla: **si vas a cambiar el A, mira si hay un AAAA. Si lo hay y no
sabes qué es, bórralo.**

## En qué orden hacerlo

1. **Baja el TTL antes de tocar nada**, si tu panel te deja. El TTL es cuánto
   tiempo se guarda la respuesta en memoria por ahí. Ponlo en 300 segundos y
   espera un rato: así, cuando cambies de verdad, el cambio corre en minutos y no
   en horas.
2. **Cambia el registro A** a la dirección que te den.
3. **Borra los AAAA** que apunten a otro sitio.
4. **Comprueba el \`www\`**: un CNAME al dominio pelado.
5. **Espera.** De diez minutos a unas horas. Durante ese rato funcionará para
   unos y para otros no, y es completamente normal.
6. Cuando esté, sube el TTL otra vez a algo largo (3600 o más).

## Si pasado un día sigue sin verse

Por orden de probabilidad:

- **Queda un AAAA.** Es esto el 80 % de las veces.
- **Lo pusiste en el sitio equivocado.** Si tu dominio usa los servidores de
  nombres de otro proveedor —Cloudflare, por ejemplo—, la zona que manda es la de
  allí, y la del registrador ya no la mira nadie.
- **Escribiste el nombre completo donde iba solo \`@\`.** Algunos paneles quieren
  \`@\` para el dominio pelado y otros el dominio entero. Si te equivocas, se crea
  \`tunegocio.com.tunegocio.com\`.
- **Hay un proxy en medio.** Si tu dominio está detrás de un proxy (en Cloudflare
  es el icono naranja), el registro A resuelve al proxy y no a tu servidor. Hay
  que apagarlo o usar la verificación por TXT.

## Lo que hacemos nosotros para que duela menos

Cuando conectas un dominio en Estrénala **no nos limitamos a aceptarlo**. Miramos
tu DNS de verdad en ese momento y te decimos qué encontramos:

- Si el dominio no apunta aquí todavía, te decimos exactamente qué registro
  poner, con el nombre y el valor listos para copiar.
- **Si hay AAAA de sobra, no dejamos conectar y te lo decimos.** Preferimos
  frenarte medio minuto a que te pases dos días pensando que la plataforma
  falla.
- Reconocemos tu proveedor por sus servidores de nombres, así que te hablamos del
  panel que vas a ver tú y no de uno genérico.
- Si el dominio está detrás de un proxy, te damos un registro TXT como
  alternativa, porque ahí el A nunca va a resolver a nuestro servidor.

Y el certificado —el candado del HTTPS— se pide solo en cuanto el dominio apunta
bien. No hay que hacer nada, ni pagar nada, ni renovar nada.

## Lo importante

Un dominio no es magia y no es difícil: son dos filas en una tabla y una que
sobra. Lo que lo convierte en una tarde perdida es que, cuando algo va mal,
**nadie te dice qué**.
`,
  preguntas: [
    {
      p: "¿Cuánto tarda en funcionar un dominio después de cambiar el DNS?",
      r: "Normalmente entre diez minutos y unas pocas horas. Durante ese rato es normal que la web se vea desde unos sitios y desde otros no, porque las respuestas antiguas siguen guardadas en memoria por el camino. Si bajas el TTL a 300 segundos un rato antes de tocar nada, el cambio corre mucho más rápido.",
    },
    {
      p: "¿Qué diferencia hay entre un registro A y un AAAA?",
      r: "Los dos dicen en qué servidor está tu dominio. El A usa las direcciones clásicas, del tipo 72.61.176.214, y el AAAA las de la generación nueva, más largas y con letras. El problema es que cuando existen los dos, los navegadores modernos prefieren el AAAA, así que un AAAA antiguo deja en pie tu web anterior aunque el A esté bien puesto.",
    },
    {
      p: "Cambié el registro A y sigo viendo la web antigua. ¿Qué pasa?",
      r: "Lo más probable es que quede un registro AAAA apuntando al sitio anterior: gana al A y no da ningún error. Bórralo. Si no hay ninguno, comprueba que estás tocando la zona DNS correcta, porque si tu dominio usa los servidores de nombres de otro proveedor, la del registrador ya no la mira nadie.",
    },
    {
      p: "¿Necesito el registro www o basta con el dominio a secas?",
      r: "Conviene tener los dos, porque la gente escribe las direcciones como le da la gana. Lo habitual es un registro A para el dominio pelado y un CNAME que lleve www al dominio pelado, de forma que las dos formas acaben en el mismo sitio.",
    },
    {
      p: "¿Tengo que pagar aparte el certificado HTTPS?",
      r: "No. En Estrénala el certificado se pide y se renueva solo en cuanto el dominio apunta bien, sin coste y sin que tengas que hacer nada. Además te avisamos por correo si alguna vez estuviera a punto de caducar sin renovarse.",
    },
  ],
};
