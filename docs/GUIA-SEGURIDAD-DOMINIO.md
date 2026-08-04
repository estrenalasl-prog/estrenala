# Guía: proteger el dominio antes de abrir

Paso a paso, dando por hecho que **no has hecho nunca nada de esto**. No hace
falta saber programar en ningún punto: es rellenar formularios en tres webs.

**Tiempo:** bloque A unos 20 min · bloque B unos 15 min · bloque C unos 30 min,
y luego esperar semanas a que te contesten.

Ve marcando las casillas. Si algo no coincide con lo que ves en pantalla, para y
pregúntame antes de seguir.

---

## Antes de empezar: por qué haces esto

Todas las webs de tus clientes viven en `algo.estrenala.com`.

Si un día alguien sube ahí una copia de la web de un banco para robar
contraseñas y Google marca `estrenala.com` como peligroso, **el navegador enseña
una pantalla roja en las webs de TODOS tus clientes**. No solo en la del malo: en
todas. Es de las pocas cosas que pueden hundir el producto en un día.

Ya he cerrado en el código lo que se podía cerrar. Lo que queda son tres cosas
que solo puedes hacer tú porque hacen falta tus cuentas.

---

# BLOQUE A · Los dos buzones de aviso

**Por qué primero:** la web ya anuncia `seguridad@estrenala.com` y
`abuso@estrenala.com` en un archivo que leen Google y los bancos. **Ahora mismo
esos buzones no existen**, así que quien nos escriba recibirá un rebote — y eso
es peor que no anunciar nada.

Vamos a hacer que lleguen a tu Gmail de siempre. Es gratis.

> **Cloudflare ha rediseñado esta pantalla** (visto el 2026-08-04). Ya no hay
> bienvenida con «Get started»: se entra directo a un resumen con pestañas, y el
> encendido va AL FINAL, no al principio. Lo de abajo es la interfaz nueva.

### A.1 · Llega a la pantalla correcta

- [ ] Abre <https://dash.cloudflare.com> → menú de la izquierda → **Cómputo** →
      **Email Service** → **Email Routing**
- [ ] Entra en **estrenala.com**. Sabrás que estás donde toca porque ves
      **Resumen de la configuración** y una fila de pestañas

> Arriba saldrá **Estado: Desactivado** y **Registros DNS: No configurado**, los
> dos en rojo. Es lo normal y se arregla en A.4: todavía no los toques.

### A.2 · Primero, tu correo de destino

Va el primero **a propósito**: una regla que apunte a una dirección sin verificar
se queda apagada, y luego cuesta entender por qué no llega nada.

- [ ] Pestaña **Direcciones de destino** → añade tu correo de siempre
- [ ] Cloudflare te manda un correo. **Ábrelo y pulsa «Verify email address»**
- [ ] Vuelve y comprueba que la dirección aparece verificada

### A.3 · Las dos direcciones

- [ ] Pestaña **Reglas de enrutamiento** → **Crear regla de enrutamiento**
- [ ] Primera: patrón `seguridad` · **@ `estrenala.com`** · acción **Enviar a un
      correo electrónico** · destino tu correo ya verificado → guardar
- [ ] Repite con la segunda: `abuso`

> El desplegable del **@** es el dominio, y existe porque una cuenta puede tener
> varios con reenvío. Aquí solo hay uno: ya viene puesto `estrenala.com` y no hay
> que tocarlo.

> No crees dos reglas con el mismo patrón: si se repiten, **solo funciona la
> primera de la lista** y la otra se queda muerta sin avisar.

### A.4 · Ahora sí, enciéndelo

- [ ] Vuelve arriba y pulsa cualquiera de los dos rótulos rojos —**Desactivado**
      o **No configurado**—, que llevan flechita porque son enlaces
- [ ] Cloudflare enseña los registros que va a añadir: unos `MX` y dos `TXT`
      (SPF y DKIM). Acéptalos
- [ ] Comprueba que arriba ya pone **Activo** y los registros configurados

✅ **Comprobado el 2026-08-04, no pisa nada:** la raíz de `estrenala.com` no
tiene hoy **ningún MX ni ningún SPF**, así que Cloudflare añade los suyos sobre
terreno limpio. `send.estrenala.com` —por donde Resend manda los correos de la
plataforma— tiene los suyos aparte y no se toca: enviar seguirá igual.

