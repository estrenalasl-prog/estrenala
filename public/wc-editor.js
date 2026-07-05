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
    if (esTextoHoja(el) || esImagen(el) || esEnlace(el)) return el;
    if (!el.closest) return null;
    var a = el.closest("a[data-wc-id]");
    return a || null;
  }

  function emitir(op) { window.parent.postMessage({ type: "wc-edit", op: op }, "*"); }
  function idDe(el) { return Number(el.getAttribute("data-wc-id")); }

  // ---------- popover (DOM propio, nunca se guarda) ----------
  var pop = document.createElement("div");
  pop.setAttribute("data-wc-ui", "1");
  pop.style.cssText = "position:absolute;z-index:2147483647;display:none;gap:6px;align-items:center;flex-wrap:wrap;max-width:360px;background:#111827;color:#fff;border-radius:8px;padding:8px;font:13px system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3)";
  function montarPop() { if (!pop.parentNode && document.body) document.body.appendChild(pop); }
  if (document.body) montarPop(); else document.addEventListener("DOMContentLoaded", montarPop);

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
    inp.style.cssText = "width:170px;padding:3px 6px;border-radius:4px;border:1px solid #374151;background:#1f2937;color:#fff";
    return inp;
  }
  function botonOk() {
    var ok = document.createElement("button"); ok.type = "button"; ok.textContent = "OK";
    ok.style.cssText = "padding:3px 8px;border-radius:4px;border:0;background:#6366f1;color:#fff;cursor:pointer";
    return ok;
  }
  function etiqueta(texto) {
    var s = document.createElement("span"); s.textContent = texto; s.style.opacity = ".8";
    return s;
  }

  function construir(el) {
    pop.innerHTML = "";
    objetivo = el;
    var hoja = esTextoHoja(el);
    var enlace = esEnlace(el) ? el : (el.closest ? el.closest("a[data-wc-id]") : null);

    if (hoja) {
      var color = document.createElement("input"); color.type = "color";
      color.value = rgbAHex(getComputedStyle(el).color);
      color.style.cssText = "width:28px;height:24px;border:0;background:none;padding:0;cursor:pointer";
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
      btn.style.cssText = "padding:3px 8px;border-radius:4px;border:0;background:#6366f1;color:#fff;cursor:pointer";
      btn.addEventListener("click", function () {
        window.parent.postMessage({ type: "wc-image-request", nodeId: idDe(el), page: PAGE }, "*");
      });
      pop.appendChild(btn);
    }
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
  function marcar(el) { el.style.outline = "2px dashed #6366f1"; el.style.outlineOffset = "2px"; if (esTextoHoja(el) || esTextoMixto(el)) el.style.cursor = "text"; }
  function desmarcar(el) { if (el === editando) return; el.style.outline = ""; el.style.outlineOffset = ""; el.style.cursor = ""; }

  // ---------- edición de texto in-situ ----------
  var editando = null, valorPrevio = "";
  function iniciarEdicion(el) {
    if (editando) terminarEdicion(true);
    editando = el; valorPrevio = el.textContent;
    el.setAttribute("contenteditable", "true"); el.focus();
  }
  function terminarEdicion(guardar) {
    if (!editando) return;
    var el = editando; el.removeAttribute("contenteditable");
    var valor = el.textContent; editando = null; desmarcar(el);
    if (guardar && valor !== valorPrevio) {
      if (esTextoMixto(el)) {
        var tn = (el.getAttribute("data-wc-tn") || "").split(":");
        emitir({ page: PAGE, nodeId: Number(tn[0]), kind: "textNode", index: Number(tn[1]), value: valor });
      } else {
        emitir({ page: PAGE, nodeId: idDe(el), kind: "text", value: valor });
      }
    } else if (!guardar) { el.textContent = valorPrevio; }
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
    if ((esTextoHoja(objetivoClick) || esTextoMixto(objetivoClick)) && !esBoton(objetivoClick) && !mixtoEnBoton && objetivoClick !== editando) {
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
    if (dentroDePop(e.relatedTarget)) return;
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
