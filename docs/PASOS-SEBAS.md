# Tus pasos, uno detrás de otro

Todo lo que queda para abrir Estrénala al público y que **no puedo hacer yo**:
son paneles ajenos y decisiones tuyas. En orden. Marca según los hagas.

Si algo no coincide con lo que ves en pantalla, para y dímelo antes de seguir.

---

## 1) Comprobar que entrar y salir sigue funcionando ⏱️ 2 min

**Por qué:** he cambiado el nombre de las cookies (a `__Host-wc_session`) para
tapar un agujero. Eso **cierra todas las sesiones abiertas**, y es lo único de
todo lo de ayer que no he podido verificar yo, porque hace falta un navegador de
verdad.

1. Arranca el proyecto en local: `npm run dev`
2. Abre **http://localhost:3000** — te va a pedir entrar (es normal, tu sesión
   vieja ya no vale).
3. Entra con tu cuenta.
4. Sal (botón de salir) y vuelve a entrar.

- [ ] **Va bien** → sigue al paso 2.
- [ ] **No te deja entrar, o entras y te echa** → para aquí y dímelo. Sería que
      el navegador está rechazando la cookie; se arregla rápido, pero no
      despliegues hasta que lo miremos.

> Ojo: entra por `localhost`, **no** por `192.168.1.31`. Con el prefijo nuevo la
> cookie necesita conexión segura, y `localhost` cuenta como tal pero la IP no.

---

## 2) `SECRETS_KEY` en Dokploy ⏱️ 3 min

**Por qué:** es la clave que cifra las claves de IA de tus clientes. Sin ella la
aplicación arranca igual, pero cuando alguien intente guardar su clave de
OpenRouter en Configuración le saltará un error.

1. Genera la clave. En la terminal del proyecto:
   ```
   openssl rand -base64 32
   ```
   Si `openssl` no te funciona en Windows, usa esto en su lugar:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
2. Copia el resultado (una línea de 44 caracteres que acaba en `=`).
3. Dokploy → **Estrénala** → **Environment**.
4. Añade una línea nueva:
   ```
   SECRETS_KEY=lo-que-te-ha-salido
   ```
5. **Save**.

- [ ] Hecho.

> **Guárdala donde guardas las demás.** Si algún día la cambias, las claves que
> tus clientes tengan guardadas dejan de poder leerse y tendrán que volver a
> pegarlas. No es la misma que `SESSION_SECRET`.

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
   *(Si no sale, WhatsApp puede tener el enlace cacheado: prueba con
   `https://estrenala.com/?1`.)*

- [ ] Hecho y las cuatro comprobaciones pasan.

---

## 4) Google: la dirección de producción ⏱️ 5 min

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

> Google tarda a veces unos minutos en aplicarlo. Si al probar te da
> `redirect_uri_mismatch`, espera cinco minutos y reintenta.

- [ ] Hecho.

---

## 5) Stripe a producción ⏱️ 25 min

**Por qué:** ahora mismo está en modo prueba. Las claves y los productos de
prueba **no valen** en producción: hay que rehacerlos.

### 5.1 Activar la cuenta

En **dashboard.stripe.com**, completa la activación (datos fiscales, cuenta
bancaria). Hasta que Stripe no la apruebe no puedes cobrar de verdad.

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

Al terminar, de cada uno de los **4 precios** copia su **ID** (empieza por
`price_`). Apúntalos identificando cuál es cuál.

### 5.4 La clave secreta

**Desarrolladores → Claves de API** → copia la **clave secreta** (empieza por
`sk_live_`). Solo se enseña una vez.

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
