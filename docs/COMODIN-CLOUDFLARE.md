# Certificado comodín `*.estrenala.com` con Cloudflare — runbook

Escrito el 2026-08-01. **Léelo entero antes de tocar nada.** Traefik está compartido
con producción de Quantiva (el CRM y los agentes de WhatsApp): hacer esto a lo loco no
tumba solo Estrénala.

## Por qué se hace

Hoy cada web publicada se da de alta como un dominio suyo en Dokploy, y Traefik le pide
a Let's Encrypt un certificado propio (reto HTTP-01). **Let's Encrypt limita a 50
certificados nuevos por semana y dominio registrado**, y todos los clientes cuelgan de
`estrenala.com`, así que **comparten el mismo cupo de 50**. La web 51 de la semana se
publicaría sin HTTPS. Un comodín cubre subdominios ilimitados con UN certificado y el
techo desaparece.

**Los dominios propios de los clientes NO entran aquí**: `sucliente.com` gasta el cupo
de `sucliente.com`, no el nuestro. Esos siguen con HTTP-01 exactamente como están.

## Lo que casi nadie ve venir

Dos cosas, y las dos muerden:

1. **El certificado comodín por sí solo no sirve de nada.** Como dice el comentario de
   `src/publish/dokploy.ts`: *sin una ruta que case con el Host, Traefik ni siquiera
   entrega la petición a la aplicación*. Hace falta ADEMÁS una regla de enrutado
   comodín. El certificado es la mitad del trabajo.

2. **La regla comodín puede robarte el panel de Dokploy.** En Traefik, cuando no se
   dice otra cosa, **la prioridad de una regla es la LONGITUD de su texto**: gana la más
   larga. Una regla `` HostRegexp(`^[a-z0-9-]+\.estrenala\.com$`) `` es más larga que
   `` Host(`panel.estrenala.com`) ``, así que **la comodín ganaría y `panel.estrenala.com`
   dejaría de llegar a Dokploy**: te quedas sin panel de control, servido por la
   plataforma, que además te devolvería su 404 pública. Se evita poniéndole a la regla
   comodín `priority=1` (la más baja), para que cualquier regla específica le gane.

## Estado verificado a 2026-08-01 (medido desde fuera)

Servidores autoritativos: `lunar.dns-parking.com`, `solar.dns-parking.com` (Hostinger).

| Nombre | Tipo | Valor |
|---|---|---|
| `estrenala.com` | A | `72.61.176.214` |
| `*` | A | `72.61.176.214` (comprobado: `comodin-test-xyz.estrenala.com` resuelve) |
| `www` | CNAME | `estrenala.com` |
| `send` | TXT | `v=spf1 include:amazonses.com ~all` |
| `send` | MX | `10 feedback-smtp.eu-west-1.amazonses.com` |
| `resend._domainkey` | TXT | `p=MIGfMA0…` (DKIM de Resend) |
| `_dmarc` | TXT | **NO EXISTE** — hay que crearlo |

- **Sin CAA** en `estrenala.com` ni en `quantivatechnology.com`: ninguna autoridad está
  bloqueada, no hay obstáculo para emitir el comodín.
- **Sin MX ni TXT en la raíz.** El SPF vive en `send.` (es el Return-Path de Resend) y
  la alineación de DMARC la va a dar el **DKIM**, que sí firma como `estrenala.com`.
- ⚠️ **`panel`, `mail`, `analitica`, `app`… responden por el COMODÍN**, no porque tengan
  registro propio. Desde fuera no se distingue un registro explícito de una coincidencia
  con el `*`. **Por eso el paso 0 es una captura de la zona en Hostinger**: es la única
  forma de saber qué hay escrito de verdad.

---

## Paso 0 — Red de seguridad (10 min, no te lo saltes)

1. Captura de pantalla de **toda** la zona DNS de Hostinger, con todas las filas
   visibles. Esta es la lista buena, no la de arriba.
2. Captura de Dokploy → **Web Server → Traefik**: las *Environment Variables* y el
   contenido de `traefik.yml`.
3. Captura de la app `estrenala` → pestaña **Domains** (la lista de hosts dados de alta).
4. Apunta el correo con el que Let's Encrypt tiene registrada la cuenta (sale en
   `traefik.yml`).

## Paso 1 — Mover el DNS a Cloudflare (reversible, no cambia nada más)

Esto **solo cambia quién contesta las preguntas de DNS**. Ni certificados, ni Traefik,
ni la aplicación. Si sale mal, se vuelve atrás cambiando los nameservers.

1. Cloudflare → **Add a site** → `estrenala.com` → plan **Free**.
2. Cloudflare importa lo que encuentra. **Repasa fila por fila contra tu captura del
   paso 0** y añade a mano lo que falte. El importador se deja cosas, y **un MX o un
   DKIM perdido rompe el correo sin avisar**.
3. **Todos los registros en gris (DNS only), ninguno naranja.** El proxy/CDN es el paso
   5 y va aparte a propósito.
