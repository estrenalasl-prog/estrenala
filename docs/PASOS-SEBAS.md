# Tus pasos, uno detrás de otro

Todo lo que queda para abrir Estrénala al público y que **no puedo hacer yo**:
son paneles ajenos y decisiones tuyas. En orden. Marca según los hagas.

Si algo no coincide con lo que ves en pantalla, para y dímelo antes de seguir.

---

## 1) Comprobar que entrar y salir sigue funcionando ⏱️ 2 min ✅

**Por qué:** he cambiado el nombre de las cookies (a `__Host-wc_session`) para
tapar un agujero. Eso **cierra todas las sesiones abiertas**, y es lo único de
todo lo de ayer que no he podido verificar yo, porque hace falta un navegador de
verdad.

1. Arranca el proyecto en local: `npm run dev`
2. Abre **http://localhost:3000** — te va a pedir entrar (es normal, tu sesión
   vieja ya no vale).
3. Entra con tu cuenta.
4. Sal (botón de salir) y vuelve a entrar.

- [x] **Comprobado el 2026-07-29: entra y sale sin problema.** El prefijo
      `__Host-` no molesta en `http://localhost`, como esperábamos.

> Ojo: entra por `localhost`, **no** por `192.168.1.31`. Con el prefijo nuevo la
> cookie necesita conexión segura, y `localhost` cuenta como tal pero la IP no.

---

## 2) `SECRETS_KEY` en Dokploy ⏱️ 3 min ✅

**Por qué:** es la clave que cifra las claves de IA de tus clientes. Sin ella la
aplicación arranca igual, pero cuando alguien intente guardar su clave de
OpenRouter en Configuración le saltará un error.

> ⚠️ **NO generes una nueva.** Tiene que ser **la misma que ya está en tu
> `.env.local`**, porque tu entorno local y producción **comparten la misma base
> de datos** (el proyecto Supabase `ycbdgvirehucnkvlldve`). Con dos claves
> distintas, lo que se guarde desde un lado no se puede leer desde el otro y sale
> «No se pudo descifrar una clave guardada».

1. Copia la clave al portapapeles **sin que aparezca en pantalla**. Ponte primero
   en la carpeta del proyecto:
   ```
   cd "C:\Users\Sebas\Desktop\Carpeta de Proyectos\Wordclicks"
   ```

   **Desde el Símbolo del sistema (CMD)** — la ventana negra de siempre:
   ```
   powershell -Command "[regex]::Match((Get-Content .env.local -Raw), '(?m)^SECRETS_KEY=(.+)$').Groups[1].Value.Trim() | Set-Clipboard"
   ```

   **Desde PowerShell** (si la ventana pone «PowerShell» arriba):
   ```powershell
   [regex]::Match((Get-Content .env.local -Raw), '(?m)^SECRETS_KEY=(.+)$').Groups[1].Value.Trim() | Set-Clipboard
   ```

   > Los dos son lo mismo; lo que cambia es dónde lo escribes. CMD **no entiende**
   > la sintaxis de PowerShell: si te dice «El nombre de archivo, el nombre de
   > directorio o la sintaxis de la etiqueta del volumen no son correctos», es que
   > has usado la segunda versión en una ventana de CMD.

   Ninguno de los dos imprime nada: si no da error, ya la tienes copiada.
2. Dokploy → **Estrénala** → **Environment**.
3. Añade una línea nueva y **pega** (Ctrl+V) el valor detrás del `=`:
   ```
   SECRETS_KEY=<pegar aquí>
   ```
4. Comprueba que lo pegado son **44 caracteres y acaba en `=`**.
5. **Save**.

- [x] **Hecho el 2026-07-29.**

> **No la pegues nunca en un chat**, ni aquí ni en ningún sitio: es la que
> protege las credenciales de tus clientes.
>
> Si algún día la cambias, las claves que tus clientes tengan guardadas dejan de
> poder leerse y tendrán que volver a pegarlas. No es la misma que
> `SESSION_SECRET`.
>
> **El día que separes la base de datos de desarrollo de la de producción**
> —que deberías, más adelante— entonces sí podrán ser distintas.

