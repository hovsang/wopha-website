// Shared helpers for board portal pages.
async function api(path, options) {
  var opts = options || {};
  if (opts.body && typeof opts.body !== "string") {
    opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    opts.body = JSON.stringify(opts.body);
  }
  var res = await fetch(path, opts);
  var data = null;
  try { data = await res.json(); } catch (e) { /* non-JSON (e.g. Access login page) */ }
  if (!res.ok) {
    throw new Error((data && data.error) || "Request failed (" + res.status + "). Are you signed in?");
  }
  return data;
}

function showError(err) {
  var box = document.getElementById("error");
  if (box) box.textContent = err && err.message ? err.message : String(err);
}

function clearError() {
  var box = document.getElementById("error");
  if (box) box.textContent = "";
}
