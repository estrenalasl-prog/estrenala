# Aguantar muchas subidas a la vez

Qué hay puesto hoy, qué se rompería primero, y en qué orden arreglarlo **cuando
haga falta**. Escrito el 2026-09-08, la mañana del Show HN.

No es una lista de tareas pendientes. Es lo contrario: es la razón por la que
hoy **no** se toca nada, y el criterio para saber cuándo sí.

---

## 0) Lo que ya está puesto

Antes de hablar de lo que falta, el suelo del que se parte. Todo esto se hizo
entre el 2026-09-02 y el 2026-09-03:

| Defensa | Dónde | Qué corta |
|---|---|---|
| Tope del cuerpo, mirado antes de leerlo | `app/api/projects/route.ts` · `MAX_CUERPO` | Que alguien haga cargar 500 MB solo para decirle que no |
| Freno por IP | `permitirIntento` en las dos puertas | Encadenar subidas de 50 MB sin parar |
| Tope declarado del ZIP, antes de descomprimir | `src/import/unzip.ts` · `portero()` | La bomba zip (medido: 299 MB que ya no entran) |
| Aforo de 6 simultáneas | `src/import/aforo.ts` | Que veinte a la vez se lleven la memoria por delante |

**Esto es lo que importa.** Con el aforo, el caso peor dejó de ser «se cae el
servidor y con él las webs de los clientes» y pasó a ser «alguien lee *prueba
dentro de un minuto*». Eso es feo, no grave. Todo lo que viene abajo es
convertir lo feo en bueno, y eso solo merece la pena si el feo llega a pasar.

---

## 1) Los tres cuellos

No hay un cuello de botella, hay tres, y son independientes. Cada uno se arregla
de forma distinta, así que conviene no mezclarlos.

### Cuello A — la memoria

Cada subida se trae el archivo entero a RAM. Medido el 2026-09-03 con las
primitivas exactas de la ruta (`Request.formData` y `File.arrayBuffer`):

> **una subida de 40 MB cuesta 130 MB de RSS** — 3,25 veces el archivo, porque el
> cuerpo se parsea entero y luego se copia — y eso **antes** de descomprimir.

De ahí sale el seis del aforo: 60 MB de cuerpo × 3,25 + 50 MB descomprimido son
~245 MB por subida en el peor caso; seis son 1,5 GB, que caben en 4 GB dejando
sitio para todo lo demás.

### Cuello B — la escritura, que va de una en una

Este es el que no habíamos visto. En `src/import/import-project.ts`,
`crearProyecto`:

```ts
for (const f of input.files) {
  await deps.storage.put(prefix + f.path, f.bytes, contentTypeFor(f.path));
}
```

Un `await` por archivo, uno detrás de otro. Y `src/storage/supabase.ts` `put()`
no hace streaming: recibe el Buffer entero y llama a `.upload()`.

Medido: **2 archivos, 0,95 s** de punta a punta. Una web hecha con IA tiene entre
20 y 60 archivos (HTML, CSS, imágenes, fuentes), o sea **entre 5 y 10 segundos**
de ida y vuelta a Supabase, de uno en uno. *(Estimado a partir de esa medición,
no medido con 60 archivos.)*

**Lo malo no es la espera, es que ese tiempo mantiene ocupada una de las seis
plazas.** Con seis plazas y ocho segundos por subida, el techo real son unas **45
subidas por minuto**. No es memoria: es cola.

### Cuello C — un solo proceso

El aforo y el freno por IP viven en la memoria del proceso. Se ponen a cero al
reiniciar y no se comparten. El día que haya una segunda réplica, los dos dejan
de valer.

---

## 2) Las etapas, por orden de lo que renta

### Etapa 1 — escribir en paralelo

Cambiar ese bucle por subidas en tandas (8 a la vez, con un límite de
concurrencia, no un `Promise.all` suelto sobre 60 archivos). Una web de 60
archivos pasa de ~9 s a ~1,5 s.

**Multiplica por seis lo que aguanta el aforo sin tocar la memoria.** Es la que
más renta por hora de trabajo, con diferencia.

- **Coste:** medio día.
- **Riesgo:** medio. Toca `crearProyecto`, que es por donde pasa *todo* lo que se
  sube, por las dos puertas. No se hace un día de lanzamiento.
- **Ojo:** el error de una tanda tiene que abortar las demás y dejar el proyecto
  sin crear, no a medias.

### Etapa 2 — no traerse el archivo a memoria

Parsear el multiparte como flujo (`busboy` sobre `req.body`), escribir el ZIP a
disco, y descomprimir entrada por entrada desde el archivo (`yauzl`) hacia el
almacenamiento. Los 130 MB por subida se quedan en unos pocos, y el `portero()`
pasa de mirar el tamaño *declarado* a ser un tope real.

Con eso el aforo puede subir de 6 a 50.

- **Coste:** varios días.
- **Riesgo:** alto. Es el camino más crítico que hay.
- **Nota:** si se hace la etapa 4, esta sobra. Ver abajo.

### Etapa 3 — sacar el trabajo de la petición

Recibir el ZIP, guardarlo, responder «lo estoy preparando», y que lo procese un
trabajador aparte. La pantalla enseña *preparando tu web…* y avisa al terminar.