---

## 3) Desplegar ⏱️ 5 min

Ya está todo subido a GitHub (rama `main`). En Dokploy → Estrénala → **Deploy**.

Cuando termine, comprueba estas cuatro cosas:

1. **https://estrenala.com** carga la landing.
2. El **icono** de la pestaña se ve (antes no se veía: iba al login).
3. **https://estrenala.com/robots.txt** dice `Disallow: /` — o sea, que el
   candado de pre-lanzamiento está puesto y Google no va a entrar.
4. Pega **https://estrenala.com** en un chat de WhatsApp contigo mismo: tiene que
   salir la **tarjeta con el logo** y «Tu web hecha con IA, por fin en directo».

   > ⚠️ **WhatsApp se guarda la vista previa y no la vuelve a pedir.** Si ya
   > compartiste el enlace antes, te seguirá enseñando la vieja aunque esté
   > cambiada. Para ver la nueva, manda una dirección distinta:
   > `https://estrenala.com/?2` (y a la siguiente `?3`, y así).

- [x] **Hecho el 2026-07-29.** La tarjeta salía, pero recortada: WhatsApp la
      corta a un cuadrado por el centro y la primera versión iba alineada a la
      izquierda. Rehecha centrada el mismo día → hay que **volver a desplegar**
      para verla.

---

## 4) Google: la dirección de producción ⏱️ 5 min ✅

**Por qué:** el botón «Continuar con Google» solo funciona en las direcciones que
Google tiene apuntadas. Ahora mismo solo tiene la de local.

1. Entra en **console.cloud.google.com** con la cuenta de Estrénala.
2. Arriba, selecciona el proyecto (el que usaste al crear las credenciales).
3. Menú **☰ → APIs y servicios → Credenciales**.
4. En «ID de clientes de OAuth 2.0», haz clic en el nombre de tu cliente web.
5. En **Orígenes autorizados de JavaScript** → **+ AÑADIR URI**:
   ```
   https://estrenala.com
   ```
6. En **URI de redireccionamiento autorizados** → **+ AÑADIR URI**:
   ```
   https://estrenala.com/api/auth/google/callback
   ```
7. ⚠️ **NO borres las de `localhost`**: son las que usas para desarrollar.
8. **GUARDAR**.

> **Comprobado el 2026-07-29: ya estaban puestas de antes**, las dos. No hubo
> que tocar nada.

> Google tarda a veces unos minutos en aplicarlo. Si al probar te da
> `redirect_uri_mismatch`, espera cinco minutos y reintenta.

- [x] **Hecho el 2026-07-29** (ya estaba).

---

## 5) Stripe a producción ⏱️ 25 min

**Por qué:** ahora mismo está en modo prueba. Las claves y los productos de
prueba **no valen** en producción: hay que rehacerlos.

> **Situación fiscal (decidida el 2026-07-29):** Sebas no está dado de alta como
> autónomo y no va a darse de alta hasta ver si esto genera ingresos reales; ya
> fue autónomo antes sin clientes y perdió la bonificación de nuevos autónomos.
> Cuando entre dinero, gestor y regularizar. Por eso en Stripe se declara
> **«Particular»**, que es lo que es: Stripe verifica identidad con el DNI, no
> el alta en Hacienda. **No declarar una situación que no se tiene.**

### 5.1 Activar la cuenta — campo por campo

En **dashboard.stripe.com** → «Activa tu cuenta». Los datos salen de
`src/legal/titular.ts`, que es lo que ya está publicado en las páginas legales:
**tienen que coincidir**.

**1 · Tipo de empresa**
- Ubicación: **España** (ya viene fija).
- Tipo de empresa: **Vendedor**. Pregunta si vendes lo tuyo o si eres un
  marketplace que cobra por cuenta de terceros. Tú vendes tus suscripciones.

