# Desplegar Estrénala en producción (VPS + Dokploy)

Guía para sacar la plataforma a `estrenala.com`. Escrita para hacerla de una
sentada, en orden. Lo que hay que decidir se marca con **🔸 DECISIÓN**; lo que
tiene que hacer Sebas a mano, con **👤**.

Elegido el 2026-07-27: **VPS propio con Dokploy**. Es para lo que está escrito el
código (`DEPLOY_TARGET=dokploy` ya existe en `src/publish/dokploy.ts`) y permite
conectar los dominios de los clientes apuntando a una IP, que es como funciona
esto de verdad.

---

## 0) El mapa de direcciones

| Dirección | Qué sirve |
|---|---|
| `estrenala.com` | La landing (sin sesión) y el panel (con sesión). Es `PLATFORM_HOST` |
| `www.estrenala.com` | 301 a `estrenala.com` (lo hace el middleware) |
| `micafe.estrenala.com` | La web publicada de un cliente. Base = `SITES_BASE_DOMAIN` |
| `www.micafe.com` → `micafe.com` | Dominio propio de un cliente (plan de pago) |

Las dos variables valen **lo mismo** (`estrenala.com`): la plataforma gana
siempre porque se comprueba primero, y los subdominios peligrosos (`www`, `app`,
`api`, `admin`, `mail`, `blog`…) están en `RESERVADOS` (`src/publish/slug.ts`),
así que ningún usuario puede pedirlos.

> Alternativa descartada: panel en `app.estrenala.com` y landing redirigida. Se
> descarta porque la landing debe vivir en el dominio pelado (SEO y marca).

---

## 1) 👤 Contratar el VPS

Con **2 vCPU / 4 GB RAM** va sobrado para empezar (Dokploy pide 2 GB mínimo y
además corren Traefik y el build de Docker).

| Proveedor | Máquina | Precio aprox. |
|---|---|---|
| **Hetzner** (recomendado) | CPX21 · 3 vCPU 4 GB · Falkenstein o Helsinki | ~7 €/mes |
| DigitalOcean | Basic 2 vCPU 4 GB | ~24 $/mes |
| Contabo | VPS S · 4 vCPU 8 GB | ~7 €/mes |

Hetzner por precio y por estar en la UE (RGPD: los datos de tus clientes se
quedan en Europa, que es lo que dice tu política de privacidad).

Al crear la máquina:
- Imagen: **Ubuntu 24.04**.
- **Añade tu clave SSH** (si no tienes: `ssh-keygen -t ed25519` en tu PC y pegas
  el contenido de `~/.ssh/id_ed25519.pub`).
- Apunta la **IPv4** que te da: es el `DNS_TARGET_IP` que verán tus clientes.

---

## 2) 👤 Instalar Dokploy

Desde tu PC:

```bash
ssh root@TU_IP
curl -sSL https://dokploy.com/install.sh | sh
```

Tarda unos minutos. Al acabar te dice la URL del panel: `http://TU_IP:3000`.
Ábrela y **crea el usuario administrador** (el primero que entra manda: hazlo ya,
antes de que lo encuentre nadie).

> Después de esto, el puerto 3000 del VPS ya no debería quedar abierto al mundo:
> en Dokploy → Settings puedes ponerle un dominio propio (p. ej.
> `panel.estrenala.com`) y cerrar el 3000 en el cortafuegos de Hetzner.

---

## 3) 👤 DNS en Hostinger

En hPanel → Dominios → `estrenala.com` → **DNS / Nameservers**. Añade:

| Tipo | Nombre | Apunta a | TTL |
|---|---|---|---|
| A | `@` | `TU_IP` | 3600 |
| A | `*` | `TU_IP` | 3600 |
| A | `www` | `TU_IP` | 3600 |

- El `*` (comodín) es el que hace que **cualquier** subdominio de cliente
  (`micafe.estrenala.com`) llegue a tu servidor sin tocar nada más.
- **No borres** los registros de Resend (`MX send`, `TXT send` con el SPF y el
  `TXT resend._domainkey` con el DKIM): son los que hacen que lleguen los
  correos. Si Hostinger ya tenía un A de `@` apuntando a su hosting, ese sí se
  cambia por el tuyo.