**Esta es la que cambia la forma del problema:** un pico deja de ser una caída y
pasa a ser una cola. Es lo que de verdad hace falta para aguantar una portada.

El patrón ya está montado en casa — `/api/cron/publicar` y `/api/cron/piloto`
son exactamente esto.

- **Coste:** varios días, la mitad en la interfaz (avisar al usuario, reintentos,
  qué se ve mientras).
- **Riesgo:** medio. Se puede montar al lado del camino actual y cambiar el
  interruptor cuando funcione.

### Etapa 4 — que el navegador suba directo al almacenamiento

Con URLs firmadas, los bytes no pasan por el servidor. Y hay una variante que
encaja especialmente bien con este producto: **descomprimir en el navegador**
(fflate ya funciona ahí) y subir los archivos sueltos. El servidor no ve ni un
byte del ZIP: recibe la lista de nombres, la valida, y firma una URL por cada
archivo que pase el filtro.

Es el final del camino. El coste por subida en el servidor baja a casi cero.

- **Coste:** una semana larga.
- **Riesgo:** alto, y en un sitio concreto. Hoy `sanearArchivos` y
  `filtrarSeguros` (`src/import/unzip.ts`) son una frontera de seguridad de
  verdad: zip-slip, extensiones, rutas raras. Al mover el descomprimido al
  navegador, esa frontera pasa a ser **qué claves se firman**. Si se firma de
  más, se acabó la frontera. Es la pieza que hay que hacer bien y la que hay que
  revisar dos veces.
- **Importante:** si se hace la 4, **la 2 no hace falta**. Son caminos
  alternativos, no pasos consecutivos.

### Etapa 5 — estado compartido

Mover el aforo y el freno por IP a Postgres o Redis, y entonces sí, dos o tres
réplicas detrás de Traefik.

- **Coste:** dos o tres días.
- **Riesgo:** bajo.
- **Solo tiene sentido después de las anteriores.** Repartir entre tres réplicas
  un trabajo que sigue costando 130 MB y ocho segundos es multiplicar la factura
  por tres para el mismo techo.

---

## 3) Cuándo hacer cada una

No se hacen por si acaso. Estos son los disparadores:

| Si pasa esto | Toca |
|---|---|
| Aparece **cualquier** `aforo:` en el log | Etapa 1 |
| Las subidas tardan de forma habitual más de 5 s | Etapa 1 |
| Más de un registro por minuto sostenido (Umami) | Etapa 3 |
| La memoria del contenedor roza el techo en Dokploy | Etapa 2 (o 4) |
| Antes de arrancar una segunda réplica | Etapa 5 |

---

## 4) Cómo mirar

Desde el 2026-09-08 las dos puertas dejan rastro cuando el aforo rechaza
(`app/api/projects/route.ts` y `app/api/projects/[id]/actualizar/route.ts`).
Antes de eso, un 503 de aforo no aparecía en ningún sitio.

```
aforo: subida rechazada (6 en curso)
aforo: actualización rechazada (6 en curso)
```

Contarlos, en los logs del contenedor:

```sh
docker logs <contenedor> 2>&1 | grep -c "aforo:"
```

O en Dokploy, buscando `aforo:` en la pestaña de logs.

Si ese número entre paréntesis alguna vez sale distinto del tope, no es que
hubiera mucha gente: es que **alguien ocupó sitio y no lo soltó**. El `finally`
de alguna de las dos rutas se rompió, y a partir de ahí la puerta se cierra sola
hasta el siguiente reinicio. Eso lo vigila `src/tests/aforo.test.ts`.

Lo demás que merece la pena mirar el mismo día:

| Señal | Dónde | Qué significa |
|---|---|---|
| `subir: fallo inesperado` | logs | Un bug de verdad, no una defensa |
| `actualizar: fallo inesperado` | logs | Lo mismo, por la otra puerta |
| Memoria del contenedor | Dokploy | Si roza el techo, adelantar la etapa 2 |

---

## 5) Lo que NO se va a hacer, y por qué

- **Subir el aforo «por si acaso».** El seis sale de una medición, no de una
  intuición. Subirlo sin haber arreglado el cuello A es cambiar un 503 por un
  servidor sin memoria, que es justo lo que el aforo vino a evitar.
- **Optimizar antes de tener un número.** Ninguna etapa se abre sin su
  disparador de la tabla de arriba. Si el log sale limpio, no se hace ninguna y
  el tiempo va al producto.
- **Empezar por la etapa 5.** Es la que más suena a «escalar» y la que menos
  arregla mientras cada subida siga costando lo que cuesta.

---

## 6) Lo que sigue sin saberse

Escrito aquí para que no se dé por sabido más adelante:

- **Qué VPS hay contratado de verdad.** `docs/DESPLIEGUE.md` recomienda 2 vCPU /
  4 GB, y las cuentas de este documento suponen 4 GB. Si son 2, el aforo de seis
  va justo y habría que bajarlo a tres.
- **Si Dokploy le pone tope de memoria al contenedor.** Cambia dónde está el
  techo real.
- **Si Traefik tiene encendidos los logs de acceso.** Si lo estuvieran, los 503
  se podrían contar también desde ahí, sin depender del log de la aplicación.