**1 · Datos de la empresa**
- Estructura: **Particular** (ni «Empresa» ni «Sociedad limitada»).
- NIF: `79031692N`
- Dirección: `Calle Perdices 8, Bloque 1` · `29640` · `Fuengirola` · `Málaga`
- Sector: **Software** → **Software como servicio (SaaS)**.
- Sitio web: `https://estrenala.com`

> ⚠️ **Stripe entra en tu web a mirarla.** Si no ve qué vendes, a qué precio y
> con qué condiciones, te pide más información y se retrasa. Antes de enviar,
> comprueba que la landing enseña los planes con sus precios y que
> `estrenala.com/legal/terminos` está accesible. El candado `PLATAFORMA_NOINDEX`
> no estorba: solo dice a Google que no indexe, la web se ve igual.

**1 · Representante de la cuenta**
Tú: nombre completo, fecha de nacimiento, DNI, la misma dirección y tu teléfono.

**1 · Productos o servicios** — puedes pegar esto:
> Plataforma web por suscripción (SaaS) que publica en internet sitios web
> creados con inteligencia artificial, permite editarlos sin programar y genera
> contenido para su blog. Suscripción mensual o anual recurrente. No hay envío
> de productos físicos.

Si pregunta cuándo se cobra: **al momento de la suscripción, y luego cada
periodo**. Importe medio del pedido: **9 €**.

**1 · Datos públicos** (lo que ve el cliente)
- Nombre: `Estrénala`
- Web: `estrenala.com`
- Correo de soporte: `estrenala.sl@gmail.com`

**1 · Descripción del cargo en el extracto bancario** ← *importante*
- Pon: **`ESTRENALA`**
- Es lo que tu cliente verá en el banco. Si no lo reconoce, llama al banco y
  reclama el cargo — y cada reclamación te cuesta 15 € y penaliza tu cuenta.
  Máximo 22 caracteres, sin acentos ni eñes.

**2 · Añade tu banco**
IBAN **a tu nombre** (tiene que coincidir con el titular declarado).

**3 · Asegura tu cuenta**
Verificación en dos pasos. Usa una app de autenticación y **guarda los códigos de
recuperación** donde guardas las claves: si pierdes el móvil y no los tienes,
recuperar la cuenta es un calvario.

**4-5 · Revisar y enviar.** La aprobación suele tardar de minutos a un par de días.

### 5.2 Ponte en modo producción

Arriba a la derecha, quita el interruptor **«Modo de prueba»**. **Todo lo que
sigue se hace con el modo de prueba APAGADO.**

### 5.3 Recrear el catálogo

**Productos → + Añadir producto.** Necesitas **2 productos con 2 precios cada
uno** (mensual y anual), exactamente estos:

| Producto | Precio | Periodo |
|---|---|---|
| **Personal** | 9 € | Mensual (recurrente) |
| **Personal** | 90 € | Anual (recurrente) |
| **Agencia** | 29 € | Mensual (recurrente) |
| **Agencia** | 290 € | Anual (recurrente) |

Para el segundo precio de cada producto: entra en el producto ya creado y usa
**+ Añadir otro precio**, no crees un producto nuevo.

> **Sobre el «Comportamiento fiscal» de los precios** (comprobado el 2026-07-29):
> ese campo **solo lo enseña el panel si tienes Stripe Tax activado**, y aquí se
> omitió a propósito. Sin él, los precios nacen como «sin especificar», que es
> **el único estado que se puede cambiar más adelante**: «Incluido» y «Excluido»
> se quedan fijos para siempre.
>
> O sea que está bien como está y no hay que tocar nada. El día que te des de
> alta y actives Stripe Tax, ahí eliges «Incluido» (IVA incluido) y todo cuadra
> sin crear precios nuevos ni subirle el precio a nadie.

Al terminar, de cada uno de los **4 precios** copia su **ID** (empieza por
`price_`). Apúntalos identificando cuál es cuál.