---

## 4) 🔸 DECISIÓN: el certificado del comodín

Los certificados gratuitos de Let's Encrypt se piden de dos maneras y aquí hacen
falta las dos:

- **Dominios de clientes** (`micafe.com`): resueltos. Cuando alguien conecta su
  dominio, la plataforma llama a la API de Dokploy y Traefik emite el certificado
  por HTTP-01 él solo. Ya está programado (`DokployDeploy.connectDomain`).
- **Subdominios `*.estrenala.com`**: un certificado comodín **no se puede** emitir
  por HTTP-01; hace falta el reto DNS-01, y para eso Traefik necesita una API de
  DNS. Hostinger no tiene integración en Traefik; Cloudflare sí.

**Recomendación: mover el DNS de `estrenala.com` a Cloudflare** (gratis, el
dominio sigue comprado en Hostinger; solo cambian los *nameservers*). Con eso
Traefik pide el comodín solo y no hay que tocar nada nunca más.

Alternativa sin mover nada: que la plataforma registre en Dokploy **cada
subdominio** al publicarlo (un certificado por web, HTTP-01, sin comodín). Son
~15 líneas en `src/publish/dokploy.ts` — dilo y lo hago.

---

## 5) Crear la aplicación en Dokploy

En el panel de Dokploy: **Create Project** → `estrenala` → **Create Service →
Application**.

- **Source**: Git. Si el repo es privado, Dokploy te da una clave SSH para
  añadir como *deploy key* en el repositorio.
- **Build Type**: `Dockerfile` (ya está en la raíz del proyecto: build en varias
  etapas y salida `standalone`, ~29 MB).
- **Port**: `3000`.
- **Domains**: añade `estrenala.com` y `www.estrenala.com`, HTTPS con Let's
  Encrypt. (El comodín `*.estrenala.com` según lo que salga del punto 4.)

---

## 6) Variables de entorno

En Dokploy → tu aplicación → **Environment**. Esta es la lista completa; las que
no cambian respecto a tu `.env.local` están marcadas «igual».

