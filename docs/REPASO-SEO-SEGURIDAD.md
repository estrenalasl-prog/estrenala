# Repaso antes de abrir: SEO, indexación, seguridad y «plugins»

**Fecha:** 28 de julio de 2026 · **Estado del código:** commit `ba1be6a` (incremento 18)

Repaso hecho leyendo el código, no de memoria. Cada hallazgo dice dónde está y
qué pasa si no se toca. Lo que ya está bien también sale: sirve para no volver a
mirarlo y para saber de qué partimos.

**Prioridades**

| | Cuándo |
|---|---|
| 🔴 | Antes de abrirlo al público |
| 🟠 | Primeras semanas, con clientes ya dentro |
| 🟢 | Cuando haya volumen; hoy no duele |

---

## 0) Lo que bloquea el lanzamiento

Nada de esto es código: son pasos tuyos en paneles ajenos.

| | Qué | Dónde |
|---|---|---|
| 🔴 | **`PLATAFORMA_NOINDEX=1`** y redesplegar | Dokploy → Estrénala → Environment |
| 🔴 | **Stripe a producción**: activar la cuenta, recrear los 2 productos y 4 precios, `sk_live_`, webhook a `https://estrenala.com/api/stripe/webhook` con solo `customer.subscription.created/.updated/.deleted`, y actualizar 6 variables | `docs/DESPLIEGUE.md` punto 7 |
| 🔴 | **Google**: añadir `https://estrenala.com/api/auth/google/callback` y el origen `https://estrenala.com`, **sin quitar localhost** | Google Cloud Console → Credenciales |
| 🔴 | **Probarlo tú como cliente**: registrarte, subir un ZIP, publicar, ver la marca, conectar un dominio | En producción |

La última es la importante: **ningún humano ha usado todavía la plataforma en
producción**. Los e2e cubren el camino feliz, pero no cubren «me llegó el correo
raro» ni «esto no se entiende».

---

## 1) Seguridad

### Lo que ya está bien

No es relleno: son decisiones que no hay que revisar.

- **Contraseñas**: `scrypt` (N=16384) con sal por usuario y comparación en tiempo
  constante. Nunca se registran en el log. → `src/auth/password.ts`
- **Cookies**: `httpOnly`, `sameSite=lax`, `secure` en producción y **sin atributo
  `Domain`** (host-only), así que no viajan a los subdominios de las webs
  publicadas ni a los dominios de clientes. → `src/auth/cookie-http.ts`
- **Límite de intentos** en login, registro, recuperar y restablecer.
- **Webhook de Stripe**: firma HMAC-SHA256 con comparación en tiempo constante,
  ventana antirreplay de ±5 min y varias firmas `v1` por rotación.
