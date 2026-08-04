# Proteger el dominio compartido

Todas las webs publicadas viven en `algo.estrenala.com`. Eso es cómodo y es
gratis, pero tiene un riesgo que no tiene nadie que sirva desde su propio
dominio, y conviene entenderlo antes de abrir al público.

## El riesgo, en una frase

**Si alguien monta una web de phishing en un subdominio nuestro y Google marca
`estrenala.com`, la pantalla roja de «sitio peligroso» sale en las webs de TODOS
los clientes.** No en la del que lo hizo: en todas.

Le ha pasado a Vercel y a Netlify con sus dominios gratuitos, y hay campañas
documentadas montadas encima de ellos precisamente por la confianza heredada del
dominio:

- <https://www.kaseya.com/blog/phishing-campaigns-abusing-vercels-free-hosting-platform/>
- <https://www.cloudflare.com/cloudforce-one/research/report/vercel-hosted-rmm-abuse-campaign-evolves-with-telegram-c2-for-victim-filtering/>

## Lo que ya está hecho (en el código)

| | qué | dónde |
|---|---|---|
| ✅ | La cookie de sesión lleva el prefijo `__Host-`: atada a `estrenala.com` exacto, **no viaja a los subdominios**. Un cliente con JavaScript malicioso no puede tocar la sesión de nadie. | `src/auth/cookie-http.ts` |
| ✅ | Subdominios que suplantan marcas, rechazados (bancos, pagos, administración, paquetería, inicios de sesión). También por la vía del nombre automático. | `src/publish/suplantacion.ts` |
| ✅ | `security.txt` público, para que quien detecte algo nos avise en vez de marcar el dominio. | `app/.well-known/security.txt/` |
| ✅ | HSTS solo en nuestros hosts, nunca en el dominio de un cliente. | `src/config/robots-plataforma.ts` |
| ✅ | Zip-slip: un ZIP con `../../etc/passwd` se rechaza, y la guarda es la misma para el ZIP y para arrastrar carpetas. | `src/import/unzip.ts` |

La lista de marcas **no es un filtro de phishing** y no pretende serlo: quien vaya
en serio registra `bbva-clientes-2026` y se lo salta. Sirve para el 90% que va a
pelo, y sobre todo para poder decir —a Google, a un banco, a quien pregunte— que
la puerta no estaba abierta de par en par.

---

## Lo que falta, y lo tienes que hacer tú

> 👉 **Los pasos concretos, uno a uno, están en
> [GUIA-SEGURIDAD-DOMINIO.md](GUIA-SEGURIDAD-DOMINIO.md).** Este documento es el
> porqué; aquel es el cómo.

### 1. Meter `estrenala.com` en la Public Suffix List ← **lo más importante**

Es lo que tienen `netlify.app` y `vercel.app` y nosotros no. Hace que el
navegador y los sistemas de reputación traten **cada subdominio como un sitio
independiente**, así que un cliente malo deja de poder envenenar a los demás.

Es gratis. **Tarda semanas en aprobarse**, y por eso hay que empezarlo ya y no
el día que pase algo.

- [ ] Entra en <https://github.com/publicsuffix/list>
- [ ] Lee `CONTRIBUTING.md` (los requisitos cambian; no te fíes de lo que ponga aquí)
- [ ] Añade un registro TXT `_psl.estrenala.com` con la URL de la pull request
      (es como demuestras que el dominio es tuyo)
- [ ] Abre la pull request añadiendo `estrenala.com` en la sección PRIVATE
- [ ] Ten a mano una dirección de contacto que funcione: la van a usar

> **Ojo con el orden.** Si algún día decides mover las webs de clientes a otro
> dominio (`estrenala.app`, por ejemplo), hazlo ANTES de esto: el registro de la
> PSL es del dominio concreto, y mudarse después significa repetirlo entero.

### 2. Que los dos buzones existan de verdad

`security.txt` ya anuncia dos direcciones, y **anunciar un buzón que no existe es
peor que no anunciar ninguno**: quien te intente avisar recibirá un rebote y el
siguiente paso será marcar el dominio.

- [ ] `seguridad@estrenala.com`
- [ ] `abuso@estrenala.com`

Lo más rápido es **Cloudflare Email Routing** (gratis): reenvían a tu correo de
siempre y no hay que montar nada.

- [ ] Comprobar que llega, mandándote un correo a cada uno

### 3. Cloudflare por delante

Además de lo de arriba, resuelve dos cosas de golpe:

- [ ] Absorbe los picos de tráfico y los ataques, que hoy le llegan enteros al VPS
- [ ] **Corta la factura de transferencia de Supabase**: hoy cada visita a una
      imagen la pagamos nosotros

### 4. Cuando haya usuarios de verdad

- [ ] Verificación en dos pasos en las cuentas (hoy hay contraseña o Google)
- [ ] Copias de seguridad probadas: no basta con que Supabase las haga, hay que
      haber restaurado una vez para saber que funcionan
- [ ] Revisar las alertas de `[seguridad]` en los registros: cada subdominio de
      suplantación rechazado deja una línea con el espacio y la marca

---

## Cómo actuar si pasa

1. **Quitar la web** del subdominio (despublicar el proyecto).
2. Avisar en `https://safebrowsing.google.com/safebrowsing/report_general/` si ya
   estaba marcada, pidiendo la revisión **del subdominio concreto**.
3. Guardar qué pasó: quién lo subió, cuándo, qué había. Si vuelve a pasar con la
   misma cuenta, se cierra.

Cuanto antes se quite, menos probable es que el marcado suba del subdominio al
dominio entero. Por eso el `security.txt` importa: acorta el tiempo entre que
alguien lo detecta y nosotros nos enteramos.