```bash
# --- Direcciones ---
PLATFORM_HOST=estrenala.com
SITES_BASE_DOMAIN=estrenala.com
DNS_TARGET_IP=TU_IP          # la que se le enseña al cliente para su dominio

# --- Candado de pre-lanzamiento: PONER YA, QUITAR AL LANZAR ---
# Mientras esté puesto, toda la plataforma sale con «X-Robots-Tag: noindex,
# nofollow» y su robots.txt prohíbe el rastreo entero. Hace falta aunque no le
# hayas enseñado la web a nadie: al emitir el certificado, Let's Encrypt publica
# el dominio en los registros de Certificate Transparency, que son públicos y hay
# bots rastreándolos en busca de dominios nuevos.
# NO afecta a las webs de los clientes: cada una tiene su interruptor.
PLATAFORMA_NOINDEX=1

# --- Base de datos (igual que en local: el mismo Supabase) ---
# ⚠️ Si la contraseña lleva $, & o #, va CODIFICADA en la URL ($ → %24). Next.js
# EXPANDE variables al leer los .env, así que un "$Px92" suelto se convierte en
# nada y la contraseña llega cortada: el síntoma es «password authentication
# failed» aunque la contraseña sea correcta. Pasó el 2026-07-27.
DATABASE_URL=...

# --- Almacenamiento: OBLIGATORIO cambiarlo ---
# En local se guardan los archivos en data/storage. En Docker eso se borra en
# cada despliegue: en producción van a Supabase Storage.
STORAGE_DRIVER=supabase
SUPABASE_URL=https://TUREF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...        # Project Settings → API → service_role
SUPABASE_STORAGE_BUCKET=sites        # créalo en Supabase → Storage (privado)

# --- Sesiones: GENERA UNO NUEVO, no reutilices el de desarrollo ---
SESSION_SECRET=...                   # openssl rand -base64 48

# --- Cifrado de las claves de IA de tus clientes: OBLIGATORIO ---
# Cifra lo que cada espacio pega en Configuración (claves de OpenRouter y
# SerpAPI). Son credenciales de terceros con dinero detrás. Sin esta variable la
# aplicación arranca igual, pero al intentar guardar una clave devuelve un error
# que dice justo esto.
# A diferencia de SESSION_SECRET, esta TIENE QUE SER LA MISMA que la de tu
# .env.local mientras local y producción compartan base de datos (hoy la
# comparten: el mismo proyecto de Supabase). Con dos claves distintas, lo que se
# guarde desde un lado no se puede leer desde el otro. Si cambia, las claves ya
# guardadas dejan de poder leerse y sus dueños tienen que volver a pegarlas.
SECRETS_KEY=...                      # openssl rand -base64 32  (32 bytes exactos)

# --- Correo (igual) ---
RESEND_API_KEY=...
EMAIL_FROM=Estrénala <no-responder@estrenala.com>

# --- Google (igual la clave; hay que añadir la URI nueva, ver punto 8) ---
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# --- IA de la plataforma (igual) ---
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=anthropic/claude-sonnet-4.6
SERPAPI_KEY=...

# --- Stripe: TODO NUEVO, son las claves de producción (ver punto 7) ---
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PERSONAL_MES=price_...
STRIPE_PRICE_PERSONAL_ANUAL=price_...
STRIPE_PRICE_AGENCIA_MES=price_...
STRIPE_PRICE_AGENCIA_ANUAL=price_...

# --- Despliegue de dominios de clientes ---
DEPLOY_TARGET=dokploy
# La dirección del panel de DOKPLOY, no la de la plataforma. Si el panel se muda
# (se hizo el 2026-08-01), HAY QUE CAMBIARLA AQUÍ TAMBIÉN. Ver el aviso de abajo.
DOKPLOY_URL=https://dk-8f24.quantivatechnology.com
DOKPLOY_API_KEY=...                  # Dokploy → Settings → API/CLI
DOKPLOY_APPLICATION_ID=...           # está en la URL de tu aplicación

# --- Cron externo (opcional; el servidor ya publica solo cada 60 s) ---
CRON_SECRET=...
```

> ⚠️ `SESSION_SECRET` nuevo = todas las sesiones abiertas se caen. Es lo que
> quieres: la clave de desarrollo ha pasado por tu disco y por copias.

> ⚠️ **`DOKPLOY_URL` apuntando a un sitio que ya no es Dokploy no falla: MIENTE.**
> Al mover el panel el 2026-08-01, la vieja (`panel.estrenala.com`) pasó a caer en
> la regla comodín, o sea que la contesta **la propia plataforma** con su 404 de
> «esta web no está publicada». La llamada a la API recibe entonces un 404 con una
> página HTML en vez de un error de red, y lo que se ve arriba es que conectar un
> dominio no funciona, sin más pistas.
>
> Tardó **cuatro días** en salir a la luz porque con `DOKPLOY_COMODIN=1` publicar
> ya no llama a Dokploy: los subdominios los cubre la regla comodín. Los únicos
> que aún le llaman son `connectDomain` y `disconnectDomain`, y hasta el
> 2026-08-05 nadie había conectado un dominio propio desde la mudanza.
>
> Para comprobarlo sin desplegar nada, desde cualquier sitio:
>
> ```
> curl -s "$DOKPLOY_URL/api/domain.byApplicationId?applicationId=x"
> ```
>
> Tiene que contestar `{"message":"Unauthorized"}`. Si contesta HTML, la variable
> apunta a la plataforma y **ningún dominio de cliente se va a poder conectar**.

---

## 7) 👤 Stripe en modo producción

En el panel de Stripe, arriba a la izquierda, quita **«Modo de prueba»**. Es un
catálogo distinto: hay que rehacer lo de la otra noche.

1. **Activa la cuenta** (te pedirá NIF, dirección y cuenta bancaria; es el
   trámite de «activar los pagos»). Sin esto no hay claves `live`.
