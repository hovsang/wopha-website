// Shared board-portal layer: app-shell behavior + fetch/feedback helpers.
// Loaded synchronously by src/_includes/portal-shell.njk on every portal
// page, before any page script runs. Pages use:
//   api(), portalSummary(), el(), dollars(), TYPE_LABELS,
//   showError(), clearError(), toast(), confirmDialog(), skeleton(), initTabs()

/* ---- fetch --------------------------------------------------------------- */

async function api(path, options) {
  var opts = options || {};
  if (opts.body && typeof opts.body !== "string") {
    opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    opts.body = JSON.stringify(opts.body);
  }
  var res = await fetch(path, opts);
  var data = null;
  try { data = await res.json(); } catch (e) { /* non-JSON (e.g. Access login page) */ }
  if (res.ok && data === null) {
    throw new Error("Your sign-in session expired. Reload the page and sign in again.");
  }
  if (!res.ok) {
    var err = new Error((data && data.error) || "Request failed (" + res.status + "). Are you signed in?");
    err.status = res.status;
    throw err;
  }
  return data;
}

var _summaryPromise = null;
function portalSummary() {
  if (!_summaryPromise) _summaryPromise = api("/api/admin/summary");
  return _summaryPromise;
}

/* ---- small DOM/format helpers -------------------------------------------- */

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function dollars(cents) {
  return "$" + (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

var TYPE_LABELS = {
  contact_update: "Contact update",
  issue_report: "Issue report",
  suggestion: "Suggestion",
  arc_request: "Exterior change request",
};

/* ---- page-top banner: fetch/auth failures only ---------------------------- */

function showError(err) {
  var box = document.getElementById("error");
  var msg = document.getElementById("error-message");
  if (!box || !msg) return;
  msg.textContent = err && err.message ? err.message : String(err);
  box.hidden = false;
  box.focus();
}

function clearError() {
  var box = document.getElementById("error");
  if (box) box.hidden = true;
}

/* ---- toast: one, bottom-left, role=status, 5 s, optional action ------------ */

var _toastTimer = null;
function toast(message, opts) {
  opts = opts || {};
  var host = document.getElementById("portal-toast");
  if (!host) {
    host = el("div", "portal-toast");
    host.id = "portal-toast";
    host.setAttribute("role", "status");
    document.body.appendChild(host);
  }
  function dismiss() {
    host.classList.remove("show");
    if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
  }
  host.textContent = "";
  host.appendChild(el("span", null, message));
  if (opts.actionLabel && opts.onAction) {
    var btn = el("button", null, opts.actionLabel);
    btn.type = "button";
    btn.addEventListener("click", function () {
      dismiss();
      opts.onAction();
    });
    host.appendChild(btn);
  }
  host.classList.add("show");
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(dismiss, 5000);
}

/* ---- confirm dialog: native <dialog>, destructive confirms only ------------ */
/* Native showModal() traps focus, closes on Esc, and returns focus to the
   trigger on close — the APG dialog obligations come free. */

function confirmDialog(message) {
  return new Promise(function (resolve) {
    var dlg = document.getElementById("portal-confirm");
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.id = "portal-confirm";
      dlg.className = "portal-dialog";
      dlg.appendChild(el("p"));
      var form = document.createElement("form");
      form.method = "dialog";
      var cancel = el("button", "btn", "Cancel");
      cancel.value = "cancel";
      var ok = el("button", "btn btn--danger", "Delete");
      ok.value = "confirm";
      form.appendChild(cancel);
      form.appendChild(ok);
      dlg.appendChild(form);
      document.body.appendChild(dlg);
    }
    dlg.querySelector("p").textContent = message;
    dlg.addEventListener("close", function onClose() {
      dlg.removeEventListener("close", onClose);
      resolve(dlg.returnValue === "confirm");
    });
    dlg.showModal();
  });
}

/* ---- skeleton rows ---------------------------------------------------------- */

function skeleton(rows) {
  var frag = document.createDocumentFragment();
  for (var i = 0; i < (rows || 3); i++) frag.appendChild(el("div", "skeleton-row"));
  return frag;
}

/* ---- ARIA tabs (APG pattern) with hash routing ------------------------------- */
/* Markup contract: buttons with role="tab", data-hash="<fragment>", and
   aria-controls="<panel id>" inside a role="tablist" element. Multiple tabs
   may share one panel (inbox filters). The FIRST tab is the default when the
   URL has no matching hash. Back/forward work because selection follows
   hashchange. */

function initTabs(tablist, onChange) {
  var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
  var panelIds = [];
  tabs.forEach(function (t) {
    var id = t.getAttribute("aria-controls");
    if (id && panelIds.indexOf(id) === -1) panelIds.push(id);
  });

  function select(tab, setHash) {
    tabs.forEach(function (t) {
      var active = t === tab;
      t.setAttribute("aria-selected", active ? "true" : "false");
      t.tabIndex = active ? 0 : -1;
    });
    panelIds.forEach(function (id) {
      var panel = document.getElementById(id);
      if (panel) panel.hidden = id !== tab.getAttribute("aria-controls");
    });
    if (setHash) {
      var hash = tab.getAttribute("data-hash") || "";
      if (location.hash.replace("#", "") !== hash) location.hash = hash;
    }
    if (onChange) onChange(tab);
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { select(tab, true); });
    tab.addEventListener("keydown", function (e) {
      var j = null;
      if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = tabs.length - 1;
      if (j !== null) {
        e.preventDefault();
        tabs[j].focus();
        select(tabs[j], true);
      }
    });
  });

  function fromHash() {
    var hash = location.hash.replace("#", "");
    var match = null;
    tabs.forEach(function (t) { if (t.getAttribute("data-hash") === hash) match = t; });
    select(match || tabs[0], false);
  }
  window.addEventListener("hashchange", fromHash);
  fromHash();
  return { refresh: fromHash };
}

/* ---- app shell behavior ------------------------------------------------------- */

(function () {
  var toggle = document.querySelector(".portal-menu-toggle");
  var sidebar = document.getElementById("portal-sidebar");
  var scrim = document.querySelector(".portal-scrim");

  if (toggle && sidebar) {
    var setOpen = function (open) {
      sidebar.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (scrim) scrim.hidden = !open;
      if (open) {
        var first = sidebar.querySelector("a");
        if (first) first.focus();
      } else {
        toggle.focus();
      }
    };
    toggle.addEventListener("click", function () {
      setOpen(!sidebar.classList.contains("open"));
    });
    if (scrim) scrim.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sidebar.classList.contains("open")) setOpen(false);
    });
  }

  var reload = document.getElementById("error-reload");
  if (reload) reload.addEventListener("click", function () { location.reload(); });

  portalSummary().then(function (s) {
    var count = document.getElementById("nav-inbox-count");
    if (count) {
      count.textContent = String(s.newSubmissions);
      count.hidden = s.newSubmissions === 0;
    }
    var who = document.getElementById("portal-identity");
    if (who && s.adminEmail) {
      who.textContent = s.adminEmail;
      who.title = s.adminEmail;
    }
  }).catch(showError);
})();
