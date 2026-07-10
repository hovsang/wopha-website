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