4. Aprovecha y crea ya el que falta:

   | Tipo | Nombre | Contenido |
   |---|---|---|
   | TXT | `_dmarc` | `v=DMARC1; p=none;` |

   En Cloudflare el campo *Name* va sin el dominio detrás: `_dmarc` a secas.
5. **Antes de cambiar los nameservers**, comprueba que Cloudflare ya sirve la zona bien.
   Los nameservers que te asigne salen en la pantalla de Cloudflare; sustitúyelos abajo:

   ```
   nslookup -type=A estrenala.com <ns1-que-te-den>.ns.cloudflare.com
   nslookup -type=A comodin-test-xyz.estrenala.com <ns1>.ns.cloudflare.com
   nslookup -type=TXT send.estrenala.com <ns1>.ns.cloudflare.com
   nslookup -type=MX send.estrenala.com <ns1>.ns.cloudflare.com
   nslookup -type=TXT resend._domainkey.estrenala.com <ns1>.ns.cloudflare.com
   nslookup -type=TXT _dmarc.estrenala.com <ns1>.ns.cloudflare.com
   ```

   Las seis tienen que responder. **Si alguna falla, para**: te falta un registro.
6. Solo entonces: en Hostinger (registrador), cambia los nameservers a los de Cloudflare.
7. Espera a que Cloudflare marque el dominio como **Active** (suele ser minutos).
8. Verifica que todo sigue vivo: `estrenala.com`, `panel.estrenala.com`, y una web de
   cliente publicada.

**Vuelta atrás:** nameservers otra vez a `lunar.dns-parking.com` y
`solar.dns-parking.com`. La zona de Hostinger sigue intacta.

## Paso 2 — El certificado comodín (añade, no toca lo que hay)

La clave de que esto sea seguro para Quantiva: **se crea un resolver NUEVO, con su
propio fichero de almacenamiento**. El resolver que usan hoy el CRM y los agentes no se
toca ni una línea.

1. Cloudflare → **My Profile → API Tokens → Create Token → Create Custom Token**:
   - Permisos: **Zone → DNS → Edit**
   - Zone Resources: **Include → Specific zone → `estrenala.com`** (solo esa)
   - Copia el token. **No lo pegues en el chat.**
2. Dokploy → **Web Server → Traefik → Environment Variables**, añade:
   ```
   CF_DNS_API_TOKEN=<el token>
   ```
3. Dokploy → **Web Server → Traefik File System → `traefik.yml`**. **Deja el resolver
   que ya existe tal cual** y añade el segundo debajo:
   ```yaml
   certificatesResolvers:
     # ── EL QUE YA ESTÁ. NO TOCAR: lo usan Quantiva y los dominios de clientes.
     letsencrypt:
       acme:
         email: <el correo que ya tuvieras>
         storage: /etc/dokploy/traefik/dynamic/acme.json
         httpChallenge:
           entryPoint: web

     # ── NUEVO, solo para el comodín. Fichero de almacenamiento APARTE.
     letsencrypt-dns:
       acme:
         email: <el mismo correo>
         storage: /etc/dokploy/traefik/dynamic/acme-dns.json
         dnsChallenge:
           provider: cloudflare
           resolvers:
             - "1.1.1.1:53"
             - "8.8.8.8:53"
   ```
4. Reinicia Traefik desde Dokploy.
5. **Comprueba que no has roto nada ANTES de seguir**: entra en `panel.estrenala.com`,
   en `estrenala.com` y en el CRM de Quantiva. Los tres con su candado.

## Paso 3 — La ruta comodín (el paso delicado)

Aquí es donde se gana el techo, y donde te puedes quedar sin panel. Haz este paso
**con el panel de Dokploy abierto en otra pestaña ya logueado**, por si acaso.

**No va como etiquetas de Docker.** El `traefik.yml` ya trae el proveedor de
archivos apuntando a `/etc/dokploy/traefik/dynamic` con `watch: true`, así que la
regla va como un archivo suelto ahí. Ventaja que importa: se deshace **borrando el
archivo**, y Traefik lo recarga solo, sin reiniciar y sin restaurar copias.

Archivo `/etc/dokploy/traefik/dynamic/estrenala-comodin.yml` (hecho 2026-08-01):

```yaml
http:
  routers:
    estrenala-comodin:
      rule: HostRegexp(`^[a-z0-9-]+\.estrenala\.com$`)
      priority: 1
      entryPoints: [web]
      middlewares: [redirect-to-https]
      service: estrenala-comodin
    estrenala-comodin-websecure:
      rule: HostRegexp(`^[a-z0-9-]+\.estrenala\.com$`)
      priority: 1
      entryPoints: [websecure]
      service: estrenala-comodin
      tls:
        certResolver: letsencrypt-dns
        domains:
          - main: estrenala.com
            sans: ["*.estrenala.com"]
  services:
    estrenala-comodin:
      loadBalancer:
        servers:
          - url: http://quantiva-technology-estrenala-wpsvbw:3000
        passHostHeader: true
```

`priority: 1` **no es opcional**. Traefik, ante dos reglas que encajan, elige la de
mayor prioridad, y por defecto la prioridad ES LA LONGITUD DE LA REGLA. Medido en
el servidor el 2026-08-01:

