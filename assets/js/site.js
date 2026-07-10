// Woods of Parkview — shared behavior (mobile nav + PWA registration)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

(function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
})();

// Seasonal hero button: dues season (Jan-Apr, invoices due Mar 31) shows the
// default "Pay your dues"; pool season and meeting season swap it out.
(function () {
  var cta = document.getElementById("hero-cta");
  if (!cta) return;
  var m = new Date().getMonth(); // 0 = January
  if (m >= 4 && m <= 8) {
    cta.textContent = "Pool hours & booking";
    cta.href = "pool.html";
  } else if (m >= 9) {
    cta.textContent = "Annual meeting & minutes";
    cta.href = "board.html#minutes";
  }
})();

// Home-screen install: hide the pitch when already installed; show a real
// install button on browsers that offer the prompt (Android Chrome).
(function () {
  var section = document.getElementById("app");
  if (section && window.matchMedia("(display-mode: standalone)").matches) {
    section.hidden = true;
    return;
  }
  var btn = document.getElementById("install-app");
  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    if (btn) btn.hidden = false;
  });
  if (btn) btn.addEventListener("click", function () {
    if (!deferred) return;
    deferred.prompt();
    deferred = null;
    btn.hidden = true;
  });
})();