2. **Billing → Catálogo de productos**: crea otra vez los dos productos con sus
   dos precios (9 €/mes, 90 €/año, 29 €/mes, 290 €/año) y copia los **4 price
   IDs nuevos**.
3. **Desarrolladores → Claves de API**: copia la clave secreta `sk_live_…`.
4. **Desarrolladores → Webhooks → Añadir endpoint**:
   - URL: `https://estrenala.com/api/stripe/webhook`
   - Eventos: `customer.subscription.created`, `customer.subscription.updated` y
     `customer.subscription.deleted`. Solo esos tres: la plataforma no necesita
     `checkout.session.completed` (el `orgId` viaja en los metadatos de la
     suscripción, no en la sesión de pago).
   - Copia el **secreto de firma** (`whsec_…`) al entorno.

---

## 8) 👤 Google: añadir la dirección de producción

Google Cloud Console → Credenciales → tu ID de cliente OAuth → **URIs de
redireccionamiento autorizados** → añadir (sin borrar la de localhost):

```
https://estrenala.com/api/auth/google/callback
```

Y en «Orígenes autorizados de JavaScript»: `https://estrenala.com`.

---

## 8 bis) 👤 ROTAR las credenciales de Supabase — obligatorio

La contraseña de la base y la clave `service_role` del proyecto de Estrénala se
escribieron en una conversación el 2026-07-27. Mientras la base estaba vacía daba
igual; en cuanto haya datos de clientes, no. **Antes de abrir al público:**

1. Supabase → botón `Connect` → **reset database password**. Pon una **sin `$`,
   `&` ni `#`** y te ahorras el problema de la codificación de arriba.
2. Supabase → **JWT Keys / API Keys** → rotar la `service_role`.
3. Actualizar `DATABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` **y**
   en las variables de Dokploy, y volver a desplegar.

## 9) Primer arranque

1. **Deploy** en Dokploy y mira los logs hasta el `Ready`.
2. `https://estrenala.com/api/health` debe responder `200`.
3. La base de datos ya está migrada (es el mismo Supabase que usas en local). Si
   algún día hace falta, las migraciones están en `scripts/db/*.mjs` y son
   idempotentes: `node scripts/db/<archivo>.mjs`.
4. Entra, registra tu cuenta real y confirma el correo (ahora sí llega de verdad).

---

## 10) Comprobaciones antes de contarlo por ahí

- [ ] `https://estrenala.com` enseña la landing sin sesión.
- [ ] `https://www.estrenala.com` redirige al pelado.
- [ ] Registro → llega el correo de confirmación.
- [ ] «Continuar con Google» entra.
- [ ] Subo un ZIP, publico y `https://loquesea.estrenala.com` se ve **con** la
      insignia «Hecho con Estrénala» (plan gratuito).
- [ ] Pago real con tarjeta real → el plan sube solo y la insignia desaparece.
- [ ] Conectar un dominio propio emite su certificado (tarda un par de minutos).
- [ ] Stripe → Webhooks: el endpoint aparece en verde, sin reintentos.
- [ ] `https://estrenala.com/robots.txt` responde y dice lo que toca según tengas
      o no `PLATAFORMA_NOINDEX` (ver punto 6).

### El día que lo abras al público

- [ ] **Quitar `PLATAFORMA_NOINDEX`** de Dokploy y redesplegar. Comprobar que
      `curl -sI https://estrenala.com | grep -i x-robots-tag` no devuelve nada.
- [ ] Dar de alta el dominio en Google Search Console y pedir la indexación.

---

## Notas de mantenimiento

- **Copias de seguridad**: Supabase tiene copias diarias en el plan gratuito
  (7 días). El almacenamiento de las webs (Supabase Storage) no: si esto crece,
  vale la pena un volcado semanal a otro sitio.
- **Actualizar**: `git push` a `master` y **Deploy** en Dokploy (o activa el
  webhook de despliegue automático).
- **Los correos y la IA no dependen del VPS**: Resend y OpenRouter son externos.
  Si el VPS se cae, las webs publicadas se caen con él (se sirven desde la
  aplicación). Es el punto único de fallo a vigilar.