| Regla | Prioridad |
|---|---|
| `` Host(`estrenala.es`) `` | 20 |
| `` Host(`estrenala.com`) `` | 21 |
| `` Host(`www.estrenala.com`) `` | 25 |
| `` Host(`panel.estrenala.com`) `` | 27 |
| `` Host(`quantiva.estrenala.com`) `` | 30 |
| la regex comodín | **41** |

Sin el `1` explícito, la comodín le gana a todas y te quedas sin panel.

El `1` se puede usar porque **no hay ningún atrapatodo compitiendo**: el
`` PathPrefix(`/`) `` que sale en la lista de routers está en la entrada `traefik`
(el panel interno, puerto 8080), no en `web` ni `websecure`. Compruébalo antes de
copiar este número a otro servidor:

```sh
docker exec dokploy-traefik wget -qO- http://localhost:8080/api/http/routers | sed 's/},{/}\n{/g'
```

Verificación, **en este orden**:

1. `panel.estrenala.com` → sigue siendo Dokploy. **Si no, borra el archivo ya.**
2. Un subdominio de cliente que YA estuviera publicado → sigue bien.
3. **La prueba de fuego**: un subdominio que no esté dado de alta en ningún sitio
   tiene que responder con certificado válido. Se comprueba sin publicar nada:
   antes fallaba el TLS, después devuelve el 404 de la aplicación («esta web no
   está publicada»), que es la respuesta correcta.
4. El CRM y los agentes de Quantiva, otra vez.

El certificado sale con `SAN: *.estrenala.com, estrenala.com`. Para verlo desde
fuera vale cualquier cliente TLS; lo que NO vale es mirar los logs de Traefik:
está en nivel ERROR, así que **un certificado emitido bien no deja ni una línea**.
Silencio no es prueba de nada.

## Paso 4 — Dejar de gastar el cupo (✅ ya programado, solo hay que encenderlo)

Mientras `dokploy.ts` siga dando de alta cada subdominio con
`certificateType: "letsencrypt"`, **se sigue pidiendo un certificado por web y el cupo
de 50 se sigue gastando igual**, aunque el comodín ya funcione. El comodín no ahorra
nada hasta que dejamos de pedirlos.

El código ya está listo y **apagado por defecto**. En Dokploy → Environment de la app:

```
DOKPLOY_COMODIN=1
```

y **Deploy** (build completo, no Restart — ver el gotcha de las variables del
middleware en `REANUDACION.md`).

Qué cambia exactamente:

- `publish` **deja de registrar el subdominio**: lo cubre la regla comodín.
- `unpublish` **sigue limpiando**. A propósito: las webs publicadas ANTES de encender
  esto sí tienen su ruta dada de alta, y dejarla ahí renovaría para siempre el
  certificado de un sitio que ya no existe.
- `connectDomain` / `disconnectDomain` **no cambian**. Los dominios propios de los
  clientes siguen necesitando su ruta y su HTTP-01 — y además gastan el cupo de SU
  dominio registrado, no el nuestro.

⚠️ **No lo enciendas antes de verificar el paso 3.** Si la regla comodín no está bien,
las webs nuevas no es que salgan sin candado: es que **no llegan**, porque nadie les
pone ruta en Traefik. Para volver atrás, quita la variable y despliega.

## Paso 5 — El CDN (otro día, no hace falta para el techo)

Poner los registros en naranja mete a Cloudflare por delante y te quita de encima la
mayoría de las visitas. **No lo hagas el mismo día**: cambia cómo se sirve todo y tiene
sus propias trampas (el certificado de borde del plan gratuito cubre `algo.estrenala.com`
pero **no** `a.b.estrenala.com`, y hay que dejar el modo SSL en *Full (strict)*). El
techo de los 50 ya lo has quitado en el paso 3; esto es rendimiento, y se hace con
calma.

---

## Suelto, para no olvidarlo

- ~~**`analitica` no está en `RESERVADOS`**~~ — hecho el 2026-08-01, junto con `send`,
  `analytics`, `webmail`, `status`, `docs`, `soporte` y `ayuda`.
- **`panel.estrenala.com` es el panel de ADMINISTRACIÓN de Dokploy**, no el de la
  plataforma (`dokploy-service-app`, router `dokploy-router-app-secure@file`). Dos
  problemas: ahí dentro están todas las variables de entorno —Stripe, la base de
  datos, el token de Cloudflare—, y es el subdominio que cualquier cliente va a
  teclear pensando que es su panel, con lo que le enseñas dónde está la puerta.
  Pendiente moverlo a un nombre no adivinable, mejor bajo `quantivatechnology.com`.
  La regla comodín NO lo tapa (`priority: 1`), pero el día que se mueva, `panel`
  caerá en el comodín: ya está en `RESERVADOS`, así que ningún cliente puede pedirlo.
- Cuando el DNS esté en Cloudflare, la instrucción de DNS que la plataforma le enseña al
  cliente para su **dominio propio** no cambia: sigue siendo un registro A a
  `72.61.176.214`.
