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
  function esEditable(el) { return esTextoHoja(el) || esImagen(el); }

  function emitir(op) { window.parent.postMessage({ type: "wc-edit", op: op }, "*"); }
  function idDe(el) { return Number(el.getAttribute("data-wc-id")); }

  // ---------- popover (DOM propio, nunca se guarda) ----------
  var pop = document.createElement("div");
  pop.setAttribute("data-wc-ui", "1");
  pop.style.cssText = "position:absolute;z-index:2147483647;display:none;gap:6px;align-items:center;flex-wrap:wrap;max-width:340px;background:#111827;color:#fff;border-radius:8px;padding:8px;font:13px system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3)";
  function montarPop() { if (!pop.parentNode && document.body) document.body.appendChild(pop); }
  if (document.body) montarPop(); else document.addEventListener("DOMContentLoaded", montarPop);

  var objetivo = null;
  var ocultarTimer = null;

  function dentroDePop(el) { return el === pop || (el && pop.contains && pop.contains(el)); }

  function posicionar(el) {
    var r = el.getBoundingClientRect();
    pop.style.top = (window.scrollY + r.bottom + 6) + "px";
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

  function construir(el) {
    pop.innerHTML = "";
    objetivo = el;

    if (esTextoHoja(el)) {
      var lbl = document.createElement("span"); lbl.textContent = "Color"; lbl.style.opacity = ".8";
      var color = document.createElement("input"); color.type = "color";
      color.value = rgbAHex(getComputedStyle(el).color);
      color.style.cssText = "width:28px;height:24px;border:0;background:none;padding:0;cursor:pointer";
      color.addEventListener("input", function () {
        el.style.color = color.value;
        emitir({ page: PAGE, nodeId: idDe(el), kind: "style", property: "color", value: color.value });
      });
      pop.appendChild(lbl); pop.appendChild(color);
    }

    if (esEnlace(el)) {
      var inp = document.createElement("input"); inp.type = "text"; inp.placeholder = "https://…";
      inp.value = el.getAttribute("href") || "";
      inp.style.cssText = "width:170px;padding:3px 6px;border-radius:4px;border:1px solid #374151;background:#1f2937;color:#fff";
      var ok = document.createElement("button"); ok.type = "button"; ok.textContent = "OK";
      ok.style.cssText = "padding:3px 8px;border-radius:4px;border:0;background:#6366f1;color:#fff;cursor:pointer";
      var aplicar = function () {
        var v = inp.value.trim();
        el.setAttribute("href", v);
        emitir({ page: PAGE, nodeId: idDe(el), kind: "href", value: v });
      };
      ok.addEventListener("click", aplicar);
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); aplicar(); } });
      pop.appendChild(inp); pop.appendChild(ok);
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
    posicionar(el);
    pop.style.display = "flex";
  }
  function programarOcultar() {
    if (ocultarTimer) clearTimeout(ocultarTimer);
    ocultarTimer = setTimeout(function () { pop.style.display = "none"; objetivo = null; }, 250);
  }

  // ---------- marcado visual ----------
  function marcar(el) { el.style.outline = "2px dashed #6366f1"; el.style.outlineOffset = "2px"; if (esTextoHoja(el)) el.style.cursor = "text"; }
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
      emitir({ page: PAGE, nodeId: idDe(el), kind: "text", value: valor });
    } else if (!guardar) { el.textContent = valorPrevio; }
  }

  // ---------- eventos ----------
  document.addEventListener("mouseover", function (e) {
    var el = e.target;
    if (dentroDePop(el)) return;
    if (el && el.nodeType === 1 && esEditable(el)) { marcar(el); mostrar(el); }
  });
  document.addEventListener("mouseout", function (e) {
    var el = e.target, to = e.relatedTarget;
    if (el && el.nodeType === 1 && tieneId(el)) desmarcar(el);
    if (!dentroDePop(to) && !(to && to.nodeType === 1 && esEditable(to))) programarOcultar();
  });
  pop.addEventListener("mouseover", function () { if (ocultarTimer) { clearTimeout(ocultarTimer); ocultarTimer = null; } });
  pop.addEventListener("mouseleave", function () { programarOcultar(); });

  document.addEventListener("click", function (e) {
    var el = e.target;
    if (dentroDePop(el)) return;
    if (el && el.nodeType === 1 && esEnlace(el)) e.preventDefault(); // no navegar en modo edición
    if (el && el.nodeType === 1 && esTextoHoja(el) && el !== editando) { e.preventDefault(); iniciarEdicion(el); }
  });
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