- **Traversal**: la ruta pública rechaza `..`, `/` y `\` antes de tocar la base.
- **ZIP**: tope de 2.000 archivos y 50 MB.
- **La API nunca devuelve las claves**: solo el origen y los últimos 4 caracteres.

### 🔴 A) Las claves de tus clientes están **en claro** en la base

`org_settings.openrouter_key` y `serpapi_key` se guardan tal cual.

> `src/repositories/org-settings.ts` · `src/db/schema.ts:48`

Son credenciales **de terceros** con dinero detrás: quien tenga un volcado de la
base puede gastar en la cuenta de OpenRouter de tu cliente. Y esto no es teórico
para ti: hace dos días una clave de servicio acabó pegada en un chat y hubo que
rotarla. Si eso hubiera sido un volcado de `org_settings`, habría que avisar uno
a uno a los clientes.

**Arreglo:** cifrarlas en reposo con AES-256-GCM y una clave en el entorno
(`SECRETS_KEY`), con el mismo formato versionado que ya usas en las contraseñas
(`s1.<iv>.<tag>.<cifrado>`). Es un módulo pequeño y un script de migración que
recifra lo que haya. Media tarde.

### 🔴 B) Cambiar de subdominio no tiene freno, y cada cambio pide un certificado

Cada subdominio nuevo se da de alta en Traefik con `certificateType: letsencrypt`.
No hay límite de cuántas veces puedes renombrar.

> `src/publish/publish-site.ts` → `cambiarSubdominio` · `src/publish/dokploy.ts` → `alta`

Let's Encrypt limita los certificados nuevos por dominio registrado (del orden
de 50 a la semana). Una cuenta gratuita renombrando su web en bucle deja **a
todos los clientes** sin poder emitir certificado durante días. Y no hace falta
mala fe: basta con alguien indeciso.

**Arreglo:** límite por espacio (p. ej. 5 cambios de dirección al día) y no dar
de alta en Traefik hasta que la web esté publicada de verdad.

### 🔴 C) Conectar un dominio no comprueba que sea tuyo

`conectarDominio` valida el formato y que no lo tenga otro proyecto, y lo
registra. No comprueba el DNS.

> `src/publish/publish-site.ts:86`

Dos consecuencias: cualquiera puede **bloquear** un dominio ajeno dentro de
Estrénala (escribe `elcorteingles.es` y ya nadie más puede conectarlo), y cada
intento gasta del cupo del punto B.

No permite robar tráfico —el DNS sigue siendo del dueño—, pero es la puerta de
entrada a los dos problemas anteriores.

**Arreglo:** verificación por DNS antes de registrar, que es además lo que
desbloquea el 301 del subdominio al dominio propio que descartamos por esto
mismo. Se le enseña un registro `TXT` con un token, se comprueba con
`dns.promises.resolveTxt`, y hasta que no resuelva el dominio queda «pendiente».

### 🟠 D) Una web de cliente puede empujarte una cookie de sesión

Las webs publicadas viven en `*.estrenala.com` y ejecutan **el JavaScript que su
dueño haya subido**. Tu cookie de sesión es host-only, así que **no pueden
leerla** (eso está bien resuelto). Pero sí pueden *escribir* una cookie
`wc_session` con `Domain=.estrenala.com`, y el navegador la mandaría también a
`estrenala.com`.

No sirve para suplantar a nadie —la cookie va firmada y no pueden falsificarla—,
pero sí para **meterte en la sesión del atacante** sin que lo notes: subirías tu
web a la cuenta de otro.

**Arreglo:** renombrar la cookie a `__Host-wc_session`. Ese prefijo hace que el
navegador **rechace** cualquier cookie con ese nombre que lleve `Domain`. Es
cambiar una constante y forzar que todos vuelvan a entrar una vez.

### 🟠 E) La plataforma no manda ninguna cabecera de seguridad

`next.config.ts` no tiene bloque `headers()`. Faltan `Strict-Transport-Security`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy` y `frame-ancestors`.

**Ojo con el matiz:** estas cabeceras van **solo en la plataforma**. Las webs
publicadas se sirven desde la misma aplicación, y meterles `frame-ancestors` o
un CSP rompería a clientes que legítimamente incrustan su web o cargan scripts
de terceros. La regla tiene que excluir `/sites/`.

### 🟢 F) Riesgos asumidos (documentados, no olvidados)

- El **preview del panel** es legible sin cookie: vive en un iframe con origen
  opaco y el UUID v4 del proyecto hace de capacidad. Está razonado en
  `middleware.ts`; la escritura sí está tras el candado.
- **Contenido de clientes**: puede subirse cualquier HTML. Cuando haya volumen
  hará falta una forma de retirar una web denunciada (hoy solo a mano por base
  de datos).

---

## 2) SEO e indexación

Lo del incremento 18 ya está: interruptor por web, canónico hacia el dominio
propio y candado de plataforma. Esto es lo que sigue faltando.

### 🔴 G) Compartir el enlace de Estrénala no enseña nada

`app/layout.tsx` solo define `title` y `description`. No hay `metadataBase`, ni
`openGraph`, ni imagen. Cuando pegues `estrenala.com` en WhatsApp, X o LinkedIn
—que es exactamente lo que vas a hacer el día del lanzamiento— sale un enlace
pelado, sin tarjeta ni imagen.

Y es irónico: **ya tienes el generador**. Las portadas del blog se rasterizan a
PNG 1200×630 con resvg y Space Grotesk (`src/blog/portada/`). Es la misma pieza.

**Arreglo:** `metadataBase` + `openGraph` + `twitter` en el layout, y una imagen
`app/opengraph-image.png` de 1200×630. Es la mejora con mejor relación
esfuerzo/impacto de toda esta lista.

### 🟠 H) Las webs sin blog no tienen `sitemap.xml`

El sitemap solo se genera al publicar artículos.

> `src/blog/apply.ts:109`

Una web de cinco páginas subida en ZIP no tiene ninguno, salvo que la IA que la
generó incluyera uno (y entonces apuntará a direcciones inventadas). Google se
apaña rastreando enlaces, pero para un sitio nuevo sin enlaces entrantes el
sitemap es lo que acelera la indexación.

**Arreglo:** generarlo al publicar, recorriendo los `.html` del snapshot —el
recorrido ya existe en `src/editor/walk.ts`— y respetando el interruptor de
no indexar.

### 🟠 I) Conectar un dominio **después** deja el blog apuntando al subdominio

`basePublica` decide la dirección pública **en el momento de escribir** el
artículo, y esa dirección se congela dentro del HTML y del sitemap.