⚠️ **Para el futuro:** si algún día quieres RECIBIR correo normal en
`@estrenala.com` con otro proveedor (Google Workspace, por ejemplo), esos `MX`
habría que cambiarlos. No es un problema; es que hay que acordarse.

### A.5 · Compruébalo de verdad

Esto no te lo saltes. Un buzón que crees que funciona y no funciona es lo mismo
que no tenerlo, pero además creyendo que estás cubierto.

- [ ] Espera unos minutos a que los registros se propaguen
- [ ] Desde tu móvil (o desde otro correo distinto), manda un correo a
      `seguridad@estrenala.com`
- [ ] Comprueba que **llega a tu bandeja** — mira también en «no deseados»
- [ ] Repite con `abuso@estrenala.com`

✅ **Bloque A terminado.** Ya hay alguien al otro lado cuando avisen.

---

# BLOQUE B · Cloudflare por delante

**Para qué sirve:** hoy cada visita a las webs de tus clientes le llega entera a
tu VPS, y cada imagen que se descarga la pagas tú en la factura de Supabase.
Poniendo Cloudflare por delante, las imágenes se sirven desde sus servidores y tu
servidor ni se entera.

### B.1 · Comprueba cómo está ahora

- [ ] En Cloudflare, con `estrenala.com` abierto, ve a **DNS → Records**
- [ ] Busca las filas de tipo `A` o `CNAME`. Cada una tiene una nubecita a la
      derecha, en la columna **Proxy status**

La nubecita puede estar de dos formas:

| | qué significa |
|---|---|
| ☁️ **naranja** (Proxied) | el tráfico pasa por Cloudflare — **esto es lo que queremos** |
| ☁️ **gris** (DNS only) | Cloudflare solo dice dónde está tu servidor, y el tráfico va directo |

- [ ] Apunta cuáles están en gris. Sobre todo mira el registro `*` (el comodín)
      y el `@` (el dominio pelado)

### B.2 · Ponlas en naranja

- [ ] Haz clic en la nubecita gris del registro `*` → se pone naranja
- [ ] **Save**
- [ ] Lo mismo con `@`

### B.3 · Comprueba que las webs siguen vivas

**Esto es lo más importante del bloque.** Un cambio de estos puede tirar las webs
si el certificado no está bien, así que hay que mirarlo enseguida.

- [ ] Espera 2 minutos
- [ ] Abre en el navegador la web de pruebas y comprueba que **carga y que sale
      el candado** de HTTPS
- [ ] Abre `https://estrenala.com` y comprueba lo mismo

> **Si algo falla**, vuelve a poner la nubecita en gris (se deshace al instante) y
> avísame. No te quedes peleándote: el error típico es del modo de cifrado, y se
> arregla en **SSL/TLS → Overview** poniéndolo en **Full (strict)**.

### B.4 · Dile qué guardar

- [ ] Ve a **Caching → Configuration**
- [ ] En **Browser Cache TTL**, déjalo en **Respect Existing Headers**

> Es importante que sea eso y no otra cosa: las cabeceras se las ponemos nosotros
> desde el código, con el ETag y todo pensado. Si Cloudflare las pisa, se rompe
> la parte de «la segunda visita son 0 bytes».

✅ **Bloque B terminado.** Menos carga en el VPS y menos factura de Supabase.

---

# BLOQUE C · La Public Suffix List

**Esto es lo que de verdad protege a los demás clientes**, y es lo único que
tienen Netlify (`netlify.app`) y Vercel (`vercel.app`) que nosotros no.

Es una lista pública que usan todos los navegadores. Estar en ella hace que
`cliente-a.estrenala.com` y `cliente-b.estrenala.com` cuenten como **dos sitios
independientes** en vez de dos trozos del mismo. Así, si uno se porta mal, el
castigo se queda en él.

**Es gratis pero tarda semanas en aprobarse.** Por eso se empieza hoy.

### ⚠️ Antes de nada: decide el dominio

El registro es **para un dominio concreto**. Si algún día mueves las webs de
clientes a otro sitio (`estrenala.app`, por ejemplo), habría que repetirlo entero
y volver a esperar.

- [ ] ¿Las webs de clientes van a seguir en `*.estrenala.com` a largo plazo?
      **Si tienes dudas, páralo aquí y hablamos antes de enviar nada.**

### C.1 · Hazte una cuenta de GitHub

La lista se gestiona en GitHub. Si ya tienes cuenta, salta al C.2.