### 5.4 La clave secreta

**Desarrolladores → Claves de API** → copia la **clave secreta** (empieza por
`sk_live_`). Solo se enseña una vez.

> 🔴 **La `sk_live_` y el `whsec_` NO se pegan en un chat. Nunca.** Ni aquí, ni
> en un correo, ni en un mensaje. Van del panel de Stripe a Dokploy y de ahí no
> salen. Con la `sk_live_` cualquiera puede mover dinero de tu cuenta.
>
> Los **IDs de precio** (`price_…`) sí se pueden compartir sin problema: no son
> secretos, viajan al navegador del cliente en cada compra.

### 5.5 El webhook

**Desarrolladores → Webhooks → + Añadir punto de conexión**.

- **URL:** `https://estrenala.com/api/stripe/webhook`
- **Eventos:** selecciona **solo estos tres**, ninguno más:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Créalo y copia su **secreto de firma** (empieza por `whsec_`).

### 5.6 Pasar las 6 variables a Dokploy

Dokploy → Estrénala → **Environment**. Sustituye estas seis:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PERSONAL_MES=price_...
STRIPE_PRICE_PERSONAL_ANUAL=price_...
STRIPE_PRICE_AGENCIA_MES=price_...
STRIPE_PRICE_AGENCIA_ANUAL=price_...
```

**Save** y **Deploy**.

- [ ] Hecho.

> ⚠️ No mezcles: una clave `sk_live_` con precios de prueba (o al revés) falla
> con «No such price». Si te pasa, es eso.

---

## 6) La prueba de verdad ⏱️ 20 min

**Es el paso más importante de toda la lista.** Ningún humano ha usado todavía la
plataforma en producción. Los e2e cubren que las piezas funcionan, no que se
entienda.

Hazlo **como si fueras un cliente**, no como quien la ha construido. Si algo te
chirría, apúntalo aunque sea una tontería.

1. Regístrate en **https://estrenala.com** con un correo tuyo real (uno distinto
   del de la cuenta de Estrénala, para vivir la experiencia entera).
2. ¿Te llega el correo de confirmación? ¿En cuánto? ¿Se lee bien? ¿Cae en spam?
3. Confirma y entra.
4. Sube el ZIP de una web hecha con IA.
5. Publícala y ábrela en el móvil.
6. Comprueba que abajo a la derecha sale **«Hecho con Estrénala»** (plan gratis).
7. Edita algo haciendo clic sobre la web y vuelve a publicar.
8. Abre «Dirección y dominio» y prueba el interruptor **«Que Google no la
   encuentre todavía»**. Con él puesto, la web sigue viéndose.
9. **Paga de verdad** con tu tarjeta el plan Personal. Comprueba que:
   - el plan sube solo, sin que tengas que hacer nada;
   - la insignia «Hecho con Estrénala» **desaparece**;
   - en Stripe → Webhooks el punto de conexión sale **en verde**, sin reintentos.
10. Si tienes un dominio suelto, conéctalo y mira que emita su certificado
    (tarda un par de minutos).
11. Cuando acabes, cancela la suscripción desde el portal y comprueba que el plan
    vuelve a gratuito y la insignia reaparece.

- [ ] Hecho. Cosas que apuntar: _______________

---

## 7) El día que la abras al público

**No lo hagas hasta haber terminado el paso 6.**

1. Dokploy → Environment → **borra la línea `PLATAFORMA_NOINDEX`** entera.
2. **Deploy**.
3. Comprueba que ya no está el candado:
   ```
   curl -sI https://estrenala.com | grep -i x-robots-tag
   ```
   No tiene que devolver nada.
4. **https://estrenala.com/robots.txt** ahora debe decir `Allow: /`.
5. Da de alta el dominio en **Google Search Console**
   (search.google.com/search-console) y pide la indexación de la portada.

- [ ] Hecho. **Estrénala está abierta.** 🎉