> `src/blog/render.ts:8`

Si un cliente escribe diez artículos y luego conecta `sucafeteria.com`, los diez
siguen anunciando como canónica la dirección `*.estrenala.com`. Le estás diciendo
a Google que su dominio bueno es el que no es suyo.

**Arreglo:** al conectar un dominio, reescribir canónicos y sitemap del blog.
Mientras tanto, el canónico que acabamos de añadir tapa el caso de la web
principal, pero no el de los artículos ya escritos.

### 🟢 J) `/` y `/index.html` son la misma página en dos direcciones

`resolvePublicSite` sirve el `entryPath` cuando la ruta viene vacía, así que
ambas devuelven lo mismo con estado 200. Es duplicado de manual, aunque Google
suele resolverlo solo. Se arregla con un 301 de `/index.html` a `/`.

### 🟢 K) Tú no tienes Search Console

La herramienta de verificación de Google existe **para las webs de tus clientes**
(`src/editor/head-tools.ts`), pero la plataforma no está dada de alta. Es el
paso natural el día que quites `PLATAFORMA_NOINDEX`.

---

## 3) «Plugins»: lo que ya tienes y hacia dónde va

### La buena noticia: la abstracción ya existe

En `src/editor/head-tools.ts` hay un tipo `Herramienta` con cuatro miembros:
verificación de Google, Analytics, favicon e imagen para compartir. Se aplican
como **ediciones quirúrgicas del `<head>`** que se materializan en el snapshot.

O sea: ya tienes un sistema de extensiones. Le faltan extensiones.

### La decisión de arquitectura, que ya has tomado dos veces sin saberlo

Hay dos formas de meter algo en la web de un cliente:

| | Cuándo se aplica | Ejemplos actuales |
|---|---|---|
| **Al publicar** | Se escribe dentro del HTML del snapshot | Las 4 herramientas de `<head>` |
| **Al servir** | Se inyecta al vuelo en cada visita | La marca «Hecho con Estrénala», el `noindex` |

Lo de servir es **claramente mejor para plugins**: se activa y desactiva al
momento, sin republicar, y no ensucia el HTML del cliente. Es justo lo que
hiciste con la marca —desaparece al pagar y vuelve al cancelar, sola— y con el
interruptor de indexación.

Cuando montes plugins, ese es el camino: un registro de plugins activos por
proyecto y una única pasada de inyección en `resolvePublicSite`.

### Qué plugins, por orden de lo que un negocio pequeño necesita de verdad

El criterio: **lo que una web estática hecha con IA no puede hacer sola**. Ahí es
donde Estrénala deja de ser un hosting y pasa a ser una plataforma.

1. **Formulario de contacto** — El primero, con diferencia. Toda web de negocio
   lo lleva y ninguna web estática puede enviarlo. Necesita servidor (que tienes),
   correo (Resend, que tienes), antispam y consentimiento RGPD. Es *la* razón por
   la que alguien elegiría Estrénala en lugar de Netlify.
2. **Botón flotante de WhatsApp** — Trivial de implementar y en España es como
   se contacta con un negocio pequeño. Casi todo ventaja.
3. **Banner de cookies** — Hoy tus clientes no lo necesitan si su web no lleva
   Analytics… pero **tú ya les ofreces Analytics**, y en cuanto lo activan sí lo
   necesitan por el art. 22.2 de la LSSI. Ahora mismo les estás dando la
   herramienta que les crea la obligación sin darles con qué cumplirla.
4. **Reservas / citas** — Peluquerías, dentistas, restaurantes. Mucho más
   trabajo, pero es lo que convierte 9 €/mes en 29 €/mes.
5. **Captura de correos / newsletter** — Encaja con el blog automático que ya
   tienes.

El 3 tiene además una lectura defensiva: es el único de la lista donde el
problema lo has creado tú.

---

## Orden que propongo

**Antes de abrir** — Los cuatro pasos del punto 0, más **G** (compartir el
enlace), **A** (cifrar claves) y **B**+**C** juntos, que son el mismo arreglo:
verificación de dominio con límite de altas.

**Primeras semanas** — **D** (`__Host-`), **E** (cabeceras), **H** (sitemap),
**I** (canónicos al conectar dominio).

**Cuando haya clientes pidiéndolo** — Los plugins, empezando por el formulario
de contacto. Y **J**, **K** y el resto cuando toque.

Si tuviera que quedarme con dos: **G**, porque es el día del lanzamiento y sin
eso el enlace no vende; y **C**, porque desbloquea el 301 que dejamos a medias y
cierra de paso el agujero del cupo de certificados.
