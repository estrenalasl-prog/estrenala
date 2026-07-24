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

  // Objetivo editable de un evento: el elemento mismo (hoja de texto, imagen o <a>),
  // o si no, el <a> ancestro más cercano con data-wc-id. Las webs reales (hechas con
  // IA) traen <a><svg/></a>, <a><span>…</span></a>: el target del evento es el hijo,
  // no el enlace — sin esta resolución, iconos y botones-enlace quedan muertos.
  function resolverEditable(el) {
    if (!el || el.nodeType !== 1) return null;
    if (esTextoMixto(el)) return el;
    if (esTextoRico(el) || esImagen(el) || esEnlace(el)) return el;
    if (!el.closest) return null;
    var a = el.closest("a[data-wc-id]");
    return a || null;
  }

  function emitir(op) { window.parent.postMessage({ type: "wc-edit", op: op }, "*"); }
  function idDe(el) { return Number(el.getAttribute("data-wc-id")); }

  // ---------- popover (DOM propio, nunca se guarda) ----------
  var pop = document.createElement("div");
  pop.setAttribute("data-wc-ui", "1");
  // Estilo Estrénala v2: tarjeta clara con acento lima, tipografía de sistema (no
  // se asume Space Grotesk cargada en la web del cliente). z-index máximo.
  pop.style.cssText = "position:absolute;z-index:2147483647;display:none;flex-direction:column;gap:8px;align-items:stretch;width:280px;max-width:92vw;background:#fff;color:#141509;border:1px solid #DEDFD6;border-radius:14px;padding:12px;font:13px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;box-shadow:0 18px 48px -12px rgba(20,21,9,.28)";
  function montarPop() { if (!pop.parentNode && document.body) document.body.appendChild(pop); }
  if (document.body) montarPop(); else document.addEventListener("DOMContentLoaded", montarPop);

  // ---------- barra de formato (rich-text) ----------
  var barra = document.createElement("div");
  barra.setAttribute("data-wc-ui", "1");
  barra.style.cssText = "position:fixed;z-index:2147483647;display:none;gap:2px;background:#fff;" +
    "border:1px solid rgba(20,21,9,.14);border-radius:10px;box-shadow:0 8px 24px -6px rgba(20,21,9,.20);padding:4px";
  function botonFormato(txt, estilo, accion, titulo) {
    var b = document.createElement("button"); b.type = "button"; b.textContent = txt; b.title = titulo;
    b.style.cssText = "width:30px;height:30px;border:0;background:none;border-radius:7px;cursor:pointer;color:#141509;font-size:14px;line-height:1;" + estilo;
    // mousedown preventDefault: no robar la selección del texto en edición.
    b.addEventListener("mousedown", function (e) { e.preventDefault(); });
    b.addEventListener("click", function (e) { e.preventDefault(); accion(); });
    return b;
  }
  function comando(cmd) { try { document.execCommand("styleWithCSS", false, false); } catch (_) {} document.execCommand(cmd, false, null); }
  barra.appendChild(botonFormato("B", "font-weight:700", function () { comando("bold"); }, "Negrita"));
  barra.appendChild(botonFormato("I", "font-style:italic;font-weight:600", function () { comando("italic"); }, "Cursiva"));
  barra.appendChild(botonFormato("U", "text-decoration:underline;font-weight:600", function () { comando("underline"); }, "Subrayado"));
  barra.appendChild(botonFormato("🔗", "", function () {
    var u = window.prompt("Enlace (https://…). Deja vacío para quitarlo.");
    if (u === null) return;
    if (u.trim() === "") { try { document.execCommand("styleWithCSS", false, false); } catch (_) {} document.execCommand("unlink", false, null); }
    else document.execCommand("createLink", false, u.trim());
  }, "Enlace"));
  // Mientras se interactúa con la barra (incluido el prompt del enlace) NO se
  // cierra la edición por focusout.
  var tocandoBarra = false;
  barra.addEventListener("mousedown", function () { tocandoBarra = true; setTimeout(function () { tocandoBarra = false; }, 0); });
  function montarBarra() { if (!barra.parentNode && document.body) document.body.appendChild(barra); }
  if (document.body) montarBarra(); else document.addEventListener("DOMContentLoaded", montarBarra);
  function mostrarBarra(el) {
    var r = el.getBoundingClientRect();
    barra.style.display = "flex";
    var alto = 40;
    var top = r.top - alto - 6; if (top < 6) top = r.bottom + 6;
    barra.style.top = Math.round(top) + "px";
    barra.style.left = Math.round(Math.max(6, r.left)) + "px";
  }
  function ocultarBarra() { barra.style.display = "none"; }

  var objetivo = null;
  var ocultarTimer = null;
  var reapuntarTimer = null;

  function dentroDePop(el) { return el === pop || (el && pop.contains && pop.contains(el)); }
  // Un input del popover tiene el foco (selector de color nativo abierto, campo de
  // href/texto…) → no ocultar ni re-apuntar mientras se usa.
  function popEnUso() { return dentroDePop(document.activeElement); }

  function posicionar(el) {
    var r = el.getBoundingClientRect();
    // Solapa 2px el borde inferior del elemento: sin "zona muerta" entre el elemento
    // y el popover (si hay hueco, el ratón cruza otros editables y el popover se escapa).
    pop.style.top = (window.scrollY + r.bottom - 2) + "px";
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
    x.addEventListener("click", function () { pop.style.display = "none"; objetivo = null; });
    h.appendChild(t); h.appendChild(b); h.appendChild(x);
    return h;
  }

  function construir(el) {
    pop.innerHTML = "";
    objetivo = el;
    var hoja = esTextoRico(el);
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
    }

    // Cabecera (título + tipo + cerrar) solo si hay controles: si el elemento no es
    // editable, pop queda vacío y mostrar() lo oculta por el guard !pop.firstChild.
    if (pop.firstChild) pop.insertBefore(cabecera(tipoDe(el)), pop.firstChild);
  }

  function mostrar(el) {
    if (ocultarTimer) { clearTimeout(ocultarTimer); ocultarTimer = null; }
    if (objetivo !== el || pop.style.display === "none") construir(el);
    if (!pop.firstChild) { pop.style.display = "none"; objetivo = null; return; }
    posicionar(el);
    pop.style.display = "flex";
  }
  function programarOcultar() {
    if (ocultarTimer) clearTimeout(ocultarTimer);
    ocultarTimer = setTimeout(function () {
      if (popEnUso()) return;
      pop.style.display = "none"; objetivo = null;
    }, 350);
  }

  // ---------- marcado visual ----------
  function marcar(el) { el.style.outline = "2px dashed rgba(196,240,0,.95)"; el.style.outlineOffset = "3px"; if (esTextoRico(el) || esTextoMixto(el)) el.style.cursor = "text"; }
  function desmarcar(el) { if (el === editando) return; el.style.outline = ""; el.style.outlineOffset = ""; el.style.cursor = ""; }

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
        if (html !== htmlPrevio) emitir({ page: PAGE, nodeId: idDe(el), kind: "richText", value: html });
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
    if ((esTextoRico(objetivoClick) || esTextoMixto(objetivoClick)) && !esBoton(objetivoClick) && !mixtoEnBoton && objetivoClick !== editando) {
      iniciarEdicion(objetivoClick);
    }
  });
  // Nada de envíos de formularios en modo edición.
  document.addEventListener("submit", function (e) { e.preventDefault(); }, true);

  document.addEventListener("keydown", function (e) {
    if (!editando) return;
    if (e.key === "Escape") { e.preventDefault(); terminarEdicion(false); }
    else if (e.key === "Enter") { e.preventDefault(); terminarEdicion(true); }
  });
  // Usamos focusout (trae relatedTarget) en vez de blur: si el foco pasa AL
  // popover (p.ej. el campo href o el selector de color de un <a> que se está
  // editando como texto), NO cerramos la edición de texto. El guard !editando
  // en terminarEdicion mantiene el caso Enter->focusout como no-op.
  document.addEventListener("focusout", function (e) {
    if (tocandoBarra) return; // interactuando con la barra de formato / prompt del enlace
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
    if (!d || d.type !== "wc-image-set" || typeof d.previewUrl !== "string") return;
    var img = document.querySelector('[data-wc-id="' + Number(d.nodeId) + '"]');
    if (img && img.tagName.toLowerCase() === "img") img.src = d.previewUrl;
  });
})();