- [ ] Entra en <https://github.com/signup>
- [ ] Correo, contraseña, nombre de usuario
- [ ] Verifica el correo que te mandan

### C.2 · Lee las condiciones actuales

**No te fíes de lo que ponga en esta guía**: los requisitos los cambian de vez en
cuando, y lo que vale es lo que diga hoy su documentación.

- [ ] Abre <https://github.com/publicsuffix/list>
- [ ] Abre el archivo `CONTRIBUTING.md` y léelo entero
- [ ] Fíjate sobre todo en dos cosas: qué formato quieren para el comentario, y
      cómo hay que demostrar que el dominio es tuyo

### C.3 · Demuestra que el dominio es tuyo

Piden un registro DNS especial. Es como enseñar el DNI del dominio.

- [ ] Vuelve a Cloudflare → `estrenala.com` → **DNS → Records** → **Add record**
- [ ] Rellena:
      - **Type:** `TXT`
      - **Name:** `_psl`
      - **Content:** aquí va la dirección de tu solicitud, que **todavía no
        tienes**. Pon de momento `pendiente` y lo cambias en el paso C.5
      - **TTL:** Auto
- [ ] **Save**

### C.4 · Envía la solicitud

- [ ] En <https://github.com/publicsuffix/list>, entra en la carpeta `public_suffix_list.dat`
- [ ] Pulsa el icono del **lápiz** (Edit this file). GitHub te hará una copia
      tuya del proyecto automáticamente — es normal, dile que sí
- [ ] Busca la sección **PRIVATE DOMAINS** y, dentro, el sitio que le toque por
      orden alfabético
- [ ] Añade tus líneas siguiendo **exactamente** el formato que hayas visto en
      `CONTRIBUTING.md` y en las entradas de alrededor. Serán algo así:

```
// Estrenala : https://estrenala.com
// Submitted by <tu nombre> <seguridad@estrenala.com>
estrenala.com
```

> Copia el estilo de los vecinos: los espacios y los dos puntos importan, y una
> entrada mal formateada es una revisión perdida y otra semana de espera.

- [ ] Abajo, en **Propose changes**, escribe un título claro:
      `Add estrenala.com`
- [ ] En la descripción explica en dos líneas qué es Estrénala: una plataforma
      donde cada cliente publica su web en su propio subdominio, y por eso cada
      subdominio debe contar como sitio independiente
- [ ] Pulsa **Propose changes** y luego **Create pull request**

### C.5 · Cierra el círculo

- [ ] Copia la dirección de la solicitud que acabas de crear (algo como
      `https://github.com/publicsuffix/list/pull/2345`)
- [ ] Vuelve a Cloudflare → DNS → busca el registro `_psl` que creaste
- [ ] Cambia el **Content** de `pendiente` a esa dirección
- [ ] **Save**
- [ ] Vuelve a la solicitud en GitHub y escribe un comentario diciendo que el
      registro `_psl` ya está puesto

### C.6 · Y ahora, esperar

- [ ] **Mira el correo cada pocos días.** Te van a escribir por GitHub, y si no
      contestas cierran la solicitud y hay que empezar de cero
- [ ] Si te piden cambios, dímelo y los hacemos

✅ **Bloque C enviado.** A partir de aquí es esperar.

---

# Cuando pase algo

Guarda esto. El día que alguien avise de una web que suplanta a otra, el reloj
corre: **cuanto antes se quite, menos probable es que el castigo suba del
subdominio al dominio entero.**

1. **Quítala ya.** Entra en el panel, busca el proyecto y despublícalo. Primero
   se corta y luego se investiga
2. **Guarda las pruebas**: qué cuenta era, qué había, cuándo se subió. Con una
   captura basta
3. **Si Google ya lo había marcado**, pide la revisión en
   <https://safebrowsing.google.com/safebrowsing/report_general/> — pidiéndola
   del **subdominio concreto**, no de `estrenala.com` entero
4. **Cierra la cuenta** si vuelve a pasar con la misma

---

# Repaso rápido

- [ ] **A** — `seguridad@` y `abuso@` llegan a mi correo (lo he probado)
- [ ] **B** — La nubecita naranja puesta y las webs cargan con candado
- [ ] **C** — Solicitud enviada y registro `_psl` apuntando a ella

Con A y B hechos ya estás muchísimo mejor que esta mañana. **C es el que
tarda**, y por eso es el que hay que dejar puesto cuanto antes.
