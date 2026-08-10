(function () {
  "use strict";
  var self = document.currentScript;
  var PAGE = self.getAttribute("data-page") || "";
  var TEXT_TAGS = ["h1","h2","h3","h4","h5","h6","p","span","li","a","button","blockquote","figcaption","label","strong","em","small","td","th"];

  function tieneId(el) { return el && el.nodeType === 1 && el.hasAttribute && el.hasAttribute("data-wc-id"); }
  function esTextoHoja(el) {
    if (!tieneId(el)) return false;
    if (TEXT_TAGS.indexOf(el.tagName.toLowerCase()) === -1) return false;
    if (el.children.length > 0) return false;
    return el.textContent.trim().length > 0;
  }
  // Rich-text (incremento 7): un texto editable cuyos hijos son SOLO formato en
  // línea permitido (negrita/cursiva/subrayado/enlace/salto). Superconjunto de
  // esTextoHoja: así se puede reeditar un párrafo que ya tiene una negrita.
  var INLINE_OK = ["b", "strong", "i", "em", "u", "a", "br"];
  function soloFormatoEnLinea(el) {
    for (var i = 0; i < el.children.length; i++) {
      var h = el.children[i];
      if (INLINE_OK.indexOf(h.tagName.toLowerCase()) === -1) return false;
      if (!soloFormatoEnLinea(h)) return false;
    }
    return true;
  }
  function esTextoRico(el) {
    if (!tieneId(el)) return false;
    if (TEXT_TAGS.indexOf(el.tagName.toLowerCase()) === -1) return false;
    if (el.textContent.trim().length === 0) return false;
    return soloFormatoEnLinea(el);
  }
  function esImagen(el) { return tieneId(el) && el.tagName.toLowerCase() === "img"; }
  function esEnlace(el) { return tieneId(el) && el.tagName.toLowerCase() === "a"; }
  function esBoton(el) { return tieneId(el) && el.tagName.toLowerCase() === "button"; }
  function esTextoMixto(el) {
    return !!(el && el.nodeType === 1 && el.tagName.toLowerCase() === "wc-t" && el.hasAttribute("data-wc-tn"));
  }

  /**
   * Un párrafo con una palabra en negrita llega partido en trozos: la negrita
   * por un lado y el resto de la frase por otro (envuelto en `<wc-t>`). Eso lo
   * hace el editor para poder cambiar cada trozo por su cuenta, no la IA que
   * escribió la web —el HTML es un párrafo normal—, pero al usarlo parece que el
   * texto viniera suelto por palabras. Lo enseñó Sebas el 10/08.
   *
   * Estas dos funciones deciden cuándo se pueden juntar. La condición es que
   * juntarlos NO PIERDA NADA: al guardar un texto con formato, el servidor lo
   * reescribe dejando solo las etiquetas de formato, sin atributos. Así que solo
   * se funden las etiquetas de formato PELADAS.
   *
   * Fuera quedan a propósito:
   * - `<a>`: tiene dirección propia, y hay que poder pincharlo para cambiarla.
   * - cualquier cosa con `class`/`style` propios (`<strong class="text-lima">`):
   *   al fundirla se quedaría sin su estilo, y el cambio se vería en la web.
   * En esos casos todo sigue como estaba: cada trozo, por su cuenta.
   */
  var FUNDIBLES = ["b", "strong", "i", "em", "u", "br"];
  function sinEstiloPropio(el) {
    var attrs = el.attributes || [];
    for (var i = 0; i < attrs.length; i++) {
      // `data-wc-id` y `data-wc-tn` los pone el editor: no cuentan.
      if (attrs[i].name.indexOf("data-wc-") !== 0) return false;
    }
    return true;
  }
  function soloFormatoFundible(el) {
    for (var i = 0; i < el.children.length; i++) {
      var h = el.children[i], t = h.tagName.toLowerCase();
      // `wc-t` es el envoltorio que pone el propio editor alrededor del texto
      // suelto: por dentro no hay más que texto, así que es transparente.
      if (t !== "wc-t" && FUNDIBLES.indexOf(t) === -1) return false;
      if (!sinEstiloPropio(h)) return false;
      if (!soloFormatoFundible(h)) return false;
    }
    return true;
  }
  function esTextoJuntable(el) {
    if (!tieneId(el)) return false;
    if (TEXT_TAGS.indexOf(el.tagName.toLowerCase()) === -1) return false;
    if (el.textContent.trim().length === 0) return false;
    return soloFormatoFundible(el);
  }
  /** El texto ENTERO al que pertenece lo pinchado, o null si no se puede juntar. */
  function textoEntero(el) {
    var mejor = null, n = el, saltos = 0;
    while (n && n.nodeType === 1 && saltos < 6) {
      // Un enlace, un botón o una imagen se editan por su cuenta: pasado ese
      // punto ya no es "el mismo texto".
      if (esEnlace(n) || esBoton(n) || esImagen(n)) break;
      if (esTextoJuntable(n)) mejor = n;
      n = n.parentElement; saltos++;
    }
    return mejor;
  }
  /**
   * Un texto en el que se puede escribir: o ya lo era de por sí, o es de los que
   * se juntan enteros. Los dos casos existen porque no se solapan — un párrafo
   * cuyo único hijo es un enlace con estilo es lo primero pero no lo segundo.
   */
  function esTextoEscribible(el) { return esTextoRico(el) || esTextoJuntable(el); }

  // Objetivo editable de un evento: el texto entero al que pertenece lo pinchado
  // (ver arriba), el elemento mismo si no se puede juntar, o el <a> ancestro más
  // cercano con data-wc-id. Las webs reales (hechas con IA) traen <a><svg/></a>,
  // <a><span>…</span></a>: el target del evento es el hijo, no el enlace — sin
  // esta resolución, iconos y botones-enlace quedan muertos.
  function resolverEditable(el) {
    if (!el || el.nodeType !== 1) return null;
    if (esImagen(el) || esEnlace(el)) return el;
    // `esTextoEscribible` y no solo `esTextoRico`: un párrafo con una negrita
    // dentro NO es "rico" —sus hijos incluyen el envoltorio del texto suelto—,
    // así que preguntando solo por eso, el propio párrafo no se resolvía a nada.
    // Se marcaba al pasar por encima de la negrita y ya no había forma de
    // desmarcarlo al salir por su borde: los recuadros se quedaban pegados.
    if (esTextoMixto(el) || esTextoEscribible(el)) return textoEntero(el) || el;
    if (!el.closest) return null;
    var a = el.closest("a[data-wc-id]");
    return a || null;
  }

  // El envoltorio del texto suelto solo existe en la vista previa. El servidor lo
  // desenvuelve igual al sanear, pero mandándolo ya limpio lo que se guarda es
  // exactamente lo que se manda, sin depender de eso.
  function sinEnvoltorios(html) { return html.replace(/<\/?wc-t\b[^>]*>/gi, ""); }

  function emitir(op) { window.parent.postMessage({ type: "wc-edit", op: op }, "*"); }
  function idDe(el) { return Number(el.getAttribute("data-wc-id")); }

  // ---------- popover (DOM propio, nunca se guarda) ----------
  var pop = document.createElement("div");
  pop.setAttribute("data-wc-ui", "1");
  // Estilo Estrénala v2: tarjeta clara con acento lima, tipografía de sistema (no
  // se asume Space Grotesk cargada en la web del cliente). z-index máximo.
  // `max-height` + scroll propio: con alineación, dos barras de aire y los
  // recuadros, el menú de un texto pasa de los 400px. En una pantalla de portátil
  // no cabe entero, y sin esto la parte de abajo se quedaba fuera sin manera de
  // llegar a ella. Se prefiere que ruede por dentro a que desaparezca.
  pop.style.cssText = "position:absolute;z-index:2147483647;display:none;flex-direction:column;gap:8px;align-items:stretch;width:280px;max-width:92vw;max-height:min(78vh,520px);overflow-y:auto;background:#fff;color:#141509;border:1px solid #DEDFD6;border-radius:14px;padding:12px;font:13px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;box-shadow:0 18px 48px -12px rgba(20,21,9,.28)";
  function montarPop() { if (!pop.parentNode && document.body) document.body.appendChild(pop); }
  if (document.body) montarPop(); else document.addEventListener("DOMContentLoaded", montarPop);

  // ---------- barra de formato (rich-text) ----------
  var barra = document.createElement("div");
  barra.setAttribute("data-wc-ui", "1");
  barra.style.cssText = "position:fixed;z-index:2147483647;display:none;flex-direction:column;gap:4px;background:#fff;" +
    "border:1px solid rgba(20,21,9,.14);border-radius:10px;box-shadow:0 8px 24px -6px rgba(20,21,9,.20);padding:4px";
  var filaFormato = document.createElement("div");
  filaFormato.style.cssText = "display:flex;gap:2px";
  barra.appendChild(filaFormato);
  function botonFormato(txt, estilo, accion, titulo) {
    var b = document.createElement("button"); b.type = "button"; b.textContent = txt; b.title = titulo;
    b.style.cssText = "width:30px;height:30px;border:0;background:none;border-radius:7px;cursor:pointer;color:#141509;font-size:14px;line-height:1;" + estilo;
    // mousedown preventDefault: no robar la selección del texto en edición.
    b.addEventListener("mousedown", function (e) { e.preventDefault(); });
    b.addEventListener("click", function (e) { e.preventDefault(); accion(); });
    return b;
  }
  function comando(cmd) { try { document.execCommand("styleWithCSS", false, false); } catch (_) {} document.execCommand(cmd, false, null); }
  filaFormato.appendChild(botonFormato("B", "font-weight:700", function () { comando("bold"); }, "Negrita"));
  filaFormato.appendChild(botonFormato("I", "font-style:italic;font-weight:600", function () { comando("italic"); }, "Cursiva"));
  filaFormato.appendChild(botonFormato("U", "text-decoration:underline;font-weight:600", function () { comando("underline"); }, "Subrayado"));
  filaFormato.appendChild(botonFormato("🔗", "", function () {
    if (filaEnlace.style.display === "none") abrirEnlace(); else cerrarEnlace();
  }, "Enlace"));

  /**
   * El enlace se pide en un campo AQUÍ DENTRO, no con `window.prompt`.
   *
   * El preview corre en un iframe con `sandbox="allow-scripts"` y SIN
   * `allow-modals`. En un documento así el navegador se salta alert/confirm/prompt
   * y devuelve null sin preguntar nada. O sea que este botón no hacía
   * absolutamente nada, en silencio, desde que existe. Y ampliar el sandbox NO es
   * la solución: dejaría que la web del cliente llene el panel de ventanitas.
   */
  var filaEnlace = document.createElement("div");
  filaEnlace.style.cssText = "display:none;gap:4px;align-items:center;padding:0 2px 2px";
  var campoEnlace = inputTexto("", "https://…  ·  /precios  ·  #contacto");
  campoEnlace.style.width = "236px";
  var btnPonerEnlace = document.createElement("button");
  btnPonerEnlace.type = "button"; btnPonerEnlace.textContent = "Poner";
  btnPonerEnlace.style.cssText = "height:32px;padding:0 12px;border-radius:9px;border:0;background:#C4F000;color:#141509;font-size:13px;font-weight:600;cursor:pointer";
  var btnQuitarEnlace = document.createElement("button");
  btnQuitarEnlace.type = "button"; btnQuitarEnlace.textContent = "Quitar"; btnQuitarEnlace.title = "Dejar el texto sin enlace";
  btnQuitarEnlace.style.cssText = "height:32px;padding:0 10px;border-radius:9px;border:1px solid #DEDFD6;background:#fff;color:#55584C;font-size:13px;cursor:pointer";
  filaEnlace.appendChild(campoEnlace); filaEnlace.appendChild(btnPonerEnlace); filaEnlace.appendChild(btnQuitarEnlace);
  var avisoEnlace = document.createElement("div");
  avisoEnlace.style.cssText = "display:none;max-width:300px;font-size:11.5px;line-height:1.4;color:#8A3A12;padding:0 4px 3px";
  barra.appendChild(filaEnlace); barra.appendChild(avisoEnlace);

  // Mientras se interactúa con la barra NO se cierra la edición por focusout.
  var tocandoBarra = false;
  barra.addEventListener("mousedown", function () { tocandoBarra = true; setTimeout(function () { tocandoBarra = false; }, 0); });
  function dentroDeBarra(el) { return el === barra || !!(el && barra.contains && barra.contains(el)); }
  function montarBarra() { if (!barra.parentNode && document.body) document.body.appendChild(barra); }
  if (document.body) montarBarra(); else document.addEventListener("DOMContentLoaded", montarBarra);

  var elBarra = null;
  function mostrarBarra(el) {
    elBarra = el;
    filaEnlace.style.display = "none"; avisoEnlace.style.display = "none"; enlaceEnEdicion = null;
    barra.style.display = "flex";
    colocarBarra();
  }
  // Se mide el alto de verdad en vez de darlo por hecho: la barra crece al abrir
  // el campo del enlace o al salir un aviso, y con un alto fijo se comería el
  // texto que está editando.
  function colocarBarra() {
    if (!elBarra || barra.style.display === "none") return;
    var r = elBarra.getBoundingClientRect();
    var alto = barra.offsetHeight || 40;
    var top = r.top - alto - 6; if (top < 6) top = r.bottom + 6;
    barra.style.top = Math.round(top) + "px";
    barra.style.left = Math.round(Math.max(6, r.left)) + "px";
  }
  function ocultarBarra() { barra.style.display = "none"; elBarra = null; enlaceEnEdicion = null; }

  // ---------- enlaces dentro del texto ----------
  var rangoGuardado = null;
  var enlaceEnEdicion = null;

  // Al enfocar el campo se pierde la selección del texto, así que se guarda antes
  // y se repone justo antes de aplicar.
  function guardarRango() {
    var s = window.getSelection();
    if (!s || s.rangeCount === 0 || !editando) return;
    var r = s.getRangeAt(0);
    if (editando.contains(r.commonAncestorContainer)) rangoGuardado = r.cloneRange();
  }
  function restaurarRango() {
    if (!editando) return;
    editando.focus();
    if (!rangoGuardado) return;
    var s = window.getSelection();
    s.removeAllRanges(); s.addRange(rangoGuardado);
  }
  function seleccionarContenido(nodo) {
    var r = document.createRange(); r.selectNodeContents(nodo);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  function enlaceDeLaSeleccion() {
    var s = window.getSelection();
    if (!s || s.rangeCount === 0 || !editando) return null;
    var n = s.getRangeAt(0).commonAncestorContainer;
    if (n && n.nodeType === 3) n = n.parentNode;
    while (n && n !== editando) {
      if (n.tagName && n.tagName.toLowerCase() === "a") return n;
      n = n.parentNode;
    }
    return null;
  }
  // Las MISMAS reglas que isSafeHref en el servidor. Si no coinciden, el servidor
  // desenvuelve el <a> al guardar y el enlace desaparece sin que nadie avise.
  function hrefSeguro(u) {
    var t = u.replace(/[\x00-\x1f\x7f]/g, "").trim();
    if (t === "") return false;
    if (/^(javascript|data|vbscript):/i.test(t)) return false;
    var m = t.match(/^([a-z][a-z0-9+.-]*):/i);
    if (!m) return true; // sin esquema → ruta de la propia web
    var esq = m[1].toLowerCase();
    return esq === "http" || esq === "https" || esq === "mailto" || esq === "tel";
  }
  function avisar(texto) {
    avisoEnlace.textContent = texto;
    avisoEnlace.style.display = "block";
    colocarBarra();
  }
  function abrirEnlace() {
    guardarRango();
    enlaceEnEdicion = enlaceDeLaSeleccion();
    campoEnlace.value = enlaceEnEdicion ? (enlaceEnEdicion.getAttribute("href") || "") : "";
    btnQuitarEnlace.style.display = enlaceEnEdicion ? "" : "none";
    filaEnlace.style.display = "flex";
    avisoEnlace.style.display = "none";
    colocarBarra();
    campoEnlace.focus(); campoEnlace.select();
  }
  function cerrarEnlace() {
    filaEnlace.style.display = "none";
    avisoEnlace.style.display = "none";
    enlaceEnEdicion = null;
    colocarBarra();
  }
  function aplicarEnlace() {
    var u = campoEnlace.value.trim();
    if (u === "") { quitarEnlace(); return; }
    if (!hrefSeguro(u)) { avisar("Esa dirección no vale. Usa https://, mailto:, tel: o una ruta de tu web como /precios."); return; }
    restaurarRango();
    // Con el cursor dentro de un enlace pero sin nada seleccionado, createLink no
    // hace nada. Si estamos dentro de uno se coge entero: es lo que espera quien
    // pincha en un enlace para cambiarle la dirección.
    if (enlaceEnEdicion && window.getSelection().isCollapsed) seleccionarContenido(enlaceEnEdicion);
    if (window.getSelection().isCollapsed) { avisar("Selecciona antes el texto que quieres enlazar."); return; }
    document.execCommand("createLink", false, u);
    cerrarEnlace();
  }
  function quitarEnlace() {
    restaurarRango();
    if (enlaceEnEdicion && window.getSelection().isCollapsed) seleccionarContenido(enlaceEnEdicion);
    try { document.execCommand("styleWithCSS", false, false); } catch (_) {}
    document.execCommand("unlink", false, null);
    cerrarEnlace();
  }
  btnPonerEnlace.addEventListener("mousedown", function (e) { e.preventDefault(); });
  btnPonerEnlace.addEventListener("click", function (e) { e.preventDefault(); aplicarEnlace(); });
  btnQuitarEnlace.addEventListener("mousedown", function (e) { e.preventDefault(); });
  btnQuitarEnlace.addEventListener("click", function (e) { e.preventDefault(); quitarEnlace(); });
  campoEnlace.addEventListener("keydown", function (e) {
    // stopPropagation: si no, el Enter/Esc de aquí llega al documento y cierra la
    // edición del texto en vez de poner el enlace.
    if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); aplicarEnlace(); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrarEnlace(); restaurarRango(); }
  });

  var objetivo = null;
  var ocultarTimer = null;
  var reapuntarTimer = null;

  function dentroDePop(el) { return el === pop || (el && pop.contains && pop.contains(el)); }
  // Un input del popover tiene el foco (selector de color nativo abierto, campo de
  // href/texto…) → no ocultar ni re-apuntar mientras se usa.
  function popEnUso() { return dentroDePop(document.activeElement); }

  // Aire que se le deja al borde de la ventana para que el menú no salga pegado.
  var AIRE_VENTANA = 8;
  // Lo que mide de ancho el menú (ver `cssText`). Solo se usa como red de
  // seguridad: si ya está montado y medido, manda lo medido.
  var ANCHO_POP = 280;

  function posicionar(el) {
    var r = el.getBoundingClientRect();
    var alto = pop.offsetHeight || 0;
    var ancho = pop.offsetWidth || ANCHO_POP;
    var raiz = document.documentElement;
    // `clientWidth` y no `innerWidth`: el segundo incluye la barra de scroll, y
    // el menú acababa medio metido debajo de ella.
    var anchoVentana = (raiz && raiz.clientWidth) || window.innerWidth;

    // 1) AL LADO. Es lo que pidió Sebas el 10/08 y tiene razón: el menú se abría
    //    justo encima de lo que acababas de elegir, así que para mirar el efecto
    //    de un botón había que cerrarlo. Al lado no tapa ni el elemento ni lo que
    //    va detrás de él, solo el margen de la página.
    //    Se solapa 2px con el elemento —igual que antes por abajo— para que no
    //    quede "zona muerta": si hubiera hueco, el ratón cruzaría otro editable
    //    de camino al menú y el menú saltaría a ese otro.
    var izquierda = null;
    if (r.right - 2 + ancho <= anchoVentana - AIRE_VENTANA) izquierda = r.right - 2;
    else if (r.left + 2 - ancho >= AIRE_VENTANA) izquierda = r.left + 2 - ancho;

    if (izquierda !== null) {
      // Un elemento puede empezar fuera de la pantalla por la izquierda (un
      // carrusel a medio pasar): antes que colocar el menú donde no se ve, se
      // pierde el solape de 2px.
      izquierda = Math.max(izquierda, AIRE_VENTANA);
      // Arranca a la altura del elemento y sube lo justo para no salirse por
      // abajo. Sin esto, elegir algo del pie de la página abriría el menú con la
      // mitad fuera de la pantalla.
      var arriba = r.top;
      if (alto > 0) arriba = Math.min(arriba, window.innerHeight - alto - AIRE_VENTANA);
      pop.style.top = (window.scrollY + Math.max(arriba, AIRE_VENTANA)) + "px";
      pop.style.left = (window.scrollX + izquierda) + "px";
      return;
    }

    // 2) Sin sitio a los lados —pantalla estrecha, o un bloque que ocupa todo el
    //    ancho—: debajo, como toda la vida.
    var top = window.scrollY + r.bottom - 2;
    // El menú de un texto pasa de los 400px: pinchando algo de la mitad de abajo
    // de la pantalla, la parte útil se quedaba fuera y no había forma de llegar a
    // ella. Si no cabe debajo y arriba hay más sitio, se pone encima.
    if (alto > 0 && r.bottom + alto > window.innerHeight && r.top > window.innerHeight - r.bottom) {
      top = Math.max(window.scrollY, window.scrollY + r.top - alto + 2);
    }
    pop.style.top = top + "px";
    pop.style.left = (window.scrollX + r.left) + "px";
  }

  function rgbAHex(rgb) {
    var m = rgb && rgb.match(/\d+/g);
    if (!m || m.length < 3) return "#000000";
    return "#" + m.slice(0, 3).map(function (n) {
      var h = parseInt(n, 10).toString(16);
      return h.length === 1 ? "0" + h : h;
    }).join("");
  }

  function inputTexto(valor, placeholder) {
    var inp = document.createElement("input");
    inp.type = "text"; inp.placeholder = placeholder || ""; inp.value = valor;
    inp.style.cssText = "width:100%;height:32px;padding:0 10px;border-radius:9px;border:1px solid #DEDFD6;background:#fff;color:#141509;font-size:13px;outline:none";
    inp.addEventListener("focus", function () { inp.style.borderColor = "#8FB300"; inp.style.boxShadow = "0 0 0 2px #fff,0 0 0 4px #8FB300"; });
    inp.addEventListener("blur", function () { inp.style.borderColor = "#DEDFD6"; inp.style.boxShadow = "none"; });
    return inp;
  }
  function botonOk() {
    var ok = document.createElement("button"); ok.type = "button"; ok.textContent = "Guardar";
    ok.style.cssText = "height:32px;padding:0 14px;border-radius:9px;border:0;background:#C4F000;color:#141509;font-size:13px;font-weight:600;cursor:pointer";
    return ok;
  }
  function etiqueta(texto) {
    var s = document.createElement("span"); s.textContent = texto;
    s.style.cssText = "font-size:11.5px;font-weight:500;color:#55584C";
    return s;
  }

  function tipoDe(el) {
    if (esImagen(el)) return "Imagen";
    if (esBoton(el)) return "Botón";
    if (esEnlace(el)) return "Enlace";
    if (el.closest && el.closest("a[data-wc-id]") && !esTextoHoja(el) && !esTextoMixto(el)) return "Enlace";
    return "Texto";
  }
  function cabecera(tipo) {
    var h = document.createElement("div");
    h.style.cssText = "display:flex;align-items:center;gap:8px;width:100%;margin-bottom:2px";
    var t = document.createElement("span"); t.textContent = "Editar";
    t.style.cssText = "font-weight:600;font-size:13px;color:#141509";
    var b = document.createElement("span"); b.textContent = tipo;
    b.style.cssText = "font-size:11px;font-weight:600;color:#141509;background:#C4F000;border-radius:999px;padding:2px 9px";
    var x = document.createElement("button"); x.type = "button"; x.textContent = "✕";
    x.style.cssText = "margin-left:auto;border:0;background:none;cursor:pointer;color:#9A9C8F;font-size:14px;line-height:1;width:22px;height:22px;border-radius:6px";
    x.addEventListener("click", function () { quitarResalte(); pop.style.display = "none"; objetivo = null; });
    h.appendChild(t); h.appendChild(b); h.appendChild(x);
    return h;
  }

  // Botón «Encima»/«Debajo» del bloque de añadir imagen. El padre abre el selector
  // de archivo y contesta con `wc-image-insert-set`.
  function botonInsertar(txt, posicion, el) {
    var b = document.createElement("button");
    b.type = "button"; b.textContent = txt;
    b.style.cssText = "flex:1;height:32px;border-radius:9px;border:1px solid #DEDFD6;background:#fff;color:#141509;font-size:13px;font-weight:500;cursor:pointer";
    b.addEventListener("click", function () {
      window.parent.postMessage(
        { type: "wc-image-insert-request", nodeId: idDe(el), page: PAGE, posicion: posicion },
        "*"
      );
    });
    return b;
  }

  // Alinear la imagen. Se manda la INTENCIÓN («centro»), no el CSS: el servidor
  // decide los márgenes (ver `MARGENES` en src/editor/apply.ts). Aquí se aplica
  // además en vivo, con lo mismo que escribirá el servidor, para que lo que se ve
  // y lo que se guarda no puedan discrepar.
  var MARGENES_UI = { izquierda: ["0", "auto"], centro: ["auto", "auto"], derecha: ["auto", "0"] };
  function botonAlinear(txt, valor, el) {
    var b = document.createElement("button");
    b.type = "button"; b.textContent = txt;
    b.style.cssText = "flex:1;height:30px;border-radius:9px;border:1px solid #DEDFD6;background:#fff;color:#141509;font-size:12px;font-weight:500;cursor:pointer";
    b.addEventListener("click", function () {
      var m = MARGENES_UI[valor];
      // display:block es imprescindible: una imagen es en línea por defecto y sin
      // esto los márgenes automáticos no hacen absolutamente nada.
      el.style.display = "block";
      el.style.marginLeft = m[0];
      el.style.marginRight = m[1];
      emitir({ page: PAGE, nodeId: idDe(el), kind: "align", value: valor });
    });
    return b;
  }

  function acotar(n, min, max) { return Math.max(min, Math.min(max, Math.round(n))); }

  // ---------- diseño del bloque (texto) ----------
  //
  // Estos tres controles —alineación, aire y recuadro— son lo que Sebas pedía
  // desde el principio: hasta ahora el editor solo dejaba cambiar el CONTENIDO,
  // y para separar un título de su párrafo había que bajarse el ZIP y tocar CSS.
  //
  // Van solo en elementos que de verdad SON un bloque. Un `text-align` sobre un
  // <span> y un `margin-top` sobre un <a> en línea no hacen absolutamente nada:
  // el botón se pulsaría, no pasaría nada, y parecería roto. Es el mismo fallo
  // que ya tuvo la alineación de imágenes, así que aquí se mira el `display` de
  // verdad en vez de suponerlo por la etiqueta.
  var DISPLAY_EN_BLOQUE = ["block", "flex", "grid", "list-item", "inline-block", "flow-root", "table"];
  function esBloque(el) {
    try { return DISPLAY_EN_BLOQUE.indexOf(window.getComputedStyle(el).display) !== -1; }
    catch (_) { return false; }
  }

  /**
   * Sobre QUÉ se aplican estos tres controles.
   *
   * No siempre es lo que hay debajo del ratón. Un párrafo o un punto de lista que
   * mezcla texto con un enlace no se edita entero: el texto suelto va envuelto en
   * un `<wc-t>` (ver annotate.ts) para poder cambiarlo por su cuenta, y ese
   * elemento es EN LÍNEA. Al pasar por encima, lo que se resolvía era el `<wc-t>`,
   * no el punto de la lista — así que los tres controles desaparecían y en una
   * lista con enlaces no había forma de llegar a ellos. Lo vio Sebas el 10/08.
   *
   * Igual con una negrita: quien pincha en ella y busca «recuadro» quiere el
   * recuadro del párrafo, no uno alrededor de dos palabras.
   *
   * Así que se sube al bloque de texto que lo contiene. La lista de etiquetas es
   * cerrada A PROPÓSITO: subiendo sin más se acabaría en el <section> o el <main>
   * de la maqueta, y un recuadro ahí no es lo que ha pedido nadie.
   */
  // `div` entra porque las webs hechas con IA meten texto suelto en uno
  // constantemente. No se va lejos: se coge el PRIMERO que aparece subiendo, o
  // sea el que envuelve ese texto de cerca, no la maqueta.
  var BLOQUES_DE_TEXTO = ["p", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "figcaption", "dd", "dt", "div"];
  // La frase entera y no solo el nombre: así no hay que adivinar el artículo
  // («del párrafo» pero «de la cita») a base de reglas que fallarían en cuanto
  // se añada una etiqueta más.
  var DE_QUE_BLOQUE = {
    p: "del párrafo", li: "del punto de la lista", blockquote: "de la cita",
    figcaption: "del pie de imagen", dd: "de la definición", dt: "de la definición",
    h1: "del título", h2: "del título", h3: "del título",
    h4: "del título", h5: "del título", h6: "del título",
  };
  function bloqueDe(el) {
    var n = el;
    // Un tope de saltos para no recorrer media página buscando: el bloque de un
    // texto está siempre a un par de niveles.
    for (var i = 0; n && n.nodeType === 1 && i < 6; i++, n = n.parentElement) {
      // Dentro de una tabla se para. Una celda no acepta márgenes (es
      // `table-cell`), y seguir subiendo saltaría la tabla ENTERA para acabar
      // enmarcando lo que haya detrás, que no es lo que se ha pinchado.
      if (esDeTabla(n)) return null;
      if (!tieneId(n)) continue;
      if (BLOQUES_DE_TEXTO.indexOf(n.tagName.toLowerCase()) === -1) continue;
      // Y que de verdad se pinte como bloque: sobre algo en línea, ni el margen
      // ni la alineación harían nada y el botón parecería roto.
      if (esBloque(n)) return n;
    }
    return null;
  }
  function esDeTabla(el) {
    try { return window.getComputedStyle(el).display.indexOf("table") === 0; }
    catch (_) { return false; }
  }
  function nombreDeBloque(el) {
    var t = el.tagName.toLowerCase();
    return Object.prototype.hasOwnProperty.call(DE_QUE_BLOQUE, t) ? DE_QUE_BLOQUE[t] : "del bloque";
  }

  /**
   * Enseña a qué bloque apuntan los controles mientras el ratón está sobre ellos.
   *
   * Sin esto, pinchar una negrita y ver «Recuadro» hace pensar que el recuadro va
   * alrededor de la negrita. Va alrededor del párrafo, y eso hay que verlo ANTES
   * de pulsar, no después. Se guarda el contorno anterior y se repone: el que
   * pone `marcar` al pasar por encima sigue siendo suyo.
   */
  var bloqueResaltado = null, contornoPrevio = "";
  function resaltarBloque(el) {
    if (bloqueResaltado === el) return;
    quitarResalte();
    if (!el) return;
    bloqueResaltado = el;
    contornoPrevio = el.style.outline;
    el.style.outline = "2px solid rgba(196,240,0,.95)";
  }
  function quitarResalte() {
    if (!bloqueResaltado) return;
    bloqueResaltado.style.outline = contornoPrevio;
    bloqueResaltado = null; contornoPrevio = "";
  }

  // Las MISMAS tablas que el servidor (TEXT_ALIGN, RECUADROS y PROPIEDADES_RECUADRO
  // en src/editor/apply.ts). Se aplican aquí en vivo y allí al guardar: si
  // discreparan, el usuario aprobaría una cosa y se publicaría otra. Hay un test
  // que las compara literalmente.
  var TEXT_ALIGN_UI = { izquierda: "left", centro: "center", derecha: "right" };
  var PROPIEDADES_RECUADRO_UI = ["padding", "padding-top", "padding-right", "padding-bottom", "padding-left", "background", "background-color", "border", "border-top", "border-right", "border-bottom", "border-left", "border-width", "border-style", "border-color", "border-radius"];
  var RECUADROS_UI = {
    ninguno: [],
    suave: [["background-color", "rgba(128,128,128,.10)"], ["border-radius", "12px"], ["padding", "18px 20px"]],
    borde: [["border", "1px solid rgba(128,128,128,.35)"], ["border-radius", "12px"], ["padding", "18px 20px"]],
    lateral: [["border-left", "3px solid currentColor"], ["padding", "4px 0 4px 16px"]]
  };

  function botonChico(txt, titulo) {
    /* `titulo` es el rótulo que sale al dejar el ratón encima. */
    var b = document.createElement("button");
    b.type = "button"; b.textContent = txt; if (titulo) b.title = titulo;
    b.style.cssText = "flex:1;height:30px;border-radius:9px;border:1px solid #DEDFD6;background:#fff;color:#141509;font-size:12px;font-weight:500;cursor:pointer";
    return b;
  }

  function botonAlinearTexto(txt, valor, el) {
    var b = botonChico(txt);
    b.addEventListener("click", function () {
      // Solo `text-align`. Nada de `display:block` como en las imágenes: eso
      // sacaría de su fila a un título que estuviera dentro de una maqueta.
      el.style.textAlign = TEXT_ALIGN_UI[valor];
      emitir({ page: PAGE, nodeId: idDe(el), kind: "textAlign", value: valor });
    });
    return b;
  }

  function botonRecuadro(txt, valor, el) {
    var b = botonChico(txt);
    b.addEventListener("click", function () {
      // Primero se borran TODAS las propiedades del grupo y luego se escriben las
      // del recuadro elegido. Sin el borrado, cambiar de «con borde» a «barra
      // lateral» dejaría el borde de antes puesto y saldría un marco con barra.
      for (var i = 0; i < PROPIEDADES_RECUADRO_UI.length; i++) el.style.removeProperty(PROPIEDADES_RECUADRO_UI[i]);
      var decls = RECUADROS_UI[valor] || [];
      for (var j = 0; j < decls.length; j++) el.style.setProperty(decls[j][0], decls[j][1]);
      emitir({ page: PAGE, nodeId: idDe(el), kind: "recuadro", value: valor });
      colocarPopSiAbierto();
    });
    return b;
  }
  // El recuadro cambia el tamaño del elemento (mete relleno), y el menú se
  // coloca contra sus bordes: sin recolocarlo se queda flotando donde ya no está.
  function colocarPopSiAbierto() { if (objetivo && pop.style.display !== "none") posicionar(objetivo); }

  /**
   * Los hermanos de un bloque, TAL Y COMO LOS VE EL SERVIDOR.
   *
   * Solo los que llevan `data-wc-id`, o sea los que existen en el documento
   * guardado. La vista previa añade cosas que ahí no están —el `<wc-t>` que
   * envuelve el texto suelto, el `<script>` del propio editor, una imagen recién
   * insertada—, y contarlas movería el bloque una posición de más al guardar:
   * una cosa en pantalla y otra en la web publicada.
   */
  function hermanosDe(el) {
    var padre = el.parentElement, out = [];
    if (!padre) return out;
    for (var i = 0; i < padre.children.length; i++) {
      if (tieneId(padre.children[i])) out.push(padre.children[i]);
    }
    return out;
  }

  // Cuánto se ha movido cada bloque desde que se entró en modo edición. Se manda
  // el ACUMULADO, no cada paso: dos ops iguales sobre el mismo nodo se
  // deduplican, y el bloque acabaría una posición más arriba de lo que enseña la
  // vista previa. Ver `MOVER_MAX` en src/editor/apply.ts.
  var desplazamientos = {};

  function botonMover(txt, paso, el) {
    var hermanos = hermanosDe(el);
    var i = hermanos.indexOf(el);
    var puede = i !== -1 && i + paso >= 0 && i + paso < hermanos.length;
    var b = botonChico(txt, puede ? "" : "Ya está " + (paso < 0 ? "el primero" : "el último"));
    if (!puede) {
      // Apagado y no escondido: que se vea que la herramienta existe y que este
      // bloque ya está en el extremo, en vez de que el botón desaparezca y
      // parezca que la página se comporta distinta según dónde pinches.
      b.disabled = true;
      b.style.opacity = ".45";
      b.style.cursor = "default";
      return b;
    }
    b.addEventListener("click", function () {
      var lista = hermanosDe(el), pos = lista.indexOf(el), destino = pos + paso;
      if (pos === -1 || destino < 0 || destino >= lista.length) return;
      var padre = el.parentElement;
      if (paso < 0) padre.insertBefore(el, lista[destino]);
      else padre.insertBefore(el, lista[destino].nextSibling);

      var id = idDe(el);
      desplazamientos[id] = (desplazamientos[id] || 0) + paso;
      emitir({ page: PAGE, nodeId: id, kind: "mover", value: desplazamientos[id] });

      el.scrollIntoView({ block: "nearest" });
      // Se reconstruye el menú: el bloque puede haber llegado a un extremo y los
      // botones tienen que apagarse. Sin esto se quedarían activos y el siguiente
      // clic no haría nada sin explicar por qué.
      construir(el);
      posicionar(el);
    });
    return b;
  }

  function filaDeBotones(botones, columnas) {
    var f = document.createElement("div");
    f.style.cssText = columnas
      ? "display:grid;grid-template-columns:repeat(" + columnas + ",1fr);gap:6px"
      : "display:flex;gap:6px";
    for (var i = 0; i < botones.length; i++) f.appendChild(botones[i]);
    return f;
  }

  // Dónde está la imagen AHORA, para que la barra arranque en su sitio. Se mide
  // contra el contenedor: es lo que el usuario ve, y no depende de si el ancho
  // está escrito en el HTML, en una hoja de estilos o en ningún sitio.
  function anchoActual(el) {
    var padre = el.parentElement;
    var w = el.getBoundingClientRect().width;
    var p = padre ? padre.getBoundingClientRect().width : 0;
    if (!p) return 100;
    return acotar((w / p) * 100, 10, 100);
  }
  function margenActual(el) {
    var v = parseFloat(window.getComputedStyle(el).marginTop);
    return acotar(isNaN(v) ? 0 : v, 0, 120);
  }
  // Un margen puede ser negativo en la web de origen; la barra empieza en 0, así
  // que se recorta. No se «arregla» nada al leerlo: hasta que no se toque la
  // barra, no se emite ninguna op y el margen negativo se queda como estaba.
  function margenActualLado(el, prop) {
    var v = parseFloat(window.getComputedStyle(el)[prop]);
    return acotar(isNaN(v) ? 0 : v, 0, 120);
  }
  function tamanoActual(el) {
    var v = parseFloat(window.getComputedStyle(el).fontSize);
    return acotar(isNaN(v) ? 16 : v, 10, 96);
  }

  /**
   * Barra deslizante + cajita con el número. Sebas: «queda más profesional», y
   * tenía razón — poner nombres a los tamaños («Pequeña», «Normal») es no
   * atreverse a dar la cifra, y obliga a que uno de los cuatro sea el que quiere.
   *
   * `onCambio(n, final)`: se llama en CADA movimiento para que se vea al vuelo,
   * pero solo con `final=true` al soltar. Si se emitiera en cada píxel del
   * arrastre, un solo gesto mandaría cientos de mensajes al panel.
   *
   * OJO CON EL NOMBRE: no puede llamarse `barra`. Ya hay un `var barra` en este
   * archivo —la barra de formato de texto— y cuando un `var` y una función
   * comparten nombre, el `var` gana: al abrir el menú, `barra` era un div y
   * llamarlo reventaba `construir` entero, así que desaparecía todo lo que iba
   * después. La sintaxis es válida, no falla ningún test y solo se ve abriendo
   * el menú.
   */
  function deslizador(titulo, unidad, min, max, valorInicial, onCambio) {
    var caja = document.createElement("div");
    var cab = document.createElement("div");
    cab.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;margin:2px 0 4px";
    var t = document.createElement("span");
    t.textContent = titulo;
    t.style.cssText = "font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#9A9C8F";
    var num = document.createElement("input");
    num.type = "number"; num.min = String(min); num.max = String(max); num.value = String(valorInicial);
    num.style.cssText = "width:62px;height:26px;border:1px solid #DEDFD6;border-radius:8px;padding:0 6px;font-size:12px;color:#141509;background:#fff;text-align:right";
    var uni = document.createElement("span");
    uni.textContent = unidad;
    uni.style.cssText = "font-size:11px;color:#9A9C8F;margin-left:-4px";
    var envNum = document.createElement("span");
    envNum.style.cssText = "display:flex;align-items:center;gap:4px";
    envNum.appendChild(num); envNum.appendChild(uni);
    cab.appendChild(t); cab.appendChild(envNum);

    var rango = document.createElement("input");
    rango.type = "range"; rango.min = String(min); rango.max = String(max);
    rango.value = String(valorInicial);
    rango.style.cssText = "width:100%;accent-color:#C4F000;cursor:pointer";

    function aplicar(n, final) {
      var v = acotar(n, min, max);
      rango.value = String(v);
      num.value = String(v);
      onCambio(v, final);
    }
    // `input` mientras se arrastra (se ve al vuelo), `change` al soltar (se
    // guarda). En la cajita, `change` basta: se confirma al salir o con Enter.
    rango.addEventListener("input", function () { aplicar(Number(rango.value), false); });
    rango.addEventListener("change", function () { aplicar(Number(rango.value), true); });
    num.addEventListener("change", function () {
      var n = Number(num.value);
      aplicar(isNaN(n) ? valorInicial : n, true); // texto que no es número → se deja como estaba
    });

    caja.appendChild(cab); caja.appendChild(rango);
    return caja;
  }

  function construir(el) {
    pop.innerHTML = "";
    objetivo = el;
    var hoja = esTextoEscribible(el);
    var enlace = esEnlace(el) ? el : (el.closest ? el.closest("a[data-wc-id]") : null);

    if (hoja) {
      var color = document.createElement("input"); color.type = "color";
      color.value = rgbAHex(getComputedStyle(el).color);
      color.style.cssText = "width:30px;height:30px;border:1px solid rgba(20,21,9,.12);border-radius:8px;background:none;padding:0;cursor:pointer";
      color.addEventListener("input", function () {
        el.style.color = color.value;
        emitir({ page: PAGE, nodeId: idDe(el), kind: "style", property: "color", value: color.value });
      });
      pop.appendChild(etiqueta("Color")); pop.appendChild(color);
    }

    // Alineación, aire y recuadro. No van sobre lo que hay debajo del ratón sino
    // sobre el BLOQUE que lo contiene (ver `bloqueDe`): quien pincha una negrita
    // y busca «recuadro» quiere el del párrafo, y en un punto de lista con un
    // enlace dentro lo que se resuelve es el trozo de texto, no el punto.
    var bloque = esImagen(el) ? null : bloqueDe(el);
    if (bloque) {
      // Todo junto en una caja para poder resaltar el bloque mientras el ratón
      // está sobre estos controles, y solo sobre estos.
      var caja = document.createElement("div");
      caja.style.cssText = "display:flex;flex-direction:column;gap:8px";
      caja.addEventListener("mouseenter", function () { resaltarBloque(bloque); });
      caja.addEventListener("mouseleave", quitarResalte);
      pop.appendChild(caja);

      caja.appendChild(etiqueta("Diseño " + nombreDeBloque(bloque)));

      // Mover va lo primero porque es de otra familia: las demás cambian cómo se
      // ve el bloque, esta cambia dónde está.
      caja.appendChild(etiqueta("Mover"));
      caja.appendChild(filaDeBotones([
        botonMover("↑ Subir", -1, bloque),
        botonMover("↓ Bajar", 1, bloque)
      ]));

      caja.appendChild(etiqueta("Alineación del texto"));
      caja.appendChild(filaDeBotones([
        botonAlinearTexto("Izq.", "izquierda", bloque),
        botonAlinearTexto("Centro", "centro", bloque),
        botonAlinearTexto("Der.", "derecha", bloque)
      ]));

      // Arriba y abajo por separado, y no un solo control como en las imágenes:
      // en un texto el hueco que se quiere abrir está casi siempre a un lado
      // —un título despegado del párrafo de arriba— y moviendo los dos a la vez
      // hay que aceptar un cambio que no se ha pedido para conseguir el que sí.
      // Arranca en lo que MIDE ahora, no en un valor de fábrica: si empezara en
      // otro sitio, el primer arrastre daría un salto que nadie ha pedido. Es la
      // misma razón por la que el ancho de las imágenes se mide contra su hueco.
      caja.appendChild(deslizador("Tamaño de la letra", "px", 10, 96, tamanoActual(bloque), function (n, final) {
        bloque.style.fontSize = n + "px";
        if (final) { emitir({ page: PAGE, nodeId: idDe(bloque), kind: "fontSize", value: n }); colocarPopSiAbierto(); }
      }));

      caja.appendChild(deslizador("Aire arriba", "px", 0, 120, margenActualLado(bloque, "marginTop"), function (n, final) {
        bloque.style.marginTop = n + "px";
        // Recolocar solo al soltar. Subir el aire de arriba empuja el elemento
        // hacia abajo y el menú cuelga de él: si se recolocara en cada píxel del
        // arrastre, el menú iría persiguiendo al ratón mientras se arrastra.
        if (final) { emitir({ page: PAGE, nodeId: idDe(bloque), kind: "margen", value: n, lado: "arriba" }); colocarPopSiAbierto(); }
      }));
      caja.appendChild(deslizador("Aire abajo", "px", 0, 120, margenActualLado(bloque, "marginBottom"), function (n, final) {
        bloque.style.marginBottom = n + "px";
        if (final) { emitir({ page: PAGE, nodeId: idDe(bloque), kind: "margen", value: n, lado: "abajo" }); colocarPopSiAbierto(); }
      }));

      // Cuatro y en dos filas: los nombres («Fondo suave», «Barra lateral») no
      // caben en una sola de 280px, y abreviarlos hasta que quepan obliga a
      // probarlos uno por uno para saber cuál es cuál.
      caja.appendChild(etiqueta("Recuadro"));
      caja.appendChild(filaDeBotones([
        botonRecuadro("Ninguno", "ninguno", bloque),
        botonRecuadro("Fondo suave", "suave", bloque),
        botonRecuadro("Con borde", "borde", bloque),
        botonRecuadro("Barra lateral", "lateral", bloque)
      ], 2));
    }

    if (hoja && esBoton(el)) {
      // Los <button> no aceptan bien el caret de contenteditable (el navegador no deja
      // escribir dentro) → el texto del botón se edita desde el popover.
      var txt = inputTexto(el.textContent, "Texto del botón");
      var okT = botonOk();
      var aplicarT = function () {
        el.textContent = txt.value;
        emitir({ page: PAGE, nodeId: idDe(el), kind: "text", value: txt.value });
      };
      okT.addEventListener("click", aplicarT);
      txt.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); aplicarT(); } });
      pop.appendChild(etiqueta("Texto")); pop.appendChild(txt); pop.appendChild(okT);
    }

    if (esTextoMixto(el) && el.closest && el.closest("button")) {
      // El caret de contenteditable no funciona dentro de <button>: el texto suelto
      // de un botón mixto (icono + texto) se edita desde el popover, como los botones hoja.
      var txtM = inputTexto(el.textContent, "Texto del botón");
      var okM = botonOk();
      var aplicarM = function () {
        el.textContent = txtM.value;
        var tnM = (el.getAttribute("data-wc-tn") || "").split(":");
        emitir({ page: PAGE, nodeId: Number(tnM[0]), kind: "textNode", index: Number(tnM[1]), value: txtM.value });
      };
      okM.addEventListener("click", aplicarM);
      txtM.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); aplicarM(); } });
      pop.appendChild(etiqueta("Texto")); pop.appendChild(txtM); pop.appendChild(okM);
    }

    if (enlace) {
      var inp = inputTexto(enlace.getAttribute("href") || "", "https://…");
      var ok = botonOk();
      var aplicar = function () {
        var v = inp.value.trim();
        enlace.setAttribute("href", v);
        emitir({ page: PAGE, nodeId: idDe(enlace), kind: "href", value: v });
      };
      ok.addEventListener("click", aplicar);
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); aplicar(); } });
      pop.appendChild(etiqueta("Enlace")); pop.appendChild(inp); pop.appendChild(ok);
    }

    if (esImagen(el)) {
      var btn = document.createElement("button"); btn.type = "button"; btn.textContent = "Cambiar imagen";
      btn.style.cssText = "height:32px;padding:0 14px;border-radius:9px;border:0;background:#C4F000;color:#141509;font-size:13px;font-weight:600;cursor:pointer";
      btn.addEventListener("click", function () {
        window.parent.postMessage({ type: "wc-image-request", nodeId: idDe(el), page: PAGE }, "*");
      });
      pop.appendChild(btn);

      // Alineación arriba, y debajo las dos barras juntas. Son controles de la
      // misma familia (dos números con su barra) y separarlos con los botones de
      // alineación en medio rompía la simetría del recuadro.
      //
      // Solo para imágenes: alinear un párrafo es otra cosa (ahí se alinea el
      // TEXTO, no el bloque) y mezclarlas confundiría.
      pop.appendChild(etiqueta("Alineación"));
      var fa = document.createElement("div");
      fa.style.cssText = "display:flex;gap:6px";
      fa.appendChild(botonAlinear("Izq.", "izquierda", el));
      fa.appendChild(botonAlinear("Centro", "centro", el));
      fa.appendChild(botonAlinear("Der.", "derecha", el));
      pop.appendChild(fa);

      // Ancho, en % de su hueco. La barra arranca donde está la imagen AHORA
      // —medida contra su contenedor—, no en un valor de fábrica: si empezara en
      // otro sitio, el primer arrastre daría un salto que nadie ha pedido.
      pop.appendChild(deslizador("Tamaño", "%", 10, 100, anchoActual(el), function (n, final) {
        el.style.display = "block";
        el.style.width = n + "%";
        el.style.height = "auto"; // sin esto, cambiar solo el ancho deforma la foto
        if (final) emitir({ page: PAGE, nodeId: idDe(el), kind: "size", value: n });
      }));

      // Aire por arriba y por abajo. Solo vertical: los lados son de la
      // alineación, y si esto también los tocara, subirlo descentraría la foto
      // que se acaba de centrar.
      pop.appendChild(deslizador("Margen arriba y abajo", "px", 0, 120, margenActual(el), function (n, final) {
        el.style.marginTop = n + "px";
        el.style.marginBottom = n + "px";
        if (final) emitir({ page: PAGE, nodeId: idDe(el), kind: "margen", value: n });
      }));
    }

    // Meter una imagen NUEVA junto a lo que se ha pinchado. Hasta ahora solo se
    // podía cambiar una que ya estuviera, así que quien no tenía hueco para foto
    // en su diseño no podía ponerla.
    //
    // Dos botones y no uno con opciones: «encima» y «debajo» se entienden sin
    // leer nada, y esconder la elección detrás de un desplegable convierte un
    // gesto en dos decisiones.
    pop.appendChild(etiqueta("Añadir una imagen"));
    var fila = document.createElement("div");
    fila.style.cssText = "display:flex;gap:6px";
    fila.appendChild(botonInsertar("Encima", "antes", el));
    fila.appendChild(botonInsertar("Debajo", "despues", el));
    pop.appendChild(fila);

    // Cabecera (título + tipo + cerrar) solo si hay controles. Desde que «Añadir
    // una imagen» se pone en TODOS, siempre hay al menos uno; el guard se queda
    // porque `mostrar()` depende de él y quitarlo dejaría el popover abriéndose
    // vacío el día que se toque `construir`.
    if (pop.firstChild) pop.insertBefore(cabecera(tipoDe(el)), pop.firstChild);
  }

  function mostrar(el) {
    if (ocultarTimer) { clearTimeout(ocultarTimer); ocultarTimer = null; }
    if (objetivo !== el || pop.style.display === "none") construir(el);
    if (!pop.firstChild) { pop.style.display = "none"; objetivo = null; return; }
    // Se muestra ANTES de colocar porque `posicionar` necesita medir el alto para
    // decidir si cabe debajo, y un elemento con `display:none` mide cero. La
    // visibilidad tapa el fotograma intermedio: si no, al abrirlo se ve un salto
    // desde donde estaba el menú anterior.
    pop.style.visibility = "hidden";
    pop.style.display = "flex";
    posicionar(el);
    pop.style.visibility = "visible";
  }
  function programarOcultar() {
    if (ocultarTimer) clearTimeout(ocultarTimer);
    ocultarTimer = setTimeout(function () {
      if (popEnUso()) return;
      pop.style.display = "none"; objetivo = null;
    }, 350);
  }

  // ---------- marcado visual ----------
  // Solo puede haber UNO marcado: el ratón está en un sitio, no en cuatro. Que
  // cada quien se desmarcara por su cuenta al salir dependía de acertar con qué
  // elemento resolvía el evento de salida, y bastaba con fallar una vez para
  // dejar el recuadro pegado hasta recargar. Marcar el siguiente borra el
  // anterior, así que un fallo así se corrige solo en el siguiente movimiento.
  var marcado = null;
  function marcar(el) {
    if (marcado && marcado !== el) desmarcar(marcado);
    marcado = el;
    el.style.outline = "2px dashed rgba(196,240,0,.95)"; el.style.outlineOffset = "3px";
    if (esTextoEscribible(el) || esTextoMixto(el)) el.style.cursor = "text";
  }
  function desmarcar(el) {
    if (el === editando) return;
    if (el === marcado) marcado = null;
    el.style.outline = ""; el.style.outlineOffset = ""; el.style.cursor = "";
  }

  // ---------- edición de texto in-situ ----------
  var editando = null, valorPrevio = "", htmlPrevio = "";
  function iniciarEdicion(el) {
    if (editando) terminarEdicion(true);
    editando = el; valorPrevio = el.textContent; htmlPrevio = el.innerHTML;
    el.setAttribute("contenteditable", "true"); el.focus();
    // La barra de formato solo para texto de verdad (no para el texto suelto de
    // un elemento mixto icono+texto, que es un único nodo sin formato).
    if (!esTextoMixto(el)) mostrarBarra(el);
  }
  function terminarEdicion(guardar) {
    if (!editando) return;
    var el = editando; el.removeAttribute("contenteditable"); ocultarBarra();
    var texto = el.textContent, html = el.innerHTML; editando = null; desmarcar(el);
    if (guardar) {
      if (esTextoMixto(el)) {
        if (texto !== valorPrevio) {
          var tn = (el.getAttribute("data-wc-tn") || "").split(":");
          emitir({ page: PAGE, nodeId: Number(tn[0]), kind: "textNode", index: Number(tn[1]), value: texto });
        }
      } else if (el.children.length > 0) {
        // Tiene formato en línea → op rich-text (el servidor la sanea).
        if (html !== htmlPrevio) emitir({ page: PAGE, nodeId: idDe(el), kind: "richText", value: sinEnvoltorios(html) });
      } else if (texto !== valorPrevio) {
        emitir({ page: PAGE, nodeId: idDe(el), kind: "text", value: texto });
      }
    } else {
      el.innerHTML = htmlPrevio; // revertir restaura también el formato
    }
  }

  // ---------- eventos ----------
  document.addEventListener("mouseover", function (e) {
    if (dentroDePop(e.target)) {
      if (ocultarTimer) { clearTimeout(ocultarTimer); ocultarTimer = null; }
      if (reapuntarTimer) { clearTimeout(reapuntarTimer); reapuntarTimer = null; }
      return;
    }
    var el = resolverEditable(e.target);
    if (!el) return;
    marcar(el);
    if (objetivo && el !== objetivo && pop.style.display !== "none") {
      // El ratón puede estar de camino al popover cruzando otro editable: espera
      // antes de re-apuntar; si llega al popover, el re-apuntado se cancela.
      if (reapuntarTimer) clearTimeout(reapuntarTimer);
      reapuntarTimer = setTimeout(function () { if (!popEnUso()) mostrar(el); }, 300);
    } else {
      mostrar(el);
    }
  });
  document.addEventListener("mouseout", function (e) {
    var res = resolverEditable(e.target), to = e.relatedTarget;
    if (res && (!to || !res.contains || !res.contains(to))) desmarcar(res);
    if (!dentroDePop(to) && !resolverEditable(to)) programarOcultar();
  });
  pop.addEventListener("mouseover", function () {
    if (ocultarTimer) { clearTimeout(ocultarTimer); ocultarTimer = null; }
    if (reapuntarTimer) { clearTimeout(reapuntarTimer); reapuntarTimer = null; }
  });
  pop.addEventListener("mouseleave", function () { programarOcultar(); });

  document.addEventListener("click", function (e) {
    var el = e.target;
    if (dentroDePop(el)) return;
    // En modo edición no se navega ni se pulsan botones "de verdad".
    if (el && el.nodeType === 1 && el.closest && el.closest("a, button, [type=submit]")) e.preventDefault();
    var objetivoClick = resolverEditable(el);
    if (!objetivoClick) return;
    mostrar(objetivoClick); // el click también fija el popover (por si el hover se escapó)
    var mixtoEnBoton = esTextoMixto(objetivoClick) && objetivoClick.closest && !!objetivoClick.closest("button");
    if ((esTextoEscribible(objetivoClick) || esTextoMixto(objetivoClick)) && !esBoton(objetivoClick) && !mixtoEnBoton && objetivoClick !== editando) {
      iniciarEdicion(objetivoClick);
    }
  });
  // Nada de envíos de formularios en modo edición.
  document.addEventListener("submit", function (e) { e.preventDefault(); }, true);

  document.addEventListener("keydown", function (e) {
    if (!editando) return;
    if (dentroDeBarra(e.target)) return; // el campo del enlace se apaña solo
    if (e.key === "Escape") { e.preventDefault(); terminarEdicion(false); }
    else if (e.key === "Enter") { e.preventDefault(); terminarEdicion(true); }
  });

  /**
   * Pegar trae el HTML de donde se copió: <span style="font-family:Calibri…">,
   * <div>, <p>, <font>, tablas enteras. El servidor solo guarda <b> <i> <u> <a>
   * <br>, así que todo eso se cae AL GUARDAR — y los párrafos, al perder su <p>,
   * se quedan pegados unos a otros sin separación.
   *
   * O sea que se veía una cosa en pantalla y quedaba publicada otra. Se pega
   * texto limpio, que es exactamente lo que se va a guardar.
   */
  document.addEventListener("paste", function (e) {
    if (!editando) return;
    e.preventDefault();
    var dt = e.clipboardData || window.clipboardData;
    var txt = dt ? dt.getData("text/plain") || "" : "";
    if (txt === "") return;
    if (esTextoMixto(editando)) {
      // El texto suelto de un icono+texto es un nodo de texto: ahí no cabe un
      // <br>, así que los saltos se quedan en espacios.
      document.execCommand("insertText", false, txt.replace(/\s+/g, " ").trim());
      return;
    }
    var lineas = txt.replace(/\r\n?/g, "\n").split("\n").map(escaparHtml);
    document.execCommand("insertHTML", false, lineas.join("<br>"));
  }, true);
  function escaparHtml(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  // Usamos focusout (trae relatedTarget) en vez de blur: si el foco pasa AL
  // popover (p.ej. el campo href o el selector de color de un <a> que se está
  // editando como texto), NO cerramos la edición de texto. El guard !editando
  // en terminarEdicion mantiene el caso Enter->focusout como no-op.
  document.addEventListener("focusout", function (e) {
    if (tocandoBarra) return; // interactuando con la barra de formato
    // El foco se ha ido AL campo del enlace: es la misma edición, no una salida.
    // (No basta con `tocandoBarra`, que solo cubre el ratón: al campo también se
    // puede llegar con el tabulador.)
    if (dentroDeBarra(e.relatedTarget)) return;
    if (dentroDePop(e.relatedTarget)) return;
    // El mousedown enfoca el ancestro enfocable más cercano (p.ej. el <a> de un
    // botón-enlace icono+texto); al iniciar la edición, focus() del elemento dispara
    // un focusout de ese ancestro CON DESTINO el propio elemento en edición. Eso es
    // una entrada, no una salida: cerrarla aquí mataba la edición al instante.
    if (editando && e.relatedTarget && editando.contains(e.relatedTarget)) return;
    terminarEdicion(true);
  }, true);

  // ---------- recepción del padre: fijar la imagen subida en vivo ----------
  window.addEventListener("message", function (e) {
    if (e.source !== window.parent) return;
    var d = e.data;
    if (!d || typeof d.previewUrl !== "string") return;

    if (d.type === "wc-image-set") {
      var img = document.querySelector('[data-wc-id="' + Number(d.nodeId) + '"]');
      if (img && img.tagName.toLowerCase() === "img") img.src = d.previewUrl;
      return;
    }

    // Imagen NUEVA: se pinta ya, para que se vea dónde ha quedado antes de
    // guardar. El <img> se crea con el MISMO estilo que le pondrá el servidor al
    // guardar (ver `imgHtml` en src/editor/apply.ts); si aquí se viera de otra
    // manera, el usuario aprobaría una cosa y se guardaría otra.
    //
    // A propósito SIN `data-wc-id`: no existe en el documento guardado todavía,
    // así que no es editable ni se le puede pinchar. Lo será tras guardar, cuando
    // la página se vuelva a numerar.
    if (d.type === "wc-image-insert-set" && (d.posicion === "antes" || d.posicion === "despues")) {
      var ancla = document.querySelector('[data-wc-id="' + Number(d.nodeId) + '"]');
      if (!ancla || !ancla.parentNode) return;
      var nueva = document.createElement("img");
      nueva.src = d.previewUrl;
      nueva.alt = typeof d.alt === "string" ? d.alt : "";
      nueva.setAttribute("loading", "lazy");
      nueva.style.cssText = "max-width:100%;height:auto;display:block";
      if (d.posicion === "antes") ancla.parentNode.insertBefore(nueva, ancla);
      else ancla.parentNode.insertBefore(nueva, ancla.nextSibling);
      nueva.scrollIntoView({ block: "nearest" });
    }
  });
})();
