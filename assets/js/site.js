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

// Announcements: fetched from the portal API. If the API is unreachable
// (offline, or portal not yet deployed) the sections simply stay hidden.
(function () {
  var list = document.getElementById("news-list");
  var archive = document.getElementById("news-archive-list");
  var target = list || archive;
  if (!target) return;
  fetch("/api/announcements").then(function (r) {
    if (!r.ok) throw new Error("bad status");
    return r.json();
  }).then(function (data) {
    var items = (data && data.announcements) || [];
    if (list) items = items.slice(0, 3);
    if (!items.length) return;
    items.forEach(function (a) {
      var card = document.createElement("div");
      card.className = "card";
      var h = document.createElement("h3");
      h.textContent = a.title;
      var p = document.createElement("p");
      p.textContent = a.body;
      var d = document.createElement("p");
      d.textContent = a.created_at.slice(0, 10);
      card.appendChild(h);
      card.appendChild(p);
      card.appendChild(d);
      target.appendChild(card);
    });
    var section = target.closest("section");
    if (section) section.hidden = false;
  }).catch(function () { /* leave section hidden */ });
})();
