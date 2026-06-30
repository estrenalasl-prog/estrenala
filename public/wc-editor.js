(function () {
  "use strict";
  var self = document.currentScript;
  var PAGE = self.getAttribute("data-page") || "";
  var TAGS = ["h1","h2","h3","h4","h5","h6","p","span","li","a","button","blockquote","figcaption","label","strong","em","small","td","th"];

  function esEditable(el) {
    if (!el.hasAttribute("data-wc-id")) return false;
    if (TAGS.indexOf(el.tagName.toLowerCase()) === -1) return false;
    if (el.children.length > 0) return false; // tiene hijos-elemento → no es hoja de texto
    return el.textContent.trim().length > 0;
  }

  var editando = null;
  var valorPrevio = "";

  function marcar(el) {
    el.style.outline = "2px dashed #6366f1";
    el.style.outlineOffset = "2px";
    el.style.cursor = "text";
  }
  function desmarcar(el) {
    if (el === editando) return;
    el.style.outline = "";
    el.style.outlineOffset = "";
    el.style.cursor = "";
  }

  function iniciarEdicion(el) {
    if (editando) terminarEdicion(true);
    editando = el;
    valorPrevio = el.textContent;
    el.setAttribute("contenteditable", "true");
    el.focus();
  }

  function terminarEdicion(guardar) {
    if (!editando) return;
    var el = editando;
    el.removeAttribute("contenteditable");
    var valor = el.textContent;
    editando = null;
    desmarcar(el);
    if (guardar && valor !== valorPrevio) {
      window.parent.postMessage({
        type: "wc-edit",
        op: { page: PAGE, nodeId: Number(el.getAttribute("data-wc-id")), kind: "text", value: valor }
      }, "*");
    } else if (!guardar) {
      el.textContent = valorPrevio;
    }
  }

  document.addEventListener("mouseover", function (e) {
    var el = e.target;
    if (el && el.nodeType === 1 && esEditable(el)) marcar(el);
  });
  document.addEventListener("mouseout", function (e) {
    var el = e.target;
    if (el && el.nodeType === 1 && el.hasAttribute && el.hasAttribute("data-wc-id")) desmarcar(el);
  });
  document.addEventListener("click", function (e) {
    var el = e.target;
    if (el && el.nodeType === 1 && esEditable(el) && el !== editando) {
      e.preventDefault();
      iniciarEdicion(el);
    }
  });
  document.addEventListener("keydown", function (e) {
    if (!editando) return;
    if (e.key === "Escape") { e.preventDefault(); terminarEdicion(false); }
    else if (e.key === "Enter") { e.preventDefault(); terminarEdicion(true); }
  });
  document.addEventListener("blur", function () { terminarEdicion(true); }, true);
})();
