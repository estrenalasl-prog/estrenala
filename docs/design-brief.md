# Brief de diseño visual — Wordclicks (nombre en revisión)

> **Para quién es este documento:** una sesión de diseño con Claude (u otro diseñador).
> El objetivo es producir el sistema visual completo de la plataforma para que quede
> profesional. La integración al código la hará después otro asistente: entrega en
> el formato indicado en «Entregables» y será directa.

## 1. Qué es el producto

**"El WordPress para webs hechas con IA."** El usuario (agencias y autónomos) tiene
webs en HTML generadas por cualquier IA (Claude, ChatGPT, v0…). La plataforma le da
lo que la IA no le da:

1. **Ponerla online en un clic** — sube un ZIP y la web vive en `su-negocio.PLATAFORMA.com`
   o en su dominio propio (`suempresa.com`) con HTTPS automático.
2. **Editar sin código** — clic sobre cualquier texto, imagen, enlace, color o botón
   de la web real y se edita in-situ, con historial de versiones y "revertir".
3. **Blog automático** (próximamente).

Modelo mental del usuario: *"Mi IA me hizo la web. Aquí la enchufo y ya funciona como
un WordPress, pero sin aprender WordPress."*

## 2. Estado de la marca

- El nombre actual es **Wordclicks** pero está EN REVISIÓN (el .com está pillado).
  Candidatos con dominio libre: **Estrénala** (estrenala.com), **WebNace** (webnace.com),
  **YaVive** (yavive.app).
- Pedido: que el sistema visual sea **agnóstico del nombre** (tokens, componentes,
  layouts que funcionen con cualquiera), y si aporta, 1 dirección de wordmark/logotipo
  por candidato para ayudar a decidir.
- Personalidad deseada: **profesional pero cercana**, en español, sin jerga técnica.
  El usuario es un emprendedor o una agencia pequeña, no un developer. Debe transmitir:
  "esto es serio y mi web está en buenas manos", con la simpleza de un producto moderno
  (referencias de sensación: Vercel/Linear por limpieza, WordPress.com por accesibilidad
  mental, pero SIN copiar su estética).

## 3. Stack técnico (restricciones duras)

- Next.js 16 (App Router) + React 19 + **Tailwind CSS v4** (utilidades en JSX; hoy no
  hay librería de componentes ni tokens definidos — todo es gris/esmeralda por defecto).
- **Entrega ideal: HTML/JSX con clases Tailwind** (se porta directo). Alternativa:
  especificación por componente (colores hex, tipografías, espaciados, estados).
- Sin dependencias nuevas pesadas; nada de fuentes de pago (Google Fonts o del sistema).
- Los textos de la UI están en español y así deben quedar.
- Tiene que verse bien en móvil (el panel se usará también desde el teléfono).

## 4. Inventario de pantallas (estado actual → qué necesita)

### 4.1 Login (`/login`)
Hoy: tarjeta mínima con campo de contraseña y botón «Entrar».
Necesita: primera impresión de marca (es la puerta del producto), estado de error
(«Contraseña incorrecta»), y que escale al futuro login multiusuario (email+password).

### 4.2 Panel — lista de proyectos (`/`)
Hoy: título, formulario de importación (input nombre + input file ZIP + botón) y una
lista de enlaces a proyectos, todo sin diseño. Botón «Salir» pequeño.
Necesita: cards o filas de proyecto con: nombre, miniatura o placeholder, estado
(**Publicado** verde / **Sin publicar** gris / **Cambios sin publicar** ámbar), URL
pública si existe, fecha. La importación como acción primaria destacada (idealmente
zona de arrastrar-ZIP). Estado vacío acogedor ("Importa tu primera web").

### 4.3 Proyecto (`/projects/[id]`)
La pantalla más importante. Hoy, de arriba abajo:
- Enlace «← Volver», título del proyecto.
- **PublishBar** (barra de publicación): botón Publicar/Republicar, enlace a la URL
  pública, badge «Tienes cambios sin publicar», Despublicar con confirmación en dos
  pasos («¿Seguro? Sí, despublicar» + cancelar), «cambiar subdominio» (input inline),
  y sección «Dominio propio»: conectar dominio (input), enlace https://dominio,
  «instrucciones DNS» desplegables (bloque con dos registros A y una nota), «Quitar»
  con confirmación.
- **PreviewPane**: selector de página (si la web tiene varias .html), iframe con la
  web real, conmutador de modo edición, botones Guardar/Descartar cuando hay cambios
  pendientes, e historial de versiones con «Restaurar» por snapshot.
Necesita: jerarquía clara (publicar es LA acción), que la barra no parezca un cajón
de sastre, historial como panel lateral o desplegable ordenado, y estados de carga/
éxito/error consistentes (hoy son spans de texto rojo).

### 4.4 Editor in-situ (popover sobre la web del cliente)
Dentro del iframe, al pasar el ratón se resaltan elementos editables; al hacer clic
aparece un **popover** anclado al elemento con, según el tipo: edición de texto
directa (contenteditable), campo de URL para enlaces, subir/reemplazar imagen, campo
de texto para botones, y selector de color. Es ES5 vanilla inyectado (sin React), así
que el diseño debe entregarse como **CSS/HTML plano** para este componente.
Necesita: aspecto pulido y neutro (flota sobre webs de terceros con cualquier estética:
ni chocar ni desaparecer), microestados (hover, seleccionado, guardando), y controles
táctiles razonables.

### 4.5 Página 404 pública («Esta web no está publicada»)
La ve un visitante que llega a un subdominio sin web. Hoy: texto plano centrado.
Necesita: página simple con marca discreta de la plataforma (es también publicidad).

### 4.6 Para diseñar con previsión (no construir aún)
- Landing de marketing en la raíz del dominio.
- Editor de blog (incremento 4): lista de posts + editor rich-text.
- Multiusuario: selector de organización, roles.

## 5. Componentes a sistematizar

Botón primario / secundario / peligro (con estados disabled y ocupado), input de texto
y de archivo, badge de estado (verde/ámbar/gris/rojo), card de proyecto, banner o toast
de error y de éxito, confirmación en dos pasos (patrón ya usado en Despublicar/Quitar),
bloque de código/DNS (monoespaciado copiable), popover del editor, tabla/lista de
historial, estado vacío.

## 6. Entregables pedidos a la sesión de diseño

1. **Design tokens**: paleta (con semánticos: primario, éxito, aviso, peligro, superficies,
   textos), tipografía (familia, escala, pesos), espaciado, radios, sombras, y su
   expresión como variables CSS/config Tailwind v4.
2. **Las 4 pantallas clave** (login, panel, proyecto, popover del editor) como mockups
   HTML+Tailwind autocontenidos (un archivo por pantalla, sin assets externos).
3. **Hoja de componentes** (§5) con todos los estados.
4. **Página 404 pública** con marca.
5. (Opcional) direcciones de wordmark para los 3 candidatos de nombre.

## 7. Lo que NO hay que hacer

- No rediseñar las webs de los clientes (se sirven byte-idénticas; solo se diseña el
  popover que flota encima).
- No introducir librerías de componentes (shadcn, MUI…) ni JS nuevo.
- No modo oscuro por ahora (bienvenido si los tokens lo dejan preparado).
- No maximalismo: el usuario debe publicar su web en 2 minutos sin leer nada.
